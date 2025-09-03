# 소켓 프로그래밍: 네트워크의 가장 낮은 레벨에서 춤추기

안녕하세요! 오늘은 소켓 프로그래밍의 깊은 세계로 들어가보겠습니다. 블로킹과 논블로킹, 동기와 비동기, 그리고 현대적인 I/O 멀티플렉싱까지 함께 탐험해볼까요?

## 소켓이란 무엇인가?

소켓은 프로세스 간 통신의 끝점(endpoint)입니다. 전화기와 비슷하다고 생각하면 쉬워요. 전화번호(IP:Port)로 연결하고, 대화(데이터 전송)를 나누죠.

### 소켓의 종류

```
도메인 (Domain):
├─ AF_INET   : IPv4 인터넷 프로토콜
├─ AF_INET6  : IPv6 인터넷 프로토콜
├─ AF_UNIX   : 로컬 통신 (Unix Domain Socket)
└─ AF_PACKET : 저수준 패킷 인터페이스

타입 (Type):
├─ SOCK_STREAM : TCP (연결 지향, 신뢰성)
├─ SOCK_DGRAM  : UDP (비연결, 비신뢰성)
└─ SOCK_RAW    : Raw 소켓 (IP 레벨 접근)

프로토콜 (Protocol):
├─ IPPROTO_TCP : TCP 프로토콜
├─ IPPROTO_UDP : UDP 프로토콜
└─ IPPROTO_RAW : Raw IP 프로토콜
```

## 소켓의 생명주기

### TCP 서버 소켓

```
1. socket()    : 소켓 생성
2. bind()      : 주소 할당
3. listen()    : 연결 대기 상태
4. accept()    : 연결 수락
5. read/write  : 데이터 송수신
6. close()     : 소켓 종료
```

### TCP 클라이언트 소켓

```
1. socket()    : 소켓 생성
2. connect()   : 서버 연결
3. read/write  : 데이터 송수신
4. close()     : 소켓 종료
```

## 블로킹 vs 논블로킹

이 개념은 정말 중요합니다. 제가 처음 네트워크 프로그래밍을 시작했을 때 가장 헷갈렸던 부분이죠.

### 블로킹 I/O

"기다림의 미학"

```
블로킹 read() 호출:
1. 데이터 도착할 때까지 대기
2. 프로세스/스레드 블록됨
3. 데이터 도착하면 복귀

장점:
- 프로그래밍 단순
- 순차적 실행
- 디버깅 쉬움

단점:
- 동시 처리 어려움
- 리소스 낭비
- 확장성 제한
```

### 논블로킹 I/O

"기다리지 않는 삶"

```
논블로킹 read() 호출:
1. 즉시 반환
2. 데이터 없으면 EAGAIN/EWOULDBLOCK
3. 주기적으로 확인 필요

장점:
- 동시 처리 가능
- 리소스 효율적
- 높은 확장성

단점:
- 프로그래밍 복잡
- Busy waiting 위험
- 에러 처리 복잡
```

## 동기 vs 비동기

블로킹/논블로킹과 자주 혼동되는 개념입니다.

### 동기 (Synchronous)

"결과를 직접 받아요"

```
동기 방식:
result = operation();
// operation 완료 후 result 사용
process(result);
```

### 비동기 (Asynchronous)

"나중에 알려줄게요"

```
비동기 방식:
operation(callback);
// operation 진행 중에도 다른 작업 가능
do_other_work();
// callback이 결과와 함께 호출됨
```

### 4가지 조합

```
1. 동기 + 블로킹 (전통적)
   - 일반적인 read(), write()
   - 간단하지만 비효율적

2. 동기 + 논블로킹 (폴링)
   - 논블로킹 소켓 + 반복 확인
   - CPU 낭비 가능성

3. 비동기 + 블로킹 (거의 없음)
   - 이론적으로만 존재
   - 실용성 없음

4. 비동기 + 논블로킹 (최적)
   - epoll, kqueue, IOCP
   - 고성능 서버의 선택
```

