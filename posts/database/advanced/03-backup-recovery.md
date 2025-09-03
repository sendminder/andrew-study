# 백업과 복구: 재해에서 살아남는 법

안녕하세요! 오늘은 DBA의 가장 중요한 임무, 백업과 복구에 대해 알아보겠습니다. "백업이 없으면 복구도 없다"는 말처럼, 데이터를 지키는 최후의 보루를 함께 구축해볼까요?

## 백업의 기본 원칙

### 3-2-1 규칙

```
3개의 백업 복사본
2개의 다른 미디어
1개의 오프사이트 백업

예시:
- 원본: 프로덕션 서버
- 백업 1: 로컬 백업 서버
- 백업 2: 클라우드 스토리지 (다른 미디어)
- 백업 3: 다른 지역 데이터센터 (오프사이트)
```

### RPO와 RTO

```
RPO (Recovery Point Objective): 데이터 손실 허용 시간
- "최대 몇 분의 데이터 손실을 감수할 수 있나?"
- 예: RPO 1시간 = 최대 1시간 데이터 손실 허용

RTO (Recovery Time Objective): 복구 소요 시간
- "얼마나 빨리 복구해야 하나?"
- 예: RTO 4시간 = 4시간 내 서비스 정상화

비즈니스 요구사항에 따른 전략:
- 금융: RPO 0분, RTO 1시간 → 실시간 복제 필요
- 블로그: RPO 24시간, RTO 24시간 → 일일 백업으로 충분
```

## 백업 유형

### 물리적 백업 vs 논리적 백업

**물리적 백업 (Physical Backup)**

```bash
# 데이터 파일 직접 복사
cp -r /var/lib/mysql /backup/mysql

장점:
- 빠른 백업과 복구
- 전체 데이터베이스 일관성
- 증분 백업 가능

단점:
- 같은 DB 버전 필요
- 플랫폼 종속적
- 부분 복구 어려움
```

**논리적 백업 (Logical Backup)**

```bash
# SQL 문으로 내보내기
mysqldump -u root -p database > backup.sql
pg_dump database > backup.sql

장점:
- 플랫폼 독립적
- 버전 간 이식 가능
- 부분 복구 쉬움
- 텍스트로 검토 가능

단점:
- 느린 백업과 복구
- 큰 저장 공간
- 실행 중 백업 어려움
```

### 전체 vs 증분 vs 차등 백업

```
전체 백업 (Full Backup):
일 월 화 수 목 금 토
F  -  -  -  -  -  F
모든 데이터 백업

증분 백업 (Incremental Backup):
일 월 화 수 목 금 토
F  I  I  I  I  I  F
마지막 백업 이후 변경분만

차등 백업 (Differential Backup):
일 월 화 수 목 금 토
F  D  D  D  D  D  F
전체 백업 이후 모든 변경분

복구 시나리오 (목요일 장애):
- 전체: 일요일 백업만 복구
- 증분: 일 + 월 + 화 + 수 백업 순서대로 복구
- 차등: 일 + 수 백업만 복구
```

## MySQL 백업 전략

### mysqldump

```bash
# 전체 데이터베이스 백업
mysqldump -u root -p --all-databases > all_databases.sql

# 단일 데이터베이스
mysqldump -u root -p mydb > mydb.sql

# 특정 테이블만
mysqldump -u root -p mydb table1 table2 > tables.sql

# 옵션 설명
--single-transaction  # InnoDB 일관성 백업
--lock-tables        # MyISAM 테이블 락
--master-data=2      # 복제 위치 정보 포함
--routines          # 저장 프로시저 포함
--triggers          # 트리거 포함
--events            # 이벤트 포함

# 압축 백업
mysqldump -u root -p mydb | gzip > mydb.sql.gz

# 복구
mysql -u root -p mydb < mydb.sql
gunzip < mydb.sql.gz | mysql -u root -p mydb
```

### Percona XtraBackup (물리적 백업)

