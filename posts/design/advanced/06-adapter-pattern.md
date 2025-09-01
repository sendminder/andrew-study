# Adapter Pattern: 호환되지 않는 것을 연결하는 변환기

## 왜 Adapter Pattern이 필요했을까?

### 서로 맞지 않는 인터페이스

호환되지 않는 두 인터페이스를 함께 사용해야 할 때가 있습니다.

```
실제 상황을 생각해보세요:

해외여행 전기 플러그:
- 한국: 220V, C/F 타입 플러그
- 미국: 110V, A/B 타입 플러그
- 영국: 230V, G 타입 플러그
→ 어댑터가 없으면 사용 불가!

소프트웨어에서도:
- 기존 시스템: XML 형식 데이터
- 새 라이브러리: JSON만 지원
- 레거시 API: SOAP 프로토콜
- 최신 서비스: REST API
→ 변환 없이는 통합 불가!
```

## Adapter Pattern의 핵심 개념

### 인터페이스 변환기

```go
// 클라이언트가 원하는 인터페이스로 변환
// 기존 코드 수정 없이 호환성 제공

기존시스템 → Adapter → 새로운인터페이스
```

## 기본 Adapter Pattern 구현

### 결제 시스템 통합 예제

```go
package payment

import (
    "encoding/json"
    "encoding/xml"
    "fmt"
)

// Target Interface - 우리 시스템이 사용하는 인터페이스
type PaymentProcessor interface {
    MakePayment(amount float64, currency string) (*PaymentResult, error)
    RefundPayment(transactionID string) error
    GetPaymentStatus(transactionID string) (string, error)
}

// PaymentResult - 통합 결과 구조체
type PaymentResult struct {
    TransactionID string
    Status        string
    Amount        float64
    Currency      string
}

// Adaptee 1 - 레거시 결제 시스템 (XML 기반)
type LegacyPaymentSystem struct{}

type LegacyPaymentRequest struct {
    XMLName xml.Name `xml:"payment"`
    Money   float64  `xml:"money"`
    Unit    string   `xml:"unit"`
}

type LegacyPaymentResponse struct {
    XMLName xml.Name `xml:"response"`
    TxID    string   `xml:"transaction_id"`
    Code    int      `xml:"code"`
}

func (l *LegacyPaymentSystem) ProcessPaymentXML(xmlData string) string {
    fmt.Printf("레거시 시스템: XML 처리 중...\n%s\n", xmlData)
    
    // 실제로는 XML 파싱 후 처리
    response := LegacyPaymentResponse{
        TxID: "LEG-" + fmt.Sprintf("%d", time.Now().Unix()),
        Code: 200,
    }
    
    result, _ := xml.Marshal(response)
    return string(result)
}

func (l *LegacyPaymentSystem) CancelPaymentXML(xmlData string) string {
    fmt.Printf("레거시 시스템: 취소 처리 중...\n")
    return "<response><code>200</code></response>"
}

// Adapter for Legacy System
type LegacyPaymentAdapter struct {
    legacySystem *LegacyPaymentSystem
}

func NewLegacyPaymentAdapter(system *LegacyPaymentSystem) *LegacyPaymentAdapter {
    return &LegacyPaymentAdapter{
        legacySystem: system,
    }
}

func (a *LegacyPaymentAdapter) MakePayment(amount float64, currency string) (*PaymentResult, error) {
    // 새 인터페이스 → 레거시 XML 형식으로 변환
    request := LegacyPaymentRequest{
        Money: amount,
        Unit:  currency,
    }
    
    xmlData, _ := xml.Marshal(request)
    xmlResponse := a.legacySystem.ProcessPaymentXML(string(xmlData))
    
    // XML 응답을 파싱하여 표준 형식으로 변환
    var response LegacyPaymentResponse
    xml.Unmarshal([]byte(xmlResponse), &response)
    
    status := "FAILED"
    if response.Code == 200 {
        status = "SUCCESS"
    }
    
    return &PaymentResult{
        TransactionID: response.TxID,
        Status:        status,
        Amount:        amount,
        Currency:      currency,
    }, nil
}

func (a *LegacyPaymentAdapter) RefundPayment(transactionID string) error {
    xmlData := fmt.Sprintf("<cancel><tx_id>%s</tx_id></cancel>", transactionID)
    a.legacySystem.CancelPaymentXML(xmlData)
    return nil
}

func (a *LegacyPaymentAdapter) GetPaymentStatus(transactionID string) (string, error) {
    // 레거시 시스템의 상태 조회 로직
    return "SUCCESS", nil
}

// Adaptee 2 - 최신 결제 서비스 (JSON 기반)
type ModernPaymentService struct{}

type ModernPaymentRequest struct {
    Amount   float64 `json:"amount"`
    Currency string  `json:"currency"`
    Method   string  `json:"method"`
}

func (m *ModernPaymentService) ChargeCard(jsonData []byte) ([]byte, error) {
    fmt.Printf("최신 서비스: JSON 처리 중...\n%s\n", string(jsonData))
    
    response := map[string]interface{}{
        "transaction_id": "MOD-" + fmt.Sprintf("%d", time.Now().Unix()),
        "status":         "approved",
        "timestamp":      time.Now().Unix(),
    }
    
    return json.Marshal(response)
}

func (m *ModernPaymentService) RefundTransaction(txID string) error {
    fmt.Printf("최신 서비스: 환불 처리 - %s\n", txID)
    return nil
}

// Adapter for Modern Service
type ModernPaymentAdapter struct {
    modernService *ModernPaymentService
}

func NewModernPaymentAdapter(service *ModernPaymentService) *ModernPaymentAdapter {
    return &ModernPaymentAdapter{
        modernService: service,
    }
}

func (a *ModernPaymentAdapter) MakePayment(amount float64, currency string) (*PaymentResult, error) {
    // 표준 인터페이스 → JSON 형식으로 변환
    request := ModernPaymentRequest{
        Amount:   amount,
        Currency: currency,
        Method:   "credit_card",
    }
    
    jsonData, _ := json.Marshal(request)
    jsonResponse, err := a.modernService.ChargeCard(jsonData)
    if err != nil {
        return nil, err
    }
    
    // JSON 응답을 표준 형식으로 변환
    var response map[string]interface{}
    json.Unmarshal(jsonResponse, &response)
    
    return &PaymentResult{
        TransactionID: response["transaction_id"].(string),
        Status:        "SUCCESS",
        Amount:        amount,
        Currency:      currency,
    }, nil
}

func (a *ModernPaymentAdapter) RefundPayment(transactionID string) error {
    return a.modernService.RefundTransaction(transactionID)
}

func (a *ModernPaymentAdapter) GetPaymentStatus(transactionID string) (string, error) {
    return "SUCCESS", nil
}
```

