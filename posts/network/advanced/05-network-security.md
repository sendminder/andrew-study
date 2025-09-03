# 네트워크 보안: 공격과 방어의 끝없는 전쟁

안녕하세요! 오늘은 네트워크 보안의 깊은 세계로 들어가보겠습니다. 실제 공격 사례와 방어 기법, 그리고 제가 경험한 보안 사고들을 공유해드릴게요.

## 네트워크 보안의 기본 원칙

### CIA Triad

```
Confidentiality (기밀성)
├─ 암호화
├─ 접근 제어
└─ 데이터 마스킹

Integrity (무결성)
├─ 체크섬/해시
├─ 디지털 서명
└─ 메시지 인증 코드

Availability (가용성)
├─ 이중화
├─ DDoS 방어
└─ 장애 복구
```

### Defense in Depth (심층 방어)

양파처럼 여러 겹의 보안 계층:

```
인터넷
  ↓
[방화벽] - 1차 방어선
  ↓
[IDS/IPS] - 침입 탐지/방지
  ↓
[WAF] - 웹 애플리케이션 방화벽
  ↓
[네트워크 분리] - VLAN/서브넷
  ↓
[호스트 보안] - 엔드포인트 보호
  ↓
[애플리케이션 보안] - 시큐어 코딩
  ↓
[데이터 암호화] - 마지막 방어선
```

## TLS/SSL: 암호화 통신의 기초

### TLS Handshake 상세 분석

```
Client                              Server
  |                                    |
  |------ ClientHello ---------------→ | 1. 지원 암호 스위트 전송
  |  - TLS 버전                         |    
  |  - 지원 암호 스위트                    |
  |  - 랜덤 값                           |
  |                                    |
  |←----- ServerHello ---------------- | 2. 암호 스위트 선택
  |  - 선택된 암호 스위트                  |
  |  - 서버 랜덤 값                       |
  |                                    |
  |←----- Certificate ---------------- | 3. 서버 인증서
  |                                    |
  |←----- ServerKeyExchange ---------- | 4. 키 교환 파라미터
  |                                    |
  |←----- ServerHelloDone ------------ | 5. 서버 메시지 완료
  |                                    |
  |------ ClientKeyExchange ---------→ | 6. Pre-master secret
  |                                    |
  |------ ChangeCipherSpec ----------→ | 7. 암호화 시작 알림
  |                                    |
  |------ Finished ------------------→ | 8. 핸드셰이크 검증
  |                                    |
  |←----- ChangeCipherSpec ----------- | 9. 서버도 암호화 시작
  |                                    |
  |←----- Finished ------------------- | 10. 완료
  |                                    |
  [암호화된 애플리케이션 데이터 교환]
```

### 암호 스위트 이해하기

```
TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384

분해하면:
- TLS: 프로토콜
- ECDHE: 키 교환 (Elliptic Curve Diffie-Hellman Ephemeral)
- RSA: 인증 (서버 인증서 서명)
- AES_256_GCM: 대칭키 암호화 (256비트, Galois/Counter Mode)
- SHA384: 메시지 인증 코드
```

### TLS 1.3의 혁신

```
TLS 1.2: 2 RTT
TLS 1.3: 1 RTT
TLS 1.3 0-RTT: 재연결 시 즉시 데이터 전송

보안 개선:
- 약한 암호 제거
- Forward Secrecy 기본
- 핸드셰이크 암호화
```

## 주요 네트워크 공격 유형

### 1. DDoS (Distributed Denial of Service)

**Volume-based Attacks**

```
UDP Flood:
공격자들 → 대량 UDP 패킷 → 타겟 서버
          → 대역폭 소진 → 서비스 불가

ICMP Flood (Ping Flood):
ping -f -s 65500 target  # 절대 하지 마세요!

DNS Amplification:
작은 요청 → DNS 서버 → 큰 응답 → 피해자
(증폭률: 최대 70배)
```

**Protocol Attacks**

```
SYN Flood:
for i in range(1000000):
    send_syn(target, random_port())
    # ACK 보내지 않음
    # 서버의 half-open 연결 고갈

Slowloris:
HTTP 헤더를 아주 천천히 전송
연결을 오래 유지하여 연결 풀 고갈
```

**Application Layer Attacks**

```
HTTP Flood:
정상적인 HTTP 요청을 대량으로 전송
구분이 어려워 방어 까다로움

Cache Busting:
캐시되지 않는 요청 집중
매번 DB 조회 강제 → 서버 과부하
```

