# Observer Pattern: 상태 변화를 감지하는 감시자

## 왜 Observer Pattern이 필요했을까?

### 변화를 알려야 하는 상황들

하나의 변화가 여러 곳에 영향을 미칠 때가 있습니다.

```
실제 상황을 생각해보세요:

유튜브 구독 시스템:
- 크리에이터가 영상 업로드 → 수만 명의 구독자에게 알림
- 구독자는 자동으로 알림 받음
- 구독 취소하면 알림 중단

주식 시장:
- 주가 변동 → 수천 명의 투자자에게 알림
- 각자 설정한 조건에 따라 알림
- 관심 종목만 선택적 구독

문제 상황:
if 주가변경 {
    sendEmailToUser1()
    sendSMSToUser2()
    updateDashboardForUser3()
    // 새로운 사용자 추가할 때마다 코드 수정? 😱
}
```

## Observer Pattern의 핵심 개념

### 발행-구독 메커니즘

```go
// 주체(Subject)는 관찰자(Observer)들을 관리
// 상태 변화 시 모든 관찰자에게 자동 통지

주체.상태변경() → 자동으로 → 모든 관찰자.업데이트()
```

## 기본 Observer Pattern 구현

### 인터페이스 정의

```go
package observer

// Observer 인터페이스
type Observer interface {
    Update(data interface{})
    GetID() string
}

// Subject 인터페이스
type Subject interface {
    Attach(observer Observer)
    Detach(observer Observer)
    Notify()
}

// 구체적인 Subject - 주식 가격
type StockPrice struct {
    observers map[string]Observer
    symbol    string
    price     float64
}

func NewStockPrice(symbol string) *StockPrice {
    return &StockPrice{
        observers: make(map[string]Observer),
        symbol:    symbol,
        price:     0,
    }
}

func (s *StockPrice) Attach(observer Observer) {
    s.observers[observer.GetID()] = observer
    fmt.Printf("관찰자 %s가 %s 주식을 구독했습니다\n", 
        observer.GetID(), s.symbol)
}

func (s *StockPrice) Detach(observer Observer) {
    delete(s.observers, observer.GetID())
    fmt.Printf("관찰자 %s가 %s 주식 구독을 취소했습니다\n", 
        observer.GetID(), s.symbol)
}

func (s *StockPrice) Notify() {
    for _, observer := range s.observers {
        observer.Update(map[string]interface{}{
            "symbol": s.symbol,
            "price":  s.price,
        })
    }
}

func (s *StockPrice) SetPrice(price float64) {
    fmt.Printf("\n%s 주가 변경: %.2f → %.2f\n", 
        s.symbol, s.price, price)
    s.price = price
    s.Notify()  // 모든 관찰자에게 알림
}
```

### 구체적인 Observer 구현

```go
// 투자자 - Observer 구현
type Investor struct {
    id       string
    name     string
    strategy string  // "buy", "sell", "hold"
}

func NewInvestor(id, name, strategy string) *Investor {
    return &Investor{
        id:       id,
        name:     name,
        strategy: strategy,
    }
}

func (i *Investor) Update(data interface{}) {
    stockData := data.(map[string]interface{})
    symbol := stockData["symbol"].(string)
    price := stockData["price"].(float64)
    
    fmt.Printf("  [%s] %s님, %s 주가: %.2f\n", 
        i.id, i.name, symbol, price)
    
    // 전략에 따른 행동
    switch i.strategy {
    case "buy":
        if price < 50000 {
            fmt.Printf("    → 매수 신호! (50,000원 미만)\n")
        }
    case "sell":
        if price > 100000 {
            fmt.Printf("    → 매도 신호! (100,000원 초과)\n")
        }
    case "hold":
        fmt.Printf("    → 보유 유지\n")
    }
}

func (i *Investor) GetID() string {
    return i.id
}

// 알림 시스템 - 또 다른 Observer
type NotificationSystem struct {
    id      string
    channel string  // "email", "sms", "push"
}

func NewNotificationSystem(id, channel string) *NotificationSystem {
    return &NotificationSystem{
        id:      id,
        channel: channel,
    }
}

func (n *NotificationSystem) Update(data interface{}) {
    stockData := data.(map[string]interface{})
    symbol := stockData["symbol"].(string)
    price := stockData["price"].(float64)
    
    switch n.channel {
    case "email":
        fmt.Printf("  [%s] 이메일 발송: %s 주가 %.2f\n", 
            n.id, symbol, price)
    case "sms":
        fmt.Printf("  [%s] SMS 발송: %s %.2f\n", 
            n.id, symbol, price)
    case "push":
        fmt.Printf("  [%s] 푸시 알림: %s %.2f\n", 
            n.id, symbol, price)
    }
}

func (n *NotificationSystem) GetID() string {
    return n.id
}
```

