# 쿼리 최적화: 밀리초를 아끼는 기술

안녕하세요! 오늘은 데이터베이스 성능의 핵심, 쿼리 최적화에 대해 깊이 파헤쳐보겠습니다. 느린 쿼리를 빠르게 만드는 마법 같은 기술들을 함께 알아볼까요?

## 실행 계획 읽기: 쿼리의 X-Ray

실행 계획(Execution Plan)은 데이터베이스가 쿼리를 어떻게 처리할지 보여주는 청사진입니다.

### MySQL EXPLAIN

```sql
EXPLAIN SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id;

-- 결과 해석
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+-------+
| id | select_type | table | partitions | type | possible_keys | key  | key_len | ref  | rows | filtered | Extra |
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+-------+
| 1  | SIMPLE      | u     | NULL       | ALL  | NULL          | NULL | NULL    | NULL | 1000 | 33.33    | Using where; Using temporary; Using filesort |
| 1  | SIMPLE      | o     | NULL       | ref  | user_id_idx   | user_id_idx | 4  | u.id | 10   | 100.00   | NULL |
```

**핵심 지표 해석:**

```
type (접근 방식):
- const: 기본키/유니크 키로 단일 행 (최고!)
- eq_ref: 조인에서 기본키/유니크 키 사용
- ref: 인덱스로 여러 행 접근
- range: 인덱스 범위 스캔
- index: 인덱스 전체 스캔
- ALL: 테이블 전체 스캔 (최악!)

Extra (추가 정보):
- Using index: 커버링 인덱스 (좋음!)
- Using filesort: 정렬 필요 (주의)
- Using temporary: 임시 테이블 생성 (위험)
- Using where: WHERE 절 필터링
```

### PostgreSQL EXPLAIN ANALYZE

```sql
EXPLAIN (ANALYZE, BUFFERS) 
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name;

-- 결과
HashAggregate (cost=1234.56..1345.67 rows=100 width=64) 
              (actual time=23.456..24.567 rows=95 loops=1)
  Group Key: u.id
  Buffers: shared hit=234 read=12
  -> Hash Left Join (cost=234.56..1123.45 rows=1000 width=32)
                    (actual time=2.345..20.123 rows=950 loops=1)
       Hash Cond: (o.user_id = u.id)
       Buffers: shared hit=220 read=10
       -> Seq Scan on orders o (cost=0.00..456.78 rows=10000 width=8)
                                (actual time=0.123..5.678 rows=9500 loops=1)
       -> Hash (cost=123.45..123.45 rows=100 width=24)
              (actual time=1.234..1.234 rows=95 loops=1)
            -> Bitmap Heap Scan on users u (cost=12.34..123.45 rows=100 width=24)
                                            (actual time=0.234..1.123 rows=95 loops=1)
                 Recheck Cond: (created_at > '2024-01-01')
                 -> Bitmap Index Scan on users_created_at_idx
                                      (cost=0.00..12.34 rows=100 width=0)
                                      (actual time=0.123..0.123 rows=95 loops=1)
```

**중요 메트릭:**

```
cost: 추정 비용 (시작..전체)
actual time: 실제 시간 (시작..전체)
rows: 예상 행 수 vs 실제 행 수
loops: 반복 횟수
Buffers: 버퍼 사용량 (shared hit=캐시, read=디스크)

주의할 패턴:
- 예상과 실제 rows 차이가 크면 → 통계 업데이트 필요
- Seq Scan on 큰 테이블 → 인덱스 필요
- Nested Loop with 많은 rows → Hash Join이 나을 수도
```

## 인덱스 전략: 검색의 지름길

### 인덱스 선택 기준

```sql
-- 카디널리티가 높은 컬럼 (고유값이 많은)
CREATE INDEX idx_email ON users(email);  -- 좋음 (거의 유니크)
CREATE INDEX idx_gender ON users(gender); -- 나쁨 (M/F 두 개뿐)

-- 자주 WHERE에 사용되는 컬럼
SELECT * FROM orders WHERE status = 'pending';  -- status 인덱스 필요

-- 정렬에 사용되는 컬럼
SELECT * FROM posts ORDER BY created_at DESC;  -- created_at 인덱스

-- 조인에 사용되는 컬럼
JOIN orders o ON u.id = o.user_id;  -- user_id 인덱스 필수
```

### 복합 인덱스의 순서

```sql
-- 순서가 중요합니다!
CREATE INDEX idx_status_date ON orders(status, created_at);

-- 이 인덱스를 사용할 수 있는 쿼리
WHERE status = 'pending'  ✓
WHERE status = 'pending' AND created_at > '2024-01-01'  ✓
WHERE status = 'pending' ORDER BY created_at  ✓

-- 사용할 수 없는 쿼리
WHERE created_at > '2024-01-01'  ✗ (첫 번째 컬럼 없음)

-- 최좌측 원칙 (Leftmost Principle)
인덱스 (a, b, c)는 다음을 커버:
- (a)
- (a, b)
- (a, b, c)
하지만 (b), (c), (b, c)는 커버하지 않음
```

