# Strategy Pattern: 전략을 선택하는 지휘관

## 왜 Strategy Pattern이 필요했을까?

### 알고리즘을 선택해야 하는 상황

같은 목적을 달성하는 여러 방법이 있을 때, 상황에 맞게 선택해야 합니다.

```
실제 상황을 생각해보세요:

네비게이션 앱:
- 최단 거리 경로
- 최소 시간 경로  
- 통행료 없는 경로
- 경치 좋은 경로

결제 시스템:
- 카드 결제 → 카드사 API 호출
- 페이팔 → PayPal API 호출
- 암호화폐 → 블록체인 처리
- 포인트 → 내부 시스템 처리

문제 상황:
if (paymentMethod == "card") {
    // 100줄의 카드 결제 로직
} else if (paymentMethod == "paypal") {
    // 150줄의 페이팔 로직
} else if (paymentMethod == "crypto") {
    // 200줄의 암호화폐 로직
}
// 새로운 결제 방식 추가하면 이 거대한 if문이 더 커짐 😱
```

## Strategy Pattern의 핵심 개념

### 알고리즘을 캡슐화하고 교체 가능하게

```go
// 전략을 인터페이스로 정의
// 런타임에 전략 교체 가능
// 클라이언트는 구체적인 알고리즘을 몰라도 됨

context.SetStrategy(new전략)
context.Execute()  // 선택된 전략 실행
```

## 기본 Strategy Pattern 구현

### 결제 시스템 예제

```go
package payment

import (
    "fmt"
    "time"
)

// PaymentStrategy 인터페이스
type PaymentStrategy interface {
    Pay(amount float64) error
    GetName() string
}

// 신용카드 결제 전략
type CreditCardStrategy struct {
    cardNumber string
    cvv        string
    expiryDate string
}

func NewCreditCardStrategy(cardNumber, cvv, expiryDate string) *CreditCardStrategy {
    return &CreditCardStrategy{
        cardNumber: cardNumber,
        cvv:        cvv,
        expiryDate: expiryDate,
    }
}

func (c *CreditCardStrategy) Pay(amount float64) error {
    fmt.Printf("신용카드 결제 처리 중...\n")
    fmt.Printf("카드번호: ****%s\n", c.cardNumber[len(c.cardNumber)-4:])
    
    // 카드 유효성 검사
    if len(c.cvv) != 3 {
        return fmt.Errorf("유효하지 않은 CVV")
    }
    
    // 결제 처리 시뮬레이션
    time.Sleep(1 * time.Second)
    fmt.Printf("✅ %.2f원 결제 완료 (신용카드)\n", amount)
    return nil
}

func (c *CreditCardStrategy) GetName() string {
    return "신용카드"
}

// PayPal 결제 전략
type PayPalStrategy struct {
    email    string
    password string
}

func NewPayPalStrategy(email, password string) *PayPalStrategy {
    return &PayPalStrategy{
        email:    email,
        password: password,
    }
}

func (p *PayPalStrategy) Pay(amount float64) error {
    fmt.Printf("PayPal 결제 처리 중...\n")
    fmt.Printf("계정: %s\n", p.email)
    
    // PayPal 인증
    fmt.Println("PayPal 계정 인증 중...")
    time.Sleep(800 * time.Millisecond)
    
    // 결제 처리
    fmt.Printf("✅ %.2f원 결제 완료 (PayPal)\n", amount)
    return nil
}

func (p *PayPalStrategy) GetName() string {
    return "PayPal"
}

// 암호화폐 결제 전략
type CryptoStrategy struct {
    walletAddress string
    privateKey    string
}

func NewCryptoStrategy(walletAddress, privateKey string) *CryptoStrategy {
    return &CryptoStrategy{
        walletAddress: walletAddress,
        privateKey:    privateKey,
    }
}

func (c *CryptoStrategy) Pay(amount float64) error {
    fmt.Printf("암호화폐 결제 처리 중...\n")
    fmt.Printf("지갑 주소: %s...%s\n", 
        c.walletAddress[:6], c.walletAddress[len(c.walletAddress)-4:])
    
    // 블록체인 트랜잭션
    fmt.Println("블록체인 네트워크에 트랜잭션 전송 중...")
    time.Sleep(2 * time.Second)
    
    // 환율 계산
    btcAmount := amount / 50000000  // 1 BTC = 5천만원 가정
    fmt.Printf("✅ %.8f BTC 결제 완료 (%.2f원)\n", btcAmount, amount)
    return nil
}

func (c *CryptoStrategy) GetName() string {
    return "암호화폐"
}

// PaymentContext - 전략을 사용하는 컨텍스트
type PaymentContext struct {
    strategy PaymentStrategy
}

func NewPaymentContext(strategy PaymentStrategy) *PaymentContext {
    return &PaymentContext{
        strategy: strategy,
    }
}

func (p *PaymentContext) SetStrategy(strategy PaymentStrategy) {
    fmt.Printf("\n결제 방식 변경: %s\n", strategy.GetName())
    p.strategy = strategy
}

func (p *PaymentContext) ProcessPayment(amount float64) error {
    if p.strategy == nil {
        return fmt.Errorf("결제 방식이 선택되지 않았습니다")
    }
    
    fmt.Printf("\n=== %s 결제 시작 ===\n", p.strategy.GetName())
    return p.strategy.Pay(amount)
}
```

