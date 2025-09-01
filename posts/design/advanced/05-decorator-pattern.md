# Decorator Pattern: 기능을 덧붙이는 장식가

## 왜 Decorator Pattern이 필요했을까?

### 기능을 동적으로 추가하고 싶을 때

객체에 새로운 기능을 추가하되, 기존 코드를 수정하지 않고 싶을 때가 있습니다.

```
실제 상황을 생각해보세요:

커피숍 주문 시스템:
- 기본 커피: 4,000원
- + 샷 추가: 500원
- + 휘핑크림: 700원
- + 시럽: 300원
- + 두유 변경: 600원

문제 상황:
class CoffeeWithMilk { }
class CoffeeWithMilkAndSyrup { }
class CoffeeWithMilkAndSyrupAndWhip { }
class CoffeeWithSoyMilkAndExtraShot { }
// 조합이 늘어날수록 클래스 폭발! 💥
// 20개 옵션 = 2^20 = 100만개 클래스?!
```

## Decorator Pattern의 핵심 개념

### 객체를 감싸서 기능 추가

```go
// 마트료시카 인형처럼 하나씩 감싸기
coffee = NewEspresso()                    // 기본 에스프레소
coffee = NewMilk(coffee)                  // 우유 추가
coffee = NewWhip(coffee)                  // 휘핑 추가
coffee = NewSyrup(coffee)                 // 시럽 추가
// 각 데코레이터가 이전 객체를 감싸면서 기능 추가
```

## 기본 Decorator Pattern 구현

### 커피숍 시스템

```go
package coffee

import "fmt"

// Beverage 인터페이스 - Component
type Beverage interface {
    GetDescription() string
    GetCost() float64
}

// Espresso - Concrete Component
type Espresso struct{}

func (e *Espresso) GetDescription() string {
    return "에스프레소"
}

func (e *Espresso) GetCost() float64 {
    return 4000
}

// Americano - Concrete Component
type Americano struct{}

func (a *Americano) GetDescription() string {
    return "아메리카노"
}

func (a *Americano) GetCost() float64 {
    return 4500
}

// Latte - Concrete Component
type Latte struct{}

func (l *Latte) GetDescription() string {
    return "라떼"
}

func (l *Latte) GetCost() float64 {
    return 5000
}

// CondimentDecorator - Decorator Base
type CondimentDecorator struct {
    beverage Beverage
}

// Milk - Concrete Decorator
type Milk struct {
    CondimentDecorator
}

func NewMilk(beverage Beverage) *Milk {
    return &Milk{
        CondimentDecorator: CondimentDecorator{
            beverage: beverage,
        },
    }
}

func (m *Milk) GetDescription() string {
    return m.beverage.GetDescription() + ", 우유"
}

func (m *Milk) GetCost() float64 {
    return m.beverage.GetCost() + 500
}

// WhipCream - Concrete Decorator
type WhipCream struct {
    CondimentDecorator
}

func NewWhipCream(beverage Beverage) *WhipCream {
    return &WhipCream{
        CondimentDecorator: CondimentDecorator{
            beverage: beverage,
        },
    }
}

func (w *WhipCream) GetDescription() string {
    return w.beverage.GetDescription() + ", 휘핑크림"
}

func (w *WhipCream) GetCost() float64 {
    return w.beverage.GetCost() + 700
}

// Syrup - Concrete Decorator
type Syrup struct {
    CondimentDecorator
    flavor string
}

func NewSyrup(beverage Beverage, flavor string) *Syrup {
    return &Syrup{
        CondimentDecorator: CondimentDecorator{
            beverage: beverage,
        },
        flavor: flavor,
    }
}

func (s *Syrup) GetDescription() string {
    return s.beverage.GetDescription() + ", " + s.flavor + " 시럽"
}

func (s *Syrup) GetCost() float64 {
    return s.beverage.GetCost() + 300
}

// ExtraShot - Concrete Decorator
type ExtraShot struct {
    CondimentDecorator
    shots int
}

func NewExtraShot(beverage Beverage, shots int) *ExtraShot {
    return &ExtraShot{
        CondimentDecorator: CondimentDecorator{
            beverage: beverage,
        },
        shots: shots,
    }
}

func (e *ExtraShot) GetDescription() string {
    return e.beverage.GetDescription() + 
        fmt.Sprintf(", 샷 %d개 추가", e.shots)
}

func (e *ExtraShot) GetCost() float64 {
    return e.beverage.GetCost() + (500 * float64(e.shots))
}

// Size Decorator - 사이즈 변경
type SizeDecorator struct {
    CondimentDecorator
    size string
}

func NewSizeDecorator(beverage Beverage, size string) *SizeDecorator {
    return &SizeDecorator{
        CondimentDecorator: CondimentDecorator{
            beverage: beverage,
        },
        size: size,
    }
}

func (s *SizeDecorator) GetDescription() string {
    return s.size + " " + s.beverage.GetDescription()
}

func (s *SizeDecorator) GetCost() float64 {
    baseCost := s.beverage.GetCost()
    
    switch s.size {
    case "Tall":
        return baseCost
    case "Grande":
        return baseCost + 500
    case "Venti":
        return baseCost + 1000
    default:
        return baseCost
    }
}
```

