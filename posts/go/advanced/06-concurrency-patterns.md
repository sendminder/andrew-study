# 동시성 패턴: Go 동시성의 예술

## 🎬 프롤로그: 동시성은 병렬성이 아니다

Rob Pike의 유명한 말입니다:
> "Concurrency is not parallelism. Concurrency is about dealing with lots of things at once. Parallelism is about doing lots of things at once."

동시성은 **구조**에 관한 것이고, 병렬성은 **실행**에 관한 것입니다.

## 📚 Chapter 1: 기본 패턴 - 동시성의 빌딩 블록

### 패턴 1: Pipeline Pattern (파이프라인)

유닉스의 파이프와 같은 개념입니다.

```go
// 각 단계는 독립적으로 동작
func pipeline() {
    // 단계 1: 숫자 생성
    numbers := generate()
    
    // 단계 2: 제곱
    squares := square(numbers)
    
    // 단계 3: 출력
    print(squares)
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

func print(in <-chan int) {
    for n := range in {
        fmt.Println(n)
    }
}
```

### 패턴 2: Fan-Out/Fan-In

작업을 분산(Fan-Out)하고 결과를 수집(Fan-In)합니다.

```go
func fanOutFanIn() {
    in := generate()
    
    // Fan-Out: 여러 워커에게 작업 분배
    c1 := process(in)
    c2 := process(in)
    c3 := process(in)
    
    // Fan-In: 결과 수집
    result := fanIn(c1, c2, c3)
    
    for r := range result {
        fmt.Println(r)
    }
}

func process(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- heavyWork(n)
        }
        close(out)
    }()
    return out
}

func fanIn(channels ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup
    
    // 각 채널에서 읽어서 하나로 모으기
    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan int) {
            defer wg.Done()
            for n := range c {
                out <- n
            }
        }(ch)
    }
    
    // 모든 채널이 닫히면 out도 닫기
    go func() {
        wg.Wait()
        close(out)
    }()
    
    return out
}
```

### 패턴 3: Worker Pool

고정된 수의 워커로 작업을 처리합니다.

```go
type Job struct {
    ID   int
    Data string
}

type Result struct {
    JobID  int
    Output string
    Error  error
}

func workerPool(numWorkers int) {
    jobs := make(chan Job, 100)
    results := make(chan Result, 100)
    
    // 워커 시작
    var wg sync.WaitGroup
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go worker(i, jobs, results, &wg)
    }
    
    // 작업 생성
    go func() {
        for i := 0; i < 1000; i++ {
            jobs <- Job{ID: i, Data: fmt.Sprintf("job-%d", i)}
        }
        close(jobs)
    }()
    
    // 워커 완료 대기 후 results 채널 닫기
    go func() {
        wg.Wait()
        close(results)
    }()
    
    // 결과 수집
    for result := range results {
        if result.Error != nil {
            log.Printf("Job %d failed: %v", result.JobID, result.Error)
        } else {
            log.Printf("Job %d completed: %s", result.JobID, result.Output)
        }
    }
}

func worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()
    
    for job := range jobs {
        // 작업 처리
        output, err := processJob(job)
        results <- Result{
            JobID:  job.ID,
            Output: output,
            Error:  err,
        }
    }
}
```

## 🎯 Chapter 2: 고급 패턴 - 복잡한 시나리오

### 패턴 4: Rate Limiting (속도 제한)

API 호출이나 리소스 접근을 제한합니다.

```go
// 토큰 버킷 알고리즘
type RateLimiter struct {
    rate     int           // 초당 허용 요청 수
    bucket   chan struct{} // 토큰 버킷
    stopCh   chan struct{}
}

func NewRateLimiter(rate int) *RateLimiter {
    rl := &RateLimiter{
        rate:   rate,
        bucket: make(chan struct{}, rate),
        stopCh: make(chan struct{}),
    }
    
    // 버킷 초기화
    for i := 0; i < rate; i++ {
        rl.bucket <- struct{}{}
    }
    
    // 토큰 보충
    go rl.refill()
    
    return rl
}

func (rl *RateLimiter) refill() {
    ticker := time.NewTicker(time.Second / time.Duration(rl.rate))
    defer ticker.Stop()
    
    for {
        select {
        case <-ticker.C:
            select {
            case rl.bucket <- struct{}{}:
                // 토큰 추가
            default:
                // 버킷이 가득 참
            }
        case <-rl.stopCh:
            return
        }
    }
}

func (rl *RateLimiter) Allow() bool {
    select {
    case <-rl.bucket:
        return true
    default:
        return false
    }
}

// 사용 예
func rateLimitedAPI() {
    limiter := NewRateLimiter(10) // 초당 10개 요청
    
    for i := 0; i < 100; i++ {
        if limiter.Allow() {
            go makeAPICall(i)
        } else {
            log.Printf("Request %d rate limited", i)
        }
    }
}
```

