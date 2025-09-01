# Redis 트랜잭션과 Lua 스크립트: 원자적 연산의 완성

## 왜 트랜잭션과 스크립트가 필요했을까?

### 동시성 문제의 발생

여러 클라이언트가 동시에 Redis를 사용할 때 문제가 발생합니다.

```
예시: 은행 계좌 이체

Client A: 100만원을 B에게 이체
1. GET account:A  # 500만원
2. GET account:B  # 200만원
3. SET account:A 400만원
4. SET account:B 300만원

Client C: 동시에 50만원을 A에게 입금
1. GET account:A  # 500만원 (아직 안 바뀜)
2. SET account:A 550만원

결과: A의 잔액이 550만원? 400만원? 
      → 데이터 불일치! 💥
```

## Redis 트랜잭션 (MULTI/EXEC)

### 기본 개념

Redis 트랜잭션은 여러 명령을 하나의 원자적 단위로 실행합니다.

```bash
# 트랜잭션 시작
MULTI
SET account:A 400
SET account:B 300
EXEC  # 한 번에 실행

# 또는 취소
MULTI
SET key1 value1
DISCARD  # 취소
```

### 트랜잭션의 특징

```
Redis 트랜잭션 vs 전통적 DB 트랜잭션:

Redis:
- 원자성(Atomicity): ✓ 모두 실행 or 모두 취소
- 일관성(Consistency): ✓ 데이터 일관성 유지
- 격리성(Isolation): △ 실행 중 다른 명령 끼어들 수 없음
- 지속성(Durability): △ 영속성 설정에 따라

특이점:
- Rollback 없음! (에러 발생해도 계속 실행)
- 실행 전까지 명령들이 큐에 대기
```

### WATCH를 이용한 낙관적 잠금

```bash
# WATCH: 키 감시, 변경되면 트랜잭션 취소
WATCH account:A account:B
current_a = GET account:A  # 500만원
current_b = GET account:B  # 200만원

MULTI
SET account:A 400  # 100만원 차감
SET account:B 300  # 100만원 추가
EXEC  # 누군가 account:A나 B를 변경했다면 실행 안 됨!
```

**Python 예제: 안전한 이체**

```python
def transfer_money(from_account, to_account, amount):
    while True:
        try:
            # 파이프라인으로 트랜잭션 시작
            pipe = r.pipeline()
            
            # 계좌 감시
            pipe.watch(from_account, to_account)
            
            # 현재 잔액 확인
            balance_from = int(pipe.get(from_account) or 0)
            balance_to = int(pipe.get(to_account) or 0)
            
            if balance_from < amount:
                pipe.unwatch()
                return False  # 잔액 부족
            
            # 트랜잭션 시작
            pipe.multi()
            pipe.decrby(from_account, amount)
            pipe.incrby(to_account, amount)
            
            # 실행
            pipe.execute()
            return True
            
        except redis.WatchError:
            # 누군가 계좌를 수정함, 재시도
            continue
```

## Lua 스크립트: 진정한 원자성

### Lua 스크립트의 장점

```
트랜잭션 vs Lua 스크립트:

트랜잭션(MULTI/EXEC):
- 단순한 명령 나열
- 조건문 불가
- 중간 결과 활용 불가

Lua 스크립트:
- 복잡한 로직 가능
- 조건문, 반복문 사용
- 중간 계산 가능
- 원자적 실행 보장
- 네트워크 왕복 최소화
```

### 기본 Lua 스크립트

```bash
# 간단한 스크립트 실행
EVAL "return redis.call('GET', KEYS[1])" 1 mykey

# 조건부 증가
EVAL "
  local current = redis.call('GET', KEYS[1])
  if not current then
    current = 0
  end
  if tonumber(current) < 100 then
    return redis.call('INCR', KEYS[1])
  else
    return current
  end
" 1 counter
```

### 실전 Lua 스크립트 예제

#### 1. 분산 잠금 (Distributed Lock)

```lua
-- 안전한 잠금 획득 스크립트
local lock_key = KEYS[1]
local lock_value = ARGV[1]
local lock_ttl = ARGV[2]

-- 잠금 시도
if redis.call('SET', lock_key, lock_value, 'NX', 'EX', lock_ttl) then
    return 1  -- 성공
else
    -- 이미 잠금이 있는지 확인
    local current_value = redis.call('GET', lock_key)
    if current_value == lock_value then
        -- 내가 소유한 잠금, TTL 연장
        redis.call('EXPIRE', lock_key, lock_ttl)
        return 1
    end
    return 0  -- 실패
end
```