### 사용 예시

```go
func main() {
    // 기본 에스프레소
    var beverage Beverage = &Espresso{}
    fmt.Printf("%s: %.0f원\n", 
        beverage.GetDescription(), beverage.GetCost())
    
    // 아메리카노 + 휘핑크림
    var beverage2 Beverage = &Americano{}
    beverage2 = NewWhipCream(beverage2)
    fmt.Printf("%s: %.0f원\n", 
        beverage2.GetDescription(), beverage2.GetCost())
    
    // 라떼 + 바닐라 시럽 + 샷 추가 + 휘핑크림
    var beverage3 Beverage = &Latte{}
    beverage3 = NewSyrup(beverage3, "바닐라")
    beverage3 = NewExtraShot(beverage3, 2)
    beverage3 = NewWhipCream(beverage3)
    fmt.Printf("%s: %.0f원\n", 
        beverage3.GetDescription(), beverage3.GetCost())
    
    // Venti 사이즈 아메리카노 + 샷 추가
    var beverage4 Beverage = &Americano{}
    beverage4 = NewSizeDecorator(beverage4, "Venti")
    beverage4 = NewExtraShot(beverage4, 1)
    fmt.Printf("%s: %.0f원\n", 
        beverage4.GetDescription(), beverage4.GetCost())
}
```

## 실전 예제: HTTP 미들웨어