## I/O 멀티플렉싱: 진화의 역사

### select (1983)

최초의 I/O 멀티플렉싱 메커니즘

```
장점:
- 거의 모든 OS 지원
- 간단한 인터페이스

단점:
- FD_SETSIZE 제한 (보통 1024)
- O(n) 복잡도
- fd_set 복사 오버헤드
```

실무 경험: 1000개 이상 연결에서 성능 급격히 저하

### poll (1986)

select의 개선 버전

```
장점:
- 파일 디스크립터 제한 없음
- 더 세밀한 이벤트 제어

단점:
- 여전히 O(n) 복잡도
- 모든 fd 순회 필요
```

### epoll (Linux, 2002)

리눅스의 게임 체인저

```
장점:
- O(1) 복잡도
- Edge/Level Triggered 모드
- 대규모 연결 처리 가능

단점:
- Linux 전용
- 복잡한 인터페이스

핵심 API:
- epoll_create(): epoll 인스턴스 생성
- epoll_ctl(): fd 추가/수정/삭제
- epoll_wait(): 이벤트 대기
```

### kqueue (BSD/macOS)

BSD 계열의 강력한 도구

```
장점:
- 파일, 소켓, 타이머 등 다양한 이벤트
- 뛰어난 성능
- 유연한 필터링

단점:
- BSD/macOS 전용
- 학습 곡선 가파름
```

### io_uring (Linux, 2019)

최신 비동기 I/O 인터페이스

```
장점:
- 진정한 비동기 I/O
- 시스템 콜 오버헤드 최소화
- 놀라운 성능

단점:
- Linux 5.1+ 필요
- 복잡한 프로그래밍 모델
- 아직 생태계 미성숙
```

## 실무 패턴: C10K 문제 해결하기

C10K 문제는 "1만 개의 동시 연결을 어떻게 처리할 것인가?"입니다.

### 1. Thread per Connection

```
전통적 방식:
while (true) {
    client = accept();
    create_thread(handle_client, client);
}

문제점:
- 스레드 생성/삭제 오버헤드
- 컨텍스트 스위칭 비용
- 메모리 사용량 폭발
```

### 2. Thread Pool

```
개선된 방식:
create_thread_pool(100);
while (true) {
    client = accept();
    thread_pool.submit(handle_client, client);
}

장점:
- 스레드 재사용
- 제한된 리소스 사용

단점:
- 여전히 블로킹 I/O
- 스레드 수 제한
```

### 3. Event-Driven (Reactor)

```
현대적 방식:
epoll = epoll_create();
while (true) {
    events = epoll_wait(epoll);
    for (event in events) {
        if (event.is_readable()) {
            handle_read(event.fd);
        }
        if (event.is_writable()) {
            handle_write(event.fd);
        }
    }
}

장점:
- 단일 스레드로 수만 연결 처리
- 낮은 메모리 사용량
- 뛰어난 확장성
```

### 4. Proactor 패턴

```
비동기 방식:
async_read(socket, buffer, on_read_complete);
async_write(socket, data, on_write_complete);
// 완료 시 콜백 호출

장점:
- 진정한 비동기
- 최대 성능
- Windows IOCP 지원

단점:
- 복잡한 프로그래밍
- 디버깅 어려움
```

## 실무 최적화 테크닉

### 1. SO_REUSEADDR

TIME_WAIT 상태의 포트 재사용:

```c
int reuse = 1;
setsockopt(sock, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));
```

서버 재시작 시 "Address already in use" 에러 방지

### 2. TCP_NODELAY

Nagle 알고리즘 비활성화:

```c
int nodelay = 1;
setsockopt(sock, IPPROTO_TCP, TCP_NODELAY, &nodelay, sizeof(nodelay));
```

