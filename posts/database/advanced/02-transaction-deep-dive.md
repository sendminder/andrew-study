# 트랜잭션 심화: MVCC와 격리 수준의 모든 것

안녕하세요! 오늘은 데이터베이스의 심장부, 트랜잭션의 깊은 세계로 들어가보겠습니다. MVCC부터 데드락까지, 트랜잭션의 모든 비밀을 파헤쳐볼까요?

## MVCC (Multi-Version Concurrency Control)

MVCC는 동시성을 높이는 마법입니다. 읽기와 쓰기가 서로를 차단하지 않죠!

### MVCC의 원리

```
시간 흐름 →

트랜잭션 1 (T1): BEGIN → READ x=100 → ... → COMMIT
트랜잭션 2 (T2):      BEGIN → WRITE x=200 → COMMIT
트랜잭션 3 (T3):           BEGIN → READ x=? → ...

T3가 읽는 x의 값은?
- MVCC 없이: T2가 쓰는 동안 대기 (블로킹)
- MVCC 있으면: x의 이전 버전(100) 읽기 (논블로킹!)
```

### PostgreSQL의 MVCC

```sql
-- 각 행은 숨겨진 시스템 컬럼을 가짐
xmin: 행을 생성한 트랜잭션 ID
xmax: 행을 삭제한 트랜잭션 ID (0이면 살아있음)
ctid: 행의 물리적 위치

-- 실제로 보기
SELECT xmin, xmax, ctid, * FROM users WHERE id = 1;

-- UPDATE는 실제로 DELETE + INSERT
UPDATE users SET name = 'New' WHERE id = 1;
-- 1. 기존 행의 xmax 설정 (논리적 삭제)
-- 2. 새 행 생성 (xmin = 현재 트랜잭션 ID)
```

### MySQL InnoDB의 MVCC

```sql
-- Undo Log를 사용한 MVCC
트랜잭션 시작 → 스냅샷 생성
UPDATE 시:
1. Undo Log에 이전 값 저장
2. 데이터 페이지 수정
3. 다른 트랜잭션은 Undo Log에서 이전 버전 읽기

-- 버전 체인
현재 데이터 → Undo Log 1 → Undo Log 2 → ...
   (최신)        (이전)       (더 이전)
```

### MVCC의 장단점

```
장점:
✓ 읽기가 쓰기를 차단하지 않음
✓ 쓰기가 읽기를 차단하지 않음
✓ 높은 동시성
✓ Consistent Read 제공

단점:
✗ 추가 저장 공간 필요
✗ VACUUM/Purge 필요
✗ 긴 트랜잭션이 공간 낭비
```

## 격리 수준 완벽 이해

### Read Uncommitted (레벨 0)

"무법지대" - 거의 사용하지 않음

```sql
-- 트랜잭션 A
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- 아직 커밋 안 함!

-- 트랜잭션 B (READ UNCOMMITTED)
BEGIN;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SELECT balance FROM accounts WHERE id = 1;  -- Dirty Read! 
-- 커밋되지 않은 값을 읽음

-- 트랜잭션 A
ROLLBACK;  -- 앗! 롤백했네요

-- 트랜잭션 B는 존재하지 않는 데이터를 읽었음!
```

### Read Committed (레벨 1)

가장 일반적인 기본값 (PostgreSQL, Oracle)

```sql
-- 트랜잭션 A
BEGIN;
SELECT balance FROM accounts WHERE id = 1;  -- 1000원

-- 트랜잭션 B
BEGIN;
UPDATE accounts SET balance = 500 WHERE id = 1;
COMMIT;

-- 트랜잭션 A (같은 쿼리 다시 실행)
SELECT balance FROM accounts WHERE id = 1;  -- 500원
-- Non-Repeatable Read 발생!

특징:
- Dirty Read 방지 ✓
- Non-Repeatable Read 가능 ✗
- Phantom Read 가능 ✗
```

### Repeatable Read (레벨 2)

MySQL InnoDB의 기본값

```sql
-- 트랜잭션 A (REPEATABLE READ)
BEGIN;
SELECT COUNT(*) FROM users WHERE age > 30;  -- 10명

-- 트랜잭션 B
BEGIN;
INSERT INTO users (name, age) VALUES ('New', 35);
COMMIT;

-- 트랜잭션 A
SELECT COUNT(*) FROM users WHERE age > 30;  -- 여전히 10명!
-- 하지만...
UPDATE users SET status = 'checked' WHERE age > 30;
-- 11 rows affected!  -- Phantom Read!

MySQL InnoDB는 특별:
- Gap Lock으로 Phantom Read도 방지
- Next-Key Lock = Record Lock + Gap Lock
```

### Serializable (레벨 3)

"완벽한 격리" - 성능 희생

```sql
-- 모든 SELECT가 SELECT ... FOR SHARE로 동작
-- 모든 읽기에 공유 락

트랜잭션 A:
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
SELECT * FROM accounts WHERE id = 1;

트랜잭션 B:
UPDATE accounts SET balance = 0 WHERE id = 1;
-- 대기! A가 끝날 때까지

성능 영향:
- 동시성 크게 감소
- 데드락 가능성 증가
- 처리량 30-50% 감소 가능
```