```go
package middleware

import (
    "fmt"
    "log"
    "net/http"
    "time"
)

// Handler 인터페이스
type Handler interface {
    ServeHTTP(w http.ResponseWriter, r *http.Request)
}

// BaseHandler - 기본 핸들러
type BaseHandler struct {
    message string
}

func NewBaseHandler(message string) *BaseHandler {
    return &BaseHandler{message: message}
}

func (h *BaseHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Response: %s", h.message)
}

// LoggingMiddleware - 로깅 데코레이터
type LoggingMiddleware struct {
    handler Handler
}

func NewLoggingMiddleware(handler Handler) *LoggingMiddleware {
    return &LoggingMiddleware{handler: handler}
}

func (l *LoggingMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    
    log.Printf("[%s] %s %s", 
        r.Method, r.URL.Path, r.RemoteAddr)
    
    l.handler.ServeHTTP(w, r)
    
    log.Printf("Request processed in %v", time.Since(start))
}

// AuthMiddleware - 인증 데코레이터
type AuthMiddleware struct {
    handler Handler
    token   string
}

func NewAuthMiddleware(handler Handler, token string) *AuthMiddleware {
    return &AuthMiddleware{
        handler: handler,
        token:   token,
    }
}

func (a *AuthMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    authHeader := r.Header.Get("Authorization")
    
    if authHeader != "Bearer "+a.token {
        w.WriteHeader(http.StatusUnauthorized)
        fmt.Fprintf(w, "Unauthorized")
        return
    }
    
    log.Println("Authentication successful")
    a.handler.ServeHTTP(w, r)
}

// CORSMiddleware - CORS 데코레이터
type CORSMiddleware struct {
    handler Handler
    origin  string
}

func NewCORSMiddleware(handler Handler, origin string) *CORSMiddleware {
    return &CORSMiddleware{
        handler: handler,
        origin:  origin,
    }
}

func (c *CORSMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Access-Control-Allow-Origin", c.origin)
    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
    
    if r.Method == "OPTIONS" {
        w.WriteHeader(http.StatusOK)
        return
    }
    
    c.handler.ServeHTTP(w, r)
}

// RateLimitMiddleware - 속도 제한 데코레이터
type RateLimitMiddleware struct {
    handler  Handler
    requests map[string][]time.Time
    limit    int
    window   time.Duration
}

func NewRateLimitMiddleware(handler Handler, limit int, window time.Duration) *RateLimitMiddleware {
    return &RateLimitMiddleware{
        handler:  handler,
        requests: make(map[string][]time.Time),
        limit:    limit,
        window:   window,
    }
}

func (r *RateLimitMiddleware) ServeHTTP(w http.ResponseWriter, req *http.Request) {
    ip := req.RemoteAddr
    now := time.Now()
    
    // 오래된 요청 제거
    validRequests := []time.Time{}
    for _, t := range r.requests[ip] {
        if now.Sub(t) < r.window {
            validRequests = append(validRequests, t)
        }
    }
    
    if len(validRequests) >= r.limit {
        w.WriteHeader(http.StatusTooManyRequests)
        fmt.Fprintf(w, "Rate limit exceeded")
        return
    }
    
    r.requests[ip] = append(validRequests, now)
    r.handler.ServeHTTP(w, req)
}

// 사용 예시
func setupServer() {
    // 기본 핸들러
    handler := NewBaseHandler("Hello, World!")
    
    // 데코레이터 체인
    // handler = NewCORSMiddleware(handler, "*")
    // handler = NewRateLimitMiddleware(handler, 10, time.Minute)
    // handler = NewAuthMiddleware(handler, "secret-token")
    // handler = NewLoggingMiddleware(handler)
    
    // 순서가 중요! 바깥쪽부터 실행됨
    // Logging → Auth → RateLimit → CORS → Base
    
    http.Handle("/", handler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## 실전 예제: 파일 처리 파이프라인

```go
package fileprocessor

import (
    "bytes"
    "compress/gzip"
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "encoding/base64"
    "fmt"
    "io"
    "strings"
)

// FileProcessor 인터페이스
type FileProcessor interface {
    Process(data []byte) ([]byte, error)
    GetDescription() string
}

// BaseProcessor - 기본 프로세서
type BaseProcessor struct {
    filename string
}

func NewBaseProcessor(filename string) *BaseProcessor {
    return &BaseProcessor{filename: filename}
}

func (b *BaseProcessor) Process(data []byte) ([]byte, error) {
    return data, nil
}

func (b *BaseProcessor) GetDescription() string {
    return fmt.Sprintf("File: %s", b.filename)
}

// CompressionDecorator - 압축 데코레이터
type CompressionDecorator struct {
    processor FileProcessor
}

func NewCompressionDecorator(processor FileProcessor) *CompressionDecorator {
    return &CompressionDecorator{processor: processor}
}

func (c *CompressionDecorator) Process(data []byte) ([]byte, error) {
    // 이전 프로세서 실행
    processed, err := c.processor.Process(data)
    if err != nil {
        return nil, err
    }
    
    // 압축
    var buf bytes.Buffer
    writer := gzip.NewWriter(&buf)
    _, err = writer.Write(processed)
    if err != nil {
        return nil, err
    }
    writer.Close()
    
    fmt.Printf("압축 완료: %d → %d bytes\n", 
        len(processed), buf.Len())
    
    return buf.Bytes(), nil
}

func (c *CompressionDecorator) GetDescription() string {
    return c.processor.GetDescription() + " → Compressed"
}

// EncryptionDecorator - 암호화 데코레이터
type EncryptionDecorator struct {
    processor FileProcessor
    key       []byte
}

func NewEncryptionDecorator(processor FileProcessor, key []byte) *EncryptionDecorator {
    return &EncryptionDecorator{
        processor: processor,
        key:       key,
    }
}

