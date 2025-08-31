# Context API와 패키지 설계: Go의 철학이 담긴 우아한 해법

## 🎬 프롤로그: 2014년, 구글의 또 다른 도전

2014년, 구글 엔지니어들이 또 다른 문제를 마주했습니다.

```go
// 문제 상황: 이 HTTP 요청은 언제 취소해야 할까?
func handleRequest(w http.ResponseWriter, r *http.Request) {
    // 데이터베이스 조회 중... 사용자가 연결을 끊었다면?
    data := queryDatabase() // 10초 걸림
    
    // 외부 API 호출 중... 타임아웃은?
    result := callExternalAPI(data) // 5초 걸림
    
    // 사용자는 이미 떠났는데 아직도 처리 중?
}
```

이렇게 Context가 탄생했습니다.

## 📚 Chapter 1: Context의 철학 - "명시적인 전파"

### 🎯 Context란 무엇인가?

Context는 Go의 철학을 가장 잘 보여주는 API입니다:
- **명시적**: 숨겨진 마법 없이 모든 것이 명확함
- **단순함**: 단 4개의 주요 함수
- **일관성**: 모든 Go 코드에서 같은 패턴

```go
// Context의 핵심 인터페이스
type Context interface {
    Deadline() (deadline time.Time, ok bool)  // 언제까지?
    Done() <-chan struct{}                     // 끝났나?
    Err() error                                 // 왜 끝났나?
    Value(key interface{}) interface{}          // 값 전달
}
```

### 🔄 Context의 생명주기

```go
func main() {
    // 1. 루트 Context 생성
    ctx := context.Background()
    
    // 2. 타임아웃 추가
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel() // 리소스 정리 필수!
    
    // 3. 값 추가
    ctx = context.WithValue(ctx, "userID", "andrew123")
    
    // 4. 전파
    handleRequest(ctx)
}

func handleRequest(ctx context.Context) {
    select {
    case <-time.After(10 * time.Second):
        fmt.Println("작업 완료")
    case <-ctx.Done():
        fmt.Println("취소됨:", ctx.Err())
    }
}
```

## 🏗️ Chapter 2: Context 패턴 - 실전 활용법

### 패턴 1: 계층적 취소 (Cascading Cancellation)

```go
func processOrder(ctx context.Context, orderID string) error {
    // 부모 Context에서 자식 Context 생성
    ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()
    
    // 병렬 작업 시작
    errCh := make(chan error, 3)
    
    // 재고 확인
    go func() {
        errCh <- checkInventory(ctx, orderID)
    }()
    
    // 결제 처리
    go func() {
        errCh <- processPayment(ctx, orderID)
    }()
    
    // 배송 준비
    go func() {
        errCh <- prepareShipping(ctx, orderID)
    }()
    
    // 모든 작업 대기
    for i := 0; i < 3; i++ {
        select {
        case err := <-errCh:
            if err != nil {
                // 하나라도 실패하면 모두 취소
                cancel()
                return err
            }
        case <-ctx.Done():
            return ctx.Err()
        }
    }
    
    return nil
}
```

### 패턴 2: Request-Scoped Values

```go
// 미들웨어에서 요청 ID 추가
func RequestIDMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        requestID := generateRequestID()
        ctx := context.WithValue(r.Context(), "requestID", requestID)
        
        // 로깅에 활용
        log.Printf("[%s] Request started", requestID)
        
        next.ServeHTTP(w, r.WithContext(ctx))
        
        log.Printf("[%s] Request completed", requestID)
    })
}

// 어디서든 request ID 사용 가능
func someHandler(ctx context.Context) {
    if requestID, ok := ctx.Value("requestID").(string); ok {
        log.Printf("[%s] Processing...", requestID)
    }
}
```

### 패턴 3: 동적 타임아웃 관리

```go
type TimeoutManager struct {
    baseTimeout time.Duration
}

func (tm *TimeoutManager) WithDynamicTimeout(ctx context.Context, complexity int) (context.Context, context.CancelFunc) {
    // 복잡도에 따라 타임아웃 조정
    timeout := tm.baseTimeout * time.Duration(complexity)
    
    // 하지만 최대 타임아웃은 제한
    maxTimeout := 5 * time.Minute
    if timeout > maxTimeout {
        timeout = maxTimeout
    }
    
    // 부모의 데드라인도 고려
    if deadline, ok := ctx.Deadline(); ok {
        remaining := time.Until(deadline)
        if timeout > remaining {
            timeout = remaining
        }
    }
    
    return context.WithTimeout(ctx, timeout)
}
```

## 🎨 Chapter 3: 패키지 설계 - Go Way

### 📦 좋은 패키지의 원칙

1. **작고 집중적**: 하나의 책임만
2. **최소한의 의존성**: 순환 참조 금지
3. **명확한 경계**: Public API 최소화
4. **테스트 가능**: 인터페이스 활용

### 실전 패키지 구조

```
myapp/
├── cmd/                    # 실행 가능한 프로그램
│   └── server/
│       └── main.go
├── internal/               # 내부 패키지 (외부 접근 불가)
│   ├── config/
│   │   └── config.go
│   └── database/
│       └── postgres.go
├── pkg/                    # 공개 라이브러리
│   ├── auth/
│   │   ├── auth.go
│   │   └── auth_test.go
│   └── models/
│       └── user.go
├── api/                    # API 정의
│   └── v1/
│       └── routes.go
└── go.mod
```