**Python에서 사용:**

```python
# 스크립트 등록
lock_script = """
local lock_key = KEYS[1]
local lock_value = ARGV[1]
local lock_ttl = ARGV[2]

if redis.call('SET', lock_key, lock_value, 'NX', 'EX', lock_ttl) then
    return 1
else
    local current_value = redis.call('GET', lock_key)
    if current_value == lock_value then
        redis.call('EXPIRE', lock_key, lock_ttl)
        return 1
    end
    return 0
end
"""

# SHA로 등록 (성능 최적화)
lock_sha = r.script_load(lock_script)

# 사용
import uuid
lock_id = str(uuid.uuid4())
acquired = r.evalsha(lock_sha, 1, 'mylock', lock_id, 30)
```

#### 2. 재고 차감 스크립트

```lua
-- 재고 차감 및 주문 생성
local product_key = KEYS[1]
local order_key = KEYS[2]
local quantity = tonumber(ARGV[1])
local user_id = ARGV[2]

-- 현재 재고 확인
local stock = redis.call('GET', product_key)
if not stock then
    return {-1, "상품이 없습니다"}
end

stock = tonumber(stock)

-- 재고 부족 체크
if stock < quantity then
    return {-2, "재고가 부족합니다. 남은 재고: " .. stock}
end

-- 재고 차감
redis.call('DECRBY', product_key, quantity)

-- 주문 생성
local order_id = redis.call('INCR', 'order:counter')
local order_data = string.format(
    '{"order_id":%d,"user_id":"%s","product":"%s","quantity":%d,"timestamp":%d}',
    order_id, user_id, product_key, quantity, redis.call('TIME')[1]
)
redis.call('HSET', order_key .. ':' .. order_id, 'data', order_data)

-- 주문 목록에 추가
redis.call('LPUSH', 'orders:pending', order_id)

return {order_id, "주문 성공"}
```

#### 3. Rate Limiting 스크립트

```lua
-- 슬라이딩 윈도우 방식의 Rate Limiting
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current_time = tonumber(ARGV[3])

-- 오래된 항목 제거
redis.call('ZREMRANGEBYSCORE', key, 0, current_time - window)

-- 현재 카운트
local current_count = redis.call('ZCARD', key)

if current_count < limit then
    -- 허용
    redis.call('ZADD', key, current_time, current_time)
    redis.call('EXPIRE', key, window)
    return 1
else
    -- 제한
    return 0
end
```

**Python Rate Limiter 클래스:**

```python
class RateLimiter:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.script = self.redis.script_load("""
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local current_time = tonumber(ARGV[3])
            
            redis.call('ZREMRANGEBYSCORE', key, 0, current_time - window)
            local current_count = redis.call('ZCARD', key)
            
            if current_count < limit then
                redis.call('ZADD', key, current_time, current_time)
                redis.call('EXPIRE', key, window)
                return 1
            else
                return 0
            end
        """)
    
    def is_allowed(self, user_id, limit=10, window=60):
        key = f"rate_limit:{user_id}"
        current_time = int(time.time())
        
        return self.redis.evalsha(
            self.script, 
            1, 
            key, 
            limit, 
            window, 
            current_time
        ) == 1

# 사용
limiter = RateLimiter(r)
if limiter.is_allowed("user:123", limit=10, window=60):
    # 요청 처리
    process_request()
else:
    # 제한됨
    return "Too many requests", 429
```

#### 4. 리더보드 업데이트

```lua
-- 점수 업데이트 및 순위 반환
local leaderboard_key = KEYS[1]
local user_id = ARGV[1]
local score = tonumber(ARGV[2])
local max_members = tonumber(ARGV[3] or 1000)

-- 점수 업데이트
redis.call('ZADD', leaderboard_key, score, user_id)

-- 리더보드 크기 제한
local total = redis.call('ZCARD', leaderboard_key)
if total > max_members then
    -- 하위 멤버 제거
    redis.call('ZREMRANGEBYRANK', leaderboard_key, 0, total - max_members - 1)
end

-- 순위 계산 (0-based를 1-based로)
local rank = redis.call('ZREVRANK', leaderboard_key, user_id)
if rank then
    rank = rank + 1
end

-- Top 10 가져오기
local top10 = redis.call('ZREVRANGE', leaderboard_key, 0, 9, 'WITHSCORES')

return {rank, top10}
```

