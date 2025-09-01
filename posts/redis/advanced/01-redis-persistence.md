# Redis 영속성: 메모리 데이터를 디스크에 안전하게 저장하기

## 왜 영속성이 필요했을까?

### 메모리의 치명적 약점

Redis는 빠르지만 치명적인 약점이 있었습니다. 바로 "전원이 꺼지면 모든 데이터가 사라진다"는 것이죠. 

```
상황을 상상해보세요:
- 쇼핑몰 장바구니 데이터 → 서버 재시작 → 모두 사라짐
- 게임 순위표 → 정전 → 처음부터 다시
- 세션 정보 → 서버 장애 → 모든 사용자 로그아웃

이런 재앙을 막기 위해 Redis는 영속성을 제공합니다!
```

## Redis의 두 가지 영속성 전략

### 1. RDB (Redis Database) - 스냅샷 방식

마치 사진을 찍듯이 특정 시점의 전체 데이터를 저장합니다.

```
RDB 동작 원리:

1. 스냅샷 시작
   Parent Process: "자, 지금 데이터 상태를 저장하자"
   
2. Fork() 시스템 콜
   Parent → Fork() → Child Process 생성
   Parent: 계속 클라이언트 요청 처리
   Child: 스냅샷 저장 담당
   
3. COW (Copy-On-Write) 활용
   초기: Parent와 Child가 같은 메모리 페이지 공유
   수정 발생: 해당 페이지만 복사 (메모리 효율적!)
   
4. 디스크 저장
   Child: 메모리 데이터 → dump.rdb 파일
   완료 후 Child 프로세스 종료
```

**RDB 설정 예시:**

```bash
# redis.conf 설정
save 900 1      # 900초(15분)동안 1개 이상 키 변경 시 저장
save 300 10     # 300초(5분)동안 10개 이상 키 변경 시 저장  
save 60 10000   # 60초(1분)동안 10000개 이상 키 변경 시 저장

# 수동 스냅샷
BGSAVE  # 백그라운드에서 저장
SAVE    # 포그라운드에서 저장 (서비스 중단!)
```

**RDB의 장단점:**

```
장점:
✓ 파일 크기가 작음 (압축 저장)
✓ 복구 속도 빠름 (한 번에 로드)
✓ 특정 시점 백업에 적합
✓ 성능 영향 최소 (fork 사용)

단점:
✗ 데이터 손실 가능 (마지막 스냅샷 이후 데이터)
✗ Fork 시 메모리 사용량 증가 (최대 2배)
✗ 대용량 데이터는 저장 시간 오래 걸림
```

### 2. AOF (Append Only File) - 로그 방식

모든 쓰기 명령을 순서대로 기록합니다. 마치 일기를 쓰듯이!

```
AOF 동작 원리:

1. 쓰기 명령 수신
   Client: SET user:1 "Andrew"
   
2. 명령 실행
   Redis: 메모리에 데이터 저장
   
3. AOF 버퍼에 기록
   Buffer: "*3\r\n$3\r\nSET\r\n$6\r\nuser:1\r\n$6\r\nAndrew\r\n"
   
4. 디스크 동기화
   appendfsync always    # 모든 명령마다 (느리지만 안전)
   appendfsync everysec  # 1초마다 (균형적)
   appendfsync no        # OS에 맡김 (빠르지만 위험)
```

**AOF 파일 내용 예시:**

```
*2
$6
SELECT
$1
0
*3
$3
SET
$6
user:1
$6
Andrew
*3
$3
SET  
$6
user:2
$5
Kevin
```

### 3. AOF Rewrite - AOF 최적화

AOF 파일이 계속 커지는 문제를 해결합니다.

```
Rewrite 과정:

원본 AOF:
SET counter 1
INCR counter
INCR counter
INCR counter
DEL counter
SET counter 10

Rewrite 후:
SET counter 10  # 최종 상태만 저장!

동작 방식:
1. Fork()로 자식 프로세스 생성
2. 자식이 현재 메모리 상태를 새 AOF 파일로 작성
3. 부모는 임시 AOF 버퍼에 새 명령 기록
4. 자식 완료 후 임시 버퍼 내용 추가
5. 새 AOF 파일로 교체
```

