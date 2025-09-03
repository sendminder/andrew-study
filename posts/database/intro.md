# 관계형 데이터베이스: 데이터 관리의 핵심

안녕하세요! 오늘부터 관계형 데이터베이스(RDB)의 깊은 세계로 들어가보겠습니다. 수십 년간 데이터 관리의 중심에 있었던 RDB의 원리와 실무 활용법을 함께 알아볼까요?

## 왜 관계형 데이터베이스인가?

제가 백엔드 개발을 시작했을 때, "왜 굳이 복잡한 RDB를 써야 하지? 그냥 파일에 저장하면 안 되나?"라고 생각했었습니다. 하지만 실무를 경험하면서 RDB가 제공하는 강력한 기능들이 왜 필요한지 깨달았죠.

### 파일 시스템의 한계

```
문제 상황:
- 동시성: 여러 사용자가 동시에 수정하면?
- 일관성: 중간에 프로그램이 죽으면?
- 검색: 100만 개 중에서 특정 데이터를 찾으려면?
- 보안: 특정 데이터만 접근 제한하려면?
- 백업: 실시간으로 서비스하면서 백업하려면?
```

RDB는 이 모든 문제를 해결합니다!

## 관계형 모델의 탄생

1970년 IBM의 에드거 F. 코드(Edgar F. Codd)가 제안한 관계형 모델은 데이터베이스 역사의 혁명이었습니다.

### 핵심 개념

```
테이블 (Table) = 릴레이션 (Relation)
행 (Row) = 튜플 (Tuple)
열 (Column) = 속성 (Attribute)
기본키 (Primary Key) = 고유 식별자
외래키 (Foreign Key) = 관계 연결
```

### 관계의 힘

```sql
-- 분리된 테이블들
Users: id, name, email
Orders: id, user_id, product_id, quantity
Products: id, name, price

-- JOIN으로 연결
SELECT u.name, p.name, o.quantity
FROM Orders o
JOIN Users u ON o.user_id = u.id
JOIN Products p ON o.product_id = p.id

-- 하나의 의미 있는 정보로!
```

## ACID: 신뢰성의 4가지 기둥

RDB의 가장 큰 장점은 ACID 속성입니다.

### Atomicity (원자성)

"All or Nothing" - 전부 성공하거나 전부 실패

```sql
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;  -- 둘 다 성공해야 커밋

-- 중간에 실패하면?
ROLLBACK;  -- 모든 변경사항 취소
```

실무 경험: 결제 시스템에서 원자성이 없다면? 돈은 빠졌는데 상품은 안 왔다는 고객 불만이 쏟아질 겁니다.

### Consistency (일관성)

데이터베이스는 항상 일관된 상태를 유지

```sql
-- 제약 조건으로 일관성 보장
CREATE TABLE accounts (
    id INT PRIMARY KEY,
    balance DECIMAL(10,2) CHECK (balance >= 0),  -- 음수 불가
    email VARCHAR(255) UNIQUE  -- 중복 불가
);

-- 일관성 위반 시도
INSERT INTO accounts (balance) VALUES (-100);  -- 에러!
```

### Isolation (격리성)

동시에 실행되는 트랜잭션들이 서로 영향을 주지 않음

```
트랜잭션 A: 계좌 잔액 읽기 → 1000원
트랜잭션 B: 같은 계좌 잔액 읽기 → 1000원
트랜잭션 A: 100원 출금 → 900원 저장
트랜잭션 B: 200원 출금 → 800원 저장  // 문제! 900원이어야 함

격리 레벨로 해결:
- READ UNCOMMITTED
- READ COMMITTED
- REPEATABLE READ
- SERIALIZABLE
```

### Durability (지속성)

커밋된 트랜잭션은 영구적으로 보존

```
1. 트랜잭션 커밋
2. WAL (Write-Ahead Log)에 기록
3. 정전이 나도 복구 가능!
```

## SQL: 데이터와 대화하는 언어

