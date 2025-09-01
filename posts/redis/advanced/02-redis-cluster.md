# Redis Cluster: 무한 확장 가능한 분산 시스템 구축하기

## 왜 Redis Cluster가 필요했을까?

### 단일 Redis의 한계

하나의 Redis 서버로는 한계가 명확했습니다.

```
단일 서버의 문제점:

1. 메모리 한계
   서버 RAM: 128GB → 그 이상 데이터는?
   
2. CPU 한계
   단일 스레드 → CPU 1개 코어만 사용
   
3. 장애 위험
   서버 1대 다운 → 전체 서비스 중단
   
4. 네트워크 대역폭
   10Gbps NIC → 그 이상 트래픽은?

해결책: 여러 대로 나누자! → Redis Cluster 탄생
```

## Redis Cluster의 핵심 개념

### 1. Hash Slot (해시 슬롯)

Redis Cluster는 16384개의 슬롯으로 데이터를 분산합니다.

```
Hash Slot 동작 원리:

1. 키를 슬롯 번호로 변환
   Key: "user:1000"
   CRC16("user:1000") % 16384 = 슬롯 번호 (예: 5526)
   
2. 슬롯을 노드에 할당
   Node A: 슬롯 0-5460
   Node B: 슬롯 5461-10922  
   Node C: 슬롯 10923-16383
   
3. 자동 라우팅
   "user:1000" → 슬롯 5526 → Node B로 자동 전달
```

**Hash Tag로 같은 노드에 저장하기:**

```bash
# Hash Tag 사용 - {} 안의 내용으로만 슬롯 계산
SET {user:1000}:profile "Andrew"
SET {user:1000}:settings "theme:dark"
SET {user:1000}:cart "items:5"

# 모두 같은 슬롯 → 같은 노드 → 트랜잭션 가능!
MULTI
GET {user:1000}:profile
GET {user:1000}:settings  
EXEC
```

### 2. Master-Slave 구조

각 마스터는 슬레이브를 가져 고가용성을 보장합니다.

```
클러스터 구조:

Master A (슬롯 0-5460)     ← 복제 → Slave A1, A2
Master B (슬롯 5461-10922)  ← 복제 → Slave B1, B2
Master C (슬롯 10923-16383) ← 복제 → Slave C1, C2

장애 시나리오:
1. Master A 다운
2. 클러스터가 감지 (과반수 투표)
3. Slave A1이 새 Master로 승격
4. 서비스 지속 (자동 페일오버!)
```

### 3. Gossip Protocol

노드들이 서로의 상태를 공유하는 방식입니다.

```
Gossip 통신:

매 초마다:
Node A → "나 살아있어, B도 괜찮아 보여" → Node C
Node B → "나도 살아있어, C가 좀 느려" → Node A  
Node C → "A가 안 보여!" → Node B

정보 전파:
1. 각 노드는 랜덤하게 다른 노드와 통신
2. 클러스터 상태 정보 교환
3. 몇 초 안에 모든 노드가 전체 상태 파악

장점:
✓ 중앙 서버 불필요
✓ 확장성 우수
✓ 부분 장애에 강함
```

## Redis Cluster 구축하기

### 1. 클러스터 생성

```bash
# 6개 노드로 클러스터 생성 (Master 3, Slave 3)
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1

# 결과:
Master[0] → 127.0.0.1:7000 (슬롯 0-5460)
├─ Slave → 127.0.0.1:7003

Master[1] → 127.0.0.1:7001 (슬롯 5461-10922)
├─ Slave → 127.0.0.1:7004

Master[2] → 127.0.0.1:7002 (슬롯 10923-16383)
├─ Slave → 127.0.0.1:7005
```

### 2. 클러스터 설정

```bash
# redis.conf 주요 설정
port 7000
cluster-enabled yes
cluster-config-file nodes-7000.conf
cluster-node-timeout 5000  # 5초 후 노드 실패 판단
cluster-require-full-coverage no  # 일부 슬롯 다운 시에도 서비스

# 추가 보호 설정
cluster-slave-validity-factor 10  # 슬레이브 유효성 검사
cluster-migration-barrier 1  # 최소 슬레이브 수
```

## 클러스터 운영 시나리오

### 1. 노드 추가 (Scale Out)

```bash
# 새 마스터 노드 추가
redis-cli --cluster add-node 127.0.0.1:7006 127.0.0.1:7000

# 슬롯 재분배
redis-cli --cluster reshard 127.0.0.1:7000
How many slots? 4096  # 각 노드에서 1024개씩 가져옴

# 결과:
기존: 3 Masters × 5461 슬롯
이후: 4 Masters × 4096 슬롯
```

**리샤딩 과정 상세:**

```
슬롯 이동 과정:

1. 준비 단계
   Source Node: 슬롯 5000-5100을 Target으로 이동 준비
   Target Node: 슬롯 5000-5100 IMPORTING 상태
   
2. 키 마이그레이션
   For each key in 슬롯 5000-5100:
     MIGRATE target_host target_port key 0 5000
   
3. 슬롯 상태 업데이트
   Cluster: 슬롯 5000-5100 소유자 변경
   모든 노드에 전파
   
4. 클라이언트 리다이렉션
   Client → Old Node → MOVED 5000 target_host:port
   Client → Target Node (직접 연결)
```

