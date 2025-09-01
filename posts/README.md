# 🚀 Andrew Study

개발 관련 공부를 클로드 코드와 함께 하면서 정리하는 통합 학습 레포지토리입니다.

## 📚 학습 목표

이 레포지토리는 다양한 개발 기술과 개념을 체계적으로 학습하고 정리하기 위해 만들어졌습니다. Go 언어뿐만 아니라 Kafka, Redis, Pipeline, Architecture, Design Pattern, Database 등 다양한 주제를 통합적으로 다루며, 클로드 코드와의 협업을 통해 더욱 효율적이고 체계적인 학습을 진행합니다.

## 📝 학습 노트 작성 규칙

- 각 학습 주제는 독립적인 디렉토리로 구성
- `intro.md`로 개념과 이론 정리
- 아키텍처 다이어그램과 설계 문서 포함
- 명확하고 이해하기 쉬운 주석과 설명 추가
- 실제 프로젝트 적용 사례와 모범 사례 정리
- 코드학습을 하려는게 아니고 개념학습을 심도있게 하려는거야, 그래서 강의 형태로 작성해주면 좋아,
- 누구나 쉽게 이해할수 있는 말을 사용하면서 강의 형태로 . 이기술이 왜 등장했고 어떻게 사용하고 어떤 특징이 있고 . 이특징이 이러이렇게 동작해서 이런장점이 있고 이런
  방식으로 설명해주는 .md 파일들을 만들면 좋겠어, intro는 전체적인 총괄개념을 알려주고 advanced에는 개념중 중요 특징 하나씩 꼽아서 그 특징이 어떻게 왜 만들어졌는지 어떻게 동작하는지 상세하게 알려주면돼
- `advanced/01-xxx.md`
- `advanced/02-xxx.md`
...

## 🗂️ 현재 학습 구조

### 🐹 Go 언어 학습 (현재 진행 중)
- **기초 (Basic)**
  - 변수와 타입
  - 함수
  - 구조체
  - 인터페이스
  - 메서드
- **동시성 (Concurrency)**
  - 고루틴
  - 채널
  - 패턴
- **웹 개발 (Web Development)**
  - HTTP 기초
  - REST API
  - 미들웨어
  - WebSocket
- **데이터베이스 (Database)**
  - SQL 기초
  - GORM
  - Redis
- **테스팅 (Testing)**
  - 단위 테스트
  - 통합 테스트
  - 벤치마크
- **고급 주제 (Advanced)**
  - gRPC
  - 마이크로서비스
  - 배포

### 🎯 프로젝트 실습
- CLI 도구 개발
- 채팅 서버 구현
- API 서버 구축

## 🚀 향후 학습 계획

### 📊 데이터 처리 & 메시징
- **Kafka**: 메시지 브로커, 스트림 처리, 이벤트 기반 아키텍처
- **Pipeline**: 데이터 파이프라인 설계, ETL/ELT 프로세스
- **Redis**: 캐싱, 세션 관리, 실시간 데이터 처리

### 🏗️ 아키텍처 & 설계
- **Architecture**: 마이크로서비스, 이벤트 주도 설계, CQRS
- **Design Pattern**: 생성, 구조, 행동 패턴, 아키텍처 패턴
- **System Design**: 확장 가능한 시스템 설계, 성능 최적화

### 🗄️ 데이터베이스 & 스토리지
- **Database**: 관계형/비관계형 데이터베이스, 분산 데이터베이스
- **Data Modeling**: 데이터 모델링, 정규화, 인덱싱 전략
- **Data Engineering**: 빅데이터 처리, 데이터 웨어하우스

### 🔧 DevOps & 인프라
- **Containerization**: Docker, Kubernetes
- **CI/CD**: 지속적 통합/배포, 자동화
- **Monitoring**: 로깅, 메트릭, 알림 시스템

## 🛠️ 사용 기술

### 🐹 프로그래밍 언어
- **Go**: 주요 개발 언어
- **기타 언어**: 필요에 따라 Python, Java, JavaScript 등 활용

### 🗄️ 데이터베이스 & 스토리지
- **관계형**: PostgreSQL, MySQL
- **NoSQL**: Redis, MongoDB
- **메시징**: Apache Kafka, RabbitMQ

### 🌐 웹 & API
- **프로토콜**: HTTP/HTTPS, WebSocket, gRPC
- **아키텍처**: REST API, GraphQL, 마이크로서비스

### 🏗️ 아키텍처 & 설계
- **패턴**: GoF 디자인 패턴, 아키텍처 패턴
- **원칙**: SOLID, DRY, KISS
- **아키텍처**: 이벤트 주도, CQRS, 헥사고날

### 🔧 DevOps & 인프라
- **컨테이너**: Docker, Kubernetes
- **CI/CD**: GitHub Actions, Jenkins
- **모니터링**: Prometheus, Grafana, ELK Stack

## 📖 학습 방법

1. **개념 학습**: 각 주제별로 이론과 개념을 체계적으로 정리
2. **아키텍처 설계**: 실제 시스템 설계 시나리오와 해결 방안 탐구
3. **정리**: 학습 내용을 마크다운으로 체계적으로 정리하고 문서화

## 🚀 시작하기

```bash
# 레포지토리 클론
git clone https://github.com/your-username/andrew-study.git

# Go 프로젝트 시작 (필요시)
cd golang/basic
go mod init andrew-study

# 테스트 실행
go test ./...

# 다른 언어/기술 스택도 필요에 따라 추가
```

## 🤝 기여하기

이 레포지토리는 개인 학습 목적으로 만들어졌지만, 학습 내용에 대한 피드백이나 제안은 언제든 환영합니다.

---

**Happy Coding! 🎉**

*이 레포지토리는 지속적으로 업데이트되며, 새로운 학습 내용이 추가될 예정입니다.*