## 실전 예제: 이벤트 시스템

```go
package events

import (
    "sync"
    "time"
)

// EventType 정의
type EventType string

const (
    EventUserLogin    EventType = "user.login"
    EventUserLogout   EventType = "user.logout"
    EventOrderCreated EventType = "order.created"
    EventOrderPaid    EventType = "order.paid"
    EventOrderShipped EventType = "order.shipped"
)

// Event 구조체
type Event struct {
    Type      EventType
    Timestamp time.Time
    Data      map[string]interface{}
}

// EventHandler 함수 타입
type EventHandler func(event Event)

// EventBus - 이벤트 중앙 관리
type EventBus struct {
    handlers map[EventType][]EventHandler
    mu       sync.RWMutex
}

func NewEventBus() *EventBus {
    return &EventBus{
        handlers: make(map[EventType][]EventHandler),
    }
}

// Subscribe - 이벤트 구독
func (eb *EventBus) Subscribe(eventType EventType, handler EventHandler) {
    eb.mu.Lock()
    defer eb.mu.Unlock()
    
    eb.handlers[eventType] = append(eb.handlers[eventType], handler)
}

// Publish - 이벤트 발행
func (eb *EventBus) Publish(event Event) {
    eb.mu.RLock()
    handlers := eb.handlers[event.Type]
    eb.mu.RUnlock()
    
    // 모든 핸들러 실행
    for _, handler := range handlers {
        go handler(event)  // 비동기 실행
    }
}

// 사용 예시
func main() {
    eventBus := NewEventBus()
    
    // 로그 시스템 구독
    eventBus.Subscribe(EventUserLogin, func(event Event) {
        userID := event.Data["userID"].(string)
        fmt.Printf("[로그] 사용자 %s 로그인 - %s\n", 
            userID, event.Timestamp.Format("15:04:05"))
    })
    
    // 분석 시스템 구독
    eventBus.Subscribe(EventUserLogin, func(event Event) {
        userID := event.Data["userID"].(string)
        fmt.Printf("[분석] 로그인 통계 업데이트: %s\n", userID)
    })
    
    // 보안 시스템 구독
    eventBus.Subscribe(EventUserLogin, func(event Event) {
        userID := event.Data["userID"].(string)
        ip := event.Data["ip"].(string)
        fmt.Printf("[보안] 로그인 감지: %s from %s\n", userID, ip)
    })
    
    // 주문 이벤트 구독
    eventBus.Subscribe(EventOrderCreated, func(event Event) {
        orderID := event.Data["orderID"].(string)
        amount := event.Data["amount"].(float64)
        fmt.Printf("[주문] 새 주문 #%s: %.2f원\n", orderID, amount)
    })
    
    // 이벤트 발행
    eventBus.Publish(Event{
        Type:      EventUserLogin,
        Timestamp: time.Now(),
        Data: map[string]interface{}{
            "userID": "user123",
            "ip":     "192.168.1.1",
        },
    })
    
    eventBus.Publish(Event{
        Type:      EventOrderCreated,
        Timestamp: time.Now(),
        Data: map[string]interface{}{
            "orderID": "ORD-001",
            "userID":  "user123",
            "amount":  50000.0,
        },
    })
    
    time.Sleep(100 * time.Millisecond)  // 비동기 처리 대기
}
```

