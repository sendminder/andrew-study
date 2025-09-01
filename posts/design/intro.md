# 디자인 패턴: 검증된 소프트웨어 설계의 정석

## 디자인 패턴이란?

디자인 패턴은 소프트웨어 개발에서 자주 발생하는 문제들에 대한 검증된 해결책입니다. 마치 건축에서 사용하는 설계 도면처럼, 개발자들이 공통으로 사용할 수 있는 설계 템플릿입니다.

## 왜 디자인 패턴을 배워야 할까?

### 개발자들의 공통된 고민

```
반복되는 문제들:
- "이 복잡한 객체 생성을 어떻게 깔끔하게 처리하지?"
- "변경사항이 있을 때마다 수십 개 파일을 수정해야 해..."
- "다른 팀 코드를 이해하는데 일주일이 걸려..."
- "비슷한 기능인데 매번 처음부터 다시 구현해야 하나?"

디자인 패턴이 주는 해답:
✓ 검증된 해결책 제공
✓ 공통된 언어로 소통
✓ 유지보수성 향상
✓ 확장 가능한 구조
```

## 디자인 패턴의 분류

### 1. 생성 패턴 (Creational Patterns)
객체 생성 메커니즘을 다루며, 상황에 맞는 객체를 만듭니다.
- Singleton: 단 하나의 인스턴스만
- Factory: 객체 생성 로직 캡슐화
- Builder: 복잡한 객체 단계별 생성
- Prototype: 객체 복제를 통한 생성
- Abstract Factory: 관련 객체들의 팩토리

### 2. 구조 패턴 (Structural Patterns)
클래스나 객체를 조합해 더 큰 구조를 만듭니다.
- Adapter: 호환되지 않는 인터페이스 연결
- Decorator: 기능을 동적으로 추가
- Facade: 복잡한 서브시스템을 단순화
- Proxy: 대리자를 통한 접근 제어
- Composite: 트리 구조로 객체 구성

### 3. 행동 패턴 (Behavioral Patterns)
객체 간의 책임 분배와 알고리즘을 다룹니다.
- Observer: 상태 변화 자동 통지
- Strategy: 알고리즘을 캡슐화하고 교체
- Command: 요청을 객체로 캡슐화
- Iterator: 컬렉션 순회 방법 제공
- Template Method: 알고리즘 구조 정의

## 실제 사용 예시

### 웹 애플리케이션에서
```
- Singleton: 데이터베이스 연결 풀
- Factory: 다양한 결제 수단 처리
- Observer: 실시간 알림 시스템
- Strategy: 가격 정책, 할인 전략
- Decorator: 미들웨어 체인
```

### 게임 개발에서
```
- State: 캐릭터 상태 관리
- Command: 실행 취소/다시 실행
- Prototype: 몬스터 복제
- Composite: 인벤토리 시스템
- Observer: 이벤트 시스템
```

### 시스템 프로그래밍에서
```
- Singleton: 로거, 설정 관리자
- Proxy: 캐시, 보안 검사
- Chain of Responsibility: 에러 처리
- Facade: API 게이트웨이
- Adapter: 레거시 시스템 통합
```

## 학습 로드맵

### 핵심 패턴 (Must Know)
1. [Singleton - 오직 하나뿐인 인스턴스](./advanced/01-singleton-pattern.md)
2. [Factory - 객체 생성의 전문가](./advanced/02-factory-pattern.md)
3. [Observer - 상태 변화를 감지하는 감시자](./advanced/03-observer-pattern.md)
4. [Strategy - 전략을 선택하는 지휘관](./advanced/04-strategy-pattern.md)
5. [Decorator - 기능을 덧붙이는 장식가](./advanced/05-decorator-pattern.md)
6. [Adapter - 호환되지 않는 것을 연결하는 변환기](./advanced/06-adapter-pattern.md)

## 디자인 패턴 학습 시 주의사항

### 올바른 사용
```
✅ 문제를 먼저 이해하고 패턴 적용
✅ 간단한 해결책이 있다면 그것을 선택
✅ 팀원들과 패턴 사용 합의
✅ 패턴의 의도를 정확히 이해
```

### 잘못된 사용
```
❌ 패턴을 위한 패턴 사용
❌ 모든 문제를 패턴으로 해결하려 함
❌ 과도한 추상화
❌ 단순한 문제를 복잡하게 만듦
```

## 패턴 선택 가이드

```
Q: "객체를 하나만 만들고 싶어"
A: Singleton 패턴

Q: "객체 생성이 너무 복잡해"
A: Factory 또는 Builder 패턴

Q: "상태 변화를 여러 곳에 알려야 해"
A: Observer 패턴

Q: "실행 중에 알고리즘을 바꾸고 싶어"
A: Strategy 패턴

Q: "기존 기능에 새 기능을 추가하고 싶어"
A: Decorator 패턴

Q: "호환되지 않는 클래스를 함께 사용하고 싶어"
A: Adapter 패턴
```

## 디자인 패턴의 가치

디자인 패턴은 단순한 코드 템플릿이 아닙니다. 수십 년간 수많은 개발자들이 겪은 문제와 해결책의 집대성입니다. 

"바퀴를 재발명하지 마라" - 이미 검증된 해결책이 있다면, 그것을 활용하는 것이 현명합니다.

디자인 패턴을 마스터하면, 더 읽기 쉽고, 유지보수하기 좋으며, 확장 가능한 코드를 작성할 수 있습니다.