### 커버링 인덱스

```sql
-- 인덱스만으로 쿼리 완성 (테이블 접근 불필요)
CREATE INDEX idx_covering ON users(country, city, name);

-- 커버링 인덱스 활용
SELECT name FROM users WHERE country = 'Korea' AND city = 'Seoul';
-- Extra: Using index (테이블 접근 없음!)

-- 실제 성능 차이
일반 인덱스: Index Scan → Table Access → 10ms
커버링 인덱스: Index Only Scan → 1ms (10배 빠름!)
```

### 부분 인덱스 (PostgreSQL)

```sql
-- 특정 조건의 행만 인덱싱
CREATE INDEX idx_active_users ON users(email) 
WHERE active = true;

-- 인덱스 크기 대폭 감소
전체 인덱스: 1,000,000 rows → 100MB
부분 인덱스: 100,000 rows → 10MB

-- 활성 사용자만 조회할 때 효과적
SELECT * FROM users WHERE active = true AND email = 'test@example.com';
```

## 조인 최적화

### 조인 알고리즘 이해

**Nested Loop Join**
```
for each row in table1:
    for each row in table2:
        if join_condition:
            output row

복잡도: O(n × m)
적합: 작은 테이블, 인덱스 있을 때
```

**Hash Join**
```
1. 작은 테이블로 해시 테이블 생성
2. 큰 테이블 스캔하며 해시 테이블 조회

복잡도: O(n + m)
적합: 큰 테이블, 동등 조건
```

**Merge Join**
```
1. 양쪽 테이블 정렬
2. 정렬된 순서로 머지

복잡도: O(n log n + m log m)
적합: 이미 정렬된 데이터
```

### 조인 순서 최적화

```sql
-- 나쁜 예: 큰 테이블부터 조인
SELECT * 
FROM orders o  -- 1,000,000 rows
JOIN users u ON o.user_id = u.id  -- 10,000 rows
JOIN products p ON o.product_id = p.id  -- 1,000 rows
WHERE p.category = 'Electronics';

-- 좋은 예: 작은 결과셋부터 조인
SELECT * 
FROM products p  -- 1,000 rows → 100 rows (필터링 후)
JOIN orders o ON o.product_id = p.id  -- 100 → 10,000 rows
JOIN users u ON o.user_id = u.id  -- 10,000 → 10,000 rows
WHERE p.category = 'Electronics';

-- 힌트로 조인 순서 강제 (MySQL)
SELECT /*+ LEADING(p o u) */ * 
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN products p ON o.product_id = p.id
WHERE p.category = 'Electronics';
```

### EXISTS vs JOIN vs IN

```sql
-- EXISTS: 존재 여부만 확인 (빠름)
SELECT u.* FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.user_id = u.id AND o.total > 1000
);

-- IN: 작은 리스트에 효과적
SELECT * FROM users 
WHERE id IN (1, 2, 3, 4, 5);

-- JOIN: 결과에 양쪽 데이터 필요할 때
SELECT u.*, o.* FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.total > 1000;

성능 비교:
EXISTS: 첫 매치에서 중단 → 빠름
IN: 전체 서브쿼리 실행 → 작은 결과에만
JOIN: 모든 매치 찾기 → 중복 가능성
```

## 파티셔닝: 테이블 쪼개기

### 수평 파티셔닝 (Horizontal Partitioning)

```sql
-- 범위 파티셔닝 (PostgreSQL)
CREATE TABLE orders (
    id SERIAL,
    created_at TIMESTAMP,
    user_id INT,
    total DECIMAL
) PARTITION BY RANGE (created_at);

-- 월별 파티션 생성
CREATE TABLE orders_2024_01 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE orders_2024_02 PARTITION OF orders
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 자동으로 올바른 파티션 접근
SELECT * FROM orders WHERE created_at = '2024-01-15';
-- 실제로는 orders_2024_01만 스캔

장점:
- 대용량 테이블 관리 용이
- 오래된 데이터 쉽게 삭제
- 병렬 처리 가능
```

### 샤딩 (Sharding)

```sql
-- 사용자 ID 기반 샤딩
shard_id = user_id % 4

Shard 0: user_id % 4 = 0
Shard 1: user_id % 4 = 1
Shard 2: user_id % 4 = 2
Shard 3: user_id % 4 = 3

주의사항:
- 크로스 샤드 조인 어려움
- 트랜잭션 복잡도 증가
- 리밸런싱 어려움
```

## 쿼리 작성 팁

### 1. SELECT * 피하기

```sql
-- 나쁜 예
SELECT * FROM users;

-- 좋은 예
SELECT id, name, email FROM users;

이유:
- 네트워크 트래픽 감소
- 커버링 인덱스 활용 가능
- 메모리 사용량 감소
```

### 2. LIMIT 활용