### Internal 패키지의 마법

```go
// internal/auth/token.go
// 이 패키지는 myapp 내부에서만 사용 가능!
package auth

type TokenGenerator struct {
    secret []byte
}

func (t *TokenGenerator) Generate(userID string) string {
    // 토큰 생성 로직
    return "token"
}
```

```go
// 외부 프로젝트에서 시도하면...
import "github.com/myapp/internal/auth" // 컴파일 에러!
```

## 🔍 Chapter 4: 인터페이스 설계 패턴

### 작은 인터페이스의 힘

```go
// ❌ 나쁜 예: 너무 큰 인터페이스
type UserService interface {
    CreateUser(User) error
    GetUser(id string) (User, error)
    UpdateUser(User) error
    DeleteUser(id string) error
    AuthenticateUser(email, password string) (string, error)
    SendEmail(to string, subject string, body string) error
    // ... 20개 더
}

// ✅ 좋은 예: 작고 집중적인 인터페이스
type UserReader interface {
    GetUser(ctx context.Context, id string) (User, error)
}

type UserWriter interface {
    CreateUser(ctx context.Context, user User) error
    UpdateUser(ctx context.Context, user User) error
}

type UserDeleter interface {
    DeleteUser(ctx context.Context, id string) error
}

// 필요에 따라 조합
type UserRepository interface {
    UserReader
    UserWriter
    UserDeleter
}
```

### Accept Interfaces, Return Structs

```go
// ✅ 인터페이스를 받고
func ProcessData(r io.Reader) error {
    // r은 파일, 네트워크, 메모리 등 어디서든 올 수 있음
    data, err := io.ReadAll(r)
    if err != nil {
        return err
    }
    // 처리...
    return nil
}

// ✅ 구체 타입을 반환
func NewService() *Service {  // 인터페이스가 아닌 구체 타입
    return &Service{
        // ...
    }
}
```

## 🎭 Chapter 5: Context 안티패턴과 해결책

### ❌ 안티패턴 1: Context를 구조체에 저장

```go
// 나쁜 예
type Service struct {
    ctx context.Context  // 절대 금지!
}

// 좋은 예
type Service struct {
    // Context는 매개변수로 전달
}

func (s *Service) DoWork(ctx context.Context) error {
    // Context를 매개변수로 받음
    return nil
}
```

### ❌ 안티패턴 2: Context Value 남용

```go
// 나쁜 예: 비즈니스 로직을 Context에 넣기
ctx = context.WithValue(ctx, "database", db)
ctx = context.WithValue(ctx, "service", service)

// 좋은 예: 요청 스코프 메타데이터만
ctx = context.WithValue(ctx, "requestID", requestID)
ctx = context.WithValue(ctx, "userID", userID)
```

### ❌ 안티패턴 3: nil Context 전달

```go
// 나쁜 예
func doSomething() {
    processData(nil)  // panic 위험!
}

// 좋은 예
func doSomething() {
    ctx := context.Background()  // 또는 context.TODO()
    processData(ctx)
}
```

## 🚀 Chapter 6: 고급 Context 패턴

### 커스텀 Context 구현

```go
// 로깅이 강화된 Context
type LoggingContext struct {
    context.Context
    logger *log.Logger
}

func WithLogger(ctx context.Context, logger *log.Logger) *LoggingContext {
    return &LoggingContext{
        Context: ctx,
        logger:  logger,
    }
}

func (lc *LoggingContext) Logf(format string, args ...interface{}) {
    if requestID := lc.Value("requestID"); requestID != nil {
        format = fmt.Sprintf("[%v] %s", requestID, format)
    }
    lc.logger.Printf(format, args...)
}
```

### Context를 활용한 분산 추적

```go
type Span struct {
    TraceID  string
    SpanID   string
    ParentID string
}

func StartSpan(ctx context.Context, operation string) (context.Context, *Span) {
    parentSpan, _ := ctx.Value("span").(*Span)
    
    span := &Span{
        TraceID:  generateTraceID(),
        SpanID:   generateSpanID(),
        ParentID: parentSpan.SpanID,
    }
    
    // 분산 추적 시스템에 전송
    sendToTracing(span, operation)
    
    return context.WithValue(ctx, "span", span), span
}
```

## 💡 핵심 정리: Context와 패키지 설계

### Context 베스트 프랙티스
1. **첫 번째 매개변수**: Context는 항상 첫 번째
2. **nil 금지**: 최소한 context.Background() 사용
3. **취소 정리**: defer cancel() 필수
4. **값은 메타데이터만**: 비즈니스 로직 X

### 패키지 설계 체크리스트
- [ ] 단일 책임 원칙을 따르는가?
- [ ] 순환 의존성이 없는가?
- [ ] internal 패키지를 활용했는가?
- [ ] 인터페이스는 작고 집중적인가?
- [ ] 테스트가 쉬운가?

## 🎓 마무리: Go의 철학

Context와 패키지 설계는 Go의 핵심 철학을 보여줍니다:
- **명시적 > 암시적**
- **단순함 > 복잡함**
- **조합 > 상속**

"좋은 소프트웨어 설계는 복잡한 것을 단순하게 만드는 것이다."

---

*다음 문서에서는 동시성 패턴의 고급 기법을 알아봅니다.*