**AOF Rewrite 설정:**

```bash
# 자동 Rewrite 조건
auto-aof-rewrite-percentage 100  # AOF 파일이 100% 커지면
auto-aof-rewrite-min-size 64mb   # 최소 64MB 이상일 때

# 수동 Rewrite
BGREWRITEAOF
```

## RDB + AOF 혼합 모드 (Redis 4.0+)

두 방식의 장점을 결합한 하이브리드 방식입니다.

```
혼합 모드 동작:

1. AOF Rewrite 시 RDB 형식으로 기본 데이터 저장
2. 이후 변경사항은 AOF 형식으로 추가

파일 구조:
[RDB 형식 데이터 (압축됨)]
[AOF 형식 증분 명령들]

장점:
✓ 빠른 복구 (RDB 로드 + AOF 적용)
✓ 작은 파일 크기
✓ 데이터 손실 최소화
```

## 복구 과정 상세

### Redis 시작 시 데이터 복구

```
복구 우선순위:

1. AOF 파일 확인
   있음 → AOF 로드 (더 최신 데이터)
   없음 → 2번으로
   
2. RDB 파일 확인  
   있음 → RDB 로드
   없음 → 빈 상태로 시작

AOF 복구 과정:
1. AOF 파일 열기
2. 명령어 하나씩 읽기
3. 각 명령어 재실행
4. 메모리 상태 복원 완료

RDB 복구 과정:
1. RDB 파일 읽기
2. 메모리에 한 번에 로드
3. 복원 완료 (AOF보다 빠름!)
```

## 실제 운영 시나리오별 설정

### 1. 캐시 서버 (데이터 손실 허용)
```bash
# RDB만 사용 (성능 우선)
save 3600 1  # 1시간마다 저장
appendonly no

# 이유: 캐시는 다시 생성 가능, 성능이 중요
```

### 2. 세션 스토어 (약간의 손실 허용)
```bash
# RDB + AOF everysec
save 900 1
save 300 10
appendonly yes
appendfsync everysec

# 이유: 1초 정도 손실은 감수, 성능과 안정성 균형
```

### 3. 금융 데이터 (손실 절대 불가)
```bash
# AOF always 모드
appendonly yes
appendfsync always
no-appendfsync-on-rewrite no

# 이유: 성능보다 데이터 안정성이 절대적
```

### 4. 분석 데이터 (대용량, 주기적 백업)
```bash
# RDB 위주 + AOF
save 3600 1000
appendonly yes
appendfsync no
auto-aof-rewrite-percentage 200

# 이유: 대용량 데이터, 실시간성보다 전체 백업 중요
```

## 영속성 관련 주의사항

### 1. 메모리 사용량 모니터링
```
Fork 시 필요 메모리:
현재 사용량: 10GB
최악의 경우: 20GB (2배)
실제로는: 12-15GB (COW 덕분에)

모니터링:
INFO memory
used_memory_peak_perc  # 피크 사용률 확인
```

### 2. 디스크 I/O 영향
```
AOF always 사용 시:
- 쓰기 성능 10-30% 감소
- SSD 사용 권장
- 별도 디스크 사용 고려

모니터링:
iostat -x 1  # 디스크 I/O 확인
```

### 3. 백업 전략
```bash
# 정기 백업 스크립트
#!/bin/bash
redis-cli BGSAVE
sleep 10
cp /var/lib/redis/dump.rdb /backup/dump-$(date +%Y%m%d-%H%M%S).rdb

# AOF 백업
cp /var/lib/redis/appendonly.aof /backup/
```

## 정리

Redis 영속성은 "속도"와 "안정성" 사이의 균형을 맞추는 예술입니다. 

- **RDB**: 빠르고 효율적이지만 데이터 손실 위험
- **AOF**: 안전하지만 성능 오버헤드
- **혼합 모드**: 두 마리 토끼를 모두 잡는 시도

여러분의 서비스가 무엇을 더 중요하게 생각하는지에 따라 적절한 전략을 선택하세요. 게임 캐시라면 RDB로 충분하지만, 결제 정보라면 AOF always가 필수입니다.

"메모리의 속도와 디스크의 영속성, 두 세계의 장점을 모두 가진 Redis!"