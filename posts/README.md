# 🚀 Andrew Study

개발 관련 공부를 클로드 코드와 함께 하면서 정리하는 통합 학습 레포지토리입니다.

## 📚 학습 목표

이 레포지토리는 다양한 개발 기술과 개념을 체계적으로 학습하고 정리하기 위해 만들어졌습니다. 주언어로 사용하고 있는 Go 언어뿐만 아니라 Kafka, Redis, Pipeline, Architecture, Design Pattern, Database 등 다양한 주제를 통합적으로 다루며, 클로드 코드와의 협업을 통해 더욱 효율적이고 체계적인 학습을 진행합니다.

## 📝 학습 노트 작성 규칙

### 🎯 작성 목표
- **개념 중심 학습**: 코드 구현보다는 기술의 본질과 원리를 이해하는 것에 중점
- **강의 형태**: 마치 강사가 학생에게 설명하는 듯한 친근하고 이해하기 쉬운 톤
- **체계적 구조**: intro → advanced 순서로 점진적 심화 학습

### 📁 디렉토리 구조
```
posts/
├── [주제명]/
│   ├── intro.md          # 전체 개요 및 기본 개념
│   └── advanced/
│       ├── 01-[핵심특징1].md
│       ├── 02-[핵심특징2].md
│       └── ...
```

### 📖 intro.md 작성 가이드
**목적**: 해당 기술의 전체적인 그림을 그려주는 입문서

**필수 포함 내용**:
1. **기술의 등장 배경**: 왜 이 기술이 필요했는가?
2. **핵심 개념**: 이 기술이 무엇인지 간단명료하게
3. **주요 특징**: 3-5개의 핵심 특징을 요약
4. **사용 사례**: 언제, 어디서 사용되는가?
5. **다른 기술과의 차이점**: 유사한 기술과 비교
6. **학습 로드맵**: advanced 주제들과의 연결고리

**작성 톤**:
- "안녕하세요! 오늘은 [기술명]에 대해 알아보겠습니다"
- "이 기술이 왜 등장했을까요?"
- "쉽게 말해서 [기술명]은..."

### 🔬 advanced/[번호]-[주제].md 작성 가이드
**목적**: 특정 특징이나 개념을 깊이 있게 파헤치는 심화 학습

**필수 포함 내용**:
1. **문제 상황**: 이 특징이 해결하려는 문제는?
2. **해결 방법**: 어떻게 이 문제를 해결하는가?
3. **동작 원리**: 내부적으로 어떻게 작동하는가?
4. **구체적 예시**: 실제 사용 사례나 시나리오
5. **장단점**: 이 특징의 이점과 한계
6. **실무 적용**: 실제 프로젝트에서 어떻게 활용하는가?

**작성 톤**:
- "이번에는 [기술명]의 [특징명]에 대해 자세히 살펴보겠습니다"
- "왜 이런 방식으로 설계되었을까요?"
- "실제로는 이렇게 동작합니다..."

### 🎨 작성 스타일 가이드
- **친근한 톤**: "~입니다", "~해요" 보다는 "~입니다", "~합니다" 사용
- **구체적 예시**: 추상적 설명보다는 구체적인 시나리오 제시
- **단계별 설명**: 복잡한 개념은 단계별로 나누어 설명
- **시각적 요소**: 다이어그램, 표, 코드 블록 적극 활용
- **연결성**: 다른 개념과의 연관성 언급

### 📋 체크리스트
- [ ] 기술의 등장 배경이 명확히 설명되었는가?
- [ ] 핵심 개념이 이해하기 쉽게 정리되었는가?
- [ ] 구체적인 예시나 시나리오가 포함되었는가?
- [ ] 다른 기술과의 차이점이 명확한가?
- [ ] 실무 적용 사례가 언급되었는가?
- [ ] 다음 학습 주제로의 연결고리가 있는가?

## 🤖 AI 학습 포스트 생성 가이드

### 📝 주제별 생성 예시

#### 예시 1: "Redis" 주제로 포스트 생성 요청 시
**AI가 생성해야 할 내용**:
- `intro.md`: Redis의 등장 배경, 메모리 기반 저장소의 필요성, 주요 특징 (속도, 데이터 타입, 영속성)
- `advanced/01-redis-persistence.md`: RDB vs AOF, 백그라운드 저장 방식
- `advanced/02-redis-cluster.md`: 샤딩, 복제, 고가용성
- `advanced/03-redis-pubsub-stream.md`: 실시간 메시징, 스트림 처리