func (e *EncryptionDecorator) Process(data []byte) ([]byte, error) {
    // 이전 프로세서 실행
    processed, err := e.processor.Process(data)
    if err != nil {
        return nil, err
    }
    
    // AES 암호화 (간단한 예시)
    block, err := aes.NewCipher(e.key)
    if err != nil {
        return nil, err
    }
    
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }
    
    nonce := make([]byte, gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return nil, err
    }
    
    encrypted := gcm.Seal(nonce, nonce, processed, nil)
    
    fmt.Printf("암호화 완료: %d → %d bytes\n", 
        len(processed), len(encrypted))
    
    return encrypted, nil
}

func (e *EncryptionDecorator) GetDescription() string {
    return e.processor.GetDescription() + " → Encrypted"
}

// Base64Decorator - Base64 인코딩 데코레이터
type Base64Decorator struct {
    processor FileProcessor
}

func NewBase64Decorator(processor FileProcessor) *Base64Decorator {
    return &Base64Decorator{processor: processor}
}

func (b *Base64Decorator) Process(data []byte) ([]byte, error) {
    // 이전 프로세서 실행
    processed, err := b.processor.Process(data)
    if err != nil {
        return nil, err
    }
    
    // Base64 인코딩
    encoded := base64.StdEncoding.EncodeToString(processed)
    
    fmt.Printf("Base64 인코딩 완료: %d → %d bytes\n", 
        len(processed), len(encoded))
    
    return []byte(encoded), nil
}

func (b *Base64Decorator) GetDescription() string {
    return b.processor.GetDescription() + " → Base64"
}

// UpperCaseDecorator - 대문자 변환 데코레이터
type UpperCaseDecorator struct {
    processor FileProcessor
}

func NewUpperCaseDecorator(processor FileProcessor) *UpperCaseDecorator {
    return &UpperCaseDecorator{processor: processor}
}

func (u *UpperCaseDecorator) Process(data []byte) ([]byte, error) {
    // 이전 프로세서 실행
    processed, err := u.processor.Process(data)
    if err != nil {
        return nil, err
    }
    
    // 대문자 변환
    result := strings.ToUpper(string(processed))
    
    fmt.Println("대문자 변환 완료")
    
    return []byte(result), nil
}

func (u *UpperCaseDecorator) GetDescription() string {
    return u.processor.GetDescription() + " → UpperCase"
}

// 사용 예시
func processFile() {
    data := []byte("Hello, World! This is a test file.")
    
    // 기본 프로세서
    processor := NewBaseProcessor("test.txt")
    
    // 파이프라인 1: 압축 → Base64
    fmt.Println("\n=== 파이프라인 1 ===")
    p1 := NewBase64Decorator(NewCompressionDecorator(processor))
    result1, _ := p1.Process(data)
    fmt.Printf("최종: %s\n", p1.GetDescription())
    fmt.Printf("결과 크기: %d bytes\n", len(result1))
    
    // 파이프라인 2: 대문자 → 압축 → 암호화 → Base64
    fmt.Println("\n=== 파이프라인 2 ===")
    key := []byte("myverystrongpasswordo32bitlength")
    p2 := NewBase64Decorator(
        NewEncryptionDecorator(
            NewCompressionDecorator(
                NewUpperCaseDecorator(processor),
            ),
            key,
        ),
    )
    result2, _ := p2.Process(data)
    fmt.Printf("최종: %s\n", p2.GetDescription())
    fmt.Printf("결과 크기: %d bytes\n", len(result2))
}
```

## 실전 예제: UI 컴포넌트 데코레이터

```go
package ui

import (
    "fmt"
    "strings"
)

// Component 인터페이스
type Component interface {
    Render() string
    GetName() string
}

// TextField - 기본 컴포넌트
type TextField struct {
    value string
}

func NewTextField(value string) *TextField {
    return &TextField{value: value}
}

func (t *TextField) Render() string {
    return fmt.Sprintf("<input type='text' value='%s' />", t.value)
}

func (t *TextField) GetName() string {
    return "TextField"
}

// BorderDecorator - 테두리 데코레이터
type BorderDecorator struct {
    component Component
    style     string
}

func NewBorderDecorator(component Component, style string) *BorderDecorator {
    return &BorderDecorator{
        component: component,
        style:     style,
    }
}

func (b *BorderDecorator) Render() string {
    return fmt.Sprintf(
        "<div style='border: %s'>%s</div>",
        b.style,
        b.component.Render(),
    )
}

