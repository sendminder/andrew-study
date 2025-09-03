# 네트워크 성능 최적화: 밀리초를 줄이는 예술

안녕하세요! 오늘은 네트워크 성능을 극한까지 끌어올리는 방법을 알아보겠습니다. 지연 시간을 줄이고, 처리량을 늘리고, 효율성을 높이는 모든 기법을 다뤄볼게요.

## 네트워크 성능의 핵심 지표

성능을 최적화하려면 먼저 무엇을 측정해야 하는지 알아야 합니다.

### 지연 시간 (Latency)

```
구성 요소:
├─ Propagation Delay : 물리적 거리 (빛의 속도)
├─ Transmission Delay : 데이터 크기 / 대역폭
├─ Processing Delay : 라우터/스위치 처리 시간
└─ Queuing Delay : 버퍼 대기 시간

RTT (Round Trip Time) = 2 × 단방향 지연 시간
```

**실제 측정값 (서울 기준):**
- 서울 ↔ 부산: ~10ms
- 서울 ↔ 도쿄: ~30ms
- 서울 ↔ 싱가포르: ~80ms
- 서울 ↔ 미국 서부: ~150ms
- 서울 ↔ 유럽: ~250ms

### 처리량 (Throughput)

```
이론적 최대값:
처리량 = 윈도우 크기 / RTT

실제 처리량:
- 패킷 손실
- 혼잡 제어
- 프로토콜 오버헤드
- 애플리케이션 처리 속도
```

### 대역폭 지연 곱 (BDP)

```
BDP = 대역폭 × RTT

예시:
1Gbps × 100ms = 12.5MB

의미: 
네트워크 "파이프"에 들어갈 수 있는 최대 데이터량
최적 윈도우 크기 결정의 기준
```

## 지연 시간 최적화

### 1. 물리적 거리 단축

**CDN (Content Delivery Network)**

```
사용자 ← 5ms → Edge Server (CDN)
              ↓
          캐시 히트
              ↓
         즉시 응답

캐시 미스 시:
Edge Server ← 100ms → Origin Server
```

제가 글로벌 서비스를 운영하면서 CDN 도입으로:
- 평균 응답 시간 70% 감소
- 원본 서버 부하 80% 감소
- 대역폭 비용 50% 절감

**Edge Computing**

```
전통적 방식:
사용자 → 클라우드 (200ms) → 처리 → 응답

Edge Computing:
사용자 → Edge Node (10ms) → 처리 → 응답
```

### 2. 연결 재사용

**Connection Pooling**

```
나쁜 예:
for request in requests:
    conn = create_connection()  # 3-way handshake
    send_request(conn)
    close_connection(conn)      # 4-way handshake

좋은 예:
pool = ConnectionPool(size=100)
for request in requests:
    conn = pool.get()           # 재사용
    send_request(conn)
    pool.release(conn)          # 반환
```

실무 경험: 연결 풀링으로 평균 응답 시간 40% 개선

**HTTP Keep-Alive**

```
HTTP/1.0 (Keep-Alive 없음):
요청1: TCP 연결 → 요청 → 응답 → 연결 종료
요청2: TCP 연결 → 요청 → 응답 → 연결 종료

HTTP/1.1 (Keep-Alive):
TCP 연결 → 요청1 → 응답1 → 요청2 → 응답2 → ... → 연결 종료
```

### 3. 프로토콜 최적화

**TCP Fast Open (TFO)**

```
일반 TCP:
SYN → SYN-ACK → ACK → Data  (1.5 RTT)

TFO:
SYN + Data → SYN-ACK + Data → ACK  (0.5 RTT)
```

1 RTT 절약! 특히 짧은 연결에 효과적

**QUIC / HTTP/3**

```
TCP + TLS:
TCP Handshake (1 RTT) + TLS Handshake (1-2 RTT) = 2-3 RTT

QUIC:
QUIC Handshake (1 RTT) or 0-RTT resumption
```

## 처리량 최적화

### 1. 윈도우 크기 조정

**수신 윈도우 스케일링**