### 패턴 5: Circuit Breaker (회로 차단기)

실패하는 서비스를 보호합니다.

```go
type CircuitBreaker struct {
    mu            sync.RWMutex
    failureCount  int
    successCount  int
    lastFailTime  time.Time
    state         State
    threshold     int
    timeout       time.Duration
}

type State int

const (
    StateClosed State = iota // 정상
    StateOpen                 // 차단
    StateHalfOpen            // 반개방
)

func NewCircuitBreaker(threshold int, timeout time.Duration) *CircuitBreaker {
    return &CircuitBreaker{
        threshold: threshold,
        timeout:   timeout,
        state:     StateClosed,
    }
}

func (cb *CircuitBreaker) Call(fn func() error) error {
    cb.mu.Lock()
    defer cb.mu.Unlock()
    
    // 상태 확인
    switch cb.state {
    case StateOpen:
        // 타임아웃 확인
        if time.Since(cb.lastFailTime) > cb.timeout {
            cb.state = StateHalfOpen
            cb.failureCount = 0
            cb.successCount = 0
        } else {
            return fmt.Errorf("circuit breaker is open")
        }
    }
    
    // 함수 실행
    err := fn()
    
    if err != nil {
        cb.failureCount++
        cb.lastFailTime = time.Now()
        
        if cb.failureCount >= cb.threshold {
            cb.state = StateOpen
            return fmt.Errorf("circuit breaker opened: %w", err)
        }
        return err
    }
    
    // 성공
    if cb.state == StateHalfOpen {
        cb.successCount++
        if cb.successCount >= cb.threshold {
            cb.state = StateClosed
        }
    }
    
    return nil
}
```

### 패턴 6: Semaphore (세마포어)

동시 접근을 제한합니다.

```go
type Semaphore struct {
    sem chan struct{}
}

func NewSemaphore(n int) *Semaphore {
    return &Semaphore{
        sem: make(chan struct{}, n),
    }
}

func (s *Semaphore) Acquire(ctx context.Context) error {
    select {
    case s.sem <- struct{}{}:
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}

func (s *Semaphore) Release() {
    <-s.sem
}

// 사용 예: 동시 데이터베이스 연결 제한
func limitedDBConnections() {
    sem := NewSemaphore(10) // 최대 10개 동시 연결
    
    var wg sync.WaitGroup
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            
            ctx := context.Background()
            if err := sem.Acquire(ctx); err != nil {
                log.Printf("Failed to acquire semaphore: %v", err)
                return
            }
            defer sem.Release()
            
            // DB 작업
            performDBOperation(id)
        }(i)
    }
    
    wg.Wait()
}
```

## 🔄 Chapter 3: 에러 처리 패턴

### 패턴 7: Error Group

여러 고루틴의 에러를 관리합니다.

```go
// golang.org/x/sync/errgroup 패키지 구현
type Group struct {
    cancel func()
    wg     sync.WaitGroup
    errOnce sync.Once
    err     error
}

func WithContext(ctx context.Context) (*Group, context.Context) {
    ctx, cancel := context.WithCancel(ctx)
    return &Group{cancel: cancel}, ctx
}

func (g *Group) Go(f func() error) {
    g.wg.Add(1)
    
    go func() {
        defer g.wg.Done()
        
        if err := f(); err != nil {
            g.errOnce.Do(func() {
                g.err = err
                if g.cancel != nil {
                    g.cancel()
                }
            })
        }
    }()
}

func (g *Group) Wait() error {
    g.wg.Wait()
    if g.cancel != nil {
        g.cancel()
    }
    return g.err
}

// 사용 예
func processWithErrorGroup(ctx context.Context, urls []string) error {
    g, ctx := WithContext(ctx)
    
    for _, url := range urls {
        url := url // capture
        g.Go(func() error {
            return fetchURL(ctx, url)
        })
    }
    
    return g.Wait()
}
```

### 패턴 8: Retry with Backoff

지수 백오프로 재시도합니다.

