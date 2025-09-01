# Kafka의 Exactly-Once Semantics: 완벽한 메시지 전달 보장

## 왜 Exactly-Once가 필요했을까?

### 기존 메시징 시스템의 한계

여러분이 은행 시스템을 운영한다고 상상해보세요. 고객이 100만원을 이체했는데, 네트워크 문제로 이 메시지가 두 번 처리되어 200만원이 이체된다면? 또는 메시지가 유실되어 이체가 아예 안 된다면? 이런 문제들이 바로 메시징 시스템이 해결해야 할 핵심 과제였습니다.

```
전통적인 메시지 전달 보장 수준:

1. At-Most-Once (최대 한 번)
   - 메시지가 0번 또는 1번 전달
   - 빠르지만 데이터 유실 가능
   - "보내고 잊어버리기" 방식

2. At-Least-Once (최소 한 번)  
   - 메시지가 1번 이상 전달
   - 데이터 유실은 없지만 중복 가능
   - 재시도 메커니즘 사용

3. Exactly-Once (정확히 한 번) ← Kafka가 구현한 것
   - 메시지가 정확히 1번만 전달
   - 데이터 유실도, 중복도 없음
   - 가장 이상적이지만 구현이 어려움
```

## Kafka의 Exactly-Once는 어떻게 동작하나?

### 1. Idempotent Producer (멱등성 프로듀서)

Kafka는 각 메시지에 고유한 ID를 부여하여 중복을 방지합니다.

```java
// 멱등성 프로듀서 설정
Properties props = new Properties();
props.put("enable.idempotence", "true");  // 멱등성 활성화

// 내부적으로 이렇게 동작합니다:
// 1. Producer ID (PID) 할당
// 2. 각 메시지에 Sequence Number 부여
// 3. Broker가 중복 감지 및 제거
```

**동작 원리 상세 설명:**

```
Producer → Broker 메시지 전송 과정:

1단계: Producer 초기화
   Producer → "나 Producer야, ID 좀 줘" → Broker
   Broker → "너의 ID는 PID-123이야" → Producer

2단계: 메시지 전송
   Producer → Message(PID=123, SeqNum=1, Data="첫번째") → Broker
   Broker → "SeqNum=1 처음 보네, 저장!" → ACK

3단계: 네트워크 문제로 재전송 발생
   Producer → Message(PID=123, SeqNum=1, Data="첫번째") → Broker
   Broker → "SeqNum=1 이미 있네, 무시!" → ACK (중복 제거)

4단계: 다음 메시지 전송
   Producer → Message(PID=123, SeqNum=2, Data="두번째") → Broker
   Broker → "SeqNum=2 새로운 거네, 저장!" → ACK
```

### 2. Transactional Producer (트랜잭션 프로듀서)

여러 파티션에 걸친 원자적 쓰기를 보장합니다.

```java
// 트랜잭션 프로듀서 예제
producer.initTransactions();

try {
    producer.beginTransaction();
    
    // 여러 메시지를 하나의 트랜잭션으로 묶음
    producer.send(new ProducerRecord<>("account", "user1", "-100만원"));
    producer.send(new ProducerRecord<>("account", "user2", "+100만원"));
    
    producer.commitTransaction();  // 모두 성공하거나 모두 실패
} catch (Exception e) {
    producer.abortTransaction();  // 롤백
}
```

**트랜잭션 메커니즘 상세:**

```
트랜잭션 코디네이터의 역할:

1. 트랜잭션 시작
   Producer → "거래 시작할게 (TxnID=T1)" → Transaction Coordinator
   Coordinator → Transaction Log에 "T1 시작" 기록

2. 메시지 전송
   Producer → Partition 1: "A계좌 -100만원"
   Producer → Partition 2: "B계좌 +100만원"
   
3. 커밋 준비
   Producer → "커밋 준비됐어" → Coordinator
   Coordinator → 모든 파티션에 "T1 준비 완료" 마커 전송

4. 커밋 완료
   Coordinator → Transaction Log에 "T1 커밋" 기록
   Coordinator → 모든 파티션에 "T1 커밋" 마커 전송
   
5. Consumer 읽기
   Consumer는 커밋된 트랜잭션의 메시지만 읽음
```

