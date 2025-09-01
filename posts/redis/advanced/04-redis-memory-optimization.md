# Redis 메모리 최적화: 한정된 메모리를 극한까지 활용하기

## 왜 메모리 최적화가 중요한가?

### Redis의 딜레마

Redis는 모든 데이터를 메모리에 저장합니다. 이는 축복이자 저주입니다.

```
메모리의 현실:
- 서버 RAM: 64GB
- Redis 사용 가능: 50GB (OS, 버퍼 제외)
- 데이터 크기: 100GB...?

선택지:
1. RAM 추가 구매 → 비용 💸
2. 서버 추가 → 복잡도 증가 🤯
3. 메모리 최적화 → 스마트한 해결! 🎯

메모리 1GB 절약 = 연간 수백만원 절감!
```

## Redis의 메모리 사용 구조

### 메모리는 어디에 쓰이나?

```
Redis 메모리 구성:

1. 사용자 데이터 (70-80%)
   - Key-Value 실제 데이터
   
2. Redis 오버헤드 (10-20%)
   - 메타데이터, 포인터
   - 내부 자료구조
   
3. 버퍼/임시 공간 (5-10%)
   - 클라이언트 버퍼
   - AOF 재작성 버퍼
   - 복제 버퍼

4. 메모리 단편화 (5-20%)
   - 할당/해제 반복으로 인한 조각화
```

### 메모리 사용량 확인

```bash
# 메모리 정보 확인
redis-cli INFO memory

used_memory:1073741824         # 실제 사용 중 (1GB)
used_memory_human:1.00G        
used_memory_rss:1288490188     # OS가 본 메모리
mem_fragmentation_ratio:1.20   # 단편화 비율
used_memory_overhead:134217728 # 오버헤드
used_memory_dataset:939524096  # 실제 데이터
```

## 데이터 구조별 최적화

### 1. String 최적화

```bash
# 비효율적 - 각 필드가 별도 키
SET user:1000:name "Andrew"      # 약 90 bytes
SET user:1000:email "a@test.com" # 약 94 bytes
SET user:1000:age "30"           # 약 68 bytes
# 총: 252 bytes + 오버헤드

# 효율적 - Hash 사용
HSET user:1000 name "Andrew" email "a@test.com" age "30"
# 총: 약 100 bytes (60% 절감!)
```

### 2. Hash 최적화 - Ziplist 인코딩

```bash
# redis.conf 설정
hash-max-ziplist-entries 512  # 엔트리 512개까지 ziplist
hash-max-ziplist-value 64     # 값 64바이트까지 ziplist

# Ziplist vs HashTable
작은 Hash (ziplist): 메모리 효율적, 약간 느림
큰 Hash (hashtable): 메모리 많이 사용, 빠름
```

**Ziplist 효과 실측:**

```python
# 일반 Hash (hashtable 인코딩)
for i in range(1000):
    r.hset(f"user:{i}", mapping={
        "name": "A" * 100,  # 큰 값
        "data": "B" * 200
    })
# 메모리: 약 1MB

# 최적화된 Hash (ziplist 인코딩)
for i in range(1000):
    r.hset(f"user:{i}", mapping={
        "n": "A" * 60,  # 작은 값, 짧은 키
        "d": "B" * 60
    })
# 메모리: 약 200KB (80% 절감!)
```

### 3. List 최적화 - Quicklist

```bash
# redis.conf 설정
list-max-ziplist-size -2  # 각 노드 8KB까지
list-compress-depth 1     # 양 끝 1개 노드만 비압축

# 구조:
Quicklist = LinkedList of Ziplists
[ziplist] ← → [ziplist] ← → [ziplist(압축)]
   head                         tail
```

### 4. Set 최적화

```bash
# 작은 Set은 intset 인코딩 (정수만)
SADD myset 1 2 3 4 5
# 메모리 효율적

# 문자열 추가되면 hashtable로 변환
SADD myset "hello"
# 메모리 사용량 증가

# 최적화 팁: 가능하면 정수 ID 사용
SADD users:online 1000 1001 1002  # Good
SADD users:online "u1000" "u1001" # Bad
```

### 5. Sorted Set 최적화

```bash
# redis.conf 설정
zset-max-ziplist-entries 128
zset-max-ziplist-value 64

# 작은 Sorted Set 유지
ZADD leaderboard 100 "user1" 95 "user2"

# 큰 데이터는 참조로
ZADD leaderboard 100 "1000"  # user_id만 저장
HGET user:1000 name           # 실제 데이터는 별도 조회
```

## 메모리 정책과 Eviction

### Maxmemory 정책

```bash
# redis.conf
maxmemory 2gb  # 최대 메모리 제한

# Eviction 정책
maxmemory-policy noeviction     # 메모리 풀 시 에러 (기본값)
maxmemory-policy allkeys-lru    # 모든 키 중 LRU
maxmemory-policy volatile-lru   # 만료 설정된 키 중 LRU
maxmemory-policy allkeys-lfu    # 모든 키 중 LFU (Redis 4.0+)
maxmemory-policy volatile-lfu   # 만료 설정된 키 중 LFU
maxmemory-policy allkeys-random # 랜덤 삭제
maxmemory-policy volatile-ttl   # TTL 짧은 순서로 삭제
```

### LRU vs LFU

```
LRU (Least Recently Used):
- 가장 오래 사용 안 한 키 삭제
- 일시적 인기 데이터에 약함

예시:
시간 0: A 접근
시간 1: B 접근  
시간 2: C 접근
시간 3: A 접근 100번 (갑자기 인기)
시간 4: 메모리 부족 → B 삭제 (가장 오래됨)

LFU (Least Frequently Used):
- 가장 적게 사용한 키 삭제
- 접근 빈도 추적

예시:
A: 100번 접근
B: 1번 접근
C: 2번 접근
메모리 부족 → B 삭제 (가장 적게 사용)
```