```bash
# 전체 백업
xtrabackup --backup --target-dir=/backup/full

# 증분 백업
xtrabackup --backup --target-dir=/backup/inc1 \
           --incremental-basedir=/backup/full

# 준비 단계 (복구 전 필수)
xtrabackup --prepare --target-dir=/backup/full
xtrabackup --prepare --target-dir=/backup/full \
           --incremental-dir=/backup/inc1

# 복구
xtrabackup --copy-back --target-dir=/backup/full
chown -R mysql:mysql /var/lib/mysql

장점:
- 온라인 백업 (서비스 중단 없음)
- 빠른 백업과 복구
- 증분 백업 지원
```

### MySQL 바이너리 로그 백업

```bash
# binlog 설정 (my.cnf)
log_bin = /var/log/mysql/mysql-bin
expire_logs_days = 7
max_binlog_size = 100M

# binlog 백업
mysqlbinlog mysql-bin.000001 > binlog_backup.sql

# Point-in-Time Recovery
# 1. 전체 백업 복구
mysql < full_backup.sql

# 2. binlog 적용 (특정 시점까지)
mysqlbinlog --stop-datetime="2024-01-15 10:00:00" \
            mysql-bin.000001 mysql-bin.000002 | mysql

# 특정 트랜잭션 제외
mysqlbinlog --start-position=100 --stop-position=500 \
            mysql-bin.000001 | mysql
```

## PostgreSQL 백업 전략

### pg_dump와 pg_dumpall

```bash
# 단일 데이터베이스 백업
pg_dump mydb > mydb.sql
pg_dump -Fc mydb > mydb.custom  # 커스텀 형식 (압축)
pg_dump -Ft mydb > mydb.tar     # tar 형식

# 전체 클러스터 백업
pg_dumpall > all_databases.sql

# 병렬 백업 (빠름)
pg_dump -j 4 -Fd -f /backup/mydb mydb

# 복구
psql mydb < mydb.sql
pg_restore -d mydb mydb.custom
pg_restore -j 4 -d mydb /backup/mydb  # 병렬 복구

# 옵션
--clean             # DROP 문 포함
--if-exists         # IF EXISTS 추가
--no-owner          # 소유자 정보 제외
--no-privileges     # 권한 정보 제외
--schema-only       # 스키마만
--data-only         # 데이터만
```

### pg_basebackup (물리적 백업)

```bash
# 기본 백업
pg_basebackup -h localhost -D /backup/base -P -U postgres

# tar 형식으로 압축
pg_basebackup -h localhost -D /backup/base -Ft -z -P

# 스트리밍 복제용 백업
pg_basebackup -h localhost -D /backup/base -X stream -P

# WAL 아카이빙 설정 (postgresql.conf)
wal_level = replica
archive_mode = on
archive_command = 'cp %p /archive/%f'

# 복구 설정 (recovery.conf)
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2024-01-15 10:00:00'
```

### PITR (Point-In-Time Recovery)

```bash
# 1. 지속적 아카이빙 설정
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'

# 2. 베이스 백업 생성
pg_basebackup -D /backup/base -X fetch

# 3. 복구
# 데이터 디렉토리 준비
rm -rf /var/lib/postgresql/14/main/*
cp -r /backup/base/* /var/lib/postgresql/14/main/

# recovery.signal 생성
touch /var/lib/postgresql/14/main/recovery.signal

# postgresql.conf에 복구 설정
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2024-01-15 10:00:00'
recovery_target_action = 'promote'

# 서버 시작
systemctl start postgresql
```

## 실시간 복제와 고가용성

### MySQL 복제

```sql
-- 마스터 설정
-- my.cnf
[mysqld]
server-id = 1
log_bin = mysql-bin
binlog_do_db = mydb

-- 복제 사용자 생성
CREATE USER 'repl'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';

-- 마스터 상태 확인
SHOW MASTER STATUS;

-- 슬레이브 설정
-- my.cnf
[mysqld]
server-id = 2

-- 슬레이브 시작
CHANGE MASTER TO
    MASTER_HOST='master_ip',
    MASTER_USER='repl',
    MASTER_PASSWORD='password',
    MASTER_LOG_FILE='mysql-bin.000001',
    MASTER_LOG_POS=154;

START SLAVE;
SHOW SLAVE STATUS\G
```

### PostgreSQL 스트리밍 복제

