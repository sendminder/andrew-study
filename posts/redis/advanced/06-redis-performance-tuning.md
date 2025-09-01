# Redis 성능 튜닝: 초고속 Redis를 더 빠르게 만들기

## 왜 성능 튜닝이 필요한가?

### Redis도 튜닝이 필요하다

Redis는 빠르지만, 제대로 튜닝하지 않으면 기대만큼의 성능이 나오지 않습니다.

```
실제 성능 차이:

튜닝 전:
- 응답 시간: 10ms
- 처리량: 10,000 ops/sec
- CPU 사용률: 90%

튜닝 후:
- 응답 시간: 0.5ms (20배 향상!)
- 처리량: 100,000 ops/sec (10배 향상!)
- CPU 사용률: 40%

같은 하드웨어, 다른 성능!
```

## 하드웨어 최적화

### 1. CPU 선택과 설정

```
Redis는 단일 스레드!

좋은 선택:
✓ 높은 클럭 속도 (3.5GHz+)
✓ 큰 L3 캐시
✓ 최신 아키텍처 (더 나은 IPC)

나쁜 선택:
✗ 많은 코어 수 (32 코어? Redis는 1개만 사용)
✗ 낮은 클럭 (2.0GHz 32코어 < 4.0GHz 8코어)
```

**CPU 친화성 설정:**

```bash
# Redis를 특정 CPU 코어에 고정
taskset -c 0 redis-server  # CPU 0번에 고정

# 또는 redis.conf에서
# bind-cpu-list 0-3  # CPU 0-3번 사용
```

### 2. 메모리 최적화

```bash
# Transparent Huge Pages 비활성화 (필수!)
echo never > /sys/kernel/mm/transparent_hugepage/enabled

# 이유: THP는 메모리 지연 시간 증가, Redis 성능 저하

# NUMA 설정 (다중 소켓 서버)
numactl --interleave=all redis-server

# Swap 비활성화 또는 최소화
echo 0 > /proc/sys/vm/swappiness
```

### 3. 네트워크 최적화

```bash
# TCP 백로그 증가
echo 511 > /proc/sys/net/core/somaxconn

# TCP keepalive 설정
echo 300 > /proc/sys/net/ipv4/tcp_keepalive_time
echo 60 > /proc/sys/net/ipv4/tcp_keepalive_intvl
echo 20 > /proc/sys/net/ipv4/tcp_keepalive_probes

# 네트워크 버퍼 크기 증가
echo 'net.core.rmem_max = 134217728' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 134217728' >> /etc/sysctl.conf
```

## Redis 설정 최적화

### 1. 기본 설정 튜닝

```bash
# redis.conf 핵심 설정

# TCP 백로그
tcp-backlog 511

# TCP keepalive (클라이언트 연결 유지)
tcp-keepalive 300

# 데이터베이스 수 (사용하는 만큼만)
databases 1  # 기본 16 → 1로 줄이면 메모리 절약

# 클라이언트 연결 수
maxclients 10000

# Slow log 설정 (성능 분석용)
slowlog-log-slower-than 10000  # 10ms 이상 명령 기록
slowlog-max-len 128
```

### 2. 영속성 설정 최적화

```bash
# RDB 설정
save ""  # 캐시로만 사용 시 RDB 비활성화
# 또는 느슨한 설정
save 3600 1  # 1시간에 1개 변경 시만

# AOF 설정
appendonly no  # 캐시는 비활성화
# 또는
appendfsync everysec  # 1초마다 (균형)
no-appendfsync-on-rewrite yes  # rewrite 중 fsync 안 함

# AOF rewrite 최적화
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### 3. 위험한 명령어 비활성화

```bash
# 성능에 영향을 주는 명령어 비활성화
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command KEYS ""  # KEYS 대신 SCAN 사용
rename-command CONFIG ""
rename-command SHUTDOWN ""