### 사용 예시

```go
func main() {
    // 결제 컨텍스트 생성
    payment := NewPaymentContext(nil)
    
    // 신용카드 결제
    creditCard := NewCreditCardStrategy(
        "1234-5678-9012-3456",
        "123",
        "12/25",
    )
    payment.SetStrategy(creditCard)
    payment.ProcessPayment(50000)
    
    // PayPal로 전환
    paypal := NewPayPalStrategy(
        "user@example.com",
        "password123",
    )
    payment.SetStrategy(paypal)
    payment.ProcessPayment(75000)
    
    // 암호화폐로 전환
    crypto := NewCryptoStrategy(
        "1A2B3C4D5E6F7G8H9I0J",
        "private_key_xyz",
    )
    payment.SetStrategy(crypto)
    payment.ProcessPayment(100000)
}
```

## 실전 예제: 가격 정책 시스템

```go
package pricing

import (
    "fmt"
    "time"
)

// PricingStrategy 인터페이스
type PricingStrategy interface {
    CalculatePrice(basePrice float64, quantity int) float64
    GetDescription() string
}

// 일반 가격 전략
type RegularPricing struct{}

func (r *RegularPricing) CalculatePrice(basePrice float64, quantity int) float64 {
    return basePrice * float64(quantity)
}

func (r *RegularPricing) GetDescription() string {
    return "일반 가격"
}

// 할인 가격 전략
type DiscountPricing struct {
    discountRate float64  // 0.1 = 10% 할인
}

func NewDiscountPricing(rate float64) *DiscountPricing {
    return &DiscountPricing{discountRate: rate}
}

func (d *DiscountPricing) CalculatePrice(basePrice float64, quantity int) float64 {
    total := basePrice * float64(quantity)
    discount := total * d.discountRate
    return total - discount
}

func (d *DiscountPricing) GetDescription() string {
    return fmt.Sprintf("%.0f%% 할인", d.discountRate*100)
}

// 대량 구매 할인 전략
type BulkPricing struct {
    bulkQuantity int
    bulkRate     float64
}

func NewBulkPricing(bulkQuantity int, bulkRate float64) *BulkPricing {
    return &BulkPricing{
        bulkQuantity: bulkQuantity,
        bulkRate:     bulkRate,
    }
}

func (b *BulkPricing) CalculatePrice(basePrice float64, quantity int) float64 {
    if quantity >= b.bulkQuantity {
        discountedPrice := basePrice * (1 - b.bulkRate)
        return discountedPrice * float64(quantity)
    }
    return basePrice * float64(quantity)
}

func (b *BulkPricing) GetDescription() string {
    return fmt.Sprintf("%d개 이상 구매 시 %.0f%% 할인", 
        b.bulkQuantity, b.bulkRate*100)
}

// 시간 한정 할인 전략
type TimeLimitedPricing struct {
    discountRate float64
    startTime    time.Time
    endTime      time.Time
}

func NewTimeLimitedPricing(rate float64, start, end time.Time) *TimeLimitedPricing {
    return &TimeLimitedPricing{
        discountRate: rate,
        startTime:    start,
        endTime:      end,
    }
}

func (t *TimeLimitedPricing) CalculatePrice(basePrice float64, quantity int) float64 {
    now := time.Now()
    
    if now.After(t.startTime) && now.Before(t.endTime) {
        total := basePrice * float64(quantity)
        discount := total * t.discountRate
        return total - discount
    }
    
    return basePrice * float64(quantity)
}

func (t *TimeLimitedPricing) GetDescription() string {
    return fmt.Sprintf("타임세일 %.0f%% (기간: %s ~ %s)",
        t.discountRate*100,
        t.startTime.Format("15:04"),
        t.endTime.Format("15:04"))
}

// Product - 가격 전략을 사용하는 상품
type Product struct {
    name     string
    basePrice float64
    strategy PricingStrategy
}

func NewProduct(name string, basePrice float64) *Product {
    return &Product{
        name:      name,
        basePrice: basePrice,
        strategy:  &RegularPricing{},  // 기본 전략
    }
}

func (p *Product) SetPricingStrategy(strategy PricingStrategy) {
    p.strategy = strategy
    fmt.Printf("%s 상품의 가격 정책 변경: %s\n", 
        p.name, strategy.GetDescription())
}

func (p *Product) GetPrice(quantity int) float64 {
    return p.strategy.CalculatePrice(p.basePrice, quantity)
}

func (p *Product) ShowPriceInfo(quantity int) {
    price := p.GetPrice(quantity)
    fmt.Printf("\n상품: %s\n", p.name)
    fmt.Printf("기본가: %.0f원\n", p.basePrice)
    fmt.Printf("수량: %d개\n", quantity)
    fmt.Printf("적용 정책: %s\n", p.strategy.GetDescription())
    fmt.Printf("최종 가격: %.0f원\n", price)
}

// 사용 예시
func main() {
    // 상품 생성
    laptop := NewProduct("노트북", 1000000)
    
    // 일반 가격
    laptop.ShowPriceInfo(2)
    
    // 20% 할인 적용
    laptop.SetPricingStrategy(NewDiscountPricing(0.2))
    laptop.ShowPriceInfo(2)
    
    // 대량 구매 할인 적용 (5개 이상 30% 할인)
    laptop.SetPricingStrategy(NewBulkPricing(5, 0.3))
    laptop.ShowPriceInfo(3)  // 할인 미적용
    laptop.ShowPriceInfo(5)  // 할인 적용
    
    // 타임세일 적용
    start := time.Now()
    end := start.Add(1 * time.Hour)
    laptop.SetPricingStrategy(NewTimeLimitedPricing(0.5, start, end))
    laptop.ShowPriceInfo(1)
}
```