```sql
-- 나쁜 예: 전체 결과 가져온 후 애플리케이션에서 처리
SELECT * FROM logs ORDER BY created_at DESC;

-- 좋은 예: 필요한 만큼만
SELECT * FROM logs ORDER BY created_at DESC LIMIT 100;

-- 페이징 최적화 (키셋 페이징)
-- 나쁜 예: OFFSET 사용
SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 10000;  -- 10010개 읽고 10개 반환

-- 좋은 예: WHERE 조건 사용
SELECT * FROM users WHERE id > 10000 ORDER BY id LIMIT 10;  -- 10개만 읽음
```

### 3. 함수 호출 최소화

```sql
-- 나쁜 예: WHERE 절에 함수 (인덱스 사용 불가)
SELECT * FROM users WHERE YEAR(created_at) = 2024;

-- 좋은 예: 범위 조건 (인덱스 사용 가능)
SELECT * FROM users 
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';

-- 나쁜 예: 계산된 컬럼
SELECT * FROM orders WHERE total * 1.1 > 1000;

-- 좋은 예: 계산 이동
SELECT * FROM orders WHERE total > 1000 / 1.1;
```

### 4. OR 조건 주의

```sql
-- 나쁜 예: OR는 인덱스 활용 어려움
SELECT * FROM users WHERE name = 'John' OR email = 'john@example.com';

-- 좋은 예: UNION 사용
SELECT * FROM users WHERE name = 'John'
UNION
SELECT * FROM users WHERE email = 'john@example.com';

-- 또는 IN 사용 (같은 컬럼일 때)
SELECT * FROM users WHERE status IN ('active', 'pending');
```

## 실전 최적화 사례

### 사례 1: 대시보드 쿼리 최적화

**문제 쿼리: 30초**
```sql
SELECT 
    DATE(o.created_at) as date,
    COUNT(DISTINCT o.user_id) as unique_users,
    COUNT(o.id) as total_orders,
    SUM(o.total) as revenue,
    AVG(o.total) as avg_order_value
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(o.created_at);
```

**최적화 과정:**

1. 인덱스 추가
```sql
CREATE INDEX idx_orders_created_total ON orders(created_at, total, user_id);
```

2. 불필요한 JOIN 제거
```sql
-- users 테이블 정보가 필요없음
```

3. 사전 집계 테이블 사용
```sql
CREATE TABLE daily_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(id) as total_orders,
    SUM(total) as revenue
FROM orders
GROUP BY DATE(created_at);

-- 인덱스 추가
CREATE INDEX idx_daily_stats_date ON daily_stats(date);
```

**결과: 0.1초** (300배 개선!)

### 사례 2: N+1 문제 해결

**문제 코드:**
```python
users = User.query.all()  # 1 query
for user in users:
    orders = user.orders  # N queries
    print(f"{user.name}: {len(orders)} orders")
```

**해결 방법:**

1. Eager Loading
```python
users = User.query.options(joinedload(User.orders)).all()  # 1 query
```

2. 수동 JOIN
```sql
SELECT u.*, o.*
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
ORDER BY u.id, o.id;
```

3. 배치 로딩
```python
user_ids = [u.id for u in users]
orders = Order.query.filter(Order.user_id.in_(user_ids)).all()
orders_by_user = defaultdict(list)
for order in orders:
    orders_by_user[order.user_id].append(order)
```

## 모니터링과 프로파일링

### 슬로우 쿼리 로그

```sql
-- MySQL 설정
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- 1초 이상
SET GLOBAL log_queries_not_using_indexes = 'ON';

-- PostgreSQL 설정
log_min_duration_statement = 1000  -- 1초 이상
log_statement = 'all'
```

### 실시간 모니터링

```sql
-- MySQL: 현재 실행 중인 쿼리
SHOW PROCESSLIST;

-- PostgreSQL: 현재 활동
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- 락 대기 확인
SELECT blocked_locks.pid AS blocked_pid,
       blocking_locks.pid AS blocking_pid,
       blocked_activity.query AS blocked_query,
       blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

## 체크리스트: 쿼리 최적화

- [ ] EXPLAIN으로 실행 계획 확인
- [ ] 적절한 인덱스 생성
- [ ] 커버링 인덱스 고려
- [ ] 조인 순서 최적화
- [ ] 서브쿼리 → JOIN/EXISTS 변경
- [ ] SELECT * 제거
- [ ] LIMIT 추가
- [ ] 함수 호출 최소화
- [ ] 파티셔닝 고려
- [ ] 캐싱 전략 수립

## 마무리: 최적화의 철학

쿼리 최적화는 과학이자 예술입니다. 제가 경험한 바로는:

1. **측정이 우선**: 추측하지 말고 프로파일링
2. **가장 느린 것부터**: 파레토 법칙 (20%가 80% 차지)
3. **단순함 유지**: 복잡한 쿼리는 유지보수 어려움
4. **트레이드오프 이해**: 공간 vs 시간, 쓰기 vs 읽기
5. **지속적 모니터링**: 데이터 증가에 따른 변화

1초를 0.1초로 만드는 것이 사용자 경험을 완전히 바꿀 수 있습니다. 쿼리 최적화, 정말 흥미진진하지 않나요? ⚡