### 3. Transactional Consumer (트랜잭션 컨슈머)

커밋된 메시지만 읽어서 일관성을 보장합니다.

```java
// 트랜잭션 격리 수준 설정
Properties props = new Properties();
props.put("isolation.level", "read_committed");  // 커밋된 것만 읽기

// read_uncommitted: 모든 메시지 읽기 (기본값)
// read_committed: 커밋된 트랜잭션의 메시지만 읽기
```

## 실제 사용 사례와 이점

### 금융 거래 시스템
```
사용자 A → 100만원 이체 → 사용자 B

Exactly-Once 없이:
- 중복 전송 → 200만원 이체 (재앙!)
- 메시지 유실 → 이체 실패 (고객 불만!)

Exactly-Once 사용:
- 네트워크 문제가 있어도 정확히 100만원만 이체
- 시스템 장애 시에도 데이터 일관성 보장
```

### 재고 관리 시스템
```
주문 처리 → 재고 차감 → 배송 시작

트랜잭션으로 묶어서:
- 재고가 부족하면 전체 주문 취소
- 배송 시작 실패 시 재고 롤백
- 모든 단계가 성공해야만 완료
```

## 성능 트레이드오프

Exactly-Once는 완벽하지만 비용이 있습니다:

```
성능 영향:
┌─────────────────┬──────────────┬──────────────┐
│    설정         │   처리량     │    지연시간   │
├─────────────────┼──────────────┼──────────────┤
│ At-Most-Once    │    100%      │     1ms      │
│ At-Least-Once   │     95%      │     2ms      │
│ Exactly-Once    │     85%      │     5ms      │
└─────────────────┴──────────────┴──────────────┘

추가 오버헤드:
- Producer ID 관리
- Sequence Number 추적
- 트랜잭션 로그 유지
- 추가 네트워크 왕복
```

## 언제 사용해야 할까?

### Exactly-Once가 필수인 경우:
- 금융 거래, 결제 시스템
- 재고 관리, 주문 처리
- 청구서 발행, 과금 시스템
- 규정 준수가 필요한 시스템

### At-Least-Once로 충분한 경우:
- 로그 수집, 모니터링
- 사용자 활동 추적
- 캐시 무효화
- 알림 발송 (중복 허용)

## 구현 시 주의사항

```java
// 완전한 Exactly-Once 설정
Properties props = new Properties();

// Producer 설정
props.put("enable.idempotence", "true");
props.put("transactional.id", "my-transactional-id");
props.put("acks", "all");  // 모든 복제본 확인

// Consumer 설정
props.put("isolation.level", "read_committed");
props.put("enable.auto.commit", "false");  // 수동 커밋

// 처리 로직
producer.initTransactions();
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(100);
    
    producer.beginTransaction();
    try {
        for (ConsumerRecord<String, String> record : records) {
            // 메시지 처리 및 결과 전송
            String result = processRecord(record);
            producer.send(new ProducerRecord<>("output", result));
        }
        
        // 오프셋 커밋도 트랜잭션에 포함
        producer.sendOffsetsToTransaction(
            getOffsetsToCommit(records), 
            "my-consumer-group"
        );
        
        producer.commitTransaction();
    } catch (Exception e) {
        producer.abortTransaction();
        // 에러 처리
    }
}
```

## 정리

Kafka의 Exactly-Once Semantics는 분산 시스템에서 가장 어려운 문제 중 하나를 해결했습니다. 멱등성 프로듀서와 트랜잭션을 통해 데이터의 정확성과 일관성을 보장하면서도, 실용적인 성능을 제공합니다.

이는 마치 은행 거래에서 이중 장부를 작성하고, 모든 거래를 검증하는 것과 같습니다. 약간의 성능 비용이 있지만, 데이터의 정확성이 중요한 시스템에서는 필수적인 기능입니다.

"느려도 정확한 것이, 빠르지만 틀린 것보다 낫다" - 이것이 Exactly-Once의 철학입니다.