```bash
# Primary 설정
# postgresql.conf
wal_level = replica
max_wal_senders = 3
wal_keep_segments = 64

# pg_hba.conf
host replication repl_user replica_ip/32 md5

# Standby 설정
# 베이스 백업
pg_basebackup -h primary_ip -D /var/lib/postgresql/14/main \
              -U repl_user -P -v -R -X stream

# postgresql.conf
hot_standby = on

# 복제 상태 확인 (Primary)
SELECT * FROM pg_stat_replication;

# 복제 지연 확인 (Standby)
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;
```

## 클라우드 백업 전략

### AWS RDS 백업

```bash
# 자동 백업 설정
aws rds modify-db-instance \
    --db-instance-identifier mydb \
    --backup-retention-period 7 \
    --preferred-backup-window "03:00-04:00"

# 수동 스냅샷 생성
aws rds create-db-snapshot \
    --db-instance-identifier mydb \
    --db-snapshot-identifier mydb-snapshot-$(date +%Y%m%d)

# 스냅샷에서 복구
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier mydb-restored \
    --db-snapshot-identifier mydb-snapshot-20240115

# Point-in-Time 복구
aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier mydb \
    --target-db-instance-identifier mydb-pitr \
    --restore-time 2024-01-15T10:00:00.000Z
```

### S3로 백업

```bash
# S3 동기화
aws s3 sync /backup s3://my-backup-bucket/database/

# 압축 후 업로드
tar czf - /var/lib/mysql | \
    aws s3 cp - s3://my-backup-bucket/mysql-backup-$(date +%Y%m%d).tar.gz

# 수명 주기 정책 설정
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-backup-bucket \
    --lifecycle-configuration file://lifecycle.json

# lifecycle.json
{
    "Rules": [{
        "Id": "DeleteOldBackups",
        "Status": "Enabled",
        "Expiration": {
            "Days": 30
        },
        "Transitions": [{
            "Days": 7,
            "StorageClass": "GLACIER"
        }]
    }]
}
```

## 재해 복구 시나리오

### 시나리오 1: 실수로 테이블 삭제

```sql
-- 사고 발생: 2024-01-15 14:30
DROP TABLE important_table;  -- 앗!

-- 복구 방법 1: 백업에서 특정 테이블만
-- 백업 파일에서 테이블 추출
sed -n '/CREATE TABLE `important_table`/,/UNLOCK TABLES/p' \
    backup.sql > table_restore.sql
mysql mydb < table_restore.sql

-- 복구 방법 2: binlog에서 DROP 직전까지
mysqlbinlog --stop-datetime="2024-01-15 14:29:59" \
            mysql-bin.* | mysql

-- 복구 방법 3: 다른 서버에 전체 복구 후 테이블만 복사
mysql temp_db < full_backup.sql
mysqldump temp_db important_table | mysql production_db
```

### 시나리오 2: 랜섬웨어 공격

```bash
# 1. 즉시 격리
systemctl stop mysql
iptables -A INPUT -j DROP

# 2. 깨끗한 환경 준비
# 새 서버 준비 또는 OS 재설치

# 3. 감염 시점 파악
# 로그 분석으로 감염 시작 시간 확인

# 4. 감염 전 백업 찾기
# 오프사이트 백업 확인

# 5. 복구
# 안전한 백업에서 복구
mysql < safe_backup.sql

# 6. binlog로 최신 데이터 복구
mysqlbinlog --start-datetime="backup_time" \
            --stop-datetime="infection_time" \
            mysql-bin.* | mysql
```

### 시나리오 3: 데이터센터 전체 장애

```yaml
# DR (Disaster Recovery) 계획
1. RTO/RPO 확인:
   - RTO: 4시간
   - RPO: 1시간

2. DR 사이트 활성화:
   - DNS 전환
   - 로드밸런서 설정

3. 데이터 복구:
   - 최신 복제 서버 승격
   - 또는 클라우드 백업에서 복구

4. 애플리케이션 시작:
   - 설정 파일 업데이트
   - 서비스 시작

5. 검증:
   - 데이터 일관성 확인
   - 기능 테스트
```

## 백업 테스트

### 복구 훈련

