# Go 채널(Channel): 고루틴들의 우아한 대화법

## 📚 목차
1. [개요: CSP와 채널의 철학](#개요-csp와-채널의-철학)
2. [채널의 내부 구조](#채널의-내부-구조)
3. [채널 동작 원리](#채널-동작-원리)
4. [버퍼드 vs 언버퍼드 채널](#버퍼드-vs-언버퍼드-채널)
5. [Select와 다중 채널](#select와-다중-채널)
6. [채널 패턴과 이디엄](#채널-패턴과-이디엄)
7. [실습: 채널 마스터하기](#실습-채널-마스터하기)
8. [성능과 최적화](#성능과-최적화)
9. [FAQ](#faq)

---

## 개요: CSP와 채널의 철학

### 🎯 한 줄 정의
> **"메모리를 공유하지 말고 통신하라 - 고루틴 간의 타입 안전한 메시지 파이프"**

### 📖 CSP(Communicating Sequential Processes) 모델

Tony Hoare가 1978년에 제안한 동시성 모델:

```
전통적 방식 (공유 메모리):
Thread A ─┐
          ├─→ [Shared Memory] ← Lock/Unlock 필요
Thread B ─┘

CSP 방식 (메시지 전달):
Goroutine A ─→ [Channel] ─→ Goroutine B
              메시지 전달     (동기화 자동!)
```

### 🎭 우체국 비유로 이해하기

```
뮤텍스 방식 (위험한 공유):
"우리 모두 같은 칠판에 쓰자!"
→ 동시에 쓰면 충돌!
→ 자물쇠로 보호 필요
→ 데드락 위험

채널 방식 (안전한 전달):
"편지로 주고받자!"
→ 우체통에 넣으면
→ 상대방이 꺼내감
→ 충돌 없음!
```

---

## 채널의 내부 구조

### 🔍 채널의 실제 구조체

```go
// src/runtime/chan.go
type hchan struct {
    qcount   uint           // 큐에 있는 데이터 개수
    dataqsiz uint           // 버퍼 크기
    buf      unsafe.Pointer // 버퍼를 가리키는 포인터
    elemsize uint16         // 요소 하나의 크기
    closed   uint32         // 닫힘 상태
    elemtype *_type         // 요소 타입 정보
    sendx    uint           // 송신 인덱스
    recvx    uint           // 수신 인덱스
    recvq    waitq          // 받기 대기 중인 고루틴들
    sendq    waitq          // 보내기 대기 중인 고루틴들
    lock     mutex          // 뮤텍스 (내부적으로는 있음!)
}

type waitq struct {
    first *sudog  // 대기 큐의 첫 번째 고루틴
    last  *sudog  // 대기 큐의 마지막 고루틴
}
```

### 📊 메모리 레이아웃

```
채널 생성: ch := make(chan int, 3)

메모리 구조:
┌─────────────┐
│   hchan     │
├─────────────┤
│ qcount: 0   │ ← 현재 0개
│ dataqsiz: 3 │ ← 버퍼 크기 3
│ buf: ────────────→ [nil][nil][nil] (버퍼)
│ sendx: 0    │ ← 다음 쓸 위치
│ recvx: 0    │ ← 다음 읽을 위치
│ recvq: nil  │ ← 받기 대기 큐
│ sendq: nil  │ ← 보내기 대기 큐
└─────────────┘
```

---

## 채널 동작 원리

### 📤 Send 동작 상세 분석

```go
ch <- 42  // 이 한 줄이 실행되면...
```

**내부 동작 과정:**

```go
// chansend 함수 (의사코드)
func chansend(c *hchan, elem unsafe.Pointer) {
    // 1. nil 채널 체크
    if c == nil {
        gopark(nil)  // 영원히 블록
    }
    
    // 2. 락 획득
    lock(&c.lock)
    
    // 3. 닫힌 채널 체크
    if c.closed != 0 {
        panic("send on closed channel")
    }
    
    // 4. 받기 대기자가 있으면 직접 전달!
    if sg := c.recvq.dequeue(); sg != nil {
        send(c, sg, elem)  // 직접 복사 (버퍼 거치지 않음!)
        unlock(&c.lock)
        return
    }
    
    // 5. 버퍼에 공간이 있으면 버퍼에 저장
    if c.qcount < c.dataqsiz {
        qp := chanbuf(c, c.sendx)
        typedmemmove(c.elemtype, qp, elem)
        c.sendx++
        if c.sendx == c.dataqsiz {
            c.sendx = 0  // 순환 버퍼
        }
        c.qcount++
        unlock(&c.lock)
        return
    }
    
    // 6. 버퍼 꽉 참 - 현재 고루틴 블록
    gp := getg()
    mysg := acquireSudog()
    mysg.elem = elem
    c.sendq.enqueue(mysg)
    gopark(chanparkcommit)  // 여기서 멈춤!
    
    // 7. 누군가 깨워주면 여기서 재개
    unlock(&c.lock)
}
```

### 📥 Receive 동작 상세 분석

```go
value := <-ch  // 이 한 줄이 실행되면...
```

**내부 동작 과정:**

```go
// chanrecv 함수 (의사코드)
func chanrecv(c *hchan, elem unsafe.Pointer) (received bool) {
    // 1. nil 채널 체크
    if c == nil {
        gopark(nil)  // 영원히 블록
    }
    
    // 2. 락 획득
    lock(&c.lock)
    
    // 3. 닫히고 비어있는 채널 체크
    if c.closed != 0 && c.qcount == 0 {
        unlock(&c.lock)
        return false  // zero value 반환
    }
    
    // 4. 보내기 대기자가 있으면 직접 받기
    if sg := c.sendq.dequeue(); sg != nil {
        recv(c, sg, elem)  // 직접 복사!
        unlock(&c.lock)
        return true
    }
    
    // 5. 버퍼에 데이터가 있으면 버퍼에서 꺼내기
    if c.qcount > 0 {
        qp := chanbuf(c, c.recvx)
        typedmemmove(c.elemtype, elem, qp)
        c.recvx++
        if c.recvx == c.dataqsiz {
            c.recvx = 0  // 순환 버퍼
        }
        c.qcount--
        unlock(&c.lock)
        return true
    }
    
    // 6. 버퍼 비어있음 - 현재 고루틴 블록
    gp := getg()
    mysg := acquireSudog()
    mysg.elem = elem
    c.recvq.enqueue(mysg)
    gopark(chanparkcommit)  // 여기서 멈춤!
    
    // 7. 누군가 깨워주면 여기서 재개
    unlock(&c.lock)
    return true
}
```

### 🔄 직접 전달 최적화 (Zero-copy)

```go
// 놀라운 최적화: 버퍼를 거치지 않는 직접 전달!

// Sender가 대기 중일 때 Receiver가 오면:
func directSend() {
    // 1. Sender의 데이터를
    // 2. Receiver의 변수로
    // 3. 직접 복사! (버퍼 거치지 않음)
    
    // 장점:
    // - 복사 1번 (원래는 2번: sender→buffer→receiver)
    // - 캐시 효율성
    // - 메모리 대역폭 절약
}
```

---

## 버퍼드 vs 언버퍼드 채널

### 🔄 언버퍼드 채널 (동기적)

```go
ch := make(chan int)  // 버퍼 크기 0

// 특징: 송신자와 수신자가 만날 때까지 대기
go func() {
    ch <- 42  // 받는 사람 나타날 때까지 대기
}()

value := <-ch  // 보내는 사람 나타날 때까지 대기
```

**타임라인:**
```
시간 →
Sender:   [시작]──[ch <- 42]──────[블록]─────[재개]──[끝]
                         ↘           ↗
                          랑데뷰 지점
                         ↙           ↖
Receiver: [시작]──────────────[<-ch]──[값 받음]──[끝]
```

### 📦 버퍼드 채널 (비동기적)

```go
ch := make(chan int, 3)  // 버퍼 크기 3

// 특징: 버퍼가 차기 전까지 블록 안 됨
go func() {
    ch <- 1  // 즉시 리턴
    ch <- 2  // 즉시 리턴
    ch <- 3  // 즉시 리턴
    ch <- 4  // 블록! (버퍼 꽉 참)
}()
```

**버퍼 상태 변화:**
```
초기:     [_][_][_] (비어있음)
ch <- 1:  [1][_][_] 
ch <- 2:  [1][2][_]
ch <- 3:  [1][2][3] (꽉 참)
<-ch:     [_][2][3] (1 제거)
ch <- 4:  [4][2][3] (순환)
```

### 📊 성능 비교

```go
// 벤치마크 코드
func BenchmarkUnbuffered(b *testing.B) {
    ch := make(chan int)
    go func() {
        for i := 0; i < b.N; i++ {
            ch <- i
        }
    }()
    for i := 0; i < b.N; i++ {
        <-ch
    }
}

func BenchmarkBuffered(b *testing.B) {
    ch := make(chan int, 100)
    go func() {
        for i := 0; i < b.N; i++ {
            ch <- i
        }
    }()
    for i := 0; i < b.N; i++ {
        <-ch
    }
}

// 결과:
// BenchmarkUnbuffered: 150 ns/op (컨텍스트 스위치)
// BenchmarkBuffered:    50 ns/op  (버퍼 활용)
```

---

## Select와 다중 채널

### 🎯 Select 구문의 마법

```go
select {
case v1 := <-ch1:
    fmt.Println("ch1:", v1)
case v2 := <-ch2:
    fmt.Println("ch2:", v2)
case ch3 <- 42:
    fmt.Println("sent to ch3")
default:
    fmt.Println("no channel ready")
}
```

### 🎲 Select의 내부 동작

```go
// selectgo 함수 (의사코드)
func selectgo(cases []scase) (int, bool) {
    // 1. 모든 케이스 섞기 (공정성!)
    shuffle(cases)
    
    // 2. 첫 번째 패스: 즉시 가능한 케이스 찾기
    for i, cas := range cases {
        if cas.kind == caseDefault {
            return i, false  // default 실행
        }
        if canProceed(cas) {
            return i, true  // 즉시 실행 가능!
        }
    }
    
    // 3. 두 번째 패스: 모든 채널에 대기 등록
    for _, cas := range cases {
        if cas.kind == caseSend {
            cas.c.sendq.enqueue(gp)
        } else {
            cas.c.recvq.enqueue(gp)
        }
    }
    
    // 4. 블록하고 대기
    gopark(selparkcommit)
    
    // 5. 깨어나면 선택된 케이스 반환
    return selectedCase, true
}
```

### 🎯 Select 패턴들

#### 1. 타임아웃 패턴

```go
select {
case result := <-ch:
    fmt.Println("Got result:", result)
case <-time.After(5 * time.Second):
    fmt.Println("Timeout!")
}
```

#### 2. 논블로킹 송수신

```go
// 논블로킹 수신
select {
case msg := <-ch:
    fmt.Println("Received:", msg)
default:
    fmt.Println("No message available")
}

// 논블로킹 송신
select {
case ch <- msg:
    fmt.Println("Sent message")
default:
    fmt.Println("Channel full")
}
```

#### 3. 다중 채널 멀티플렉싱

```go
func fanIn(ch1, ch2 <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for {
            select {
            case v := <-ch1:
                out <- v
            case v := <-ch2:
                out <- v
            }
        }
    }()
    return out
}
```

---

## 채널 패턴과 이디엄

### 🎨 1. Pipeline 패턴

```go
// 파이프라인: 데이터 처리 단계를 연결
func pipeline() {
    // 단계 1: 숫자 생성
    numbers := generate()
    
    // 단계 2: 제곱
    squares := square(numbers)
    
    // 단계 3: 필터링
    filtered := filter(squares)
    
    // 최종 소비
    for v := range filtered {
        fmt.Println(v)
    }
}

func generate() <-chan int {
    out := make(chan int)
    go func() {
        for i := 1; i <= 100; i++ {
            out <- i
        }
        close(out)
    }()
    return out
}

func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * n
        }
        close(out)
    }()
    return out
}

func filter(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            if n%2 == 0 {
                out <- n
            }
        }
        close(out)
    }()
    return out
}
```

### 🎨 2. Fan-out/Fan-in 패턴

```go
// Fan-out: 하나의 입력을 여러 워커로 분산
// Fan-in: 여러 결과를 하나로 합침

func fanOutFanIn(in <-chan int) <-chan int {
    // Fan-out: 3개 워커 생성
    c1 := worker(in)
    c2 := worker(in)
    c3 := worker(in)
    
    // Fan-in: 결과 합치기
    return merge(c1, c2, c3)
}

func worker(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- process(n)  // 무거운 작업
        }
        close(out)
    }()
    return out
}

func merge(cs ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup
    
    for _, c := range cs {
        wg.Add(1)
        go func(ch <-chan int) {
            for n := range ch {
                out <- n
            }
            wg.Done()
        }(c)
    }
    
    go func() {
        wg.Wait()
        close(out)
    }()
    
    return out
}
```

### 🎨 3. Worker Pool 패턴

```go
type Job struct {
    ID   int
    Data string
}

type Result struct {
    Job    Job
    Output string
}

func workerPool(jobs <-chan Job, results chan<- Result, workers int) {
    var wg sync.WaitGroup
    
    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func(id int) {
            for job := range jobs {
                // 작업 처리
                output := process(job.Data)
                results <- Result{Job: job, Output: output}
            }
            wg.Done()
        }(i)
    }
    
    go func() {
        wg.Wait()
        close(results)
    }()
}

// 사용 예
func main() {
    jobs := make(chan Job, 100)
    results := make(chan Result, 100)
    
    // 워커 시작
    workerPool(jobs, results, 5)
    
    // 작업 전송
    for i := 0; i < 50; i++ {
        jobs <- Job{ID: i, Data: fmt.Sprintf("job-%d", i)}
    }
    close(jobs)
    
    // 결과 수집
    for result := range results {
        fmt.Printf("Job %d: %s\n", result.Job.ID, result.Output)
    }
}
```

### 🎨 4. Semaphore 패턴

```go
// 세마포어: 동시 실행 제한
type Semaphore chan struct{}

func NewSemaphore(n int) Semaphore {
    return make(chan struct{}, n)
}

func (s Semaphore) Acquire() {
    s <- struct{}{}
}

func (s Semaphore) Release() {
    <-s
}

// 사용 예: 최대 3개 동시 다운로드
func downloadWithLimit(urls []string) {
    sem := NewSemaphore(3)
    var wg sync.WaitGroup
    
    for _, url := range urls {
        wg.Add(1)
        go func(u string) {
            defer wg.Done()
            
            sem.Acquire()         // 토큰 획득
            defer sem.Release()   // 토큰 반납
            
            download(u)
        }(url)
    }
    
    wg.Wait()
}
```

### 🎨 5. Context와 채널

```go
// Context를 이용한 취소 전파
func worker(ctx context.Context, id int) {
    for {
        select {
        case <-ctx.Done():
            fmt.Printf("Worker %d: 종료 신호 받음\n", id)
            return
        default:
            // 작업 수행
            doWork()
            time.Sleep(1 * time.Second)
        }
    }
}

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    
    // 5개 워커 시작
    for i := 0; i < 5; i++ {
        go worker(ctx, i)
    }
    
    time.Sleep(5 * time.Second)
    cancel()  // 모든 워커 종료!
}
```

---

## 실습: 채널 마스터하기

### 🧪 실험 1: 채널 내부 상태 관찰

```go
package main

import (
    "fmt"
    "runtime"
    "time"
)

func observeChannel() {
    ch := make(chan int, 3)
    
    // 채널 상태 출력 함수
    printState := func(label string) {
        fmt.Printf("%s - len: %d, cap: %d\n", 
            label, len(ch), cap(ch))
    }
    
    printState("초기")           // len: 0, cap: 3
    
    ch <- 1
    printState("1 추가")          // len: 1, cap: 3
    
    ch <- 2
    printState("2 추가")          // len: 2, cap: 3
    
    go func() {
        ch <- 3
        printState("3 추가 (고루틴)") // len: 3, cap: 3
        
        ch <- 4  // 블록됨!
        printState("4 추가 (블록 해제)")
    }()
    
    time.Sleep(100 * time.Millisecond)
    fmt.Printf("대기 중인 고루틴: %d\n", runtime.NumGoroutine())
    
    <-ch
    printState("하나 제거")       // len: 3, cap: 3 (4가 들어감)
    
    close(ch)
    
    // 닫힌 채널에서 읽기
    for v := range ch {
        fmt.Println("남은 값:", v)
    }
}
```

### 🧪 실험 2: Select 공정성 테스트

```go
func testSelectFairness() {
    ch1 := make(chan int, 100)
    ch2 := make(chan int, 100)
    
    // 두 채널 모두 채우기
    for i := 0; i < 100; i++ {
        ch1 <- i
        ch2 <- i * 100
    }
    
    count1, count2 := 0, 0
    
    // Select로 읽기
    for i := 0; i < 200; i++ {
        select {
        case <-ch1:
            count1++
        case <-ch2:
            count2++
        }
    }
    
    fmt.Printf("ch1: %d회, ch2: %d회\n", count1, count2)
    // 결과: 거의 50:50 (랜덤 선택)
}
```

### 🧪 실험 3: 채널 성능 측정

```go
func benchmarkChannels() {
    // 1. 언버퍼드 채널
    start := time.Now()
    ch1 := make(chan int)
    go func() {
        for i := 0; i < 1000000; i++ {
            ch1 <- i
        }
    }()
    for i := 0; i < 1000000; i++ {
        <-ch1
    }
    fmt.Printf("언버퍼드: %v\n", time.Since(start))
    
    // 2. 버퍼드 채널
    start = time.Now()
    ch2 := make(chan int, 1000)
    go func() {
        for i := 0; i < 1000000; i++ {
            ch2 <- i
        }
    }()
    for i := 0; i < 1000000; i++ {
        <-ch2
    }
    fmt.Printf("버퍼드: %v\n", time.Since(start))
    
    // 3. 직접 전달 최적화 확인
    start = time.Now()
    ch3 := make(chan int)
    done := make(chan bool)
    
    // 수신자 먼저 대기
    go func() {
        for i := 0; i < 1000000; i++ {
            <-ch3
        }
        done <- true
    }()
    
    // 송신자가 직접 전달
    for i := 0; i < 1000000; i++ {
        ch3 <- i
    }
    <-done
    fmt.Printf("직접 전달: %v\n", time.Since(start))
}

// 예상 결과:
// 언버퍼드: 150ms
// 버퍼드:    50ms
// 직접 전달: 140ms (언버퍼드보다 빠름!)
```

### 🧪 실험 4: 메모리 누수 방지

```go
// 잘못된 예: 고루틴 누수
func leakyGoroutine() {
    ch := make(chan int)
    
    go func() {
        val := <-ch  // 영원히 블록!
        fmt.Println(val)
    }()
    
    // ch를 닫지 않고 함수 종료
    // 고루틴이 영원히 살아있음! (누수)
}

// 올바른 예: Context로 취소
func properGoroutine(ctx context.Context) {
    ch := make(chan int)
    
    go func() {
        select {
        case val := <-ch:
            fmt.Println(val)
        case <-ctx.Done():
            fmt.Println("취소됨")
            return
        }
    }()
    
    // 필요시 ctx.cancel()로 종료 가능
}

// 디버깅: 고루틴 수 모니터링
func monitorGoroutines() {
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()
    
    for range ticker.C {
        fmt.Printf("활성 고루틴: %d\n", runtime.NumGoroutine())
    }
}
```

---

## 성능과 최적화

### ⚡ 채널 성능 특성

```
작업                        | 시간      | 메모리
---------------------------|----------|----------
make(chan T)               | 100ns    | 96 bytes
make(chan T, N)            | 100ns    | 96 + N*sizeof(T)
ch <- v (언버퍼드)          | 150ns    | 0
ch <- v (버퍼드, 여유있음)   | 20ns     | 0
<-ch (언버퍼드)             | 150ns    | 0
<-ch (버퍼드, 데이터있음)    | 20ns     | 0
select (2 cases)           | 50ns     | 0
select (10 cases)          | 200ns    | 0
close(ch)                  | 50ns     | 0
```

### 🚀 최적화 팁

#### 1. 적절한 버퍼 크기 선택

```go
// 너무 작은 버퍼: 빈번한 블로킹
ch1 := make(chan int, 1)

// 너무 큰 버퍼: 메모리 낭비
ch2 := make(chan int, 1000000)

// 적절한 버퍼: 처리 속도 고려
// 규칙: 평균 생산 속도 × 허용 지연 시간
ch3 := make(chan int, 100)
```

#### 2. 채널 방향 제한

```go
// 송신 전용
func send(ch chan<- int) {
    ch <- 42
}

// 수신 전용
func receive(ch <-chan int) {
    val := <-ch
}

// 컴파일러가 최적화 가능!
```

#### 3. 배치 처리

```go
// 비효율적: 하나씩 처리
func inefficient(ch <-chan int) {
    for val := range ch {
        process(val)
    }
}

// 효율적: 배치로 처리
func efficient(ch <-chan int) {
    batch := make([]int, 0, 100)
    timer := time.NewTimer(100 * time.Millisecond)
    
    for {
        select {
        case val := <-ch:
            batch = append(batch, val)
            if len(batch) >= 100 {
                processBatch(batch)
                batch = batch[:0]
                timer.Reset(100 * time.Millisecond)
            }
        case <-timer.C:
            if len(batch) > 0 {
                processBatch(batch)
                batch = batch[:0]
            }
            timer.Reset(100 * time.Millisecond)
        }
    }
}
```

---

## FAQ

### ❓ 자주 묻는 질문들

**Q1: 언제 버퍼드 채널을 사용해야 하나요?**

A: 
- **버퍼드**: 생산자와 소비자의 속도가 다를 때
- **언버퍼드**: 동기화가 중요할 때
```go
// 버퍼드: 버스트 처리
events := make(chan Event, 100)

// 언버퍼드: 핸드셰이크
done := make(chan bool)
```

**Q2: 채널을 닫는 것은 누가 해야 하나요?**

A: **항상 송신자가 닫아야 합니다!**
```go
// 올바른 예
func sender(ch chan<- int) {
    defer close(ch)  // 송신자가 닫음
    for i := 0; i < 10; i++ {
        ch <- i
    }
}

// 잘못된 예
func receiver(ch <-chan int) {
    for v := range ch {
        fmt.Println(v)
    }
    close(ch)  // 컴파일 에러! 수신 전용 채널
}
```

**Q3: 닫힌 채널에서 읽으면 어떻게 되나요?**

A:
```go
ch := make(chan int, 2)
ch <- 1
ch <- 2
close(ch)

// 버퍼에 있는 값은 읽을 수 있음
fmt.Println(<-ch)  // 1
fmt.Println(<-ch)  // 2

// 그 후에는 zero value
v, ok := <-ch
fmt.Println(v, ok)  // 0 false
```

**Q4: nil 채널의 동작은?**

A:
```go
var ch chan int  // nil

// 모두 영원히 블록!
ch <- 42   // 블록
<-ch       // 블록
close(ch)  // panic!

// Select에서는 무시됨
select {
case ch <- 42:  // 절대 실행 안 됨
default:
    fmt.Println("nil 채널은 무시")
}
```

**Q5: 채널 vs 뮤텍스, 언제 뭘 써야 하나요?**

A:
- **채널**: 소유권 이전, 작업 분배, 이벤트 알림
- **뮤텍스**: 캐시, 상태 보호, 간단한 카운터

```go
// 채널이 적합: 작업 큐
jobs := make(chan Job)

// 뮤텍스가 적합: 공유 캐시
type Cache struct {
    mu    sync.RWMutex
    items map[string]Item
}
```

**Q6: Select에서 우선순위를 줄 수 있나요?**

A: 기본적으로 불가능합니다. 하지만 트릭이 있습니다:
```go
// 우선순위 구현
for {
    select {
    case v := <-highPriority:
        handle(v)
    default:
        select {
        case v := <-highPriority:
            handle(v)
        case v := <-lowPriority:
            handle(v)
        }
    }
}
```

---

## 🎯 핵심 정리

### 채널의 핵심 개념

1. **CSP 모델**: 메모리 공유 대신 메시지 전달
2. **타입 안전**: 컴파일 타임에 타입 체크
3. **동기화 내장**: 별도 락 불필요
4. **방향성**: 송신/수신 전용 가능
5. **Select**: 다중 채널 다중화

### 기억할 규칙

- 송신자가 채널을 닫는다
- nil 채널은 영원히 블록
- 닫힌 채널 읽기는 zero value
- 닫힌 채널 쓰기는 panic
- for range는 채널이 닫힐 때까지

### 성능 고려사항

- 언버퍼드: 150ns (동기화)
- 버퍼드: 20ns (버퍼 여유시)
- 직접 전달: 복사 1번 절약
- Select: case 수에 비례

---

## 📚 참고 자료

- [Effective Go - Channels](https://go.dev/doc/effective_go#channels)
- [Go Concurrency Patterns](https://go.dev/blog/pipelines)
- [Advanced Go Concurrency](https://go.dev/blog/advanced-go-concurrency-patterns)
- [Channel Axioms](https://dave.cheney.net/2014/03/19/channel-axioms)
- [Go Source: runtime/chan.go](https://github.com/golang/go/blob/master/src/runtime/chan.go)

---

*작성일: 2025년 8월*  
*Go 버전: 1.26 기준*