### 2. Man-in-the-Middle (MITM)

**ARP Spoofing**

```
정상:
Alice → Router → Bob

ARP Spoofing:
Alice → Attacker → Router → Bob
      ↙ (가로챔)
```

실제 공격 시나리오:
1. 공격자가 가짜 ARP 응답 전송
2. 피해자의 ARP 테이블 오염
3. 모든 트래픽이 공격자 경유
4. 패킷 스니핑, 변조 가능

**DNS Spoofing**

```
정상 DNS 응답:
google.com → 142.250.207.46

DNS Spoofing:
google.com → 10.0.0.100 (공격자 서버)
```

### 3. 포트 스캐닝과 취약점 탐지

**Nmap 스캔 유형**

```bash
# TCP SYN 스캔 (스텔스)
nmap -sS target

# TCP Connect 스캔
nmap -sT target

# UDP 스캔
nmap -sU target

# OS 탐지
nmap -O target

# 서비스 버전 탐지
nmap -sV target

# 스크립트 스캔
nmap -sC target
```

### 4. 세션 하이재킹

**TCP 세션 하이재킹**

```
1. 정상 세션 관찰
2. 시퀀스 번호 예측
3. 가짜 패킷 주입
4. 세션 탈취

방어:
- 암호화 (TLS)
- 랜덤 시퀀스 번호
- 세션 타임아웃
```

## 방어 기술과 도구

### 방화벽 (Firewall)

**Stateless vs Stateful**

```
Stateless (패킷 필터):
각 패킷을 독립적으로 검사
규칙: src_ip, dst_ip, port, protocol

Stateful (상태 추적):
연결 상태 테이블 유지
연결 컨텍스트 기반 판단
```

**iptables 규칙 예시**

```bash
# 기본 정책: 모두 차단
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# 루프백 허용
iptables -A INPUT -i lo -j ACCEPT

# 기존 연결 허용
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# SSH 허용 (특정 IP만)
iptables -A INPUT -p tcp -s 192.168.1.100 --dport 22 -j ACCEPT

# HTTP/HTTPS 허용
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# SYN Flood 방어
iptables -A INPUT -p tcp --syn -m limit --limit 1/s -j ACCEPT

# Ping 제한
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s -j ACCEPT
```

### IDS/IPS (침입 탐지/방지 시스템)

**Snort 규칙 예시**

```
# SQL Injection 탐지
alert tcp any any -> any 80 (msg:"SQL Injection Attempt"; 
  content:"' OR '1'='1"; nocase; sid:1001;)

# 포트 스캔 탐지
alert tcp any any -> any any (msg:"Port Scan Detected"; 
  flags:S; threshold:type both, track by_src, count 20, seconds 10; sid:1002;)

# 브루트포스 공격 탐지
alert tcp any any -> any 22 (msg:"SSH Brute Force"; 
  threshold:type both, track by_src, count 5, seconds 60; sid:1003;)
```

### WAF (Web Application Firewall)

**OWASP Top 10 방어**

```nginx
# ModSecurity 규칙 예시

# SQL Injection 방어
SecRule ARGS "@detectSQLi" \
    "id:1001,\
    phase:2,\
    block,\
    msg:'SQL Injection Attack',\
    logdata:'%{MATCHED_VAR}'"

# XSS 방어
SecRule ARGS|REQUEST_HEADERS "@contains <script" \
    "id:1002,\
    phase:2,\
    block,\
    msg:'XSS Attack'"

# 파일 업로드 제한
SecRule FILES_TMPNAMES "@rx \.(php|jsp|asp|aspx)$" \
    "id:1003,\
    phase:2,\
    block,\
    msg:'Malicious File Upload'"
```

### DDoS 방어

**Rate Limiting**

```nginx
# Nginx rate limiting
http {
    limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=addr:10m;
    
    server {
        location /api/ {
            limit_req zone=one burst=20 nodelay;
            limit_conn addr 10;
        }
    }
}
```

**SYN Cookies**

```bash
# Linux SYN cookies 활성화
echo 1 > /proc/sys/net/ipv4/tcp_syncookies

# SYN backlog 크기 증가
echo 2048 > /proc/sys/net/ipv4/tcp_max_syn_backlog

# SYN-ACK 재시도 감소
echo 2 > /proc/sys/net/ipv4/tcp_synack_retries
```

## VPN과 Zero Trust Network

### VPN 터널링