## 스크립트 디버깅과 최적화

### 디버깅 기법

```lua
-- 디버깅을 위한 로깅
local debug_info = {}

local function log(message)
    table.insert(debug_info, message)
end

-- 실제 로직
log("시작: " .. KEYS[1])
local value = redis.call('GET', KEYS[1])
log("값: " .. (value or "nil"))

-- 디버그 정보 반환
return debug_info
```

### 성능 최적화

```python
# 1. 스크립트 캐싱
class ScriptManager:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.scripts = {}
    
    def register(self, name, script):
        sha = self.redis.script_load(script)
        self.scripts[name] = sha
        return sha
    
    def execute(self, name, keys=[], args=[]):
        sha = self.scripts.get(name)
        if not sha:
            raise ValueError(f"Script {name} not registered")
        
        try:
            return self.redis.evalsha(sha, len(keys), *keys, *args)
        except redis.NoScriptError:
            # 스크립트 재로드
            sha = self.register(name, self.get_script_content(name))
            return self.redis.evalsha(sha, len(keys), *keys, *args)

# 2. 배치 처리
def batch_update(items):
    script = """
        local results = {}
        for i = 1, #KEYS do
            redis.call('SET', KEYS[i], ARGV[i])
            table.insert(results, "OK")
        end
        return results
    """
    
    keys = [item['key'] for item in items]
    values = [item['value'] for item in items]
    
    return r.eval(script, len(keys), *keys, *values)
```

## 트랜잭션 vs 스크립트 선택 가이드

```
언제 트랜잭션(MULTI/EXEC)을 사용할까?
- 단순한 여러 명령 묶음
- 조건 분기가 없음
- Watch가 필요한 경우

언제 Lua 스크립트를 사용할까?
- 복잡한 로직 필요
- 조건문/반복문 사용
- 중간 계산 결과 활용
- 네트워크 왕복 최소화
- 완벽한 원자성 필요

성능 비교:
┌─────────────┬──────────┬──────────┐
│   작업       │  MULTI   │   Lua    │
├─────────────┼──────────┼──────────┤
│ 네트워크 I/O │   많음   │   적음   │
│ 원자성      │   부분   │   완전   │
│ 복잡한 로직  │    X     │    O     │
│ 디버깅      │   쉬움   │  보통    │
└─────────────┴──────────┴──────────┘
```

## 실전 팁

### 1. 스크립트 버전 관리
```python
SCRIPTS = {
    'v1.0.0': {
        'transfer': "...",
        'rate_limit': "..."
    },
    'v1.0.1': {
        'transfer': "... updated ...",
        'rate_limit': "..."
    }
}

def get_script(name, version='latest'):
    if version == 'latest':
        version = max(SCRIPTS.keys())
    return SCRIPTS[version][name]
```

### 2. 에러 처리
```lua
-- 안전한 에러 처리
local function safe_incr(key)
    local ok, result = pcall(function()
        return redis.call('INCR', key)
    end)
    
    if ok then
        return result
    else
        -- 에러 로깅 및 기본값 반환
        redis.call('LPUSH', 'errors', result)
        return 0
    end
end
```

### 3. 테스트 작성
```python
def test_transfer_script():
    # 테스트 데이터 준비
    r.set('account:A', 1000)
    r.set('account:B', 500)
    
    # 스크립트 실행
    result = r.eval(transfer_script, 2, 
                    'account:A', 'account:B', 
                    100)
    
    # 검증
    assert r.get('account:A') == '900'
    assert r.get('account:B') == '600'
    assert result == 'SUCCESS'
```

## 정리

Redis의 트랜잭션과 Lua 스크립트는 "동시성 문제를 해결하는 두 가지 무기"입니다.

- **트랜잭션(MULTI/EXEC)**: 간단한 작업을 원자적으로 묶기
- **Lua 스크립트**: 복잡한 로직을 서버에서 원자적으로 실행

마치 트랜잭션은 여러 개의 레고 블록을 한 번에 쌓는 것이고, Lua 스크립트는 복잡한 레고 작품을 한 번에 완성하는 것과 같습니다.

"빠르고, 안전하고, 원자적으로 - Redis가 제공하는 동시성 해결책!"