### 사용 예시

```go
func processPayments() {
    // 레거시 시스템 사용
    legacySystem := &LegacyPaymentSystem{}
    legacyAdapter := NewLegacyPaymentAdapter(legacySystem)
    
    result1, _ := legacyAdapter.MakePayment(10000, "KRW")
    fmt.Printf("레거시 결제 완료: %+v\n\n", result1)
    
    // 최신 서비스 사용
    modernService := &ModernPaymentService{}
    modernAdapter := NewModernPaymentAdapter(modernService)
    
    result2, _ := modernAdapter.MakePayment(50.00, "USD")
    fmt.Printf("최신 결제 완료: %+v\n\n", result2)
    
    // 동일한 인터페이스로 사용
    var processor PaymentProcessor
    
    processor = legacyAdapter
    processOrder(processor, 20000, "KRW")
    
    processor = modernAdapter
    processOrder(processor, 100, "USD")
}

func processOrder(processor PaymentProcessor, amount float64, currency string) {
    fmt.Printf("=== 주문 처리 시작 ===\n")
    result, err := processor.MakePayment(amount, currency)
    if err != nil {
        fmt.Printf("결제 실패: %v\n", err)
        return
    }
    fmt.Printf("결제 성공: 거래 ID %s\n", result.TransactionID)
    fmt.Printf("=== 주문 처리 완료 ===\n\n")
}
```

## 실전 예제: 데이터베이스 어댑터

