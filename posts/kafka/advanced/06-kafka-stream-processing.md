# Kafka Streams: 실시간 스트림 처리의 혁명

## 왜 Kafka Streams가 등장했을까?

### 기존 스트림 처리의 문제점

예전에는 실시간 데이터 처리를 위해 복잡한 아키텍처가 필요했습니다. Kafka로 데이터를 받고, Storm이나 Spark로 처리하고, 다시 Kafka나 데이터베이스에 저장하는... 마치 요리를 하기 위해 여러 주방을 옮겨다니는 것과 같았죠.

```
기존 방식의 복잡성:

Kafka → Spark Cluster → Processing → Kafka/DB
  ↓         ↓              ↓           ↓
설치     별도 관리      복잡한 연동    운영 부담

문제점:
- 여러 시스템 관리 필요
- 복잡한 설정과 연동
- 높은 운영 비용
- 디버깅의 어려움
```

Kafka Streams는 이 모든 것을 단순하게 만들었습니다. "Kafka 안에서 모든 걸 처리하자!"

## Kafka Streams의 핵심 개념

### 1. Stream과 Table의 이중성

Kafka Streams는 데이터를 두 가지 관점으로 봅니다:

```
Stream (KStream): 끝없는 이벤트의 흐름
- 주문 이벤트: 주문1 → 주문2 → 주문3 → ...
- 클릭 이벤트: 클릭A → 클릭B → 클릭C → ...

Table (KTable): 현재 상태의 스냅샷
- 재고 현황: {상품A: 100개, 상품B: 50개}
- 사용자 상태: {user1: 온라인, user2: 오프라인}
```

**Stream-Table 이중성의 마법:**

```java
// Stream은 모든 변경사항을 기록
KStream<String, Order> orders = builder.stream("orders");

// Table은 최신 상태만 유지
KTable<String, Product> products = builder.table("products");

// Stream → Table 변환 (집계)
KTable<String, Long> orderCounts = orders
    .groupByKey()
    .count();  // 각 사용자의 주문 횟수

// Table → Stream 변환 (변경사항 추적)
KStream<String, Long> countChanges = orderCounts.toStream();
```

### 2. Stateful Processing (상태 저장 처리)

실시간 처리에서도 상태를 유지할 수 있습니다!

```java
// 10분 동안의 구매 금액 합계 계산
KStream<String, Purchase> purchases = builder.stream("purchases");

KTable<Windowed<String>, Double> totalSpent = purchases
    .groupByKey()
    .windowedBy(TimeWindows.of(Duration.ofMinutes(10)))
    .aggregate(
        () -> 0.0,  // 초기값
        (key, purchase, total) -> total + purchase.getAmount(),  // 집계 로직
        Materialized.with(Serdes.String(), Serdes.Double())
    );
```

**State Store의 동작 원리:**

```
내부 동작 과정:

1. 로컬 State Store 생성
   Application → RocksDB (내장 DB) 생성
   
2. 데이터 처리 및 저장
   Event 도착 → 처리 → State Store 업데이트
   
3. 장애 복구 (놀라운 부분!)
   State Store → Changelog Topic으로 백업
   장애 발생 → Changelog에서 자동 복구
   
4. 확장성
   파티션 1 → Instance 1 → State Store 1
   파티션 2 → Instance 2 → State Store 2
   (각 인스턴스가 독립적으로 상태 관리)
```

### 3. Time Windows (시간 윈도우)

시간 기반 처리의 다양한 옵션:

```java
// 1. Tumbling Window (겹치지 않는 고정 윈도우)
// [0-5분] [5-10분] [10-15분] ...
.windowedBy(TimeWindows.of(Duration.ofMinutes(5)))

// 2. Hopping Window (겹치는 윈도우)
// [0-5분] [1-6분] [2-7분] ... (1분씩 이동)
.windowedBy(TimeWindows.of(Duration.ofMinutes(5))
    .advanceBy(Duration.ofMinutes(1)))

// 3. Sliding Window (이벤트 기준 윈도우)
// 각 이벤트 주변의 시간 범위
.windowedBy(SlidingWindows.withTimeDifferenceAndGrace(
    Duration.ofMinutes(5), Duration.ofMinutes(1)))

// 4. Session Window (활동 기반 윈도우)
// 5분 동안 활동이 없으면 세션 종료
.windowedBy(SessionWindows.with(Duration.ofMinutes(5)))
```

**실제 사용 예시: 실시간 대시보드**

```java
// 실시간 판매 대시보드
KStream<String, Sale> sales = builder.stream("sales");

// 지난 1시간 동안의 카테고리별 매출
KTable<Windowed<String>, Double> hourlySales = sales
    .selectKey((k, v) -> v.getCategory())
    .groupByKey()
    .windowedBy(TimeWindows.of(Duration.ofHours(1)))
    .aggregate(
        () -> 0.0,
        (key, sale, total) -> total + sale.getAmount(),
        Materialized.<String, Double>as("hourly-sales-store")
            .withKeySerde(Serdes.String())
            .withValueSerde(Serdes.Double())
    );
```

## 강력한 처리 기능들

### 1. Join Operations (조인 연산)

여러 스트림을 결합하여 풍부한 정보 생성:

```java
// Stream-Stream Join: 주문과 결제 매칭
KStream<String, Order> orders = builder.stream("orders");
KStream<String, Payment> payments = builder.stream("payments");

KStream<String, OrderPayment> orderPayments = orders.join(
    payments,
    (order, payment) -> new OrderPayment(order, payment),
    JoinWindows.of(Duration.ofMinutes(5))  // 5분 내에 매칭
);

// Stream-Table Join: 주문에 고객 정보 추가
KTable<String, Customer> customers = builder.table("customers");

KStream<String, EnrichedOrder> enrichedOrders = orders.join(
    customers,
    (order, customer) -> new EnrichedOrder(order, customer)
);
```