```bash
#!/bin/bash
# 월간 복구 테스트 스크립트

# 1. 테스트 환경 준비
TEST_DIR="/tmp/restore_test"
mkdir -p $TEST_DIR

# 2. 백업 파일 선택 (랜덤)
BACKUP_FILE=$(ls /backup/*.sql | sort -R | head -1)
echo "Testing backup: $BACKUP_FILE"

# 3. 테스트 DB 생성
mysql -e "CREATE DATABASE test_restore"

# 4. 복구 시도
if mysql test_restore < $BACKUP_FILE; then
    echo "복구 성공"
    
    # 5. 데이터 검증
    ROW_COUNT=$(mysql -sN -e "SELECT COUNT(*) FROM test_restore.users")
    if [ $ROW_COUNT -gt 0 ]; then
        echo "데이터 확인: $ROW_COUNT rows"
    else
        echo "경고: 데이터 없음"
    fi
else
    echo "복구 실패!"
    exit 1
fi

# 6. 정리
mysql -e "DROP DATABASE test_restore"
```

### 백업 무결성 검증

```bash
# 체크섬 생성
md5sum backup.sql > backup.sql.md5

# 검증
md5sum -c backup.sql.md5

# 백업 파일 테스트 (dry run)
mysql --execute="SELECT 1" < backup.sql 2>/dev/null
if [ $? -eq 0 ]; then
    echo "백업 파일 정상"
else
    echo "백업 파일 손상!"
fi
```

## 모니터링과 알림

### 백업 모니터링

```bash
#!/bin/bash
# 백업 상태 체크

# 최근 백업 확인
LAST_BACKUP=$(find /backup -name "*.sql" -mtime -1 | head -1)

if [ -z "$LAST_BACKUP" ]; then
    echo "경고: 24시간 내 백업 없음" | \
        mail -s "백업 경고" admin@example.com
fi

# 백업 크기 확인
BACKUP_SIZE=$(du -sh /backup | cut -f1)
echo "백업 디렉토리 크기: $BACKUP_SIZE"

# 디스크 공간 확인
DISK_USAGE=$(df -h /backup | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "경고: 백업 디스크 사용률 $DISK_USAGE%" | \
        mail -s "디스크 경고" admin@example.com
fi
```

## 백업 정책 수립

### 백업 계획 템플릿

```yaml
백업 정책:
  환경:
    - Production: 
        전체 백업: 매일 02:00
        증분 백업: 매시간
        보관 기간: 30일
        오프사이트: AWS S3
    
    - Staging:
        전체 백업: 매주 일요일
        보관 기간: 7일
    
    - Development:
        전체 백업: 요청 시
        보관 기간: 3일

  백업 유형:
    - 데이터베이스: mysqldump + binlog
    - 파일 시스템: rsync
    - 설정 파일: git

  복구 목표:
    - RPO: 1시간
    - RTO: 4시간

  테스트:
    - 주간: 자동 복구 테스트
    - 월간: 전체 DR 훈련
    - 분기: 보안 감사

  책임자:
    - 백업 실행: DBA 팀
    - 모니터링: DevOps 팀
    - DR 계획: CTO
```

## 체크리스트: 백업과 복구

- [ ] 3-2-1 규칙 준수
- [ ] RPO/RTO 정의
- [ ] 자동 백업 스케줄 설정
- [ ] 백업 검증 자동화
- [ ] 복구 절차 문서화
- [ ] 정기 복구 훈련
- [ ] 모니터링 및 알림 설정
- [ ] 오프사이트 백업 구성
- [ ] 암호화 백업 설정
- [ ] 백업 보관 정책 수립

## 마무리: 백업은 보험이다

백업과 복구는 지루하지만 가장 중요한 작업입니다. 제가 15년간 DBA로 일하면서 배운 교훈:

1. **백업은 있는데 복구가 안 되면 무용지물**
2. **테스트하지 않은 백업은 없는 것과 같다**
3. **자동화가 핵심 - 사람은 실수한다**
4. **3-2-1 규칙은 최소 요구사항**
5. **DR 계획은 실제로 써봐야 안다**

"백업을 안 해서 후회하는 것보다, 백업을 해서 후회하는 게 낫다"

여러분의 데이터는 안전한가요? 지금 바로 백업 상태를 확인해보세요! 💾