## 실전 예제: 압축 알고리즘 선택

```go
package compression

import (
    "bytes"
    "compress/gzip"
    "compress/zlib"
    "fmt"
    "io"
)

// CompressionStrategy 인터페이스
type CompressionStrategy interface {
    Compress(data []byte) ([]byte, error)
    Decompress(data []byte) ([]byte, error)
    GetName() string
}

// ZIP 압축 전략
type ZipStrategy struct{}

func (z *ZipStrategy) Compress(data []byte) ([]byte, error) {
    var buf bytes.Buffer
    writer := zlib.NewWriter(&buf)
    
    _, err := writer.Write(data)
    if err != nil {
        return nil, err
    }
    
    err = writer.Close()
    if err != nil {
        return nil, err
    }
    
    return buf.Bytes(), nil
}

func (z *ZipStrategy) Decompress(data []byte) ([]byte, error) {
    reader, err := zlib.NewReader(bytes.NewReader(data))
    if err != nil {
        return nil, err
    }
    defer reader.Close()
    
    return io.ReadAll(reader)
}

func (z *ZipStrategy) GetName() string {
    return "ZIP"
}

// GZIP 압축 전략
type GzipStrategy struct{}

func (g *GzipStrategy) Compress(data []byte) ([]byte, error) {
    var buf bytes.Buffer
    writer := gzip.NewWriter(&buf)
    
    _, err := writer.Write(data)
    if err != nil {
        return nil, err
    }
    
    err = writer.Close()
    if err != nil {
        return nil, err
    }
    
    return buf.Bytes(), nil
}

func (g *GzipStrategy) Decompress(data []byte) ([]byte, error) {
    reader, err := gzip.NewReader(bytes.NewReader(data))
    if err != nil {
        return nil, err
    }
    defer reader.Close()
    
    return io.ReadAll(reader)
}

func (g *GzipStrategy) GetName() string {
    return "GZIP"
}

// 압축 없음 전략
type NoCompressionStrategy struct{}

func (n *NoCompressionStrategy) Compress(data []byte) ([]byte, error) {
    return data, nil
}

func (n *NoCompressionStrategy) Decompress(data []byte) ([]byte, error) {
    return data, nil
}

func (n *NoCompressionStrategy) GetName() string {
    return "없음"
}

// FileCompressor - 압축 전략을 사용하는 파일 압축기
type FileCompressor struct {
    strategy CompressionStrategy
}

func NewFileCompressor() *FileCompressor {
    return &FileCompressor{
        strategy: &NoCompressionStrategy{},  // 기본값
    }
}

func (f *FileCompressor) SetStrategy(strategy CompressionStrategy) {
    f.strategy = strategy
    fmt.Printf("압축 방식 변경: %s\n", strategy.GetName())
}

func (f *FileCompressor) CompressFile(filename string, data []byte) ([]byte, error) {
    fmt.Printf("\n파일 압축 중: %s (방식: %s)\n", filename, f.strategy.GetName())
    
    compressed, err := f.strategy.Compress(data)
    if err != nil {
        return nil, err
    }
    
    originalSize := len(data)
    compressedSize := len(compressed)
    ratio := float64(compressedSize) / float64(originalSize) * 100
    
    fmt.Printf("원본 크기: %d bytes\n", originalSize)
    fmt.Printf("압축 크기: %d bytes\n", compressedSize)
    fmt.Printf("압축률: %.1f%%\n", ratio)
    
    return compressed, nil
}

// 사용 예시
func main() {
    compressor := NewFileCompressor()
    
    // 테스트 데이터
    data := []byte("Hello World! This is a test string for compression. " +
        "The quick brown fox jumps over the lazy dog. " +
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit.")
    
    // 압축 없음
    compressor.SetStrategy(&NoCompressionStrategy{})
    compressor.CompressFile("test.txt", data)
    
    // ZIP 압축
    compressor.SetStrategy(&ZipStrategy{})
    compressor.CompressFile("test.txt", data)
    
    // GZIP 압축
    compressor.SetStrategy(&GzipStrategy{})
    compressor.CompressFile("test.txt", data)
}
```