### 2. Aggregations (집계 연산)

복잡한 비즈니스 로직 구현:

```java
// 실시간 인기 상품 Top 10
KStream<String, ProductView> views = builder.stream("product-views");

KTable<String, Long> viewCounts = views
    .groupBy((key, view) -> view.getProductId())
    .windowedBy(TimeWindows.of(Duration.ofHours(1)))
    .count();

// Top 10 추출
viewCounts.toStream()
    .groupByKey()
    .aggregate(
        TopTen::new,
        (key, value, topTen) -> topTen.add(key, value),
        (key, value, topTen) -> topTen.remove(key, value)
    );
```

### 3. Branching (분기 처리)

조건에 따른 스트림 분리:

```java
// 주문을 금액에 따라 분류
Map<String, KStream<String, Order>> branches = orders.split()
    .branch(
        (key, order) -> order.getAmount() > 100000,
        Branched.as("high-value")
    )
    .branch(
        (key, order) -> order.getAmount() > 10000,
        Branched.as("medium-value")
    )
    .defaultBranch(Branched.as("low-value"));

// 각 브랜치별 처리
branches.get("high-value").to("high-value-orders");
branches.get("medium-value").to("medium-value-orders");
branches.get("low-value").to("low-value-orders");
```

## Interactive Queries (대화형 쿼리)

State Store를 직접 쿼리할 수 있습니다!

```java
// REST API로 실시간 상태 조회
@GetMapping("/sales/{category}")
public Double getCategorySales(@PathVariable String category) {
    ReadOnlyKeyValueStore<String, Double> store = 
        streams.store("hourly-sales-store", 
            QueryableStoreTypes.keyValueStore());
    
    return store.get(category);
}

// 실시간으로 "전자제품 카테고리의 지난 1시간 매출은?"
// → State Store에서 바로 조회 (DB 불필요!)
```

## 실제 활용 사례

### 1. 실시간 추천 시스템
```
사용자 행동 → Kafka Streams → 추천 생성

처리 로직:
1. 최근 본 상품 추적 (Session Window)
2. 유사 사용자 찾기 (Join)
3. 추천 점수 계산 (Aggregation)
4. Top-N 추천 생성 (Custom Processor)

결과: 밀리초 단위로 개인화된 추천 제공
```

### 2. 사기 탐지 시스템
```
거래 이벤트 → 패턴 분석 → 이상 탐지

처리 로직:
1. 시간당 거래 횟수 계산 (Windowed Count)
2. 평균 거래 금액 추적 (Aggregation)
3. 이상 패턴 감지 (Custom Logic)
4. 실시간 알림 발송

결과: 사기 거래를 실시간으로 차단
```

### 3. IoT 데이터 처리
```
센서 데이터 → 집계 → 알림

처리 로직:
1. 센서별 데이터 그룹화
2. 이동 평균 계산 (Sliding Window)
3. 임계값 초과 감지
4. 알림 및 제어 신호 발송

결과: 실시간 모니터링 및 자동 제어
```

## Kafka Streams의 장점

### 1. 단순함
```java
// 전체 애플리케이션이 이렇게 간단합니다!
public static void main(String[] args) {
    StreamsBuilder builder = new StreamsBuilder();
    
    // 토폴로지 정의
    KStream<String, String> source = builder.stream("input");
    source.mapValues(value -> value.toUpperCase())
          .to("output");
    
    // 실행
    KafkaStreams streams = new KafkaStreams(
        builder.build(), 
        props
    );
    streams.start();
}
```

### 2. 확장성
```
자동 확장:
1 인스턴스 → 10 파티션 처리 (느림)
10 인스턴스 → 각각 1 파티션 처리 (10배 빠름!)

리밸런싱:
- 인스턴스 추가 → 자동으로 작업 분배
- 인스턴스 장애 → 다른 인스턴스가 인수
```

### 3. 내결함성
```
자동 복구 메커니즘:
1. State Store → Changelog Topic 백업
2. 인스턴스 장애 → 다른 인스턴스에서 재시작
3. Changelog에서 상태 복구
4. 처리 재개 (Exactly-Once 보장)
```

## 언제 사용해야 할까?

### Kafka Streams가 적합한 경우:
- 실시간 데이터 변환 및 필터링
- 스트림 조인 및 집계
- 이벤트 기반 애플리케이션
- 마이크로서비스 간 데이터 처리

### 다른 도구를 고려해야 할 경우:
- 복잡한 ML 모델 실행 → Spark/Flink
- 배치 처리 → Spark/Hadoop
- 초고속 처리 (마이크로초) → Custom 솔루션

## 정리

Kafka Streams는 "스트림 처리를 일반 애플리케이션처럼 간단하게" 만들었습니다. 별도의 클러스터 없이, 복잡한 설정 없이, 그저 Java 애플리케이션을 실행하듯이 실시간 스트림 처리를 할 수 있게 된 것이죠.

이는 마치 요리할 때 모든 도구가 한 주방에 있는 것과 같습니다. 재료(데이터)를 받아서, 손질하고(변환), 조리하고(처리), 플레이팅(출력)까지 한 곳에서 모두 해결할 수 있는 것입니다.

"복잡한 것을 단순하게, 그러나 강력하게" - 이것이 Kafka Streams의 철학입니다.