```go
package database

import (
    "database/sql"
    "fmt"
    "gopkg.in/mgo.v2"
    "gopkg.in/mgo.v2/bson"
)

// Target Interface - 우리가 사용할 통합 인터페이스
type Database interface {
    Connect(connectionString string) error
    Find(collection string, query map[string]interface{}) ([]map[string]interface{}, error)
    Insert(collection string, data map[string]interface{}) error
    Update(collection string, id string, data map[string]interface{}) error
    Delete(collection string, id string) error
    Close() error
}

// MySQL Adapter
type MySQLAdapter struct {
    db *sql.DB
}

func NewMySQLAdapter() *MySQLAdapter {
    return &MySQLAdapter{}
}

func (m *MySQLAdapter) Connect(connectionString string) error {
    db, err := sql.Open("mysql", connectionString)
    if err != nil {
        return err
    }
    m.db = db
    return db.Ping()
}

func (m *MySQLAdapter) Find(table string, query map[string]interface{}) ([]map[string]interface{}, error) {
    // SQL 쿼리로 변환
    whereClause := ""
    values := []interface{}{}
    
    for key, value := range query {
        if whereClause != "" {
            whereClause += " AND "
        }
        whereClause += fmt.Sprintf("%s = ?", key)
        values = append(values, value)
    }
    
    sqlQuery := fmt.Sprintf("SELECT * FROM %s", table)
    if whereClause != "" {
        sqlQuery += " WHERE " + whereClause
    }
    
    rows, err := m.db.Query(sqlQuery, values...)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    // 결과를 map으로 변환
    results := []map[string]interface{}{}
    columns, _ := rows.Columns()
    
    for rows.Next() {
        values := make([]interface{}, len(columns))
        valuePtrs := make([]interface{}, len(columns))
        
        for i := range columns {
            valuePtrs[i] = &values[i]
        }
        
        rows.Scan(valuePtrs...)
        
        entry := make(map[string]interface{})
        for i, col := range columns {
            entry[col] = values[i]
        }
        
        results = append(results, entry)
    }
    
    return results, nil
}

func (m *MySQLAdapter) Insert(table string, data map[string]interface{}) error {
    columns := ""
    placeholders := ""
    values := []interface{}{}
    
    for key, value := range data {
        if columns != "" {
            columns += ", "
            placeholders += ", "
        }
        columns += key
        placeholders += "?"
        values = append(values, value)
    }
    
    query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", 
        table, columns, placeholders)
    
    _, err := m.db.Exec(query, values...)
    return err
}

func (m *MySQLAdapter) Update(table string, id string, data map[string]interface{}) error {
    setClause := ""
    values := []interface{}{}
    
    for key, value := range data {
        if setClause != "" {
            setClause += ", "
        }
        setClause += fmt.Sprintf("%s = ?", key)
        values = append(values, value)
    }
    
    values = append(values, id)
    query := fmt.Sprintf("UPDATE %s SET %s WHERE id = ?", table, setClause)
    
    _, err := m.db.Exec(query, values...)
    return err
}

func (m *MySQLAdapter) Delete(table string, id string) error {
    query := fmt.Sprintf("DELETE FROM %s WHERE id = ?", table)
    _, err := m.db.Exec(query, id)
    return err
}

func (m *MySQLAdapter) Close() error {
    return m.db.Close()
}

// MongoDB Adapter
type MongoDBAdapter struct {
    session    *mgo.Session
    database   string
}

func NewMongoDBAdapter(database string) *MongoDBAdapter {
    return &MongoDBAdapter{
        database: database,
    }
}

func (m *MongoDBAdapter) Connect(connectionString string) error {
    session, err := mgo.Dial(connectionString)
    if err != nil {
        return err
    }
    m.session = session
    return nil
}

func (m *MongoDBAdapter) Find(collection string, query map[string]interface{}) ([]map[string]interface{}, error) {
    c := m.session.DB(m.database).C(collection)
    
    var results []map[string]interface{}
    err := c.Find(bson.M(query)).All(&results)
    
    return results, err
}

func (m *MongoDBAdapter) Insert(collection string, data map[string]interface{}) error {
    c := m.session.DB(m.database).C(collection)
    return c.Insert(bson.M(data))
}

func (m *MongoDBAdapter) Update(collection string, id string, data map[string]interface{}) error {
    c := m.session.DB(m.database).C(collection)
    return c.UpdateId(bson.ObjectIdHex(id), bson.M{"$set": bson.M(data)})
}

func (m *MongoDBAdapter) Delete(collection string, id string) error {
    c := m.session.DB(m.database).C(collection)
    return c.RemoveId(bson.ObjectIdHex(id))
}

func (m *MongoDBAdapter) Close() error {
    m.session.Close()
    return nil
}

// 사용 예시
func useDatabase(db Database) {
    // 연결
    err := db.Connect("connection_string_here")
    if err != nil {
        fmt.Printf("연결 실패: %v\n", err)
        return
    }
    defer db.Close()
    
    // 데이터 삽입
    db.Insert("users", map[string]interface{}{
        "name":  "Andrew",
        "email": "andrew@example.com",
        "age":   30,
    })
    
    // 데이터 조회
    users, _ := db.Find("users", map[string]interface{}{
        "name": "Andrew",
    })
    
    for _, user := range users {
        fmt.Printf("사용자: %v\n", user)
    }
}

func main() {
    // MySQL 사용
    mysqlDB := NewMySQLAdapter()
    useDatabase(mysqlDB)
    
    // MongoDB 사용 (동일한 인터페이스)
    mongoDB := NewMongoDBAdapter("mydb")
    useDatabase(mongoDB)
}
```