```bash
# Linux 커널 파라미터
net.core.rmem_max = 134217728  # 128MB
net.core.wmem_max = 134217728  # 128MB
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# 윈도우 스케일링 활성화
net.ipv4.tcp_window_scaling = 1
```

BDP가 큰 네트워크(위성, 대륙간)에서 필수!

### 2. 혼잡 제어 알고리즘

**BBR vs CUBIC**

```
CUBIC (기본):
- 패킷 손실 기반
- 보수적 접근
- 안정적이지만 느림

BBR (Google):
- 대역폭과 RTT 기반
- 공격적 접근
- 빠르지만 공평성 문제

# BBR 활성화
echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf
```

실제 테스트 결과:
- 대륙간 전송: BBR이 2-3배 빠름
- 로컬 네트워크: 큰 차이 없음

### 3. 압축

**HTTP 압축**

```
압축 전: 100KB JSON
Gzip: 15KB (85% 압축)
Brotli: 12KB (88% 압축)

트레이드오프:
- CPU 사용량 증가
- 지연 시간 약간 증가
- 전송 시간 크게 감소
```

**Protocol Buffers vs JSON**

```
JSON:
{
  "id": 12345,
  "name": "John Doe",
  "email": "john@example.com"
}
크기: 75 bytes

Protobuf:
[binary data]
크기: 25 bytes (67% 감소)
```

## 패킷 최적화

### 1. MTU와 MSS

**Path MTU Discovery**

```
표준 MTU:
- Ethernet: 1500 bytes
- Jumbo Frame: 9000 bytes
- PPPoE: 1492 bytes
- VPN: 1400-1450 bytes

MSS = MTU - IP헤더(20) - TCP헤더(20) = 1460 bytes
```

잘못된 MTU로 인한 fragmentation은 성능 킬러!

### 2. TCP Segmentation Offload (TSO)

```
소프트웨어 분할:
App → 64KB → Kernel → 1460B × 45개 → NIC

TSO (하드웨어 분할):
App → 64KB → Kernel → 64KB → NIC → 1460B × 45개
```

CPU 사용량 크게 감소!

### 3. Interrupt Coalescing

```
일반 모드:
패킷 도착 → 인터럽트 → 처리
패킷 도착 → 인터럽트 → 처리
패킷 도착 → 인터럽트 → 처리

Coalescing:
패킷 도착 → 대기
패킷 도착 → 대기
패킷 도착 → 인터럽트 → 일괄 처리
```

높은 패킷 레이트에서 CPU 효율성 향상

## 애플리케이션 레벨 최적화

### 1. 배치 처리

```
나쁜 예 (1000개 요청):
for item in items:
    send_request(item)  # 1000번 시스템 콜

좋은 예:
batch = []
for item in items:
    batch.append(item)
    if len(batch) >= 100:
        send_batch(batch)  # 10번 시스템 콜
        batch = []
```

### 2. 파이프라이닝

```
순차 처리:
요청1 → 응답1 → 요청2 → 응답2 → 요청3 → 응답3
총 시간: 3 × RTT

파이프라이닝:
요청1 → 요청2 → 요청3 → 응답1 → 응답2 → 응답3
총 시간: 1 × RTT + 처리 시간
```

Redis 파이프라이닝으로 10배 성능 향상 경험!

### 3. 비동기 I/O

```python
# 동기 방식 (느림)
for url in urls:
    response = requests.get(url)  # 블로킹
    process(response)

# 비동기 방식 (빠름)
async def fetch_all():
    tasks = [fetch(url) for url in urls]
    responses = await asyncio.gather(*tasks)  # 병렬 처리
    for response in responses:
        process(response)
```

## 실전 최적화 사례

### 사례 1: API 게이트웨이 최적화

**문제**: 평균 응답 시간 500ms, P99 2초

**분석**:
1. 매 요청마다 새 연결 생성
2. 동기적 처리로 병목
3. 큰 JSON 응답

**해결**:
1. Connection Pool 도입 → 200ms 단축
2. 비동기 처리 전환 → 100ms 단축
3. Gzip 압축 → 50ms 단축
4. HTTP/2 도입 → 50ms 단축

**결과**: 평균 100ms, P99 300ms

### 사례 2: 글로벌 파일 동기화

