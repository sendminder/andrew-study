# Factory Pattern: 객체 생성의 전문가

## 왜 Factory Pattern이 필요했을까?

### 객체 생성의 복잡함

객체를 만드는 것이 단순하지 않을 때가 있습니다.

```
실제 상황을 상상해보세요:

자동차 공장:
- "세단 한 대 주세요" → 엔진 조립, 바퀴 장착, 도색...
- "SUV 한 대 주세요" → 다른 엔진, 큰 바퀴, 높은 차체...

코드에서도 마찬가지:
- "결제 처리 객체 주세요" → 카드? 현금? 포인트?
- "데이터베이스 연결 주세요" → MySQL? PostgreSQL? MongoDB?

문제점:
if paymentType == "card" {
    payment = NewCardPayment(cardNumber, cvv, ...)
} else if paymentType == "cash" {
    payment = NewCashPayment(amount, ...)
} else if paymentType == "point" {
    payment = NewPointPayment(userId, points, ...)
}
// 새로운 결제 수단이 추가되면? 😱
```

## Factory Pattern의 핵심 개념

### 객체 생성을 전문 클래스에 위임

```go
// 팩토리가 객체 생성을 담당
payment := paymentFactory.Create("card", params)
// 사용하는 쪽은 구체적인 생성 과정을 몰라도 됨!
```

## Simple Factory Pattern

### 기본 구현

```go
package payment

// Payment 인터페이스
type Payment interface {
    Process(amount float64) error
    GetType() string
}

// 카드 결제
type CardPayment struct {
    CardNumber string
    CVV        string
}

func (c *CardPayment) Process(amount float64) error {
    fmt.Printf("카드 결제: %.2f원\n", amount)
    // 카드 결제 로직
    return nil
}

func (c *CardPayment) GetType() string {
    return "CARD"
}

// 현금 결제
type CashPayment struct {
    ReceivedAmount float64
}

func (c *CashPayment) Process(amount float64) error {
    fmt.Printf("현금 결제: %.2f원\n", amount)
    if c.ReceivedAmount < amount {
        return fmt.Errorf("금액 부족")
    }
    return nil
}

func (c *CashPayment) GetType() string {
    return "CASH"
}

// 포인트 결제
type PointPayment struct {
    UserID string
    Points int
}

func (p *PointPayment) Process(amount float64) error {
    fmt.Printf("포인트 결제: %.0f 포인트\n", amount)
    // 포인트 차감 로직
    return nil
}

func (p *PointPayment) GetType() string {
    return "POINT"
}
```

### Simple Factory 구현

```go
// PaymentFactory - Simple Factory
type PaymentFactory struct{}

func (f *PaymentFactory) CreatePayment(
    paymentType string, 
    params map[string]interface{},
) (Payment, error) {
    switch paymentType {
    case "card":
        return &CardPayment{
            CardNumber: params["cardNumber"].(string),
            CVV:        params["cvv"].(string),
        }, nil
        
    case "cash":
        return &CashPayment{
            ReceivedAmount: params["amount"].(float64),
        }, nil
        
    case "point":
        return &PointPayment{
            UserID: params["userId"].(string),
            Points: params["points"].(int),
        }, nil
        
    default:
        return nil, fmt.Errorf("unknown payment type: %s", paymentType)
    }
}

// 사용 예시
func main() {
    factory := &PaymentFactory{}
    
    // 카드 결제 생성
    cardPayment, _ := factory.CreatePayment("card", map[string]interface{}{
        "cardNumber": "1234-5678-9012-3456",
        "cvv":        "123",
    })
    cardPayment.Process(50000)
    
    // 현금 결제 생성
    cashPayment, _ := factory.CreatePayment("cash", map[string]interface{}{
        "amount": 100000.0,
    })
    cashPayment.Process(50000)
}
```

## Factory Method Pattern

### 추상 팩토리 메서드

```go
// Creator 인터페이스
type PaymentCreator interface {
    CreatePayment() Payment
    // 팩토리 메서드 - 서브클래스에서 구현
}

// Concrete Creator - 카드 결제 생성자
type CardPaymentCreator struct {
    cardNumber string
    cvv        string
}

func (c *CardPaymentCreator) CreatePayment() Payment {
    return &CardPayment{
        CardNumber: c.cardNumber,
        CVV:        c.cvv,
    }
}

// Concrete Creator - 현금 결제 생성자
type CashPaymentCreator struct {
    amount float64
}

func (c *CashPaymentCreator) CreatePayment() Payment {
    return &CashPayment{
        ReceivedAmount: c.amount,
    }
}

// 사용 예시
func processPayment(creator PaymentCreator, amount float64) error {
    payment := creator.CreatePayment()
    return payment.Process(amount)
}

func main() {
    // 카드 결제
    cardCreator := &CardPaymentCreator{
        cardNumber: "1234-5678-9012-3456",
        cvv:        "123",
    }
    processPayment(cardCreator, 50000)
    
    // 현금 결제
    cashCreator := &CashPaymentCreator{
        amount: 100000,
    }
    processPayment(cashCreator, 50000)
}
```