## 실전 예제: 정렬 알고리즘 선택

```go
package sorting

import (
    "fmt"
    "sort"
    "time"
)

// SortStrategy 인터페이스
type SortStrategy interface {
    Sort(data []int) []int
    GetName() string
}

// 버블 정렬 전략
type BubbleSort struct{}

func (b *BubbleSort) Sort(data []int) []int {
    n := len(data)
    sorted := make([]int, n)
    copy(sorted, data)
    
    for i := 0; i < n-1; i++ {
        for j := 0; j < n-i-1; j++ {
            if sorted[j] > sorted[j+1] {
                sorted[j], sorted[j+1] = sorted[j+1], sorted[j]
            }
        }
    }
    
    return sorted
}

func (b *BubbleSort) GetName() string {
    return "버블 정렬"
}

// 퀵 정렬 전략
type QuickSort struct{}

func (q *QuickSort) Sort(data []int) []int {
    sorted := make([]int, len(data))
    copy(sorted, data)
    q.quickSort(sorted, 0, len(sorted)-1)
    return sorted
}

func (q *QuickSort) quickSort(arr []int, low, high int) {
    if low < high {
        pi := q.partition(arr, low, high)
        q.quickSort(arr, low, pi-1)
        q.quickSort(arr, pi+1, high)
    }
}

func (q *QuickSort) partition(arr []int, low, high int) int {
    pivot := arr[high]
    i := low - 1
    
    for j := low; j < high; j++ {
        if arr[j] < pivot {
            i++
            arr[i], arr[j] = arr[j], arr[i]
        }
    }
    
    arr[i+1], arr[high] = arr[high], arr[i+1]
    return i + 1
}

func (q *QuickSort) GetName() string {
    return "퀵 정렬"
}

// 내장 정렬 전략
type BuiltInSort struct{}

func (b *BuiltInSort) Sort(data []int) []int {
    sorted := make([]int, len(data))
    copy(sorted, data)
    sort.Ints(sorted)
    return sorted
}

func (b *BuiltInSort) GetName() string {
    return "내장 정렬"
}

// SortContext
type SortContext struct {
    strategy SortStrategy
}

func NewSortContext(strategy SortStrategy) *SortContext {
    return &SortContext{strategy: strategy}
}

func (s *SortContext) SetStrategy(strategy SortStrategy) {
    s.strategy = strategy
}

func (s *SortContext) Sort(data []int) {
    fmt.Printf("\n%s 사용\n", s.strategy.GetName())
    
    start := time.Now()
    sorted := s.strategy.Sort(data)
    elapsed := time.Since(start)
    
    fmt.Printf("정렬 시간: %v\n", elapsed)
    if len(sorted) <= 20 {
        fmt.Printf("결과: %v\n", sorted)
    } else {
        fmt.Printf("결과: %v ... %v\n", sorted[:10], sorted[len(sorted)-10:])
    }
}

// 사용 예시
func main() {
    // 테스트 데이터 생성
    data := []int{64, 34, 25, 12, 22, 11, 90, 45, 33, 77}
    
    sorter := NewSortContext(&BubbleSort{})
    
    // 작은 데이터셋
    fmt.Println("=== 작은 데이터셋 (10개) ===")
    sorter.Sort(data)
    
    sorter.SetStrategy(&QuickSort{})
    sorter.Sort(data)
    
    sorter.SetStrategy(&BuiltInSort{})
    sorter.Sort(data)
    
    // 큰 데이터셋
    fmt.Println("\n=== 큰 데이터셋 (10000개) ===")
    largeData := make([]int, 10000)
    for i := range largeData {
        largeData[i] = 10000 - i
    }
    
    // 버블 정렬은 너무 느려서 제외
    sorter.SetStrategy(&QuickSort{})
    sorter.Sort(largeData)
    
    sorter.SetStrategy(&BuiltInSort{})
    sorter.Sort(largeData)
}
```

