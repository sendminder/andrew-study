# Kafka Advanced: 복제와 고가용성 - 절대 죽지 않는 시스템의 비밀

## 🎬 들어가며: 2017년 AWS S3 대규모 장애

2017년 2월 28일, 수많은 웹사이트가 동시에 다운되었습니다.

**원인?** AWS S3 엔지니어가 디버깅 중 실수로 잘못된 명령어 입력
**결과?** 4시간 동안 수십억 달러 손실

이때 놀라운 일이 벌어졌습니다:
**Kafka를 사용하던 Netflix, Uber는 정상 서비스!**

어떻게 가능했을까요? 바로 **복제(Replication)** 덕분입니다.

## 📚 Chapter 1: 왜 복제가 필요한가?

### 단일 서버의 위험성

상상해보세요. 중요한 서류를 보관하는데:

```
방법 1: 원본 하나만 금고에 보관
위험: 화재, 도난, 손상 시 복구 불가능!

방법 2: 복사본을 여러 곳에 보관
안전: 하나가 없어져도 다른 곳에서 복구!
```

### 실제 시스템에서는?

**복제가 없다면:**
```
Server A [중요 데이터] → 💥 서버 다운
결과: 데이터 손실, 서비스 중단, 고객 이탈
```

**복제가 있다면:**
```
Server A [데이터] → 💥 서버 다운
Server B [복사본] → ✅ 즉시 대체!
Server C [복사본] → ✅ 백업 준비 완료
```

## 📚 Chapter 2: Kafka의 복제 메커니즘

### Leader와 Follower - 대장과 부하들

각 파티션은 **하나의 Leader**와 **여러 Follower**를 가집니다:

```
Partition 0의 복제 구조:

     [Leader - Broker 1]
           ↓ 복제
    ┌──────┴──────┐
[Follower]    [Follower]
 Broker 2      Broker 3
```

**역할 분담:**
- **Leader**: 모든 읽기/쓰기 요청 처리
- **Follower**: Leader의 데이터를 복사만 함
- **대기**: Leader가 죽으면 Follower 중 하나가 새 Leader

### ISR (In-Sync Replicas) - 진짜 살아있는 복제본

**모든 Follower가 같은가? NO!**

```
ISR (동기화된 복제본):
Leader: [A, B, C, D, E] ← 최신
Follower1: [A, B, C, D, E] ← ISR ✅
Follower2: [A, B, C, D, E] ← ISR ✅
Follower3: [A, B] ← ISR 아님 ❌ (뒤처짐)
```

**ISR의 조건:**
1. Leader와의 연결 유지 (replica.lag.time.max.ms 이내)
2. 최신 데이터 동기화 완료
3. 하트비트 정상 전송

## 📚 Chapter 3: 복제 설정 깊이 파기

### Replication Factor - 몇 개나 복사할까?

```
replication.factor = 3
```

**의미:** 원본 포함 총 3개의 복사본

```
원본 데이터: "주문 #1234"

Broker 1: "주문 #1234" (Leader)
Broker 2: "주문 #1234" (Follower)
Broker 3: "주문 #1234" (Follower)
```

### 적절한 Replication Factor 선택

**프로덕션 환경 권장:**
```
일반적인 경우: 3
중요한 금융 데이터: 4-5
개발/테스트: 1-2
```

**계산 공식:**
```
필요 복제 수 = 동시 장애 허용 수 + 1

예: 2대 동시 장애 허용 → 3개 복제 필요
```

### Min In-Sync Replicas - 최소 안전 장치

```
min.insync.replicas = 2
```

**의미:** 최소 2개의 동기화된 복제본 필수

**동작 방식:**
```
상황 1: ISR = 3개 → 쓰기 가능 ✅
상황 2: ISR = 2개 → 쓰기 가능 ✅
상황 3: ISR = 1개 → 쓰기 불가 ❌ (안전 우선!)
```

## 📚 Chapter 4: Acknowledgment (Acks) - 확인의 단계

### Acks=0: 불 지르고 도망가기 🔥

```
Producer → Broker
         ← (확인 안 함)
```

**특징:**
- 최고 속도 (지연 시간 최소)
- 데이터 손실 가능성 높음
- 사용 사례: 로그, 메트릭 (손실 허용)

### Acks=1: Leader만 확인 ✅

```
Producer → Leader → "OK 받았어요!"
         ← 
```

**특징:**
- 적당한 속도
- Leader 장애 시 데이터 손실 가능
- 사용 사례: 일반적인 이벤트 처리

### Acks=all (-1): 모든 ISR 확인 ✅✅✅

```
Producer → Leader → Follower1 → "복제 완료!"
                  → Follower2 → "복제 완료!"
         ← "모두 완료!"
```

**특징:**
- 가장 안전 (데이터 손실 없음)
- 가장 느림
- 사용 사례: 금융 거래, 주문 처리