#### 예시 2: "Kafka" 주제로 포스트 생성 요청 시
**AI가 생성해야 할 내용**:
- `intro.md`: 대용량 메시지 처리의 필요성, 이벤트 스트리밍 플랫폼의 개념
- `advanced/01-kafka-concept.md`: 브로커, 토픽, 파티션의 기본 구조
- `advanced/02-kafka-partitioning-advanced.md`: 파티션 전략, 순서 보장
- `advanced/03-kafka-replication-advanced.md`: 리더-팔로워 복제, ISR

### 🎯 AI 생성 시 고려사항

#### 1. 기술 선택 기준
- **실무 중요도**: 실제 프로젝트에서 자주 사용되는 기술 우선
- **학습 난이도**: 기초 → 중급 → 고급 순서로 구성
- **상호 연관성**: 다른 기술과의 연관성이 높은 기술 우선

#### 2. 내용 구성 원칙
- **문제 중심 접근**: "왜 이 기술이 필요한가?"부터 시작
- **점진적 심화**: intro에서 전체 그림 → advanced에서 세부 특징
- **실무 연결**: 이론과 실제 사용 사례의 연결

#### 3. 작성 톤 유지
- **친근함**: "여러분도 한 번쯤 경험해보셨을..." 같은 공감대 형성
- **명확함**: 전문 용어는 쉬운 말로 풀어서 설명
- **구체성**: "빠르다"보다는 "메모리 접근으로 마이크초 단위 응답"

### 📚 주제별 생성 템플릿

#### 데이터베이스/스토리지 계열
```
주제: [기술명]
intro.md: 
- 전통적 저장소의 한계 → 새로운 저장소의 필요성
- 핵심 특징 (성능, 확장성, 일관성 등)
- 주요 사용 사례

advanced/:
- 01-[핵심특징1]: 성능 최적화 관련
- 02-[핵심특징2]: 확장성/분산 관련  
- 03-[핵심특징3]: 데이터 일관성 관련
```

#### 메시징/스트리밍 계열
```
주제: [기술명]
intro.md:
- 동기식 처리의 한계 → 비동기/스트리밍의 필요성
- 이벤트 기반 아키텍처의 개념
- 주요 특징 (처리량, 지연시간, 신뢰성)

advanced/:
- 01-[핵심특징1]: 메시지 전달 보장
- 02-[핵심특징2]: 파티셔닝/샤딩
- 03-[핵심특징3]: 스트림 처리
```

#### 아키텍처/설계 계열
```
주제: [기술명]
intro.md:
- 기존 아키텍처의 문제점 → 새로운 패턴의 필요성
- 핵심 설계 원칙
- 적용 시나리오

advanced/:
- 01-[핵심특징1]: 구조적 특징
- 02-[핵심특징2]: 동작 원리
- 03-[핵심특징3]: 실무 적용
```

### 💡 AI 프롬프트 예시

#### 기본 프롬프트 템플릿
```
"[기술명]에 대한 학습 포스트를 생성해주세요. 

요구사항:
1. intro.md: 전체 개요와 기본 개념
2. advanced/ 폴더에 3-5개의 심화 주제
3. 강의 형태의 친근한 톤으로 작성
4. 개념 중심, 코드보다는 원리와 특징 설명
5. 실무 적용 사례 포함

기존 posts/ 폴더 구조를 참고하여 일관성 있게 작성해주세요."
```

#### 구체적 프롬프트 예시
```
"Redis에 대한 학습 포스트를 생성해주세요.

Redis는 메모리 기반 NoSQL 데이터베이스로, 캐싱과 실시간 데이터 처리에 특화되어 있습니다.

다음과 같은 구조로 작성해주세요:
- intro.md: Redis의 등장 배경, 메모리 기반 저장소의 장점, 주요 특징
- advanced/01-redis-persistence.md: RDB와 AOF 영속성 방식
- advanced/02-redis-cluster.md: 클러스터링과 고가용성
- advanced/03-redis-pubsub-stream.md: Pub/Sub과 Stream 기능

각 파일은 강의 형태로 작성하고, 왜 이런 기능이 필요했는지, 어떻게 동작하는지, 어떤 장점이 있는지 설명해주세요."
```

### 🎯 품질 보장 체크포인트