```go
type BackoffConfig struct {
    InitialInterval time.Duration
    Multiplier      float64
    MaxInterval     time.Duration
    MaxRetries      int
}

func RetryWithBackoff(ctx context.Context, config BackoffConfig, fn func() error) error {
    var err error
    interval := config.InitialInterval
    
    for retry := 0; retry < config.MaxRetries; retry++ {
        err = fn()
        if err == nil {
            return nil
        }
        
        // 재시도 가능한 에러인지 확인
        if !isRetryable(err) {
            return err
        }
        
        // 대기
        select {
        case <-time.After(interval):
            // 다음 간격 계산
            interval = time.Duration(float64(interval) * config.Multiplier)
            if interval > config.MaxInterval {
                interval = config.MaxInterval
            }
        case <-ctx.Done():
            return ctx.Err()
        }
        
        log.Printf("Retry %d after %v: %v", retry+1, interval, err)
    }
    
    return fmt.Errorf("max retries exceeded: %w", err)
}

func isRetryable(err error) bool {
    // 재시도 가능한 에러 판단 로직
    // 예: 네트워크 타임아웃, 일시적 에러 등
    return true
}
```

## 🎪 Chapter 4: 동기화 패턴

### 패턴 9: Barrier (배리어)

모든 고루틴이 특정 지점에 도달할 때까지 대기합니다.

```go
type Barrier struct {
    n       int
    count   int
    mu      sync.Mutex
    cond    *sync.Cond
    broken  bool
}

func NewBarrier(n int) *Barrier {
    b := &Barrier{n: n}
    b.cond = sync.NewCond(&b.mu)
    return b
}

func (b *Barrier) Wait() error {
    b.mu.Lock()
    defer b.mu.Unlock()
    
    if b.broken {
        return fmt.Errorf("barrier is broken")
    }
    
    b.count++
    
    if b.count == b.n {
        // 모든 고루틴이 도착
        b.count = 0
        b.cond.Broadcast()
        return nil
    }
    
    // 대기
    for b.count != 0 && !b.broken {
        b.cond.Wait()
    }
    
    if b.broken {
        return fmt.Errorf("barrier is broken")
    }
    
    return nil
}

// 사용 예: 병렬 처리 단계 동기화
func parallelPhases() {
    barrier := NewBarrier(3)
    
    for i := 0; i < 3; i++ {
        go func(id int) {
            // Phase 1
            fmt.Printf("Worker %d: Phase 1\n", id)
            time.Sleep(time.Duration(rand.Intn(1000)) * time.Millisecond)
            
            barrier.Wait() // 동기화 지점
            
            // Phase 2
            fmt.Printf("Worker %d: Phase 2\n", id)
        }(i)
    }
}
```

### 패턴 10: Future/Promise

비동기 작업의 미래 결과를 표현합니다.

```go
type Future[T any] struct {
    done  chan struct{}
    value T
    err   error
}

func NewFuture[T any](fn func() (T, error)) *Future[T] {
    f := &Future[T]{
        done: make(chan struct{}),
    }
    
    go func() {
        f.value, f.err = fn()
        close(f.done)
    }()
    
    return f
}

func (f *Future[T]) Get(ctx context.Context) (T, error) {
    select {
    case <-f.done:
        return f.value, f.err
    case <-ctx.Done():
        var zero T
        return zero, ctx.Err()
    }
}

// 병렬 실행 후 결과 수집
func parallelComputation() {
    // 여러 계산을 동시에 시작
    future1 := NewFuture(func() (int, error) {
        time.Sleep(1 * time.Second)
        return 42, nil
    })
    
    future2 := NewFuture(func() (string, error) {
        time.Sleep(2 * time.Second)
        return "hello", nil
    })
    
    // 나중에 결과 수집
    ctx := context.Background()
    val1, _ := future1.Get(ctx)
    val2, _ := future2.Get(ctx)
    
    fmt.Printf("Results: %d, %s\n", val1, val2)
}
```

## 🎯 Chapter 5: 고급 채널 패턴

### 패턴 11: Pub/Sub (발행-구독)

메시지 브로드캐스팅 패턴입니다.

```go
type PubSub[T any] struct {
    mu          sync.RWMutex
    subscribers map[string]chan T
    closed      bool
}

func NewPubSub[T any]() *PubSub[T] {
    return &PubSub[T]{
        subscribers: make(map[string]chan T),
    }
}

func (ps *PubSub[T]) Subscribe(id string, bufferSize int) <-chan T {
    ps.mu.Lock()
    defer ps.mu.Unlock()
    
    if ps.closed {
        return nil
    }
    
    ch := make(chan T, bufferSize)
    ps.subscribers[id] = ch
    return ch
}

func (ps *PubSub[T]) Unsubscribe(id string) {
    ps.mu.Lock()
    defer ps.mu.Unlock()
    
    if ch, ok := ps.subscribers[id]; ok {
        close(ch)
        delete(ps.subscribers, id)
    }
}

func (ps *PubSub[T]) Publish(msg T) {
    ps.mu.RLock()
    defer ps.mu.RUnlock()
    
    if ps.closed {
        return
    }
    
    for _, ch := range ps.subscribers {
        select {
        case ch <- msg:
        default:
            // 버퍼가 가득 찬 구독자는 건너뛰기
        }
    }
}

func (ps *PubSub[T]) Close() {
    ps.mu.Lock()
    defer ps.mu.Unlock()
    
    if ps.closed {
        return
    }
    
    ps.closed = true
    for _, ch := range ps.subscribers {
        close(ch)
    }
}
```