## Strategy Pattern의 장단점

### 장점
```
✅ 알고리즘을 런타임에 교체 가능
✅ 새로운 전략 추가가 용이 (OCP 원칙)
✅ 조건문 제거
✅ 전략별 단위 테스트 가능
✅ 코드 재사용성 향상
```

### 단점
```
❌ 클래스 수 증가
❌ 클라이언트가 전략을 알아야 함
❌ 전략 간 데이터 공유 어려움
❌ 간단한 경우 과도한 설계
```

## Strategy vs 다른 패턴

### Strategy vs State
```
Strategy: 알고리즘 교체
State: 상태에 따른 행동 변경

Strategy는 클라이언트가 선택
State는 내부적으로 전환
```

### Strategy vs Template Method
```
Strategy: 전체 알고리즘 교체
Template Method: 알고리즘 구조는 같고 일부만 변경

Strategy는 구성(Composition)
Template Method는 상속(Inheritance)
```

## 실제 사용 사례

### 프레임워크
```
- Spring Security의 인증 전략
- Express.js의 미들웨어
- Django의 캐시 백엔드
```

### 라이브러리
```
- 정렬 알고리즘 선택
- 압축 알고리즘 선택
- 암호화 알고리즘 선택
```

### 애플리케이션
```
- 결제 방식 선택
- 배송 방식 선택
- 가격 정책 선택
- 렌더링 엔진 선택
```

## 정리

Strategy Pattern은 "알고리즘을 캡슐화하고 교체 가능하게" 만드는 패턴입니다.

마치 여행을 갈 때 비행기, 기차, 자동차 중 상황에 맞게 선택하듯이, Strategy Pattern은 목적은 같지만 방법이 다른 알고리즘들을 상황에 맞게 선택할 수 있게 해줍니다.

"목적지는 같지만, 가는 길은 다를 수 있다" - 이것이 Strategy Pattern의 철학입니다.