## 락(Lock)의 세계

### 락의 종류와 호환성

```
락 호환성 매트릭스:
        | S-Lock | X-Lock
--------|---------|--------
S-Lock  |   ✓    |   ✗
X-Lock  |   ✗    |   ✗

S-Lock (Shared Lock): 읽기 락
X-Lock (Exclusive Lock): 쓰기 락
```

### 락의 범위

```sql
-- 1. Row-Level Lock (행 수준)
SELECT * FROM users WHERE id = 1 FOR UPDATE;
-- id=1 행만 락

-- 2. Page-Level Lock (페이지 수준)
-- PostgreSQL의 경우 8KB 페이지 단위

-- 3. Table-Level Lock (테이블 수준)
LOCK TABLES users WRITE;

-- 4. Gap Lock (MySQL InnoDB)
-- 인덱스 레코드 사이의 간격을 락
SELECT * FROM users WHERE age BETWEEN 20 AND 30 FOR UPDATE;
-- 20-30 사이에 새 레코드 삽입 차단

-- 5. Next-Key Lock (MySQL InnoDB)
-- Record Lock + Gap Lock
-- Phantom Read 방지
```

### Optimistic vs Pessimistic Locking

**Pessimistic Locking (비관적 락)**

"충돌이 자주 일어날 것이다"

```sql
-- 먼저 락을 잡고 작업
BEGIN;
SELECT * FROM products WHERE id = 1 FOR UPDATE;
-- 다른 트랜잭션은 대기

-- 재고 확인 및 차감
UPDATE products SET stock = stock - 1 WHERE id = 1;
COMMIT;

장점: 충돌 확실히 방지
단점: 동시성 낮음, 데드락 위험
```

**Optimistic Locking (낙관적 락)**

"충돌이 거의 없을 것이다"

```sql
-- 버전 컬럼 사용
SELECT id, name, stock, version FROM products WHERE id = 1;
-- version = 5

-- 업데이트 시 버전 체크
UPDATE products 
SET stock = stock - 1, version = version + 1
WHERE id = 1 AND version = 5;

-- affected rows = 0이면 충돌 발생!
-- 재시도 필요

장점: 동시성 높음, 데드락 없음
단점: 충돌 시 재시도 필요
```

## 데드락: 교착상태의 해결

### 데드락 발생 조건

```
필요충분조건 (모두 만족해야 발생):
1. Mutual Exclusion (상호 배제)
2. Hold and Wait (점유와 대기)
3. No Preemption (비선점)
4. Circular Wait (순환 대기)

예시:
트랜잭션 A: Lock(X) → Wait(Y)
트랜잭션 B: Lock(Y) → Wait(X)
= 데드락!
```

### 데드락 예제와 해결

```sql
-- 데드락 시나리오
-- 트랜잭션 A
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;  -- Lock(1)
-- 잠시 후...
UPDATE accounts SET balance = balance + 100 WHERE id = 2;  -- Wait(2)

-- 트랜잭션 B (동시에)
BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE id = 2;   -- Lock(2)
-- 잠시 후...
UPDATE accounts SET balance = balance + 50 WHERE id = 1;   -- Wait(1)

-- 데드락 발생!
-- ERROR: deadlock detected
```

### 데드락 방지 전략

**1. 락 순서 통일**

```sql
-- 항상 작은 ID부터 락
IF (from_id < to_id) THEN
    SELECT * FROM accounts WHERE id = from_id FOR UPDATE;
    SELECT * FROM accounts WHERE id = to_id FOR UPDATE;
ELSE
    SELECT * FROM accounts WHERE id = to_id FOR UPDATE;
    SELECT * FROM accounts WHERE id = from_id FOR UPDATE;
END IF;
```

**2. 타임아웃 설정**

```sql
-- MySQL
SET innodb_lock_wait_timeout = 5;  -- 5초

-- PostgreSQL
SET lock_timeout = '5s';
```

**3. 데드락 감지와 해결**

```sql
-- MySQL: 자동 감지 및 롤백
SHOW ENGINE INNODB STATUS;  -- 데드락 정보 확인

-- PostgreSQL: 자동 감지
-- 한 트랜잭션을 victim으로 선택하여 롤백
```

**4. 재시도 로직**

```python
def transfer_with_retry(from_id, to_id, amount, max_retries=3):
    for attempt in range(max_retries):
        try:
            with db.begin():
                # 트랜잭션 로직
                transfer(from_id, to_id, amount)
            return True
        except DeadlockError:
            if attempt == max_retries - 1:
                raise
            time.sleep(random.uniform(0.1, 0.5))  # 랜덤 대기
    return False
```

## 트랜잭션 로그와 복구

### WAL (Write-Ahead Logging)

```
원칙: 데이터 변경 전에 로그 먼저 기록

순서:
1. 트랜잭션 시작 → 로그에 BEGIN 기록
2. 데이터 변경 → 로그에 변경사항 기록
3. 커밋 → 로그에 COMMIT 기록
4. 체크포인트 → 메모리의 변경사항을 디스크에 반영

장애 복구:
- REDO: 커밋된 트랜잭션 재실행
- UNDO: 커밋 안 된 트랜잭션 롤백
```