## 실전 예제: 로깅 시스템 어댑터

```go
package logging

import (
    "fmt"
    "log"
    "os"
    "time"
)

// Target Interface - 우리 시스템의 로거 인터페이스
type Logger interface {
    Debug(message string)
    Info(message string)
    Warning(message string)
    Error(message string)
    Fatal(message string)
}

// 기존 콘솔 로거 (Adaptee)
type ConsoleLogger struct {
    prefix string
}

func (c *ConsoleLogger) Print(level, message string) {
    timestamp := time.Now().Format("2006-01-02 15:04:05")
    fmt.Printf("[%s] %s %s: %s\n", timestamp, c.prefix, level, message)
}

// Console Logger Adapter
type ConsoleLoggerAdapter struct {
    console *ConsoleLogger
}

func NewConsoleLoggerAdapter(prefix string) *ConsoleLoggerAdapter {
    return &ConsoleLoggerAdapter{
        console: &ConsoleLogger{prefix: prefix},
    }
}

func (a *ConsoleLoggerAdapter) Debug(message string) {
    a.console.Print("DEBUG", message)
}

func (a *ConsoleLoggerAdapter) Info(message string) {
    a.console.Print("INFO", message)
}

func (a *ConsoleLoggerAdapter) Warning(message string) {
    a.console.Print("WARNING", message)
}

func (a *ConsoleLoggerAdapter) Error(message string) {
    a.console.Print("ERROR", message)
}

func (a *ConsoleLoggerAdapter) Fatal(message string) {
    a.console.Print("FATAL", message)
    os.Exit(1)
}

// 서드파티 로거 (Adaptee)
type ThirdPartyLogger struct {
    logger *log.Logger
}

func NewThirdPartyLogger(filename string) *ThirdPartyLogger {
    file, _ := os.OpenFile(filename, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
    return &ThirdPartyLogger{
        logger: log.New(file, "", log.LstdFlags),
    }
}

func (t *ThirdPartyLogger) WriteLog(severity int, msg string) {
    severityStr := []string{"TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"}
    if severity >= 0 && severity < len(severityStr) {
        t.logger.Printf("[%s] %s", severityStr[severity], msg)
    }
}

// Third Party Logger Adapter
type ThirdPartyLoggerAdapter struct {
    thirdParty *ThirdPartyLogger
}

func NewThirdPartyLoggerAdapter(filename string) *ThirdPartyLoggerAdapter {
    return &ThirdPartyLoggerAdapter{
        thirdParty: NewThirdPartyLogger(filename),
    }
}

func (a *ThirdPartyLoggerAdapter) Debug(message string) {
    a.thirdParty.WriteLog(1, message)
}

func (a *ThirdPartyLoggerAdapter) Info(message string) {
    a.thirdParty.WriteLog(2, message)
}

func (a *ThirdPartyLoggerAdapter) Warning(message string) {
    a.thirdParty.WriteLog(3, message)
}

func (a *ThirdPartyLoggerAdapter) Error(message string) {
    a.thirdParty.WriteLog(4, message)
}

func (a *ThirdPartyLoggerAdapter) Fatal(message string) {
    a.thirdParty.WriteLog(5, message)
    os.Exit(1)
}

// 클라우드 로깅 서비스 (Adaptee)
type CloudLogger struct {
    apiKey   string
    endpoint string
}

func (c *CloudLogger) SendLog(payload map[string]interface{}) {
    // 실제로는 HTTP 요청을 보냄
    fmt.Printf("Cloud Log: %v\n", payload)
}

// Cloud Logger Adapter
type CloudLoggerAdapter struct {
    cloud *CloudLogger
}

func NewCloudLoggerAdapter(apiKey, endpoint string) *CloudLoggerAdapter {
    return &CloudLoggerAdapter{
        cloud: &CloudLogger{
            apiKey:   apiKey,
            endpoint: endpoint,
        },
    }
}

func (a *CloudLoggerAdapter) log(level, message string) {
    payload := map[string]interface{}{
        "timestamp": time.Now().Unix(),
        "level":     level,
        "message":   message,
        "service":   "my-app",
    }
    a.cloud.SendLog(payload)
}

func (a *CloudLoggerAdapter) Debug(message string) {
    a.log("DEBUG", message)
}

func (a *CloudLoggerAdapter) Info(message string) {
    a.log("INFO", message)
}

func (a *CloudLoggerAdapter) Warning(message string) {
    a.log("WARNING", message)
}

func (a *CloudLoggerAdapter) Error(message string) {
    a.log("ERROR", message)
}

func (a *CloudLoggerAdapter) Fatal(message string) {
    a.log("FATAL", message)
    os.Exit(1)
}

// 사용 예시
func runApplication(logger Logger) {
    logger.Info("애플리케이션 시작")
    logger.Debug("설정 로드 중...")
    
    // 비즈니스 로직
    result := processData()
    if result == nil {
        logger.Warning("처리 결과가 비어있음")
    }
    
    logger.Info("처리 완료")
}

func main() {
    // 콘솔 로거 사용
    consoleLogger := NewConsoleLoggerAdapter("MyApp")
    runApplication(consoleLogger)
    
    // 파일 로거 사용
    fileLogger := NewThirdPartyLoggerAdapter("app.log")
    runApplication(fileLogger)
    
    // 클라우드 로거 사용
    cloudLogger := NewCloudLoggerAdapter("api-key", "https://log.service.com")
    runApplication(cloudLogger)
}
```