# 또는 이름 변경
rename-command KEYS "KEYS_I_KNOW_ITS_DANGEROUS"
```

## 클라이언트 최적화

### 1. 연결 풀링

```python
# Python redis-py 연결 풀 설정
import redis

# 나쁜 예: 매번 새 연결
def bad_example():
    r = redis.Redis(host='localhost', port=6379)
    r.get('key')  # 연결 생성 → 사용 → 종료

# 좋은 예: 연결 풀 사용
pool = redis.ConnectionPool(
    host='localhost',
    port=6379,
    max_connections=50,
    socket_keepalive=True,
    socket_keepalive_options={
        1: 1,  # TCP_KEEPIDLE
        2: 60, # TCP_KEEPINTVL
        3: 20, # TCP_KEEPCNT
    }
)

def good_example():
    r = redis.Redis(connection_pool=pool)
    r.get('key')  # 풀에서 연결 재사용
```

### 2. 파이프라이닝

```python
# 나쁜 예: 개별 명령 (네트워크 왕복 많음)
def slow_batch():
    for i in range(1000):
        r.set(f'key:{i}', f'value:{i}')  # 1000번 왕복

# 좋은 예: 파이프라인 (네트워크 왕복 최소화)
def fast_batch():
    pipe = r.pipeline()
    for i in range(1000):
        pipe.set(f'key:{i}', f'value:{i}')
    pipe.execute()  # 1번 왕복

# 성능 차이: 10배 이상!
```

### 3. 배치 처리

```python
# MGET/MSET 활용
# 나쁜 예
values = []
for key in keys:
    values.append(r.get(key))

# 좋은 예
values = r.mget(keys)  # 한 번에 가져오기

# Lua 스크립트로 배치 처리
batch_script = """
local results = {}
for i, key in ipairs(KEYS) do
    local value = redis.call('GET', key)
    if value then
        local processed = string.upper(value)
        redis.call('SET', key, processed)
        table.insert(results, processed)
    end
end
return results
"""
```

## 명령어별 성능 최적화

### 1. KEYS vs SCAN

```bash
# 절대 사용 금지 (전체 블로킹)
KEYS user:*  # 100만개 키 = 수초 블로킹

# 대신 SCAN 사용 (점진적 순회)
SCAN 0 MATCH user:* COUNT 100
```

```python
# Python에서 안전한 키 순회
def scan_keys(pattern):
    cursor = 0
    keys = []
    
    while True:
        cursor, partial_keys = r.scan(
            cursor, 
            match=pattern, 
            count=100
        )
        keys.extend(partial_keys)
        
        if cursor == 0:
            break
    
    return keys
```

### 2. 큰 컬렉션 다루기

```python
# 큰 리스트 처리
# 나쁜 예
huge_list = r.lrange('mylist', 0, -1)  # 전체 로드

# 좋은 예
def process_list_in_batches(key, batch_size=100):
    start = 0
    while True:
        batch = r.lrange(key, start, start + batch_size - 1)
        if not batch:
            break
        
        for item in batch:
            process(item)
        
        start += batch_size

# 큰 Set/Sorted Set도 마찬가지
def scan_set(key):
    cursor = 0
    while True:
        cursor, members = r.sscan(key, cursor, count=100)
        for member in members:
            process(member)
        if cursor == 0:
            break
```

### 3. 효율적인 카운터

```python
# 일반 카운터
r.incr('counter')  # 원자적, 빠름

# 만료 시간이 있는 카운터
def incr_with_expire(key, ttl):
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, ttl)
    result = pipe.execute()
    return result[0]

# 더 효율적: Lua 스크립트
incr_expire_script = """
local value = redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ARGV[1])
return value
"""
```

## 모니터링과 프로파일링

### 1. 성능 모니터링

```bash
# 실시간 모니터링
redis-cli --stat

# 지연 시간 모니터링
redis-cli --latency
redis-cli --latency-history

