# Kafka Advanced: Consumer Group - 완벽한 팀워크의 비밀

## 🎬 들어가며: Spotify의 도전

2018년, Spotify 엔지니어링 팀.

**"3억 명의 사용자가 동시에 음악을 들어요!"**
**"각 재생마다 추천 알고리즘을 돌려야 해요!"**
**"한 서버로는 불가능합니다..."**

해결책은?
**"100대의 서버가 완벽하게 협력하면 됩니다!"**

이것이 바로 **Consumer Group**의 힘입니다.

## 📚 Chapter 1: 혼자서는 한계가 있다

### 단일 Consumer의 문제

레스토랑 주방을 상상해보세요:

```
혼자 일하는 요리사:
주문1 → 요리 (5분)
주문2 → 대기... → 요리 (5분)
주문3 → 대기... → 대기... → 요리 (5분)

결과: 3번째 손님은 15분 대기! 😤
```

### Consumer Group의 해결책

```
3명의 요리사 팀:
주문1 → 요리사A (5분)
주문2 → 요리사B (5분) (동시에!)
주문3 → 요리사C (5분) (동시에!)

결과: 모든 손님 5분만 대기! 😊
```

## 📚 Chapter 2: Consumer Group 작동 원리

### 기본 구조

```
Topic: order-events (3개 파티션)

Consumer Group: order-processors
├── Consumer-1 → Partition 0
├── Consumer-2 → Partition 1
└── Consumer-3 → Partition 2
```

**핵심 규칙:**
1. **하나의 파티션은 그룹 내 하나의 Consumer만 읽음**
2. **하나의 Consumer는 여러 파티션을 읽을 수 있음**
3. **Group ID가 같으면 같은 팀**

### 실제 동작 예시

```yaml
# Consumer 설정
group.id: "payment-processors"
```

```
상황 1: Consumer 3개, Partition 3개 (완벽한 균형)
C1 → P0
C2 → P1
C3 → P2

상황 2: Consumer 2개, Partition 3개 (한 명이 더 일함)
C1 → P0, P1
C2 → P2

상황 3: Consumer 4개, Partition 3개 (한 명은 놀고 있음)
C1 → P0
C2 → P1
C3 → P2
C4 → (대기 중)
```

## 📚 Chapter 3: Group Coordinator - 팀의 감독관

### Coordinator의 역할

축구팀 감독을 생각해보세요:
- 선수 배치 결정
- 부상 선수 교체
- 전술 변경 지시

**Kafka의 Group Coordinator도 마찬가지:**

```
Group Coordinator (Broker 중 하나)
├── Consumer 할당 관리
├── 하트비트 모니터링
├── 리밸런싱 조율
└── 오프셋 관리
```

### Join Group Protocol

새로운 Consumer가 참가할 때:

```
1. Consumer → Coordinator: "참가하고 싶어요!"
2. Coordinator: "잠깐, 리밸런싱 시작!"
3. 모든 Consumer: "현재 상태 보고"
4. Coordinator: "새로운 할당 계획"
5. 모든 Consumer: "새 파티션으로 이동!"
```

## 📚 Chapter 4: 리밸런싱 - 팀 재편성

### 리밸런싱이 발생하는 경우

1. **새 멤버 참가**
```
Before: C1→P0,P1  C2→P2,P3
After:  C1→P0  C2→P1  C3→P2  C4→P3
```

2. **멤버 탈퇴/장애**
```
Before: C1→P0  C2→P1  C3(죽음)→P2
After:  C1→P0,P2  C2→P1
```

3. **파티션 변경**
```
파티션 추가: 4개 → 6개
리밸런싱 필요!
```

### 리밸런싱 전략

#### 1. Range Assignor (기본값)

```
파티션을 범위로 나누기:

Topics: T1(P0,P1,P2), T2(P0,P1,P2)
Consumers: C1, C2

결과:
C1: T1-P0, T1-P1, T2-P0, T2-P1
C2: T1-P2, T2-P2
```

**특징:** 
- 간단하지만 불균형 가능
- 같은 키 데이터가 같은 Consumer로

#### 2. Round Robin Assignor

```
돌아가면서 하나씩:

파티션 목록: T1-P0, T1-P1, T1-P2, T2-P0, T2-P1
Consumers: C1, C2

결과:
C1: T1-P0, T1-P2, T2-P1
C2: T1-P1, T2-P0
```

**특징:**
- 균등 분배
- 토픽 간 교차 할당

#### 3. Sticky Assignor

```
기존 할당 최대한 유지:

변경 전: C1→P0,P1  C2→P2,P3
C3 추가 후: C1→P0,P1  C2→P2  C3→P3
(P0,P1,P2는 그대로!)
```

**특징:**
- 리밸런싱 비용 최소화
- 캐시 효율성 유지

#### 4. Cooperative Sticky (2.4+)

```
점진적 리밸런싱:

Step 1: C1은 P1만 해제
Step 2: C3가 P1 할당받음
Step 3: 완료!

(이 동안 P0, P2, P3는 계속 처리!)
```

**특징:**
- 중단 시간 최소화
- 점진적 재할당

## 📚 Chapter 5: Offset 관리 - 어디까지 읽었나?

### Offset이란?

책갈피와 같습니다:

```
파티션의 메시지들:
[0] [1] [2] [3] [4] [5] [6] [7] [8]
         ↑
    마지막으로 읽은 위치 (offset=2)
```

### Commit 전략

#### 1. Auto Commit (자동)

```properties
enable.auto.commit = true
auto.commit.interval.ms = 5000
```

```
매 5초마다 자동으로:
"여기까지 읽었어요!" → Kafka
```

**장점:** 간단함
**단점:** 메시지 손실 또는 중복 가능