### 패턴 12: Dynamic Select

런타임에 select 케이스를 동적으로 구성합니다.

```go
func dynamicSelect(channels []chan int) {
    cases := make([]reflect.SelectCase, len(channels))
    
    for i, ch := range channels {
        cases[i] = reflect.SelectCase{
            Dir:  reflect.SelectRecv,
            Chan: reflect.ValueOf(ch),
        }
    }
    
    for {
        index, value, ok := reflect.Select(cases)
        if !ok {
            // 채널이 닫힘
            cases = append(cases[:index], cases[index+1:]...)
            if len(cases) == 0 {
                break
            }
            continue
        }
        
        fmt.Printf("Received %d from channel %d\n", value.Int(), index)
    }
}
```

## 💡 Chapter 6: 실전 예제 - 채팅 서버

모든 패턴을 활용한 실전 예제입니다.

```go
type ChatServer struct {
    clients    map[string]*Client
    broadcast  chan Message
    register   chan *Client
    unregister chan *Client
    mu         sync.RWMutex
    limiter    *RateLimiter
    ctx        context.Context
    cancel     context.CancelFunc
}

type Client struct {
    id       string
    send     chan Message
    server   *ChatServer
    ctx      context.Context
    cancel   context.CancelFunc
}

type Message struct {
    From    string
    To      string
    Content string
    Time    time.Time
}

func NewChatServer() *ChatServer {
    ctx, cancel := context.WithCancel(context.Background())
    return &ChatServer{
        clients:    make(map[string]*Client),
        broadcast:  make(chan Message, 100),
        register:   make(chan *Client),
        unregister: make(chan *Client),
        limiter:    NewRateLimiter(100), // 초당 100개 메시지
        ctx:        ctx,
        cancel:     cancel,
    }
}

func (s *ChatServer) Run() {
    // 워커 풀 시작
    for i := 0; i < 10; i++ {
        go s.messageWorker()
    }
    
    // 메인 이벤트 루프
    for {
        select {
        case client := <-s.register:
            s.mu.Lock()
            s.clients[client.id] = client
            s.mu.Unlock()
            log.Printf("Client %s connected", client.id)
            
        case client := <-s.unregister:
            s.mu.Lock()
            if _, ok := s.clients[client.id]; ok {
                delete(s.clients, client.id)
                close(client.send)
            }
            s.mu.Unlock()
            log.Printf("Client %s disconnected", client.id)
            
        case message := <-s.broadcast:
            // 속도 제한 적용
            if !s.limiter.Allow() {
                log.Println("Message rate limited")
                continue
            }
            
            s.mu.RLock()
            for _, client := range s.clients {
                select {
                case client.send <- message:
                default:
                    // 클라이언트 버퍼가 가득 참
                    close(client.send)
                    delete(s.clients, client.id)
                }
            }
            s.mu.RUnlock()
            
        case <-s.ctx.Done():
            return
        }
    }
}

func (s *ChatServer) messageWorker() {
    for {
        select {
        case msg := <-s.broadcast:
            // 메시지 처리 (예: 필터링, 로깅 등)
            processMessage(msg)
        case <-s.ctx.Done():
            return
        }
    }
}
```

## 🎓 핵심 정리: 동시성 패턴의 선택

### 언제 어떤 패턴을 사용할까?

| 상황 | 추천 패턴 |
|------|----------|
| 단계별 처리 | Pipeline |
| 작업 분산 | Fan-Out/Fan-In |
| 리소스 제한 | Worker Pool, Semaphore |
| API 보호 | Rate Limiting, Circuit Breaker |
| 에러 관리 | Error Group |
| 재시도 | Retry with Backoff |
| 동기화 | Barrier |
| 비동기 결과 | Future/Promise |
| 메시지 전달 | Pub/Sub |

### 안티패턴 주의사항

1. **고루틴 누수**: 항상 고루틴 종료 보장
2. **채널 데드락**: 버퍼 크기와 close 신중히 관리
3. **과도한 동시성**: 적절한 제한 필요
4. **경쟁 조건**: 공유 상태 최소화

## 🚀 마무리

동시성은 Go의 핵심 강점입니다. 이러한 패턴들을 마스터하면 확장 가능하고 효율적인 시스템을 구축할 수 있습니다.

"Don't communicate by sharing memory; share memory by communicating."

---

*다음 문서에서는 에러 처리와 복구 전략을 알아봅니다.*