# 상세 정보
INFO stats
INFO commandstats

# Slow Query 확인
SLOWLOG GET 10
```

### 2. 명령어 프로파일링

```bash
# 명령어별 통계 확인
INFO commandstats

# 결과 예시:
cmdstat_get:calls=1000000,usec=5000000,usec_per_call=5.00
cmdstat_set:calls=500000,usec=3000000,usec_per_call=6.00
```

### 3. 벤치마킹

```bash
# Redis 벤치마크 도구
redis-benchmark -q -n 100000

# 특정 명령어 테스트
redis-benchmark -t get,set -n 100000

# 파이프라인 테스트
redis-benchmark -P 16 -q -n 100000

# 실제 워크로드 시뮬레이션
redis-benchmark -r 1000000 -n 1000000 \
    eval "return redis.call('set',KEYS[1],ARGV[1])" 1 \
    __rand_int__ __rand_int__
```

## 실전 튜닝 시나리오

### 시나리오 1: 높은 지연 시간

```python
# 문제: GET 명령이 느림 (10ms+)

# 진단
def diagnose_latency():
    # 1. 네트워크 지연 확인
    start = time.time()
    r.ping()
    network_latency = time.time() - start
    
    # 2. 큰 키 확인
    for key in sample_keys:
        size = r.memory_usage(key)
        if size > 1024 * 1024:  # 1MB 이상
            print(f"Large key found: {key} ({size} bytes)")
    
    # 3. Slow log 확인
    slow_queries = r.slowlog_get(10)
    for query in slow_queries:
        print(f"Slow: {query['command']} - {query['duration']}μs")

# 해결책
# 1. 큰 값은 압축
# 2. 큰 컬렉션은 분할
# 3. 네트워크 최적화
```

### 시나리오 2: 높은 CPU 사용률

```python
# 문제: Redis CPU 90%+

# 진단 및 해결
# 1. 비효율적인 명령어 찾기
INFO commandstats  # KEYS, SORT 등 확인

# 2. 명령어 최적화
# Before: KEYS 사용
keys = r.keys('prefix:*')

# After: SCAN 사용
keys = []
for key in r.scan_iter('prefix:*', count=100):
    keys.append(key)

# 3. Lua 스크립트로 서버 측 처리
# 여러 명령을 하나로 통합
```

### 시나리오 3: 메모리 부족

```bash
# 진단
INFO memory
redis-cli --bigkeys

# 해결책
# 1. TTL 설정
# 2. 메모리 정책 변경
CONFIG SET maxmemory-policy allkeys-lru

# 3. 데이터 구조 최적화
# String → Hash (작은 hash는 ziplist)
```

## 성능 튜닝 체크리스트

```
하드웨어:
□ THP 비활성화
□ CPU 친화성 설정
□ NUMA 최적화
□ 네트워크 버퍼 증가
□ Swap 비활성화

Redis 설정:
□ tcp-backlog 511
□ maxclients 적절히 설정
□ 위험한 명령어 비활성화
□ 영속성 설정 최적화
□ Slow log 활성화

클라이언트:
□ 연결 풀 사용
□ 파이프라이닝 활용
□ 배치 처리
□ 타임아웃 설정

모니터링:
□ INFO stats 주기적 확인
□ Slow log 모니터링
□ 메모리 사용량 추적
□ 명령어 통계 분석
```

## 정리

Redis 성능 튜닝은 "세부 사항에 있는 악마를 찾아내는" 과정입니다.

하드웨어 설정부터 Redis 구성, 클라이언트 최적화까지 모든 레벨에서 개선이 가능합니다. 작은 설정 하나가 10배의 성능 차이를 만들 수 있습니다.

마치 F1 레이싱카를 튜닝하는 것처럼, 0.1초를 줄이기 위해 모든 부품을 최적화하는 것과 같습니다.

"이미 빠른 Redis를, 극한까지 빠르게!"