## 📚 Chapter 5: 장애 시나리오와 대응

### 시나리오 1: Leader 장애

```
초기 상태:
Leader(Broker1): [A, B, C, D]
Follower(Broker2): [A, B, C, D] - ISR
Follower(Broker3): [A, B, C, D] - ISR

Broker1 다운! 💥

자동 복구:
새 Leader(Broker2): [A, B, C, D]
Follower(Broker3): [A, B, C, D]
```

**복구 시간:** 보통 수 초 이내!

### 시나리오 2: 네트워크 파티션

```
상황: 네트워크가 둘로 나뉨

그룹 A: [Leader, Follower1]
--- 네트워크 단절 ---
그룹 B: [Follower2]

결과:
- 그룹 A: 계속 서비스 (ISR 충족)
- 그룹 B: 읽기만 가능
```

### 시나리오 3: 연쇄 장애

```
초기: RF=3, min.insync=2

1. Broker1 다운 → ISR=2 → 서비스 정상 ✅
2. Broker2 다운 → ISR=1 → 쓰기 중단 ❌
3. 관리자 개입 필요!
```

## 📚 Chapter 6: Unclean Leader Election - 위험한 선택

### Clean Leader Election (기본값)

```
ISR = [Broker1(Leader), Broker2]
Broker1 다운 → Broker2가 새 Leader ✅
```

**안전하지만 ISR이 모두 죽으면?**
→ 서비스 중단!

### Unclean Leader Election

```properties
unclean.leader.election.enable = true
```

```
ISR = [] (모두 다운)
Out-of-sync = [Broker3 (오래된 데이터)]

Broker3를 Leader로! (데이터 손실 감수)
```

**트레이드오프:**
- 가용성 ↑ (서비스 유지)
- 일관성 ↓ (데이터 손실)

## 📚 Chapter 7: 실전 복제 전략

### 1. 지역별 복제 (Multi-Region)

```
서울 DC:    [Leader]
부산 DC:    [Follower1]
싱가포르 DC: [Follower2]

장점: 데이터센터 전체 장애 대응
단점: 네트워크 지연
```

### 2. Rack Awareness

```
kafka 설정:
broker.rack = rack1

자동 분산:
Partition0: rack1(L), rack2(F), rack3(F)
Partition1: rack2(L), rack3(F), rack1(F)
```

### 3. 복제 성능 최적화

```properties
# Follower가 Leader를 따라잡는 속도
replica.fetch.max.bytes = 10485760

# 병렬 복제 스레드
num.replica.fetchers = 4

# 복제 우선순위
replica.lag.time.max.ms = 30000
```

## 🎯 실전 팁: 복제 모니터링

### 필수 모니터링 지표

```
1. Under Replicated Partitions
   - 0이어야 정상
   - > 0이면 복제 지연

2. ISR Shrink/Expand Rate
   - 빈번한 변화 = 네트워크 문제

3. Leader Election Rate
   - 높으면 클러스터 불안정

4. Replica Lag
   - 각 Follower의 지연 시간
```

### 알람 설정 기준

```yaml
critical:
  - under_replicated_partitions > 0
  - offline_partitions > 0
  
warning:
  - isr_shrink_rate > 1/min
  - replica_lag > 10000 messages
```

## 💭 생각해볼 문제들

1. **RF=5, min.insync=3일 때, 몇 대까지 장애를 견딜 수 있을까요?**
   - 힌트: 쓰기와 읽기를 구분해서 생각

2. **Acks=all이 항상 최선일까요?**
   - 힌트: 비즈니스 요구사항과 트레이드오프

3. **Leader가 특정 브로커에 몰리면 어떻게 해결할까요?**
   - 힌트: Preferred Leader Election

## 🚀 핵심 정리

### 복제를 한 문장으로?
> **"데이터를 여러 곳에 복사해서 절대 잃지 않게 만드는 기술"**

### 황금 설정 (프로덕션)
```properties
replication.factor = 3
min.insync.replicas = 2
acks = all
unclean.leader.election.enable = false
```

### 기억해야 할 트레이드오프
- **성능 vs 안전성**: Acks 레벨 선택
- **가용성 vs 일관성**: Unclean Election
- **비용 vs 안정성**: Replication Factor

## 🎬 다음 시간 예고

**"여러 명이 동시에 메시지를 처리하면 어떻게 조율하죠?"**

다음 시간에는 **Consumer Group**에 대해 알아보겠습니다:
- 여러 Consumer의 협업
- 파티션 할당 전략
- 리밸런싱의 마법
- Exactly-once 처리

복제가 데이터의 **안전**을 보장한다면,
Consumer Group은 처리의 **효율**을 보장합니다!

---

*"분산 시스템의 두 번째 규칙: 중요한 것은 반드시 여러 개 만들어라. 하지만 너무 많이 만들면 관리가 지옥이 된다."*