# Go 메모리 관리: 스택, 힙, 그리고 이스케이프 분석

## 📚 목차
1. [개요: Go의 메모리 모델](#개요-go의-메모리-모델)
2. [스택 vs 힙](#스택-vs-힙)
3. [이스케이프 분석의 마법](#이스케이프-분석의-마법)
4. [메모리 할당자 (Allocator)](#메모리-할당자-allocator)
5. [스택 관리와 성장](#스택-관리와-성장)
6. [메모리 최적화 전략](#메모리-최적화-전략)
7. [실습: 메모리 분석하기](#실습-메모리-분석하기)
8. [메모리 프로파일링](#메모리-프로파일링)
9. [FAQ](#faq)

---

## 개요: Go의 메모리 모델

### 🎯 한 줄 정의
> **"컴파일러가 자동으로 스택/힙을 결정하고, 효율적으로 관리하는 스마트한 메모리 시스템"**

### 📖 Go 메모리의 특별함

```
전통적 언어들:
C/C++: 프로그래머가 malloc/free로 수동 관리
Java: 모든 객체는 힙에 (GC 부담↑)
Python: 모든 것이 객체 (메모리 오버헤드↑)

Go의 접근:
1. 컴파일러가 스택/힙 자동 결정 (이스케이프 분석)
2. 스택 우선 정책 (빠르고 GC 없음!)
3. 효율적인 힙 할당자 (TCMalloc 기반)
4. 세그먼트 스택 → 연속 스택 (Go 1.3+)
```

### 🏢 메모리 구조 개요

```
┌─────────────────────────────────┐
│          OS Memory              │
├─────────────────────────────────┤
│         Go Runtime              │
├─────────┬───────────┬───────────┤
│  Stack  │    Heap   │   Data    │
├─────────┼───────────┼───────────┤
│ Goroutine│  Objects │  Globals  │
│  Stack   │  Arrays  │  Strings  │
│ (2KB~1GB)│  Maps    │  Code     │
└─────────┴───────────┴───────────┘
```

---

## 스택 vs 힙

### 📚 스택 (Stack) - 빠른 임시 저장소

```go
func stackExample() {
    x := 42           // 스택에 할당
    y := x + 10       // 스택에 할당
    arr := [3]int{1,2,3} // 배열도 스택 가능!
    
    // 함수 끝 = 자동 정리 (pop)
    // GC 필요 없음!
}
```

**스택의 특징:**
```
할당 속도: 1ns (단순 포인터 이동)
해제 속도: 0ns (자동)
메모리 지역성: 최상 (캐시 친화적)
크기 제한: 있음 (기본 2KB, 최대 1GB)
GC 부담: 없음!
```

### 🏗️ 힙 (Heap) - 공유 저장소

```go
func heapExample() *User {
    user := &User{Name: "Alice"}  // 힙에 할당
    return user  // 함수 밖으로 탈출!
}
```

**힙의 특징:**
```
할당 속도: 10-100ns (할당자 호출)
해제 속도: GC 의존
메모리 지역성: 나쁨 (분산됨)
크기 제한: OS 메모리까지
GC 부담: 있음
```

### ⚔️ 스택 vs 힙 성능 비교

```go
// 벤치마크 코드
func BenchmarkStack(b *testing.B) {
    for i := 0; i < b.N; i++ {
        s := Student{Name: "test", Age: 20}
        _ = s
    }
}

func BenchmarkHeap(b *testing.B) {
    for i := 0; i < b.N; i++ {
        s := &Student{Name: "test", Age: 20}
        _ = s
    }
}

// 결과:
// BenchmarkStack: 0.3 ns/op, 0 B/op, 0 allocs/op
// BenchmarkHeap:  15 ns/op,  48 B/op, 1 allocs/op
// → 스택이 50배 빠름!
```

---

## 이스케이프 분석의 마법

### 🔍 이스케이프 분석이란?

> **"컴파일러가 변수의 생명주기를 분석해 스택/힙을 자동 결정하는 것"**

```bash
# 이스케이프 분석 보기
go build -gcflags="-m"

# 더 자세히 보기
go build -gcflags="-m -m"
```

### 📊 이스케이프 규칙들

#### 규칙 1: 포인터 반환 → 힙

```go
func rule1() *int {
    x := 42
    return &x  // x escapes to heap
}
```

#### 규칙 2: 인터페이스 할당 → 힙

```go
func rule2() {
    var i interface{}
    x := 42
    i = x  // x escapes to heap (boxing)
}
```

#### 규칙 3: 큰 객체 → 힙

```go
func rule3() {
    // 64KB 이상은 무조건 힙
    huge := make([]byte, 1<<20)  // 1MB → heap
    _ = huge
}
```

#### 규칙 4: 클로저 캡처 → 상황에 따라

```go
func rule4() {
    x := 42  // heap (캡처되고 고루틴)
    
    go func() {
        fmt.Println(x)  // x 캡처
    }()
}

func rule4_stack() {
    x := 42  // stack (즉시 실행)
    
    func() {
        fmt.Println(x)  // x 캡처
    }()  // 즉시 실행 = 스택 가능
}
```

### 🎭 이스케이프 분석 실전 예제

```go
package main

import "fmt"

// 예제 1: 스택에 남는 경우
func noEscape() int {
    x := 42
    y := &x
    return *y  // 값 반환 = 스택
}

// 예제 2: 힙으로 탈출
func escape() *int {
    x := 42
    return &x  // 포인터 반환 = 힙
}

// 예제 3: 슬라이스 크기에 따라
func sliceEscape() {
    small := make([]int, 10)      // 스택 (작음)
    large := make([]int, 10000)   // 힙 (큼)
    
    _ = small
    _ = large
}

// 예제 4: 인터페이스와 이스케이프
type Printer interface {
    Print()
}

type Book struct {
    title string
}

func (b Book) Print() {
    fmt.Println(b.title)
}

func interfaceEscape() {
    book := Book{title: "Go"}     // 스택
    
    var p Printer = book           // 힙으로 이스케이프!
    p.Print()
}

// 컴파일러 출력 분석:
// go build -gcflags="-m" escape.go
// ./escape.go:8:2: moved to heap: x
// ./escape.go:15:11: make([]int, 10) does not escape
// ./escape.go:16:11: make([]int, 10000) escapes to heap
```

### 🚀 이스케이프 최소화 전략

```go
// 나쁜 예: 불필요한 이스케이프
func bad() *Result {
    r := &Result{}  // 무조건 힙
    r.Value = calculate()
    return r
}

// 좋은 예: 값으로 반환
func good() Result {
    r := Result{}  // 스택 가능!
    r.Value = calculate()
    return r
}

// 더 좋은 예: 포인터 리시버 피하기
func (r Result) Method() {}  // 값 리시버
// vs
func (r *Result) Method() {} // 포인터 리시버 (이스케이프 가능)
```

---

## 메모리 할당자 (Allocator)

### 🏗️ TCMalloc 기반 구조

Go의 메모리 할당자는 Google의 TCMalloc을 기반으로 합니다:

```
┌─────────────────────────────┐
│      mheap (전역)           │
│   큰 객체 & 중앙 관리        │
└─────────┬───────────────────┘
          │
    ┌─────▼─────┬─────────┬─────────┐
    │  mcentral │mcentral │mcentral │
    │  (크기별) │ (크기별)│ (크기별) │
    └─────┬─────┴────┬────┴────┬────┘
          │          │         │
    ┌─────▼────┬────▼────┬────▼────┐
    │  mcache  │ mcache  │ mcache  │
    │   (P0)   │  (P1)   │  (P2)   │
    └──────────┴─────────┴─────────┘
```

### 📏 크기 클래스 (Size Classes)

Go는 객체를 67개 크기 클래스로 분류:

```go
// runtime/sizeclasses.go
// 크기 클래스 예시
var sizeClasses = []int{
    0,    // 0 바이트 (특수)
    8,    // 1-8 바이트
    16,   // 9-16 바이트
    24,   // 17-24 바이트
    32,   // 25-32 바이트
    48,   // 33-48 바이트
    64,   // 49-64 바이트
    80,   // 65-80 바이트
    96,   // 81-96 바이트
    112,  // 97-112 바이트
    128,  // 113-128 바이트
    // ... 32KB까지
}
```

### 🎯 할당 경로

```go
func allocate(size int) unsafe.Pointer {
    if size == 0 {
        return &zerobase  // 특수 처리
    }
    
    if size <= 32*1024 {  // 32KB 이하
        // 작은 객체: mcache → mcentral → mheap
        return smallAlloc(size)
    }
    
    // 큰 객체: 직접 mheap에서
    return largeAlloc(size)
}
```

### 💾 메모리 재사용 (Span)

```go
// Span: 연속된 페이지들의 단위
type mspan struct {
    next     *mspan     // 다음 span
    prev     *mspan     // 이전 span
    startAddr uintptr   // 시작 주소
    npages    uintptr   // 페이지 수
    freeindex uintptr   // 다음 free 위치
    allocBits *gcBits   // 할당 비트맵
    gcmarkBits *gcBits  // GC 마킹 비트맵
}

// 8KB span 예시 (16바이트 객체용)
// [obj][obj][obj][free][free][obj][free]...
```

---

## 스택 관리와 성장

### 📈 연속 스택 (Contiguous Stack)

Go 1.3부터 세그먼트 스택 대신 연속 스택 사용:

```go
// 초기 스택: 2KB
func recursiveFunc(n int) {
    if n == 0 {
        return
    }
    
    var arr [256]int  // 2KB 사용
    recursiveFunc(n - 1)
    _ = arr
}

// 스택 성장 과정:
// 2KB → 4KB → 8KB → 16KB → ... → 1GB (최대)
```

### 🔄 스택 복사 매커니즘

```
스택이 꽉 차면:
1. 새 스택 할당 (2배 크기)
2. 기존 스택 내용 복사
3. 포인터 조정
4. 기존 스택 해제

[Old Stack 2KB]    [New Stack 4KB]
┌──────────┐       ┌──────────┐
│  Data A  │  ───→ │  Data A  │
│  Data B  │  복사  │  Data B  │
│  꽉 참!  │       │  여유공간 │
└──────────┘       │          │
                   └──────────┘
```

### ⚠️ 스택 분할 문제와 해결

```go
// 문제: Hot Split
func hotSplit() {
    for i := 0; i < 1000000; i++ {
        // 스택 경계에서 반복적 호출
        // → 계속 스택 성장/축소 반복!
        deepCall()
    }
}

// 해결: 스택 프리엠션
// Go는 스택이 줄어들 때 바로 축소하지 않음
// 일정 시간 유지 후 축소 (히스테리시스)
```

---

## 메모리 최적화 전략

### 🎯 전략 1: 객체 풀링 (sync.Pool)

```go
var bufferPool = sync.Pool{
    New: func() interface{} {
        return make([]byte, 4096)
    },
}

func processWithPool(data []byte) {
    // 풀에서 버퍼 가져오기
    buf := bufferPool.Get().([]byte)
    defer bufferPool.Put(buf)  // 반환
    
    // 버퍼 사용
    copy(buf, data)
    process(buf)
}

// 성능 비교
// Without Pool: 100ns/op, 4096 B/op
// With Pool:    10ns/op,  0 B/op
```

### 🎯 전략 2: 구조체 패딩과 정렬

```go
// 나쁜 예: 패딩으로 인한 메모리 낭비
type BadStruct struct {
    a bool    // 1 byte
    // 7 bytes padding
    b int64   // 8 bytes
    c bool    // 1 byte
    // 7 bytes padding
}  // 총 24 bytes!

// 좋은 예: 필드 정렬로 최적화
type GoodStruct struct {
    b int64   // 8 bytes
    a bool    // 1 byte
    c bool    // 1 byte
    // 6 bytes padding
}  // 총 16 bytes!

// 크기 확인
fmt.Println(unsafe.Sizeof(BadStruct{}))   // 24
fmt.Println(unsafe.Sizeof(GoodStruct{}))  // 16
```

### 🎯 전략 3: 슬라이스 사전 할당

```go
// 나쁜 예: 동적 성장
func badAppend() []int {
    var s []int
    for i := 0; i < 1000; i++ {
        s = append(s, i)  // 여러 번 재할당!
    }
    return s
}

// 좋은 예: 사전 할당
func goodAppend() []int {
    s := make([]int, 0, 1000)  // 용량 미리 확보
    for i := 0; i < 1000; i++ {
        s = append(s, i)  // 재할당 없음!
    }
    return s
}

// 벤치마크:
// badAppend:  10000 ns/op, 24576 B/op, 11 allocs
// goodAppend: 1000 ns/op,  8192 B/op,  1 alloc
```

### 🎯 전략 4: 문자열 최적화

```go
// 문자열 연결 성능 비교

// 최악: + 연산자
func concat1(strs []string) string {
    result := ""
    for _, s := range strs {
        result += s  // 매번 새 문자열 할당!
    }
    return result
}

// 보통: fmt.Sprintf
func concat2(strs []string) string {
    return fmt.Sprintf("%s%s%s", strs[0], strs[1], strs[2])
}

// 좋음: strings.Join
func concat3(strs []string) string {
    return strings.Join(strs, "")
}

// 최선: strings.Builder
func concat4(strs []string) string {
    var builder strings.Builder
    builder.Grow(100)  // 사전 할당
    for _, s := range strs {
        builder.WriteString(s)
    }
    return builder.String()
}

// 벤치마크 (1000개 문자열):
// concat1: 500000 ns/op, 500000 B/op
// concat2: 50000 ns/op,  50000 B/op
// concat3: 5000 ns/op,   10000 B/op
// concat4: 1000 ns/op,   2000 B/op
```

### 🎯 전략 5: Zero Allocation 기법

```go
// Zero Allocation JSON 파싱
type User struct {
    Name string `json:"name"`
    Age  int    `json:"age"`
}

var userPool = sync.Pool{
    New: func() interface{} {
        return &User{}
    },
}

func parseUser(data []byte) *User {
    user := userPool.Get().(*User)
    // user를 재사용하므로 리셋 필요
    user.Name = ""
    user.Age = 0
    
    json.Unmarshal(data, user)
    return user
}

func releaseUser(user *User) {
    userPool.Put(user)
}
```

---

## 실습: 메모리 분석하기

### 🧪 실험 1: 이스케이프 분석 관찰

```go
package main

import (
    "fmt"
    "runtime"
)

// go build -gcflags="-m -l" memory.go

func main() {
    printMemStats("초기")
    
    // 스택 할당
    stackAlloc()
    printMemStats("스택 할당 후")
    
    // 힙 할당
    heapAlloc()
    printMemStats("힙 할당 후")
    
    // 강제 GC
    runtime.GC()
    printMemStats("GC 후")
}

//go:noinline
func stackAlloc() {
    // 스택에 할당
    arr := [1000]int{}
    for i := range arr {
        arr[i] = i
    }
    // 함수 끝 = 자동 해제
}

//go:noinline
func heapAlloc() []*int {
    // 힙에 할당
    var ptrs []*int
    for i := 0; i < 1000; i++ {
        n := i  // moved to heap: n
        ptrs = append(ptrs, &n)
    }
    return ptrs
}

func printMemStats(label string) {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    fmt.Printf("%s:\n", label)
    fmt.Printf("  Alloc: %d KB\n", m.Alloc/1024)
    fmt.Printf("  HeapAlloc: %d KB\n", m.HeapAlloc/1024)
    fmt.Printf("  StackInuse: %d KB\n", m.StackInuse/1024)
    fmt.Printf("  NumGC: %d\n\n", m.NumGC)
}
```

### 🧪 실험 2: 스택 성장 관찰

```go
func observeStackGrowth() {
    var count int
    
    // 재귀로 스택 성장 유도
    var recurse func(depth int)
    recurse = func(depth int) {
        // 스택 프레임 크기 증가
        var local [1024]byte
        local[0] = byte(depth)
        
        if depth < 1000 {
            recurse(depth + 1)
        } else {
            // 현재 스택 크기 출력
            stackSize := runtime.Stack(local[:], false)
            fmt.Printf("스택 크기: %d bytes\n", stackSize)
            count = depth
        }
    }
    
    recurse(0)
    fmt.Printf("재귀 깊이: %d\n", count)
}
```

### 🧪 실험 3: 메모리 정렬 확인

```go
func checkAlignment() {
    type T1 struct {
        b bool
        i int64
        s string
    }
    
    type T2 struct {
        i int64
        s string
        b bool
    }
    
    fmt.Printf("T1 size: %d, align: %d\n", 
        unsafe.Sizeof(T1{}), unsafe.Alignof(T1{}))
    fmt.Printf("T2 size: %d, align: %d\n", 
        unsafe.Sizeof(T2{}), unsafe.Alignof(T2{}))
    
    // 필드 오프셋 확인
    t1 := T1{}
    fmt.Printf("T1.b offset: %d\n", unsafe.Offsetof(t1.b))
    fmt.Printf("T1.i offset: %d\n", unsafe.Offsetof(t1.i))
    fmt.Printf("T1.s offset: %d\n", unsafe.Offsetof(t1.s))
}
```

---

## 메모리 프로파일링

### 📊 pprof를 이용한 프로파일링

```go
import (
    "os"
    "runtime"
    "runtime/pprof"
)

func profileMemory() {
    // 메모리 프로파일 시작
    f, _ := os.Create("mem.prof")
    defer f.Close()
    
    // 할당 프로파일링
    runtime.GC()
    pprof.WriteHeapProfile(f)
}

// 분석:
// go tool pprof mem.prof
// (pprof) top
// (pprof) list main
// (pprof) web
```

### 🔥 실시간 프로파일링

```go
import _ "net/http/pprof"
import "net/http"

func main() {
    go func() {
        http.ListenAndServe("localhost:6060", nil)
    }()
    
    // 애플리케이션 코드...
}

// 브라우저에서:
// http://localhost:6060/debug/pprof/heap
// http://localhost:6060/debug/pprof/allocs
// http://localhost:6060/debug/pprof/goroutine
```

### 📈 메모리 사용 패턴 분석

```go
func analyzeMemoryPattern() {
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()
    
    var prevAlloc uint64
    
    for range ticker.C {
        var m runtime.MemStats
        runtime.ReadMemStats(&m)
        
        // 할당 속도 계산
        allocRate := m.TotalAlloc - prevAlloc
        prevAlloc = m.TotalAlloc
        
        fmt.Printf("할당 속도: %d KB/s\n", allocRate/1024)
        fmt.Printf("활성 객체: %d\n", m.HeapObjects)
        fmt.Printf("GC 횟수: %d\n", m.NumGC)
        
        // 메모리 압박 감지
        if m.HeapAlloc > 100*1024*1024 {
            fmt.Println("경고: 메모리 사용량 높음!")
            debug.FreeOSMemory()  // OS에 메모리 반환
        }
    }
}
```

---

## FAQ

### ❓ 자주 묻는 질문들

**Q1: 왜 내 구조체가 힙으로 이스케이프하나요?**

A: 주요 원인들:
```go
// 1. 포인터 반환
func f1() *T { 
    t := T{}
    return &t  // escapes!
}

// 2. 인터페이스 할당
var i interface{} = T{}  // escapes!

// 3. 클로저 캡처
go func() { 
    fmt.Println(t)  // t escapes!
}()

// 4. 크기가 큼
big := make([]byte, 1<<20)  // escapes!
```

**Q2: 스택 오버플로우는 어떻게 방지하나요?**

A: Go는 자동으로 스택을 성장시킵니다:
```go
// 최대 1GB까지 자동 성장
// 스택 크기 확인
var buf [1024]byte
n := runtime.Stack(buf[:], false)
fmt.Printf("스택 크기: %d\n", n)
```

**Q3: sync.Pool은 언제 사용해야 하나요?**

A: 다음 경우에 효과적:
- 임시 객체가 자주 생성/삭제
- 객체 크기가 크거나 초기화 비용이 높음
- GC 압박을 줄이고 싶을 때

```go
// 좋은 사용 예
var jsonEncoderPool = sync.Pool{
    New: func() interface{} {
        return json.NewEncoder(nil)
    },
}
```

**Q4: 메모리 누수를 어떻게 찾나요?**

A: pprof 사용:
```bash
# 1. 프로파일 수집
curl http://localhost:6060/debug/pprof/heap > heap.prof

# 2. 분석
go tool pprof heap.prof
(pprof) top
(pprof) list leaky_function
```

**Q5: 문자열과 []byte 변환이 비싼가요?**

A: 네, 복사가 발생합니다:
```go
// 비효율적
s := "hello"
b := []byte(s)  // 복사!
s2 := string(b)  // 또 복사!

// 효율적 (unsafe, 주의!)
func stringToBytes(s string) []byte {
    return *(*[]byte)(unsafe.Pointer(&s))
}
```

**Q6: 큰 맵을 어떻게 초기화하나요?**

A: 크기 힌트 제공:
```go
// 비효율적
m := make(map[string]int)

// 효율적
m := make(map[string]int, 1000000)  // 힌트!
```

---

## 🎯 핵심 정리

### 메모리 관리 핵심

1. **이스케이프 분석**: 컴파일러가 자동 결정
2. **스택 우선**: 가능하면 스택 사용
3. **연속 스택**: 2KB 시작, 자동 성장
4. **TCMalloc 기반**: 효율적 힙 관리
5. **크기 클래스**: 67개로 분류

### 최적화 체크리스트

- [ ] 이스케이프 분석 확인 (`-gcflags="-m"`)
- [ ] 구조체 필드 정렬
- [ ] 슬라이스 사전 할당
- [ ] sync.Pool 활용
- [ ] 문자열 Builder 사용
- [ ] 프로파일링으로 검증

### 기억할 수치

- **2KB**: 초기 스택 크기
- **1GB**: 최대 스택 크기
- **32KB**: small/large 객체 경계
- **67개**: 크기 클래스 수
- **8KB**: 페이지 크기

---

## 📚 참고 자료

- [A Guide to Go's Memory](https://go.dev/blog/ismmkeynote)
- [Go Memory Model](https://go.dev/ref/mem)
- [Stack Management in Go](https://agis.io/post/contiguous-stacks-golang/)
- [Allocation Efficiency in Go](https://segment.com/blog/allocation-efficiency-in-high-performance-go-services/)
- [Go Source: runtime/malloc.go](https://github.com/golang/go/blob/master/src/runtime/malloc.go)

---

*작성일: 2025년 8월*  
*Go 버전: 1.26 기준*