## Abstract Factory Pattern

### 관련 객체들의 팩토리

```go
// 운영체제별 UI 컴포넌트 생성
package ui

// UI 컴포넌트 인터페이스들
type Button interface {
    Click()
}

type TextBox interface {
    SetText(text string)
}

type Window interface {
    Open()
    Close()
}

// Abstract Factory 인터페이스
type UIFactory interface {
    CreateButton() Button
    CreateTextBox() TextBox
    CreateWindow() Window
}

// Windows UI 구현
type WindowsButton struct{}
func (b *WindowsButton) Click() {
    fmt.Println("Windows 버튼 클릭")
}

type WindowsTextBox struct{}
func (t *WindowsTextBox) SetText(text string) {
    fmt.Printf("Windows 텍스트박스: %s\n", text)
}

type WindowsWindow struct{}
func (w *WindowsWindow) Open() {
    fmt.Println("Windows 창 열기")
}
func (w *WindowsWindow) Close() {
    fmt.Println("Windows 창 닫기")
}

// Windows Factory
type WindowsFactory struct{}

func (f *WindowsFactory) CreateButton() Button {
    return &WindowsButton{}
}

func (f *WindowsFactory) CreateTextBox() TextBox {
    return &WindowsTextBox{}
}

func (f *WindowsFactory) CreateWindow() Window {
    return &WindowsWindow{}
}

// Mac UI 구현
type MacButton struct{}
func (b *MacButton) Click() {
    fmt.Println("Mac 버튼 클릭")
}

type MacTextBox struct{}
func (t *MacTextBox) SetText(text string) {
    fmt.Printf("Mac 텍스트박스: %s\n", text)
}

type MacWindow struct{}
func (w *MacWindow) Open() {
    fmt.Println("Mac 창 열기")
}
func (w *MacWindow) Close() {
    fmt.Println("Mac 창 닫기")
}

// Mac Factory
type MacFactory struct{}

func (f *MacFactory) CreateButton() Button {
    return &MacButton{}
}

func (f *MacFactory) CreateTextBox() TextBox {
    return &MacTextBox{}
}

func (f *MacFactory) CreateWindow() Window {
    return &MacWindow{}
}

// Application
type Application struct {
    factory UIFactory
}

func NewApplication(factory UIFactory) *Application {
    return &Application{factory: factory}
}

func (app *Application) Run() {
    window := app.factory.CreateWindow()
    button := app.factory.CreateButton()
    textBox := app.factory.CreateTextBox()
    
    window.Open()
    textBox.SetText("Hello, Factory Pattern!")
    button.Click()
    window.Close()
}

// 사용 예시
func main() {
    // OS에 따라 다른 팩토리 사용
    var factory UIFactory
    
    if runtime.GOOS == "windows" {
        factory = &WindowsFactory{}
    } else if runtime.GOOS == "darwin" {
        factory = &MacFactory{}
    } else {
        factory = &LinuxFactory{}
    }
    
    app := NewApplication(factory)
    app.Run()
}
```

## 실전 예제: 데이터베이스 연결 팩토리

```go
package database

import (
    "database/sql"
    _ "github.com/go-sql-driver/mysql"
    _ "github.com/lib/pq"
    _ "github.com/mattn/go-sqlite3"
)

// Database 인터페이스
type Database interface {
    Connect() error
    Query(query string) ([]map[string]interface{}, error)
    Close() error
}

// MySQL 구현
type MySQLDatabase struct {
    host     string
    port     int
    user     string
    password string
    dbname   string
    conn     *sql.DB
}

func (m *MySQLDatabase) Connect() error {
    dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s",
        m.user, m.password, m.host, m.port, m.dbname)
    
    conn, err := sql.Open("mysql", dsn)
    if err != nil {
        return err
    }
    m.conn = conn
    return nil
}

func (m *MySQLDatabase) Query(query string) ([]map[string]interface{}, error) {
    // 쿼리 실행 로직
    return nil, nil
}

func (m *MySQLDatabase) Close() error {
    return m.conn.Close()
}

// PostgreSQL 구현
type PostgreSQLDatabase struct {
    host     string
    port     int
    user     string
    password string
    dbname   string
    conn     *sql.DB
}

func (p *PostgreSQLDatabase) Connect() error {
    dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s",
        p.host, p.port, p.user, p.password, p.dbname)
    
    conn, err := sql.Open("postgres", dsn)
    if err != nil {
        return err
    }
    p.conn = conn
    return nil
}

// DatabaseFactory
type DatabaseFactory struct{}

func (f *DatabaseFactory) CreateDatabase(config map[string]interface{}) (Database, error) {
    dbType := config["type"].(string)
    
    switch dbType {
    case "mysql":
        return &MySQLDatabase{
            host:     config["host"].(string),
            port:     config["port"].(int),
            user:     config["user"].(string),
            password: config["password"].(string),
            dbname:   config["dbname"].(string),
        }, nil
        
    case "postgresql":
        return &PostgreSQLDatabase{
            host:     config["host"].(string),
            port:     config["port"].(int),
            user:     config["user"].(string),
            password: config["password"].(string),
            dbname:   config["dbname"].(string),
        }, nil
        
    case "sqlite":
        return &SQLiteDatabase{
            filepath: config["filepath"].(string),
        }, nil
        
    default:
        return nil, fmt.Errorf("unsupported database type: %s", dbType)
    }
}

// 사용 예시
func main() {
    factory := &DatabaseFactory{}
    
    // 설정에 따라 다른 DB 생성
    config := map[string]interface{}{
        "type":     "mysql",
        "host":     "localhost",
        "port":     3306,
        "user":     "root",
        "password": "password",
        "dbname":   "myapp",
    }
    
    db, err := factory.CreateDatabase(config)
    if err != nil {
        log.Fatal(err)
    }
    
    defer db.Close()
    
    if err := db.Connect(); err != nil {
        log.Fatal(err)
    }
    
    results, _ := db.Query("SELECT * FROM users")
    // 결과 처리...
}
```