## 메모리 단편화 해결

### 단편화란?

```
메모리 할당/해제 반복:

초기: [====A====][====B====][====C====]
B 삭제: [====A====][  빈공간  ][====C====]
D 추가 시도 (B보다 큼): 못 들어감!
새 위치에 할당: [====A====][  낭비  ][====C====][=====D=====]

결과: 메모리 단편화 (fragmentation)
```

### 단편화 해결 방법

```bash
# 1. 단편화 확인
INFO memory
mem_fragmentation_ratio:1.5  # 1.5 이상이면 문제

# 2. Active Defrag 활성화 (Redis 4.0+)
CONFIG SET activedefrag yes
CONFIG SET active-defrag-ignore-bytes 100mb
CONFIG SET active-defrag-threshold-lower 10

# 3. 수동 해결 (최후의 수단)
BGSAVE        # 백업
SHUTDOWN      # 종료
redis-server  # 재시작 (메모리 재구성)
```

## 실전 최적화 테크닉

### 1. 키 이름 최적화

```bash
# 비효율적 - 긴 키 이름
SET user:profile:andrew:preferences:theme "dark"  # 41 bytes

# 효율적 - 짧은 키
SET u:p:andrew:t "dark"  # 15 bytes

# 또는 ID 사용
SET u:1000:t "dark"  # 더 짧음
```

### 2. 데이터 압축

```python
import zlib
import json
import base64

# 큰 JSON 데이터 압축
data = {"large": "data" * 1000}
json_str = json.dumps(data)  # 원본: 8KB

# 압축
compressed = zlib.compress(json_str.encode())
encoded = base64.b64encode(compressed).decode()
r.set("compressed_data", encoded)  # 저장: 200B (97% 절감!)

# 압축 해제
encoded = r.get("compressed_data")
compressed = base64.b64decode(encoded)
json_str = zlib.decompress(compressed).decode()
data = json.loads(json_str)
```

### 3. 비트맵 활용

```bash
# 사용자 일일 접속 체크 - 비효율적
SADD daily:2024:01:01 user:1000 user:1001 ...  # 많은 메모리

# 비트맵 사용 - 효율적
SETBIT daily:2024:01:01 1000 1  # user 1000 접속
SETBIT daily:2024:01:01 1001 1  # user 1001 접속

# 100만 사용자 = 125KB만 사용!
```

### 4. HyperLogLog 활용

```bash
# UV(Unique Visitor) 카운트 - 비효율적
SADD visitors:2024:01:01 "192.168.1.1" "192.168.1.2" ...
SCARD visitors:2024:01:01  # 정확하지만 메모리 많이 사용

# HyperLogLog - 효율적
PFADD hll:visitors:2024:01:01 "192.168.1.1" "192.168.1.2"
PFCOUNT hll:visitors:2024:01:01  # 0.81% 오차, 12KB 고정!
```

### 5. 데이터 샤딩

```python
# 큰 Hash를 여러 개로 분할
def get_shard_key(user_id, shard_count=100):
    shard_id = user_id % shard_count
    return f"users:{shard_id}"

# 저장
shard_key = get_shard_key(12345)
r.hset(shard_key, "12345", json.dumps(user_data))

# 각 샤드는 작게 유지되어 ziplist 인코딩 유지
```

## 모니터링과 분석

### 메모리 분석 도구

```bash
# 1. 큰 키 찾기
redis-cli --bigkeys

# 2. 메모리 사용량 분석
redis-cli --memkeys

# 3. 특정 키 메모리 사용량
MEMORY USAGE mykey

# 4. 메모리 통계
MEMORY STATS

# 5. 메모리 정리
MEMORY PURGE  # 메모리 정리 시도
```

### 메모리 모니터링 스크립트

```python
def monitor_memory():
    info = r.info('memory')
    
    used_memory = info['used_memory_human']
    fragmentation = info['mem_fragmentation_ratio']
    dataset = info['used_memory_dataset']
    overhead = info['used_memory_overhead']
    
    if fragmentation > 1.5:
        alert("High fragmentation detected!")
    
    if info['used_memory'] > info['maxmemory'] * 0.9:
        alert("Memory usage critical!")
    
    return {
        'used': used_memory,
        'fragmentation': fragmentation,
        'dataset_ratio': dataset / info['used_memory']
    }
```

## 메모리 최적화 체크리스트

```
□ 적절한 데이터 구조 선택
  - Hash for objects
  - Bitmap for boolean
  - HyperLogLog for counting

□ 인코딩 최적화
  - Ziplist 임계값 조정
  - 작은 집계 유지

□ 키 이름 최소화
  - 짧은 약어 사용
  - ID 기반 참조

□ TTL 설정
  - 임시 데이터는 만료 설정
  - 캐시는 자동 삭제

□ 압축 활용
  - 큰 문자열은 압축
  - JSON → MessagePack

□ 메모리 정책 설정
  - maxmemory 설정
  - 적절한 eviction 정책

□ 모니터링
  - 단편화 비율 체크
  - 큰 키 정기 점검
```

## 정리

Redis 메모리 최적화는 "적은 것으로 많은 것을 하는" 예술입니다. 

적절한 데이터 구조 선택, 인코딩 최적화, 압축 기법을 통해 같은 메모리로 10배 더 많은 데이터를 저장할 수 있습니다.

마치 정리 전문가가 작은 공간에 많은 물건을 효율적으로 수납하는 것처럼, Redis도 메모리를 최대한 효율적으로 활용할 수 있습니다.

"메모리는 비싸지만, 최적화는 무료입니다!"