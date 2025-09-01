# Redis: 메모리 기반 데이터 구조 저장소의 모든 것

## Redis란 무엇인가?

Redis(Remote Dictionary Server)는 메모리 기반의 key-value 데이터 구조 저장소입니다. 단순한 캐시를 넘어서 데이터베이스, 메시지 브로커, 세션 스토어 등 다양한 용도로 활용되는 만능 도구입니다.

## 왜 Redis가 필요했을까?

### 전통적인 데이터베이스의 한계

```
기존 시스템의 문제:
- RDBMS: 디스크 I/O로 인한 느린 응답 속도
- 파일 시스템: 복잡한 데이터 구조 처리 어려움
- 메모리 캐시: 단순한 key-value만 지원

Redis가 해결한 것:
✓ 메모리 기반으로 초고속 처리 (마이크로초 단위)
✓ 다양한 데이터 구조 지원 (List, Set, Hash, etc.)
✓ 영속성 옵션 제공 (메모리 + 디스크)
✓ 분산 환경 지원 (클러스터, 레플리케이션)
```

## Redis의 핵심 특징

### 1. 초고속 성능
- 모든 데이터를 메모리에 저장
- 초당 10만 개 이상의 요청 처리 가능
- 평균 응답 시간 1ms 이하

### 2. 다양한 데이터 구조
- String: 단순 key-value
- List: 순서가 있는 문자열 목록
- Set: 중복 없는 문자열 집합
- Sorted Set: 점수로 정렬된 집합
- Hash: 필드-값 쌍의 집합
- Stream: 로그 구조의 데이터
- Bitmap, HyperLogLog, Geospatial 등

### 3. 영속성 (Persistence)
- RDB: 특정 시점 스냅샷
- AOF: 모든 쓰기 명령 로깅
- 혼합 모드: RDB + AOF

### 4. 고가용성
- Master-Slave 레플리케이션
- Redis Sentinel: 자동 페일오버
- Redis Cluster: 자동 샤딩

## 주요 사용 사례

### 캐싱
```
웹 애플리케이션의 응답 속도 개선:
DB 쿼리 결과 → Redis 캐싱 → 100배 빠른 응답
```

### 세션 관리
```
분산 환경에서 세션 공유:
서버 A, B, C → Redis → 일관된 세션 상태
```

### 실시간 순위표
```
게임 리더보드, 인기 상품 순위:
Sorted Set → 실시간 순위 계산 → O(log n) 성능
```

### 메시지 큐
```
비동기 작업 처리:
Producer → Redis List/Stream → Consumer
```

## 학습 로드맵

### 기초 (Basics)
1. Redis 설치 및 기본 명령어
2. 데이터 타입별 사용법
3. 영속성 설정
4. 기본 설정 및 튜닝

### 고급 (Advanced)
1. [Redis 영속성 메커니즘](./advanced/01-redis-persistence.md)
2. [Redis 클러스터 아키텍처](./advanced/02-redis-cluster.md)
3. [Redis Pub/Sub과 Stream](./advanced/03-redis-pubsub-stream.md)
4. [Redis 메모리 최적화](./advanced/04-redis-memory-optimization.md)
5. [Redis 트랜잭션과 스크립트](./advanced/05-redis-transaction-script.md)
6. [Redis 성능 튜닝](./advanced/06-redis-performance-tuning.md)

## Redis를 선택해야 하는 이유

1. **속도**: 메모리 기반으로 극한의 성능
2. **단순함**: 간단한 명령어로 복잡한 작업 수행
3. **다양성**: 다양한 데이터 구조로 유연한 설계
4. **안정성**: 검증된 오픈소스, 대규모 서비스 사용
5. **확장성**: 클러스터를 통한 수평 확장

## 시작하기

```bash
# Redis 설치 (Mac)
brew install redis

# Redis 서버 시작
redis-server

# Redis CLI 접속
redis-cli

# 첫 번째 명령어
SET hello "world"
GET hello
```

Redis는 "단순하지만 강력한" 도구입니다. 기본은 쉽게 배울 수 있지만, 깊이 파고들수록 놀라운 기능들을 발견하게 될 것입니다.