## 실전 예제: 모델-뷰 패턴

```go
package mvc

// Model - 데이터와 비즈니스 로직
type UserModel struct {
    observers []Observer
    id        string
    name      string
    email     string
    status    string
}

func NewUserModel(id string) *UserModel {
    return &UserModel{
        observers: []Observer{},
        id:        id,
        status:    "offline",
    }
}

func (m *UserModel) Attach(observer Observer) {
    m.observers = append(m.observers, observer)
}

func (m *UserModel) NotifyAll() {
    for _, observer := range m.observers {
        observer.Update(m)
    }
}

func (m *UserModel) SetName(name string) {
    m.name = name
    m.NotifyAll()
}

func (m *UserModel) SetStatus(status string) {
    fmt.Printf("\n상태 변경: %s → %s\n", m.status, status)
    m.status = status
    m.NotifyAll()
}

// View - UI 컴포넌트
type ProfileView struct {
    id string
}

func NewProfileView(id string) *ProfileView {
    return &ProfileView{id: id}
}

func (v *ProfileView) Update(data interface{}) {
    user := data.(*UserModel)
    fmt.Printf("[프로필 뷰] 사용자: %s, 상태: %s\n", 
        user.name, user.status)
    // UI 업데이트 로직
}

func (v *ProfileView) GetID() string {
    return v.id
}

// StatusBarView - 또 다른 뷰
type StatusBarView struct {
    id string
}

func NewStatusBarView(id string) *StatusBarView {
    return &StatusBarView{id: id}
}

func (v *StatusBarView) Update(data interface{}) {
    user := data.(*UserModel)
    
    statusIcon := "⚫"
    if user.status == "online" {
        statusIcon = "🟢"
    } else if user.status == "away" {
        statusIcon = "🟡"
    }
    
    fmt.Printf("[상태바] %s %s\n", statusIcon, user.name)
}

func (v *StatusBarView) GetID() string {
    return v.id
}

// 사용 예시
func main() {
    // Model 생성
    user := NewUserModel("user1")
    user.SetName("Andrew")
    
    // View들을 Model에 연결
    profileView := NewProfileView("profile-view")
    statusBar := NewStatusBarView("status-bar")
    
    user.Attach(profileView)
    user.Attach(statusBar)
    
    // Model 변경 시 모든 View 자동 업데이트
    user.SetStatus("online")
    time.Sleep(2 * time.Second)
    
    user.SetStatus("away")
    time.Sleep(2 * time.Second)
    
    user.SetStatus("offline")
}
```

## 실전 예제: 실시간 채팅 시스템