func (b *BorderDecorator) GetName() string {
    return b.component.GetName() + " with Border"
}

// ScrollDecorator - 스크롤 데코레이터
type ScrollDecorator struct {
    component Component
    height    int
}

func NewScrollDecorator(component Component, height int) *ScrollDecorator {
    return &ScrollDecorator{
        component: component,
        height:    height,
    }
}

func (s *ScrollDecorator) Render() string {
    return fmt.Sprintf(
        "<div style='overflow-y: scroll; height: %dpx'>%s</div>",
        s.height,
        s.component.Render(),
    )
}

func (s *ScrollDecorator) GetName() string {
    return s.component.GetName() + " with Scroll"
}

// ThemeDecorator - 테마 데코레이터
type ThemeDecorator struct {
    component Component
    theme     string
}

func NewThemeDecorator(component Component, theme string) *ThemeDecorator {
    return &ThemeDecorator{
        component: component,
        theme:     theme,
    }
}

func (t *ThemeDecorator) Render() string {
    class := "theme-light"
    if t.theme == "dark" {
        class = "theme-dark"
    }
    
    return fmt.Sprintf(
        "<div class='%s'>%s</div>",
        class,
        t.component.Render(),
    )
}

func (t *ThemeDecorator) GetName() string {
    return t.component.GetName() + " with " + strings.Title(t.theme) + " Theme"
}

// 사용 예시
func buildUI() {
    // 기본 텍스트 필드
    textField := NewTextField("Hello World")
    fmt.Println(textField.Render())
    
    // 테두리 추가
    withBorder := NewBorderDecorator(textField, "1px solid black")
    fmt.Println(withBorder.Render())
    
    // 테두리 + 스크롤
    withScroll := NewScrollDecorator(withBorder, 200)
    fmt.Println(withScroll.Render())
    
    // 테두리 + 스크롤 + 다크 테마
    withTheme := NewThemeDecorator(withScroll, "dark")
    fmt.Println(withTheme.Render())
    fmt.Printf("컴포넌트: %s\n", withTheme.GetName())
}
```

## Decorator Pattern의 장단점

### 장점
```
✅ 기존 코드 수정 없이 기능 추가
✅ 단일 책임 원칙 준수
✅ 조합의 유연성
✅ 런타임에 기능 추가/제거
✅ 상속보다 유연한 구성
```

### 단점
```
❌ 작은 객체들이 많이 생성됨
❌ 디버깅 어려움 (여러 층의 래퍼)
❌ 데코레이터 순서가 중요할 수 있음
❌ 초기 설정 코드가 복잡
```

## Decorator vs 다른 패턴

### Decorator vs Adapter
```
Decorator: 기능 추가
Adapter: 인터페이스 변환

Decorator는 원본 인터페이스 유지
Adapter는 다른 인터페이스로 변환
```

### Decorator vs Proxy
```
Decorator: 기능 추가가 목적
Proxy: 접근 제어가 목적

Decorator는 여러 개 중첩 가능
Proxy는 보통 하나만 사용
```

### Decorator vs Strategy
```
Decorator: 기능을 누적
Strategy: 알고리즘을 교체

Decorator는 감싸기 (Wrapping)
Strategy는 위임 (Delegation)
```

## 실제 사용 사례

### Java I/O
```java
// Java의 I/O 스트림
InputStream is = new FileInputStream("file.txt");
is = new BufferedInputStream(is);
is = new GZIPInputStream(is);
```

### 웹 프레임워크
```
- Express.js 미들웨어
- Django 미들웨어
- Spring AOP
- ASP.NET Core 미들웨어
```

### UI 프레임워크
```
- React Higher-Order Components
- Angular Directives
- Vue.js Mixins
```

## 정리

Decorator Pattern은 "객체에 동적으로 기능을 추가"하는 패턴입니다.

마치 크리스마스 트리를 장식하듯이, 기본 객체에 하나씩 장식(기능)을 추가합니다. 필요에 따라 장식을 추가하거나 제거할 수 있고, 장식의 조합도 자유롭게 만들 수 있습니다.

"기본에 하나씩 더하여 풍성하게" - 이것이 Decorator Pattern의 철학입니다.