#### AI 생성 후 확인사항
1. **구조 일관성**: 기존 posts/ 폴더의 구조와 일치하는가?
2. **내용 완성도**: intro.md에 6가지 필수 요소가 모두 포함되었는가?
3. **톤 일관성**: 친근하고 이해하기 쉬운 강의 톤을 유지하는가?
4. **연결성**: intro → advanced로 자연스럽게 연결되는가?
5. **실무성**: 실제 프로젝트에서 활용할 수 있는 내용인가?

#### 수정이 필요한 경우
- 너무 기술적이고 딱딱한 설명 → 더 친근하고 구체적인 예시로 변경
- 코드 중심 설명 → 개념과 원리 중심으로 변경  
- 단편적 정보 → 체계적이고 연결된 설명으로 변경
- 추상적 설명 → 구체적 시나리오와 예시로 변경
...

## 🗂️ 현재 학습 구조

### 🐹 Go 언어 학습 (완료)
- **intro.md**: Go 언어의 등장 배경과 핵심 특징
- **고급 주제 (Advanced)**
  - 01-work-stealing.md: 워크 스틸링 스케줄러
  - 02-garbage-collector.md: 가비지 컬렉터 동작 원리
  - 03-channels.md: 채널의 내부 구조와 동작
  - 04-memory-management.md: 메모리 관리 전략
  - 05-context-api.md: Context API와 취소 패턴
  - 06-concurrency-patterns.md: 동시성 패턴과 모범 사례
  - 07-compiler-runtime-internals.md: 컴파일러와 런타임 내부
  - 08-performance-profiling.md: 성능 프로파일링
  - 09-fx-dependency-injection.md: 의존성 주입 프레임워크
- **go-source-analysis-guide.md**: Go 소스코드 분석 가이드

### 🔴 Redis 학습 (완료)
- **intro.md**: Redis의 등장 배경과 핵심 특징
- **고급 주제 (Advanced)**
  - 01-redis-persistence.md: RDB와 AOF 영속성
  - 02-redis-cluster.md: 클러스터링과 고가용성
  - 03-redis-pubsub-stream.md: Pub/Sub과 Stream
  - 04-redis-memory-optimization.md: 메모리 최적화
  - 05-redis-transaction-script.md: 트랜잭션과 Lua 스크립트
  - 06-redis-performance-tuning.md: 성능 튜닝

### 🚀 Kafka 학습 (완료)
- **intro.md**: 대용량 메시지 처리와 이벤트 스트리밍
- **고급 주제 (Advanced)**
  - 01-kafka-intro.md: 브로커, 토픽, 파티션 기본 구조
  - 02-kafka-partitioning-advanced.md: 파티셔닝 전략과 순서 보장
  - 03-kafka-replication-advanced.md: 리더-팔로워 복제와 ISR
  - 04-kafka-consumer-group-advanced.md: 컨슈머 그룹과 오프셋 관리
  - 05-kafka-exactly-once-semantics.md: 정확히 한 번 전달 보장
  - 06-kafka-stream-processing.md: 스트림 처리와 KStreams

### 🎨 Design Pattern 학습 (완료)
- **intro.md**: 디자인 패턴의 필요성과 분류
- **고급 주제 (Advanced)**
  - 01-singleton-pattern.md: 싱글톤 패턴
  - 02-factory-pattern.md: 팩토리 패턴
  - 03-observer-pattern.md: 옵저버 패턴
  - 04-strategy-pattern.md: 전략 패턴
  - 05-decorator-pattern.md: 데코레이터 패턴
  - 06-adapter-pattern.md: 어댑터 패턴

### 🌐 Frontend 학습 (진행 중)
- **intro.md**: 모던 프론트엔드 개발 개요
- **고급 주제 (Advanced)**
  - 1.modern-javascript.md: 모던 자바스크립트
  - 2.dev-environment.md: 개발 환경 구축
  - 3.react-fundamentals.md: React 기초
  - 4.react-hooks-master.md: React Hooks 마스터
  - 5.modern-state-management.md: 모던 상태 관리
- **concept.md**: 프론트엔드 핵심 개념

## 🚀 향후 학습 계획

### 🏗️ 아키텍처 & 설계 (우선순위: 높음)
- **Architecture**: 마이크로서비스, 이벤트 주도 설계, CQRS, 헥사고날 아키텍처
- **System Design**: 확장 가능한 시스템 설계, 성능 최적화, 로드 밸런싱
- **Clean Architecture**: 클린 아키텍처, DDD (Domain Driven Design)