SQL(Structured Query Language)은 선언적 언어입니다. "어떻게"가 아닌 "무엇을" 원하는지 선언하죠.

### DDL (Data Definition Language)

```sql
-- 테이블 생성
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- 테이블 수정
ALTER TABLE users ADD COLUMN age INT;

-- 테이블 삭제
DROP TABLE users;
```

### DML (Data Manipulation Language)

```sql
-- 삽입
INSERT INTO users (username, email) 
VALUES ('andrew', 'andrew@example.com');

-- 조회
SELECT * FROM users 
WHERE created_at > '2024-01-01'
ORDER BY username;

-- 수정
UPDATE users 
SET email = 'newemail@example.com' 
WHERE id = 1;

-- 삭제
DELETE FROM users 
WHERE inactive = true;
```

### 고급 쿼리

```sql
-- 집계 함수
SELECT 
    DATE(created_at) as date,
    COUNT(*) as user_count
FROM users
GROUP BY DATE(created_at)
HAVING COUNT(*) > 10;

-- 서브쿼리
SELECT * FROM users
WHERE id IN (
    SELECT user_id FROM orders
    WHERE total > 1000
);

-- Window 함수
SELECT 
    username,
    score,
    RANK() OVER (ORDER BY score DESC) as ranking
FROM users;
```

## 정규화: 중복을 제거하는 예술

### 제1정규형 (1NF)

원자값만 포함

```
나쁜 예:
Users: id | name | phones
      1   | John | 010-1234, 010-5678

좋은 예:
Users: id | name
      1   | John

Phones: user_id | phone
       1        | 010-1234
       1        | 010-5678
```

### 제2정규형 (2NF)

부분 함수 종속 제거

### 제3정규형 (3NF)

이행 함수 종속 제거

### BCNF, 4NF, 5NF...

실무에서는 보통 3NF까지만 적용합니다. 과도한 정규화는 오히려 성능을 해칠 수 있어요.

## 인덱스: 검색 속도의 비밀

인덱스는 책의 색인과 같습니다. 없으면 처음부터 끝까지 다 읽어야 하죠.

### B-Tree 인덱스

```
            [50]
          /      \
      [20,30]    [70,80]
      /  |  \    /  |  \
    [10][25][35][60][75][90]

특징:
- 균형 트리
- O(log n) 검색
- 범위 검색 효율적
```

### 인덱스 전략

```sql
-- 단일 컬럼 인덱스
CREATE INDEX idx_email ON users(email);

-- 복합 인덱스 (순서 중요!)
CREATE INDEX idx_name_age ON users(name, age);

-- 유니크 인덱스
CREATE UNIQUE INDEX idx_username ON users(username);

-- 부분 인덱스
CREATE INDEX idx_active ON users(email) 
WHERE active = true;
```

실무 팁: 인덱스는 약이 아니라 독이 될 수도 있습니다. INSERT/UPDATE 성능을 떨어뜨리거든요.

## 트랜잭션과 동시성 제어

### 격리 수준별 문제들

```
Dirty Read: 커밋되지 않은 데이터 읽기
Non-Repeatable Read: 같은 쿼리, 다른 결과
Phantom Read: 없던 행이 나타남

격리 수준과 문제:
READ UNCOMMITTED: 모든 문제 발생 가능
READ COMMITTED: Dirty Read 해결
REPEATABLE READ: Non-Repeatable Read도 해결
SERIALIZABLE: 모든 문제 해결 (성능 최악)
```

### 락(Lock)의 종류

```sql
-- 행 수준 락
SELECT * FROM users WHERE id = 1 FOR UPDATE;

-- 테이블 수준 락
LOCK TABLES users WRITE;

-- Optimistic Locking (낙관적 락)
UPDATE users SET name = 'New', version = version + 1
WHERE id = 1 AND version = 5;

-- Pessimistic Locking (비관적 락)
SELECT * FROM users WHERE id = 1 FOR UPDATE;
```

## 주요 RDBMS 비교

### MySQL

