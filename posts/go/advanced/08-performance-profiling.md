# 성능 프로파일링과 최적화: Go 프로그램 속도 끌어올리기

## 🎬 프롤로그: "추측하지 말고 측정하라"

Rob Pike의 격언입니다:
> "Premature optimization is the root of all evil, but measurement-driven optimization is the path to enlightenment."

최적화의 첫 걸음은 측정입니다.

## 📚 Chapter 1: 프로파일링 도구 마스터하기

### pprof - Go의 강력한 프로파일러

```go
import (
    "net/http"
    _ "net/http/pprof"
    "runtime/pprof"
)

func main() {
    // HTTP 엔드포인트로 프로파일 노출
    go func() {
        log.Println(http.ListenAndServe("localhost:6060", nil))
    }()
    
    // 또는 파일로 저장
    cpuProfile, _ := os.Create("cpu.prof")
    pprof.StartCPUProfile(cpuProfile)
    defer pprof.StopCPUProfile()
    
    // 프로그램 실행...
}
```

### 프로파일 타입별 분석

```bash
# CPU 프로파일 (어디서 시간을 쓰는가?)
go test -cpuprofile=cpu.prof -bench=.
go tool pprof cpu.prof

# 메모리 프로파일 (어디서 메모리를 할당하는가?)
go test -memprofile=mem.prof -bench=.
go tool pprof mem.prof

# 고루틴 프로파일 (고루틴 누수 확인)
go tool pprof http://localhost:6060/debug/pprof/goroutine

# 블로킹 프로파일 (어디서 대기하는가?)
go test -blockprofile=block.prof -bench=.

# 뮤텍스 프로파일 (경쟁 상황 확인)
go test -mutexprofile=mutex.prof -bench=.
```

### pprof 명령어 마스터

```bash
# 인터랙티브 모드
(pprof) top        # 상위 함수들
(pprof) list main  # 소스코드와 함께
(pprof) web        # 그래프로 시각화
(pprof) peek func  # 특정 함수 분석
(pprof) svg        # SVG로 저장

# 플레임 그래프 생성
go tool pprof -http=:8080 cpu.prof
```

## 🎯 Chapter 2: 메모리 최적화

### 메모리 할당 줄이기

```go
// ❌ 나쁜 예: 매번 할당
func concat(strs []string) string {
    result := ""
    for _, s := range strs {
        result += s  // 매번 새로운 문자열 할당
    }
    return result
}

// ✅ 좋은 예: strings.Builder 사용
func concat(strs []string) string {
    var builder strings.Builder
    // 미리 용량 할당
    totalLen := 0
    for _, s := range strs {
        totalLen += len(s)
    }
    builder.Grow(totalLen)
    
    for _, s := range strs {
        builder.WriteString(s)
    }
    return builder.String()
}

// ✅ 더 좋은 예: sync.Pool로 재사용
var builderPool = sync.Pool{
    New: func() interface{} {
        return new(strings.Builder)
    },
}

func concatWithPool(strs []string) string {
    builder := builderPool.Get().(*strings.Builder)
    defer func() {
        builder.Reset()
        builderPool.Put(builder)
    }()
    
    for _, s := range strs {
        builder.WriteString(s)
    }
    return builder.String()
}
```

### 이스케이프 분석 활용

```go
// go build -gcflags="-m" 로 확인

// ❌ 힙으로 이스케이프
func newUser() *User {
    u := User{Name: "Andrew"}  // u escapes to heap
    return &u
}

// ✅ 스택에 유지
func processUser() {
    u := User{Name: "Andrew"}  // u stays on stack
    doSomething(u)
}

// 인라인과 이스케이프
//go:noinline
func getValue() int {
    return 42
}

// 인라인되면 스택에 유지
func getValue2() int {  // can be inlined
    return 42
}
```

### 슬라이스 최적화

```go
// ❌ 나쁜 예: 반복적인 재할당
func collectData() []int {
    var result []int
    for i := 0; i < 10000; i++ {
        result = append(result, i)  // 여러 번 재할당
    }
    return result
}

// ✅ 좋은 예: 사전 할당
func collectData() []int {
    result := make([]int, 0, 10000)  // 용량 미리 할당
    for i := 0; i < 10000; i++ {
        result = append(result, i)  // 재할당 없음
    }
    return result
}

// 슬라이스 재사용
type Buffer struct {
    data []byte
}

func (b *Buffer) Reset() {
    b.data = b.data[:0]  // 길이만 0으로, 용량 유지
}
```

## 🚀 Chapter 3: CPU 최적화

### 핫패스 최적화