#### 2. Manual Commit (수동)

```java
// 동기 커밋
consumer.commitSync();

// 비동기 커밋
consumer.commitAsync((offsets, exception) -> {
    if (exception != null) {
        log.error("Commit failed", exception);
    }
});
```

**장점:** 정확한 제어
**단점:** 복잡한 구현

### Offset Reset 정책

```properties
auto.offset.reset = latest  # 또는 earliest, none
```

**새 Consumer Group이 시작할 때:**

```
earliest: 처음부터 모든 메시지 읽기
[0] [1] [2] [3] [4] [5]
 ↑ 여기서 시작

latest: 새로운 메시지만 읽기
[0] [1] [2] [3] [4] [5]
                     ↑ 여기서 시작

none: 오프셋이 없으면 에러
```

## 📚 Chapter 6: 메시지 처리 보장

### At-Most-Once (최대 한 번)

```
1. 메시지 읽기
2. 오프셋 커밋 ← 먼저!
3. 메시지 처리

위험: 처리 실패 시 메시지 손실
```

**사용 사례:** 로그, 메트릭 (손실 허용)

### At-Least-Once (최소 한 번)

```
1. 메시지 읽기
2. 메시지 처리
3. 오프셋 커밋 ← 나중에!

위험: 실패 시 중복 처리
```

**사용 사례:** 대부분의 경우 (멱등성 보장 필요)

### Exactly-Once (정확히 한 번)

```
트랜잭션으로 묶기:
BEGIN
  - 메시지 처리
  - 결과 저장
  - 오프셋 커밋
COMMIT
```

**사용 사례:** 금융 거래, 재고 관리

## 📚 Chapter 7: Consumer Group 실전 패턴

### 1. 브로드캐스트 패턴

각 서비스가 모든 메시지를 받아야 할 때:

```
Topic: user-events

Group: email-service → 모든 메시지
Group: sms-service → 모든 메시지
Group: analytics-service → 모든 메시지

(각 그룹이 독립적으로 전체 메시지 소비)
```

### 2. 작업 큐 패턴

작업을 분산 처리:

```
Topic: image-processing (10 파티션)

Group: image-processors (10 Consumer)
- 각 Consumer가 하나의 파티션 담당
- 병렬로 이미지 처리
```

### 3. 우선순위 처리 패턴

```
VIP 토픽: vip-orders (빠른 처리)
├── Group: vip-processors (10 Consumer)

일반 토픽: normal-orders (일반 처리)
└── Group: normal-processors (3 Consumer)
```

## 📚 Chapter 8: 성능 튜닝

### Consumer 설정 최적화

```properties
# 한 번에 가져올 데이터 크기
fetch.min.bytes = 1024
fetch.max.wait.ms = 500

# 파티션당 가져올 데이터
max.partition.fetch.bytes = 1048576

# 폴링 간격
max.poll.records = 500
max.poll.interval.ms = 300000

# 세션 타임아웃
session.timeout.ms = 10000
heartbeat.interval.ms = 3000
```

### 병렬 처리 최적화

```java
// 단일 스레드 처리 (느림)
for (ConsumerRecord record : records) {
    process(record);  // 5ms
}
// 100개 처리 = 500ms

// 멀티 스레드 처리 (빠름)
ExecutorService executor = Executors.newFixedThreadPool(10);
for (ConsumerRecord record : records) {
    executor.submit(() -> process(record));
}
// 100개 처리 = 50ms (10배 빠름!)
```

## 🎯 모니터링 체크리스트

### 핵심 지표

```yaml
Consumer Lag:
  - 정의: 최신 오프셋 - 현재 오프셋
  - 정상: < 1000
  - 경고: > 10000
  
Rebalance Rate:
  - 정의: 시간당 리밸런싱 횟수
  - 정상: < 1/hour
  - 경고: > 10/hour

Commit Success Rate:
  - 정의: 성공한 커밋 / 전체 커밋
  - 정상: > 99.9%
  - 경고: < 99%
```

## 💭 생각해볼 문제들

1. **Consumer가 파티션보다 많으면 왜 비효율적일까요?**
   - 힌트: 놀고 있는 Consumer의 리소스 낭비

2. **리밸런싱 중에 메시지 중복이 발생할 수 있을까요?**
   - 힌트: 커밋 타이밍과 재할당

3. **Consumer Group 없이 Kafka를 사용할 수 있을까요?**
   - 힌트: Simple Consumer API

## 🚀 핵심 정리

### Consumer Group을 한 문장으로?
> **"여러 Consumer가 완벽하게 협력해서 메시지를 나눠 처리하는 팀워크 시스템"**

### 기억해야 할 황금률
1. **Consumer 수 ≤ 파티션 수** (효율적 처리)
2. **Group ID = 팀 이름** (같은 ID = 같은 팀)
3. **리밸런싱 = 일시 정지** (최소화 필요)

### 베스트 프랙티스
- Sticky Assignor 사용 권장
- 적절한 하트비트 설정
- Consumer Lag 모니터링 필수
- 멱등성 보장 설계

## 🎬 다음 시간 예고

**"Kafka를 더 빠르게 만들 수 없을까요?"**

마지막 시간에는 **성능 최적화**에 대해 알아보겠습니다:
- 프로듀서 배치 최적화
- 압축 알고리즘 선택
- Zero-copy 전송
- 하드웨어 최적화

Consumer Group이 **협업의 효율**을 담당한다면,
성능 최적화는 **극한의 속도**를 추구합니다!

---

*"혼자 가면 빨리 가지만, 함께 가면 멀리 간다. Kafka Consumer Group은 빠르면서도 멀리 가는 방법이다."*