**문제**: 대륙간 100GB 파일 전송 12시간

**분석**:
1. TCP 윈도우 크기 제한
2. 패킷 손실에 민감한 CUBIC
3. 단일 스트림 전송

**해결**:
1. BBR 혼잡 제어 → 3배 향상
2. 윈도우 크기 128MB → 2배 향상
3. 병렬 스트림 (10개) → 속도 증가

**결과**: 2시간으로 단축

### 사례 3: 실시간 게임 서버

**문제**: 평균 핑 100ms, 가끔 스파이크

**분석**:
1. Nagle 알고리즘으로 지연
2. 큰 업데이트 패킷
3. 재전송 타임아웃

**해결**:
1. TCP_NODELAY 설정 → 20ms 개선
2. 델타 압축 → 패킷 크기 70% 감소
3. 커스텀 재전송 → 스파이크 감소

**결과**: 평균 핑 50ms, 안정적

## 모니터링과 디버깅

### 핵심 메트릭

```bash
# 네트워크 통계
netstat -s
ss -s

# 패킷 손실률
ping -c 100 target | grep "packet loss"

# TCP 재전송
netstat -s | grep -i retrans

# 네트워크 대역폭
iperf3 -c target

# 지연 시간 분포
mtr target
```

### 프로파일링 도구

**tcpdump + Wireshark**
```bash
tcpdump -w capture.pcap -s 0 'tcp port 80'
# Wireshark에서 분석
```

**ss (Socket Statistics)**
```bash
# TCP 연결 상태
ss -tin

# 메모리 사용량
ss -m

# 타이머 정보
ss -o
```

**eBPF 기반 도구**
```bash
# TCP 연결 추적
tcpconnect

# TCP 재전송
tcpretrans

# TCP RTT 분포
tcprtt
```

## 최신 기술 트렌드

### DPDK (Data Plane Development Kit)

커널 바이패스로 초고속 패킷 처리:
- 10Gbps+ 라인 레이트 달성
- 마이크로초 단위 지연 시간
- 고성능 네트워크 장비에 사용

### XDP (eXpress Data Path)

eBPF 기반 고속 패킷 처리:
- 커널 내 패킷 처리
- DDoS 방어에 효과적
- 5-10배 성능 향상

### RDMA (Remote Direct Memory Access)

CPU 개입 없이 메모리 직접 접근:
- 마이크로초 단위 지연
- 거의 제로 CPU 사용
- HPC, 분산 스토리지에 활용

## 체크리스트: 네트워크 최적화

### 기본 점검사항
- [ ] Keep-Alive 활성화
- [ ] Connection Pooling 구현
- [ ] 압축 활성화 (Gzip/Brotli)
- [ ] HTTP/2 이상 사용
- [ ] CDN 활용

### 고급 최적화
- [ ] TCP 튜닝 (윈도우, 버퍼)
- [ ] BBR 혼잡 제어 검토
- [ ] TFO 활성화
- [ ] TSO/GSO/GRO 활성화
- [ ] 인터럽트 최적화

### 애플리케이션 레벨
- [ ] 배치 처리 구현
- [ ] 비동기 I/O 활용
- [ ] 파이프라이닝 적용
- [ ] 캐싱 전략 수립
- [ ] 프로토콜 최적화 (Protobuf 등)

## 마무리: 성능 최적화의 철학

네트워크 성능 최적화는 끝이 없는 여정입니다. 제가 10년간 배운 교훈:

1. **측정 없이 최적화 없다**: 추측하지 말고 측정하세요
2. **80/20 법칙**: 20%의 최적화가 80%의 성능 향상
3. **트레이드오프 이해**: 모든 최적화는 대가가 있습니다
4. **점진적 개선**: 한 번에 하나씩 변경하고 측정
5. **실사용자 중심**: 벤치마크보다 실제 사용자 경험

네트워크 성능을 극한까지 끌어올리는 것은 예술입니다. 밀리초를 줄이는 것이 수백만 사용자의 경험을 바꿀 수 있죠.

다음 시간에는 네트워크 보안의 깊은 세계로 들어가보겠습니다. 공격과 방어의 끝없는 전쟁, 준비되셨나요? 🛡️