### 2. 자동 페일오버

```
Master 장애 감지 및 복구:

1초: Master A 응답 없음
2초: Node B, C가 A 상태 의심
5초: 과반수가 A 실패 동의 → FAIL 상태

6초: Slave A1, A2가 선거 시작
    - A1: "나 offset 1000000이야"
    - A2: "나는 999990이야"
    
7초: A1이 더 최신 → Master 승격
8초: 클러스터 정상화, 서비스 지속

총 다운타임: 약 7-8초
```

### 3. 수동 페일오버

```bash
# 계획된 유지보수를 위한 수동 페일오버
redis-cli -p 7003 CLUSTER FAILOVER

# 옵션:
CLUSTER FAILOVER FORCE    # 강제 페일오버
CLUSTER FAILOVER TAKEOVER # 즉시 인수 (위험!)
```

## 클라이언트 연결 방식

### 1. Cluster-Aware Client

```python
# Python redis-py-cluster 예제
from rediscluster import RedisCluster

startup_nodes = [
    {"host": "127.0.0.1", "port": "7000"},
    {"host": "127.0.0.1", "port": "7001"},
    {"host": "127.0.0.1", "port": "7002"}
]

rc = RedisCluster(startup_nodes=startup_nodes)

# 자동으로 올바른 노드로 라우팅
rc.set("user:1000", "Andrew")  # → Node B
rc.set("product:2000", "Laptop")  # → Node A
```

### 2. MOVED 리다이렉션

```
클라이언트 리다이렉션 과정:

1. 잘못된 노드에 요청
   Client → Node A: GET user:1000
   
2. MOVED 응답
   Node A → Client: MOVED 5526 127.0.0.1:7001
   
3. 올바른 노드로 재요청
   Client → Node B: GET user:1000
   Node B → Client: "Andrew"
   
4. 클라이언트 슬롯 맵 업데이트
   Client Cache: 슬롯 5526 = Node B
```

### 3. ASK 리다이렉션

```
슬롯 마이그레이션 중:

1. 키가 이동 중
   Client → Node A: GET migrating_key
   
2. ASK 응답 (일시적)
   Node A → Client: ASK 5526 127.0.0.1:7001
   
3. ASKING 명령 후 요청
   Client → Node B: ASKING
   Client → Node B: GET migrating_key
   Node B → Client: "value"
```

## 클러스터 모니터링

### 주요 모니터링 명령어

```bash
# 클러스터 상태 확인
redis-cli CLUSTER INFO
cluster_state:ok
cluster_slots_assigned:16384
cluster_known_nodes:6

# 노드 정보
redis-cli CLUSTER NODES
07c3... 127.0.0.1:7000@17000 master - 0-5460
a8d2... 127.0.0.1:7001@17001 master - 5461-10922

# 슬롯 분포
redis-cli --cluster check 127.0.0.1:7000

# 클러스터 통계
redis-cli --cluster info 127.0.0.1:7000
```

## 클러스터 제약사항

### 1. Multi-Key 연산 제한
```bash
# 불가능 (다른 노드에 있을 수 있음)
MGET user:1 user:2 user:3

# 가능 (Hash Tag 사용)
MGET {users}:1 {users}:2 {users}:3
```

### 2. 트랜잭션 제한
```bash
# 같은 슬롯의 키만 트랜잭션 가능
MULTI
SET {user:1}:name "Andrew"
SET {user:1}:age "30"
EXEC
```

### 3. SELECT 데이터베이스 불가
```bash
# 클러스터는 DB 0만 사용
SELECT 1  # 에러!
```

## 실전 운영 팁

### 1. 노드 수 결정
```
최소 구성: 6노드 (Master 3 + Slave 3)
권장 구성: 9노드 (Master 3 + Slave 6)
대규모: 수십~수백 노드

고려사항:
- 노드당 관리 슬롯 수
- 네트워크 오버헤드
- 관리 복잡도
```

### 2. 메모리 계획
```
노드당 메모리 = (전체 데이터 / 마스터 수) × 1.5

예시:
전체 데이터: 300GB
마스터 수: 3
노드당: 100GB × 1.5 = 150GB RAM 필요
```

### 3. 네트워크 구성
```
권장사항:
- 같은 데이터센터 내 배치
- 10Gbps 이상 네트워크
- 전용 네트워크 대역 할당
- 클러스터 버스 포트 (기본: 데이터포트 + 10000) 개방
```

## 정리

Redis Cluster는 "샤딩을 자동화한 분산 시스템"입니다. 16384개의 해시 슬롯으로 데이터를 분산하고, Gossip Protocol로 상태를 공유하며, 자동 페일오버로 고가용성을 보장합니다.

마치 대형 창고를 여러 개의 작은 창고로 나누고, 각 창고마다 백업 창고를 두며, 창고 직원들이 서로 연락하면서 물건을 관리하는 것과 같습니다.

"하나가 아닌 여럿이 함께, 그러나 하나처럼 동작하는 Redis Cluster!"