## 실전 예제: 알림 시스템 팩토리

```go
package notification

// Notification 인터페이스
type Notification interface {
    Send(recipient string, message string) error
}

// Email 알림
type EmailNotification struct {
    smtpServer string
    port       int
    from       string
}

func (e *EmailNotification) Send(recipient string, message string) error {
    fmt.Printf("이메일 발송: %s → %s\n", e.from, recipient)
    fmt.Printf("내용: %s\n", message)
    // 실제 이메일 발송 로직
    return nil
}

// SMS 알림
type SMSNotification struct {
    apiKey   string
    sender   string
}

func (s *SMSNotification) Send(recipient string, message string) error {
    fmt.Printf("SMS 발송: %s → %s\n", s.sender, recipient)
    fmt.Printf("내용: %s\n", message)
    // 실제 SMS 발송 로직
    return nil
}

// Push 알림
type PushNotification struct {
    serverKey string
}

func (p *PushNotification) Send(recipient string, message string) error {
    fmt.Printf("Push 알림: → %s\n", recipient)
    fmt.Printf("내용: %s\n", message)
    // 실제 Push 발송 로직
    return nil
}

// NotificationFactory with Registry
type NotificationFactory struct {
    creators map[string]func() Notification
}

func NewNotificationFactory() *NotificationFactory {
    return &NotificationFactory{
        creators: make(map[string]func() Notification),
    }
}

// 팩토리에 생성자 등록
func (f *NotificationFactory) Register(notifType string, creator func() Notification) {
    f.creators[notifType] = creator
}

// 알림 객체 생성
func (f *NotificationFactory) Create(notifType string) (Notification, error) {
    creator, exists := f.creators[notifType]
    if !exists {
        return nil, fmt.Errorf("notification type %s not registered", notifType)
    }
    return creator(), nil
}

// 사용 예시
func main() {
    factory := NewNotificationFactory()
    
    // 생성자 등록
    factory.Register("email", func() Notification {
        return &EmailNotification{
            smtpServer: "smtp.gmail.com",
            port:       587,
            from:       "noreply@example.com",
        }
    })
    
    factory.Register("sms", func() Notification {
        return &SMSNotification{
            apiKey: "api-key-123",
            sender: "1588-1234",
        }
    })
    
    factory.Register("push", func() Notification {
        return &PushNotification{
            serverKey: "server-key-456",
        }
    })
    
    // 사용자 선호도에 따라 알림 발송
    userPreference := "email"  // 사용자 설정에서 가져옴
    
    notifier, err := factory.Create(userPreference)
    if err != nil {
        log.Fatal(err)
    }
    
    notifier.Send("user@example.com", "주문이 완료되었습니다!")
}
```

## Factory Pattern의 장단점

### 장점
```
✅ 객체 생성 로직 캡슐화
✅ 새로운 타입 추가 용이
✅ 코드 재사용성 향상
✅ 의존성 역전 원칙 준수
✅ 단일 책임 원칙 준수
```

### 단점
```
❌ 클래스 수 증가
❌ 코드 복잡도 증가
❌ 간단한 객체에는 과도함
```

## Factory Pattern 선택 가이드

### Simple Factory를 사용할 때
```
- 객체 생성 로직이 단순
- 타입이 자주 변경되지 않음
- 작은 프로젝트
```

### Factory Method를 사용할 때
```
- 생성 로직을 서브클래스에 위임
- 프레임워크 설계
- 확장 가능한 구조 필요
```

### Abstract Factory를 사용할 때
```
- 관련된 객체들의 집합 생성
- 제품군 전체 교체 필요
- 플랫폼별 구현 필요
```

## 정리

Factory Pattern은 "객체 생성을 전문화"하는 패턴입니다.

마치 자동차 공장이 다양한 모델의 차를 전문적으로 생산하듯이, Factory는 다양한 객체를 전문적으로 생성합니다. 사용하는 쪽은 "어떻게" 만드는지 몰라도, "무엇"을 원하는지만 알면 됩니다.

"객체 생성도 전문가에게 맡기자" - 이것이 Factory Pattern의 철학입니다.