```go
// 프로파일링으로 핫패스 확인
// (pprof) top
// 90% processData
// 5%  parseInput
// ...

// 핫패스 최적화 전
func processData(data []int) int {
    sum := 0
    for _, v := range data {
        if isValid(v) {  // 함수 호출 오버헤드
            sum += calculate(v)  // 또 다른 함수 호출
        }
    }
    return sum
}

// 핫패스 최적화 후
func processData(data []int) int {
    sum := 0
    for _, v := range data {
        // 인라인 처리
        if v > 0 && v < 1000 {  // isValid 인라인
            sum += v * v  // calculate 인라인
        }
    }
    return sum
}
```

### 캐시 친화적 코드

```go
// ❌ 캐시 미스가 많은 코드
type Node struct {
    value int
    next  *Node
}

func sumList(head *Node) int {
    sum := 0
    for n := head; n != nil; n = n.next {
        sum += n.value  // 포인터 체이싱, 캐시 미스
    }
    return sum
}

// ✅ 캐시 친화적 코드
func sumArray(arr []int) int {
    sum := 0
    for i := 0; i < len(arr); i++ {
        sum += arr[i]  // 순차 접근, 캐시 히트
    }
    return sum
}

// False Sharing 방지
type Counter struct {
    value uint64
    _     [7]uint64  // 캐시 라인 패딩 (64바이트)
}
```

### SIMD와 병렬화

```go
// 단순 버전
func sum(data []float64) float64 {
    total := 0.0
    for _, v := range data {
        total += v
    }
    return total
}

// 병렬 버전
func sumParallel(data []float64) float64 {
    n := len(data)
    if n < 1000 {
        return sum(data)  // 작은 데이터는 단순 처리
    }
    
    numCPU := runtime.NumCPU()
    chunkSize := n / numCPU
    
    var wg sync.WaitGroup
    results := make([]float64, numCPU)
    
    for i := 0; i < numCPU; i++ {
        start := i * chunkSize
        end := start + chunkSize
        if i == numCPU-1 {
            end = n
        }
        
        wg.Add(1)
        go func(idx int, data []float64) {
            defer wg.Done()
            results[idx] = sum(data)
        }(i, data[start:end])
    }
    
    wg.Wait()
    
    return sum(results)
}
```

## 📊 Chapter 4: 벤치마킹

### 효과적인 벤치마크 작성

```go
func BenchmarkConcat(b *testing.B) {
    strs := []string{"hello", "world", "go", "benchmark"}
    
    b.ResetTimer()  // 준비 시간 제외
    
    for i := 0; i < b.N; i++ {
        _ = concat(strs)
    }
    
    b.ReportAllocs()  // 할당 통계 보고
}

// 서브 벤치마크
func BenchmarkSort(b *testing.B) {
    sizes := []int{10, 100, 1000, 10000}
    
    for _, size := range sizes {
        b.Run(fmt.Sprintf("size-%d", size), func(b *testing.B) {
            data := make([]int, size)
            // ... 데이터 초기화
            
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                sort.Ints(data)
            }
        })
    }
}

// 병렬 벤치마크
func BenchmarkParallel(b *testing.B) {
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            // 병렬로 실행할 작업
            doWork()
        }
    })
}
```

### 벤치마크 실행과 분석

```bash
# 기본 실행
go test -bench=.

# 메모리 할당 포함
go test -bench=. -benchmem

# 시간 지정
go test -bench=. -benchtime=10s

# 특정 벤치마크만
go test -bench=BenchmarkConcat

# 비교 (benchstat 사용)
go test -bench=. -count=10 > old.txt
# ... 코드 수정 ...
go test -bench=. -count=10 > new.txt
benchstat old.txt new.txt
```

## 🔧 Chapter 5: 고급 최적화 기법

### Bounds Check Elimination (BCE)

```go
// BCE 확인
// go build -gcflags="-d=ssa/check_bce/debug=1"

// ❌ 경계 체크 발생
func sum1(a []int) int {
    s := 0
    for i := 0; i < len(a); i++ {
        s += a[i]  // 경계 체크
    }
    return s
}

// ✅ BCE 적용 (힌트 제공)
func sum2(a []int) int {
    s := 0
    for i := range a {
        s += a[i]  // 경계 체크 제거됨
    }
    return s
}

// ✅ 명시적 힌트
func sum3(a []int) int {
    s := 0
    _ = a[len(a)-1]  // 힌트: 길이 확인
    for i := 0; i < len(a); i++ {
        s += a[i]  // BCE 적용
    }
    return s
}
```

### 컴파일러 디렉티브 활용

```go
// 핫패스 최적화
//go:inline
func hotFunction(x int) int {
    return x * x
}

// 분기 예측 힌트
func process(likely bool, data []int) {
    if likely {  // 컴파일러가 최적화
        // 자주 실행되는 경로
        fastPath(data)
    } else {
        // 드물게 실행되는 경로
        slowPath(data)
    }
}
```