```
장점:
- 오픈소스, 무료
- 빠른 읽기 성능
- 광범위한 커뮤니티

단점:
- 복잡한 쿼리 최적화 약함
- 일부 표준 SQL 미지원

적합한 경우:
- 웹 애플리케이션
- 읽기 위주 워크로드
```

### PostgreSQL

```
장점:
- 완벽한 ACID 준수
- 풍부한 데이터 타입 (JSON, Array 등)
- 강력한 확장성

단점:
- 상대적으로 느린 쓰기
- 메모리 사용량 많음

적합한 경우:
- 복잡한 쿼리
- 데이터 무결성 중요
- GIS 데이터
```

### Oracle

```
장점:
- 엔터프라이즈 기능
- 최고의 성능과 안정성
- 강력한 백업/복구

단점:
- 매우 비싼 라이선스
- 복잡한 관리

적합한 경우:
- 대규모 엔터프라이즈
- 미션 크리티컬 시스템
```

### SQL Server

```
장점:
- Windows 생태계 통합
- 훌륭한 GUI 도구
- 비즈니스 인텔리전스

단점:
- Windows 종속적
- 라이선스 비용

적합한 경우:
- .NET 애플리케이션
- Windows 환경
```

## 실무에서 자주 만나는 문제들

### N+1 문제

```sql
-- 나쁜 예: 사용자별로 주문 조회 (N+1 쿼리)
SELECT * FROM users;  -- 1번
-- 각 사용자마다
SELECT * FROM orders WHERE user_id = ?;  -- N번

-- 좋은 예: JOIN 사용 (1 쿼리)
SELECT u.*, o.*
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```

### 슬로우 쿼리

```sql
-- EXPLAIN으로 실행 계획 확인
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';

-- 인덱스 없으면 Full Table Scan!
-- 인덱스 추가 후 Index Scan으로 개선
```

### 데드락

```
트랜잭션 A: 테이블 X 락 → 테이블 Y 대기
트랜잭션 B: 테이블 Y 락 → 테이블 X 대기
= 데드락!

해결:
- 락 순서 통일
- 타임아웃 설정
- 재시도 로직
```

## NoSQL과의 비교

### 언제 RDB를 선택할까?

```
RDB가 적합한 경우:
✓ ACID가 중요 (금융, 결제)
✓ 복잡한 관계와 조인
✓ 정형화된 데이터
✓ 일관성이 중요

NoSQL이 적합한 경우:
✓ 스키마가 자주 변경
✓ 수평 확장 필요
✓ 단순한 키-값 저장
✓ 빅데이터 처리
```

## 미래와 트렌드

### NewSQL

전통적인 RDB의 ACID + NoSQL의 확장성

- Google Spanner
- CockroachDB
- TiDB

### 하이브리드 접근

```sql
-- PostgreSQL의 JSON 지원
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    attributes JSONB  -- NoSQL처럼!
);

SELECT * FROM products
WHERE attributes->>'color' = 'red';
```

## 다음 단계

이제 RDB의 기본을 이해하셨나요? advanced 폴더에서는 더 깊은 주제들을 다룹니다:

1. **쿼리 최적화**: 실행 계획 읽기, 인덱스 전략, 파티셔닝
2. **트랜잭션 심화**: MVCC, 격리 수준, 데드락 해결
3. **백업과 복구**: 전략, 도구, 재해 복구
4. **복제와 샤딩**: 읽기 분산, 쓰기 분산, 일관성
5. **성능 튜닝**: 파라미터 최적화, 모니터링, 프로파일링

## 마무리

관계형 데이터베이스는 50년이 넘는 역사를 가진 검증된 기술입니다. 트렌드가 바뀌어도 RDB의 핵심 가치는 변하지 않죠.

제가 10년 넘게 백엔드 개발하면서 느낀 것은, RDB를 제대로 이해하면 데이터 관련 문제의 90%는 해결할 수 있다는 것입니다.

자, 이제 데이터베이스의 깊은 바다로 다이빙할 준비가 되셨나요? 🌊