```
Site-to-Site VPN:
Office A ← IPSec Tunnel → Office B

Remote Access VPN:
User → VPN Client → VPN Server → Internal Network

Split Tunneling:
회사 트래픽 → VPN
인터넷 트래픽 → 직접 연결
```

### Zero Trust Architecture

"Never Trust, Always Verify"

```
전통적 모델:
외부 = 신뢰하지 않음
내부 = 신뢰함 (문제!)

Zero Trust:
모든 접근 = 검증 필요
- 사용자 인증
- 디바이스 검증
- 최소 권한
- 지속적 모니터링
```

## 실전 보안 사고 대응

### 사례 1: DDoS 공격 대응

**상황**: 초당 100Gbps UDP Flood

**대응 과정**:
1. CloudFlare DDoS 보호 활성화
2. UDP 포트 차단 (필수 포트 제외)
3. Rate limiting 강화
4. Anycast 네트워크로 트래픽 분산

**교훈**: 
- DDoS 대응 계획 사전 수립 필수
- 여러 방어 계층 필요
- 자동화된 대응 시스템 구축

### 사례 2: 데이터 유출 사고

**상황**: 내부자의 대량 데이터 반출

**대응 과정**:
1. 네트워크 세그멘테이션 강화
2. DLP (Data Loss Prevention) 도입
3. 아웃바운드 트래픽 모니터링
4. 접근 권한 최소화

**교훈**:
- 내부 위협도 고려
- 데이터 분류와 라벨링
- 행동 기반 탐지 필요

### 사례 3: 랜섬웨어 공격

**상황**: 파일 서버 암호화

**대응 과정**:
1. 감염 시스템 즉시 격리
2. 네트워크 세그먼트 차단
3. 백업에서 복구
4. 취약점 패치

**교훈**:
- 정기적 백업과 복구 테스트
- 네트워크 세그멘테이션 중요
- 직원 보안 교육 필수

## 보안 모니터링과 로깅

### 핵심 로그 수집

```bash
# 실패한 로그인 시도
grep "Failed password" /var/log/auth.log

# 수상한 네트워크 연결
netstat -tuln | grep ESTABLISHED

# 프로세스 모니터링
ps aux | grep -E "unusual|suspicious"

# 파일 무결성 모니터링
aide --check
```

### SIEM (Security Information and Event Management)

```
로그 수집 → 정규화 → 상관 분석 → 알림 → 대응

주요 지표:
- 비정상적인 로그인 패턴
- 대량 데이터 전송
- 알려진 악성 IP 접근
- 권한 상승 시도
```

## 보안 체크리스트

### 네트워크 보안
- [ ] 방화벽 규칙 최소 권한 원칙
- [ ] 불필요한 포트 차단
- [ ] 네트워크 세그멘테이션
- [ ] VPN 또는 Zero Trust 구현
- [ ] DDoS 방어 계획 수립

### 암호화
- [ ] TLS 1.2 이상 사용
- [ ] 강력한 암호 스위트만 허용
- [ ] 인증서 유효성 검증
- [ ] Perfect Forward Secrecy
- [ ] HSTS 헤더 설정

### 모니터링
- [ ] IDS/IPS 구축
- [ ] 로그 중앙 집중화
- [ ] 실시간 알림 설정
- [ ] 정기적 보안 감사
- [ ] 침투 테스트 실시

### 인증과 접근 제어
- [ ] 다단계 인증 (MFA)
- [ ] 최소 권한 원칙
- [ ] 정기적 권한 검토
- [ ] 세션 타임아웃 설정
- [ ] 강력한 패스워드 정책

## 마무리: 보안은 여정이지 목적지가 아니다

네트워크 보안은 끊임없는 고양이와 쥐의 게임입니다. 공격자는 항상 새로운 방법을 찾고, 방어자는 한 발 앞서 나가려 노력하죠.

제가 15년간 보안 분야에서 배운 교훈:

1. **완벽한 보안은 없다**: 항상 개선할 점이 있습니다
2. **사람이 가장 약한 고리**: 기술보다 교육이 중요
3. **단순함이 최고**: 복잡한 시스템은 취약점도 많습니다
4. **가정하지 말고 검증하라**: 모든 것을 의심하세요
5. **사고 대응 계획은 필수**: 언제든 일어날 수 있습니다

보안은 비용이 아니라 투자입니다. 한 번의 보안 사고가 회사를 망하게 할 수 있으니까요.

네트워크 시리즈를 마치며, 여러분이 더 안전하고 효율적인 네트워크를 구축하는 데 도움이 되었기를 바랍니다. Stay secure! 🔐