## Class Adapter vs Object Adapter

### Object Adapter (Composition)
```go
// 우리가 지금까지 본 방식
type Adapter struct {
    adaptee *Adaptee  // 구성(Composition) 사용
}

func (a *Adapter) Request() {
    a.adaptee.SpecificRequest()
}
```

### Class Adapter (Inheritance - Go에서는 embedding)
```go
// Go에서는 embedding으로 구현
type Adapter struct {
    Adaptee  // 임베딩
}

func (a *Adapter) Request() {
    a.SpecificRequest()  // 직접 호출 가능
}
```

## Two-Way Adapter

```go
// 양방향 어댑터 - 두 인터페이스를 모두 구현
type TwoWayAdapter struct {
    // 내부 상태
}

// Interface A 구현
func (t *TwoWayAdapter) MethodA() {
    // A 방식으로 처리
}

// Interface B 구현  
func (t *TwoWayAdapter) MethodB() {
    // B 방식으로 처리
}

// A를 B로, B를 A로 모두 변환 가능
```

## Adapter Pattern의 장단점

### 장점
```
✅ 기존 코드 수정 없이 통합
✅ 클래스 간 낮은 결합도
✅ 코드 재사용성 향상
✅ 개방-폐쇄 원칙 준수
✅ 단일 책임 원칙 준수
```

### 단점
```
❌ 코드 복잡도 증가
❌ 성능 오버헤드 (변환 비용)
❌ 디버깅 어려움
❌ 여러 어댑터 관리 부담
```

## Adapter vs 다른 패턴

### Adapter vs Decorator
```
Adapter: 인터페이스 변환
Decorator: 기능 추가

Adapter는 호환성이 목적
Decorator는 기능 확장이 목적
```

### Adapter vs Facade
```
Adapter: 하나의 인터페이스를 다른 인터페이스로
Facade: 여러 인터페이스를 하나의 간단한 인터페이스로

Adapter는 1:1 변환
Facade는 N:1 단순화
```

### Adapter vs Bridge
```
Adapter: 사후에 호환성 제공
Bridge: 설계 시부터 분리

Adapter는 기존 클래스 연결
Bridge는 추상과 구현 분리
```

## 실제 사용 사례

### Java
```java
// Arrays를 List로 변환
List<String> list = Arrays.asList(array);

// InputStreamReader - byte stream을 character stream으로
Reader reader = new InputStreamReader(inputStream);
```

### 프레임워크
```
- Spring의 HandlerAdapter
- Android의 RecyclerView.Adapter
- Qt의 Model/View Adapter
```

### 실무
```
- 레거시 시스템 통합
- 서드파티 라이브러리 통합
- API 버전 호환성
- 데이터 형식 변환 (XML ↔ JSON)
```

## 정리

Adapter Pattern은 "호환되지 않는 인터페이스를 연결"하는 패턴입니다.

마치 해외여행 갈 때 전기 플러그 어댑터를 사용하듯이, 서로 맞지 않는 인터페이스를 가진 클래스들을 함께 동작할 수 있게 만들어줍니다.

"서로 다른 것들을 하나로 연결한다" - 이것이 Adapter Pattern의 철학입니다.