### unsafe를 통한 극한 최적화

```go
// ⚠️ 주의: unsafe는 신중하게 사용

// string을 []byte로 zero-copy 변환
func stringToBytes(s string) []byte {
    return *(*[]byte)(unsafe.Pointer(
        &struct {
            string
            Cap int
        }{s, len(s)},
    ))
}

// []byte를 string으로 zero-copy 변환
func bytesToString(b []byte) string {
    return *(*string)(unsafe.Pointer(&b))
}

// 구조체 필드 직접 접근
type Header struct {
    Magic   uint32
    Version uint32
    Length  uint32
}

func parseHeader(data []byte) *Header {
    return (*Header)(unsafe.Pointer(&data[0]))
}
```

## 🎪 Chapter 6: 실시간 모니터링

### runtime 메트릭

```go
import "runtime"

func printStats() {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    
    fmt.Printf("Alloc = %v MB\n", m.Alloc / 1024 / 1024)
    fmt.Printf("TotalAlloc = %v MB\n", m.TotalAlloc / 1024 / 1024)
    fmt.Printf("Sys = %v MB\n", m.Sys / 1024 / 1024)
    fmt.Printf("NumGC = %v\n", m.NumGC)
    fmt.Printf("NumGoroutine = %v\n", runtime.NumGoroutine())
}

// GC 통계 추적
func trackGC() {
    go func() {
        var lastGC uint32
        var m runtime.MemStats
        
        for {
            runtime.ReadMemStats(&m)
            if m.NumGC > lastGC {
                fmt.Printf("GC #%d: Pause=%v\n", 
                    m.NumGC, 
                    time.Duration(m.PauseNs[(m.NumGC+255)%256]))
                lastGC = m.NumGC
            }
            time.Sleep(100 * time.Millisecond)
        }
    }()
}
```

### trace 도구 활용

```go
import "runtime/trace"

func main() {
    f, _ := os.Create("trace.out")
    defer f.Close()
    
    trace.Start(f)
    defer trace.Stop()
    
    // 프로그램 실행
    doWork()
}

// 분석
// go tool trace trace.out
```

## 🎯 Chapter 7: 실전 최적화 사례

### JSON 파싱 최적화

```go
// 표준 라이브러리 (느림)
func parseJSON1(data []byte) (*User, error) {
    var user User
    return &user, json.Unmarshal(data, &user)
}

// json-iterator (빠름)
import jsoniter "github.com/json-iterator/go"

var json = jsoniter.ConfigCompatibleWithStandardLibrary

func parseJSON2(data []byte) (*User, error) {
    var user User
    return &user, json.Unmarshal(data, &user)
}

// easyjson (더 빠름, 코드 생성)
//go:generate easyjson -all user.go

func parseJSON3(data []byte) (*User, error) {
    user := &User{}
    return user, user.UnmarshalJSON(data)
}
```

### HTTP 서버 최적화

```go
// 연결 풀 재사용
var client = &http.Client{
    Transport: &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 10,
        IdleConnTimeout:     90 * time.Second,
    },
    Timeout: 10 * time.Second,
}

// 버퍼 풀
var bufferPool = sync.Pool{
    New: func() interface{} {
        return make([]byte, 4096)
    },
}

func handler(w http.ResponseWriter, r *http.Request) {
    buf := bufferPool.Get().([]byte)
    defer bufferPool.Put(buf)
    
    // buf 사용...
}
```

## 💡 최적화 체크리스트

### 측정 먼저
- [ ] 프로파일링으로 병목 지점 확인
- [ ] 벤치마크로 개선 효과 측정
- [ ] 실제 워크로드로 검증

### 메모리 최적화
- [ ] 불필요한 할당 제거
- [ ] sync.Pool 활용
- [ ] 슬라이스 사전 할당
- [ ] 이스케이프 분석 확인

### CPU 최적화
- [ ] 핫패스 인라인화
- [ ] 캐시 친화적 자료구조
- [ ] 병렬 처리 활용
- [ ] BCE 적용

### 도구 활용
- [ ] pprof 프로파일링
- [ ] trace 분석
- [ ] benchstat 비교
- [ ] 컴파일러 플래그 활용

## 🎓 마무리

"성능 최적화는 과학이자 예술입니다. 측정 없는 최적화는 추측에 불과합니다."

최적화는 항상 명확한 목표와 측정을 바탕으로 진행해야 합니다. 코드의 가독성과 유지보수성을 희생하면서까지 최적화할 필요는 없습니다.

---

*성능 최적화는 지속적인 과정입니다. 측정하고, 개선하고, 다시 측정하세요.*