### 2PC (Two-Phase Commit)

분산 트랜잭션을 위한 프로토콜

```
Phase 1: Prepare (준비)
Coordinator → Participants: "커밋 준비됐나?"
Participants → Coordinator: "Yes" or "No"

Phase 2: Commit/Abort (커밋/중단)
모두 "Yes" → Coordinator: "커밋하세요"
하나라도 "No" → Coordinator: "롤백하세요"

문제점:
- Blocking: Coordinator 장애 시 무한 대기
- 성능: 2번의 round-trip
```

## 실전 트랜잭션 패턴

### Saga 패턴

긴 트랜잭션을 여러 로컬 트랜잭션으로 분할

```
주문 프로세스:
1. 주문 생성 (트랜잭션 1)
2. 결제 처리 (트랜잭션 2)
3. 재고 차감 (트랜잭션 3)
4. 배송 준비 (트랜잭션 4)

실패 시 보상 트랜잭션:
4 실패 → 3 보상 → 2 보상 → 1 보상

장점: 긴 락 회피, 확장성
단점: 복잡성, 일시적 불일치
```

### Event Sourcing

상태 대신 이벤트 저장

```sql
-- 전통적 방식
UPDATE accounts SET balance = 900 WHERE id = 1;

-- Event Sourcing
INSERT INTO events (account_id, type, amount, timestamp)
VALUES (1, 'WITHDRAW', -100, NOW());

-- 현재 잔액은 이벤트 합산으로 계산
SELECT SUM(amount) FROM events WHERE account_id = 1;

장점: 완전한 감사 로그, 시점 복원 가능
단점: 복잡성, 스냅샷 필요
```

## 트랜잭션 모니터링

### 장기 트랜잭션 찾기

```sql
-- PostgreSQL
SELECT pid, now() - xact_start AS duration, query
FROM pg_stat_activity
WHERE state != 'idle' AND xact_start IS NOT NULL
ORDER BY duration DESC;

-- MySQL
SELECT trx_id, trx_started, 
       TIMESTAMPDIFF(SECOND, trx_started, NOW()) as duration
FROM information_schema.innodb_trx
ORDER BY duration DESC;
```

### 락 모니터링

```sql
-- PostgreSQL: 블로킹 세션 찾기
SELECT 
    blocked.pid AS blocked_pid,
    blocking.pid AS blocking_pid,
    blocked.query AS blocked_query,
    blocking.query AS blocking_query
FROM pg_stat_activity AS blocked
JOIN pg_stat_activity AS blocking 
    ON blocking.pid = ANY(pg_blocking_pids(blocked.pid));

-- MySQL: 락 대기 확인
SELECT * FROM information_schema.innodb_lock_waits;
```

## 성능 튜닝

### 트랜잭션 크기 최적화

```sql
-- 나쁜 예: 거대한 트랜잭션
BEGIN;
UPDATE millions_of_rows SET status = 'processed';
COMMIT;  -- 몇 분 동안 락

-- 좋은 예: 배치 처리
LOOP
    BEGIN;
    UPDATE millions_of_rows 
    SET status = 'processed'
    WHERE status = 'pending'
    LIMIT 1000;
    COMMIT;
    
    EXIT WHEN ROW_COUNT = 0;
END LOOP;
```

### 격리 수준 선택 가이드

```
READ COMMITTED 선택:
- 대부분의 웹 애플리케이션
- 높은 동시성 필요
- 약간의 불일치 허용

REPEATABLE READ 선택:
- 금융 트랜잭션
- 리포트 생성
- 일관된 읽기 필요

SERIALIZABLE 선택:
- 절대적 정확성 필요
- 동시성보다 정확성 우선
- 배치 처리
```

## 체크리스트: 트랜잭션 설계

- [ ] 트랜잭션 크기 최소화
- [ ] 적절한 격리 수준 선택
- [ ] 데드락 방지 전략 수립
- [ ] 락 순서 문서화
- [ ] 타임아웃 설정
- [ ] 재시도 로직 구현
- [ ] 장기 트랜잭션 모니터링
- [ ] VACUUM/PURGE 전략
- [ ] 낙관적 vs 비관적 락 선택
- [ ] 분산 트랜잭션 최소화

## 마무리: 트랜잭션의 예술

트랜잭션은 데이터베이스의 핵심입니다. 제가 경험한 바로는:

1. **작게 유지하라**: 짧은 트랜잭션이 최고
2. **격리 수준을 이해하라**: 과도한 격리는 독
3. **데드락은 일어난다**: 방지보다 대응이 현실적
4. **모니터링이 핵심**: 문제를 빨리 발견하라
5. **MVCC를 활용하라**: 동시성의 열쇠

트랜잭션을 마스터하면 안정적이고 빠른 시스템을 만들 수 있습니다. 데이터의 일관성을 지키는 수호자가 되어보세요! 🛡️