```go
package chat

import (
    "fmt"
    "time"
)

// ChatRoom - Subject
type ChatRoom struct {
    name      string
    users     map[string]*User
    messages  []Message
}

type Message struct {
    From      string
    Content   string
    Timestamp time.Time
}

func NewChatRoom(name string) *ChatRoom {
    return &ChatRoom{
        name:     name,
        users:    make(map[string]*User),
        messages: []Message{},
    }
}

func (c *ChatRoom) Join(user *User) {
    c.users[user.ID] = user
    
    // 입장 알림
    msg := Message{
        From:      "System",
        Content:   fmt.Sprintf("%s님이 입장하셨습니다", user.Name),
        Timestamp: time.Now(),
    }
    
    c.broadcast(msg)
}

func (c *ChatRoom) Leave(userID string) {
    user, exists := c.users[userID]
    if !exists {
        return
    }
    
    delete(c.users, userID)
    
    // 퇴장 알림
    msg := Message{
        From:      "System",
        Content:   fmt.Sprintf("%s님이 퇴장하셨습니다", user.Name),
        Timestamp: time.Now(),
    }
    
    c.broadcast(msg)
}

func (c *ChatRoom) SendMessage(userID, content string) {
    user, exists := c.users[userID]
    if !exists {
        return
    }
    
    msg := Message{
        From:      user.Name,
        Content:   content,
        Timestamp: time.Now(),
    }
    
    c.messages = append(c.messages, msg)
    c.broadcast(msg)
}

func (c *ChatRoom) broadcast(msg Message) {
    for _, user := range c.users {
        user.ReceiveMessage(msg)
    }
}

// User - Observer
type User struct {
    ID     string
    Name   string
    Status string  // "online", "away", "busy"
}

func NewUser(id, name string) *User {
    return &User{
        ID:     id,
        Name:   name,
        Status: "online",
    }
}

func (u *User) ReceiveMessage(msg Message) {
    timestamp := msg.Timestamp.Format("15:04:05")
    
    if msg.From == "System" {
        fmt.Printf("[%s] %s: [시스템] %s\n", 
            timestamp, u.Name, msg.Content)
    } else if msg.From == u.Name {
        fmt.Printf("[%s] %s: [나] %s\n", 
            timestamp, u.Name, msg.Content)
    } else {
        fmt.Printf("[%s] %s: [%s] %s\n", 
            timestamp, u.Name, msg.From, msg.Content)
    }
}

// 사용 예시
func main() {
    // 채팅방 생성
    chatRoom := NewChatRoom("개발자 모임")
    
    // 사용자 생성 및 입장
    user1 := NewUser("1", "Andrew")
    user2 := NewUser("2", "Brian")
    user3 := NewUser("3", "Carol")
    
    chatRoom.Join(user1)
    time.Sleep(500 * time.Millisecond)
    
    chatRoom.Join(user2)
    time.Sleep(500 * time.Millisecond)
    
    chatRoom.Join(user3)
    time.Sleep(500 * time.Millisecond)
    
    // 메시지 전송
    chatRoom.SendMessage("1", "안녕하세요!")
    time.Sleep(500 * time.Millisecond)
    
    chatRoom.SendMessage("2", "반갑습니다!")
    time.Sleep(500 * time.Millisecond)
    
    chatRoom.SendMessage("3", "저도 인사드립니다!")
    time.Sleep(500 * time.Millisecond)
    
    // 사용자 퇴장
    chatRoom.Leave("2")
}
```

## Push vs Pull 방식

### Push 방식 (일반적인 Observer)
```go
// Subject가 Observer에게 데이터를 푸시
func (s *Subject) Notify() {
    for _, observer := range s.observers {
        observer.Update(s.data)  // 데이터를 직접 전달
    }
}
```

### Pull 방식
```go
// Observer가 Subject에서 데이터를 풀
func (s *Subject) Notify() {
    for _, observer := range s.observers {
        observer.Update(s)  // Subject 자체를 전달
    }
}

func (o *Observer) Update(subject *Subject) {
    data := subject.GetData()  // 필요한 데이터만 가져옴
}
```

## Observer Pattern의 장단점

### 장점
```
✅ 느슨한 결합 (Loose Coupling)
✅ 동적으로 구독/해지 가능
✅ 브로드캐스트 통신 지원
✅ 개방-폐쇄 원칙 준수
✅ 이벤트 기반 시스템 구축
```

### 단점
```
❌ 메모리 누수 위험 (구독 해지 안 하면)
❌ 예상치 못한 업데이트
❌ 디버깅 어려움
❌ 순서 보장 어려움
```

## 실제 사용 사례

### 프론트엔드
```
- React의 useState
- Vue의 Reactive System
- Redux의 Subscribe
- RxJS Observable
```

### 백엔드
```
- 이벤트 기반 아키텍처
- 메시지 큐 시스템
- WebSocket 연결
- 데이터베이스 트리거
```

### 시스템
```
- 파일 시스템 감시
- 프로세스 모니터링
- 로그 수집 시스템
- 메트릭 수집
```

## 정리

Observer Pattern은 "상태 변화를 자동으로 전파"하는 패턴입니다.

마치 유튜브 구독 시스템처럼, 관심 있는 대상을 구독하면 변화가 있을 때 자동으로 알림을 받습니다. 구독을 취소하면 더 이상 알림을 받지 않습니다.

"변화를 감지하고, 관심 있는 모두에게 알린다" - 이것이 Observer Pattern의 철학입니다.