실시간 애플리케이션에 필수!

### 3. SO_KEEPALIVE

연결 유지 확인:

```c
int keepalive = 1;
setsockopt(sock, SOL_SOCKET, SO_KEEPALIVE, &keepalive, sizeof(keepalive));
```

좀비 연결 방지

### 4. 버퍼 크기 조정

```c
int bufsize = 256 * 1024;  // 256KB
setsockopt(sock, SOL_SOCKET, SO_RCVBUF, &bufsize, sizeof(bufsize));
setsockopt(sock, SOL_SOCKET, SO_SNDBUF, &bufsize, sizeof(bufsize));
```

대용량 데이터 전송 시 성능 향상

## 실제 사례: 채팅 서버 아키텍처 진화

제가 운영했던 채팅 서버의 진화 과정입니다:

### v1.0: Thread per Connection
- 동시 접속 500명 한계
- 메모리 사용량 2GB
- CPU 사용률 80%

### v2.0: Thread Pool + 블로킹 I/O
- 동시 접속 2,000명
- 메모리 사용량 1GB
- CPU 사용률 60%

### v3.0: epoll + 논블로킹 I/O
- 동시 접속 50,000명
- 메모리 사용량 500MB
- CPU 사용률 30%

### v4.0: io_uring + 코루틴
- 동시 접속 200,000명
- 메모리 사용량 1GB
- CPU 사용률 40%

## 언어별 소켓 프로그래밍

### Go: 고루틴의 마법

```go
// Go는 고루틴으로 블로킹 I/O를 효율적으로 처리
for {
    conn, _ := listener.Accept()
    go handleConnection(conn)  // 경량 스레드
}
```

내부적으로 epoll/kqueue를 사용하지만 개발자는 신경 쓸 필요 없음!

### Node.js: 이벤트 루프

```javascript
// 단일 스레드 이벤트 루프
server.on('connection', (socket) => {
    socket.on('data', (data) => {
        // 논블로킹 처리
    });
});
```

libuv 기반으로 플랫폼별 최적 메커니즘 자동 선택

### Rust: 안전한 비동기

```rust
// Tokio 런타임
async fn handle_client(socket: TcpStream) {
    // 안전한 비동기 처리
}
```

메모리 안전성 + 고성능

## 디버깅과 모니터링

### 유용한 도구들

```bash
# 소켓 상태 확인
netstat -tuln
ss -tuln

# 연결 추적
tcpdump -i eth0 port 8080
wireshark

# 성능 측정
iperf3 -s  # 서버
iperf3 -c server_ip  # 클라이언트

# 파일 디스크립터 확인
lsof -p [pid]
ls /proc/[pid]/fd
```

### 주요 지표

1. **연결 수**: 현재 활성 연결
2. **처리량**: 초당 메시지 수
3. **지연 시간**: 평균 응답 시간
4. **에러율**: 연결 실패, 타임아웃
5. **리소스 사용량**: CPU, 메모리, FD

## 마무리: 소켓 프로그래밍 마스터의 길

소켓 프로그래밍은 네트워크 프로그래밍의 기초입니다. 처음에는 복잡해 보이지만, 원리를 이해하면 강력한 네트워크 애플리케이션을 만들 수 있죠.

제가 드리는 조언:
1. **기초부터 탄탄히**: 블로킹 I/O부터 시작
2. **점진적 학습**: select → poll → epoll 순서로
3. **실습 중심**: 작은 프로젝트부터 시작
4. **성능 측정**: 추측하지 말고 측정하기

소켓 프로그래밍을 마스터하면 어떤 네트워크 애플리케이션도 만들 수 있습니다. 게임 서버, 채팅 서버, 프록시 서버... 무엇이든 가능하죠!

다음 시간에는 네트워크 성능 최적화의 세계로 들어가보겠습니다. 밀리초를 줄이는 싸움, 흥미진진하지 않나요? ⚡