### 🗄️ 데이터베이스 & 스토리지 (우선순위: 높음)
- **PostgreSQL**: 고급 쿼리, 인덱싱, 파티셔닝, 복제
- **MongoDB**: 문서 기반 NoSQL, 샤딩, 집계 파이프라인
- **Elasticsearch**: 검색 엔진, 로그 분석, 실시간 분석

### 📊 데이터 처리 & 파이프라인 (우선순위: 중간)
- **Apache Spark**: 빅데이터 처리, 스트림 처리, 머신러닝
- **Apache Airflow**: 워크플로우 오케스트레이션, ETL/ELT
- **Apache Flink**: 실시간 스트림 처리, 이벤트 타임

### 🔧 DevOps & 인프라 (우선순위: 중간)
- **Docker**: 컨테이너화, 이미지 최적화, 멀티스테이지 빌드
- **Kubernetes**: 오케스트레이션, 서비스 메시, 헬름
- **Terraform**: 인프라 as 코드, 멀티 클라우드 관리

### 🌐 웹 & API (우선순위: 중간)
- **gRPC**: 고성능 RPC, 프로토콜 버퍼, 스트리밍
- **GraphQL**: 쿼리 언어, 스키마 설계, 성능 최적화
- **WebSocket**: 실시간 통신, 채팅 시스템, 게임 서버

### 🔍 모니터링 & 관찰성 (우선순위: 중간)
- **Prometheus**: 메트릭 수집, 알림, 서비스 디스커버리
- **Grafana**: 대시보드, 시각화, 알림 관리
- **Jaeger**: 분산 추적, 마이크로서비스 디버깅

### 🧪 테스팅 & 품질 (우선순위: 낮음)
- **Testing Strategies**: 단위/통합/E2E 테스트 전략
- **Test Automation**: 자동화 도구, CI/CD 통합
- **Code Quality**: 정적 분석, 코드 리뷰, 메트릭

### 🔐 보안 (우선순위: 낮음)
- **Application Security**: OWASP, 인증/인가, JWT
- **Infrastructure Security**: 네트워크 보안, 시크릿 관리
- **Data Security**: 암호화, 개인정보보호, 규정 준수

## 🎯 추천 추가 주제 (우선순위별)

### 🔥 즉시 추가 추천 (높은 실무 가치)
1. **PostgreSQL** - 가장 널리 사용되는 관계형 DB, 고급 기능들
2. **Docker** - 컨테이너화의 기본, 모든 개발자가 알아야 할 기술
3. **System Design** - 대규모 시스템 설계, 면접에서 자주 나오는 주제
4. **gRPC** - 마이크로서비스 간 통신의 표준, Go와 잘 맞음

### ⭐ 단기 추가 추천 (중간 실무 가치)
5. **Kubernetes** - 컨테이너 오케스트레이션의 표준
6. **MongoDB** - NoSQL의 대표주자, 문서 기반 데이터베이스
7. **Prometheus** - 모니터링의 표준, 메트릭 수집과 알림
8. **GraphQL** - API 설계의 새로운 패러다임

### 📚 장기 추가 추천 (전문성 향상)
9. **Apache Spark** - 빅데이터 처리의 핵심 기술
10. **Elasticsearch** - 검색 엔진, 로그 분석의 필수 도구
11. **Terraform** - 인프라 as 코드, 클라우드 관리
12. **Jaeger** - 분산 추적, 마이크로서비스 디버깅

### 🎨 특화 주제 (관심사별)
13. **Apache Airflow** - 데이터 파이프라인 오케스트레이션
14. **Apache Flink** - 실시간 스트림 처리
15. **Clean Architecture** - 코드 구조와 설계 원칙
16. **DDD (Domain Driven Design)** - 도메인 중심 설계

### 💡 학습 순서 제안
```
1단계: PostgreSQL → Docker → System Design
2단계: gRPC → Kubernetes → MongoDB  
3단계: Prometheus → GraphQL → Apache Spark
4단계: Elasticsearch → Terraform → Jaeger
```

## 🤝 기여하기

이 레포지토리는 개인 학습 목적으로 만들어졌지만, 학습 내용에 대한 피드백이나 제안은 언제든 환영합니다.

---

**Happy Coding! 🎉**

*이 레포지토리는 지속적으로 업데이트되며, 새로운 학습 내용이 추가될 예정입니다.*
