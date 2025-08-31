# Go의 가비지 컬렉터: 0.5ms의 마법

## 📚 목차
1. [개요: Go GC의 혁명](#개요-go-gc의-혁명)
2. [GC가 필요한 이유](#gc가-필요한-이유)
3. [Go GC의 진화 역사](#go-gc의-진화-역사)
4. [Tricolor Mark & Sweep 알고리즘](#tricolor-mark--sweep-알고리즘)
5. [Write Barrier의 비밀](#write-barrier의-비밀)
6. [GC 튜닝과 최적화](#gc-튜닝과-최적화)
7. [실습: GC 관찰하기](#실습-gc-관찰하기)
8. [다른 언어와의 비교](#다른-언어와의-비교)
9. [FAQ](#faq)

---

## 개요: Go GC의 혁명

### 🎯 한 줄 정의
> **"프로그램을 멈추지 않고(Concurrent) 0.5ms 이내에 메모리를 청소하는 마법사"**

### 📖 핵심 특징

Go의 GC는 2015년 Go 1.5에서 혁명적인 변화를 겪었습니다:

```
목표: Stop-The-World(STW) 시간을 10ms → 0.5ms로 단축!

달성 방법:
1. Concurrent Mark & Sweep
2. Tricolor 알고리즘
3. Write Barrier
4. Goroutine 협력
```

### 🎭 청소부 비유로 이해하기

```
일반적인 청소 (Stop-The-World GC):
"모두 멈춰! 청소할 시간이야!"
→ 모든 직원이 일을 멈추고 기다림 (10초)
→ 청소부가 혼자 청소
→ "이제 다시 일해도 돼!"

Go의 청소 (Concurrent GC):
"일하면서 청소할게요~"
→ 직원들은 계속 일함
→ 청소부가 살짝 방해하며 청소 (0.0005초씩)
→ 거의 눈치채지 못함!
```

---

## GC가 필요한 이유

### 🔍 메모리 누수의 위험

**C/C++의 수동 메모리 관리:**
```c
// C에서의 위험한 코드
char* buffer = malloc(1024);
processData(buffer);
// free(buffer); // 잊어버림! 메모리 누수!

// 더 위험한 경우
free(buffer);
useBuffer(buffer); // Use After Free! 크래시!
free(buffer);      // Double Free! 크래시!
```

**Go의 자동 메모리 관리:**
```go
// Go에서는 안전!
buffer := make([]byte, 1024)
processData(buffer)
// GC가 알아서 처리! 걱정 없음!

// 참조가 있는 동안은 살아있음
activeData := getData()
go func() {
    time.Sleep(10 * time.Second)
    fmt.Println(activeData) // 아직 살아있음!
}()
// GC는 고루틴이 끝날 때까지 기다림
```

### 📊 메모리 사용 패턴 분석

```go
// 실제 웹 서버의 메모리 패턴
func handleRequest(w http.ResponseWriter, r *http.Request) {
    // 요청마다 임시 메모리 할당
    buffer := make([]byte, 4096)    // 4KB
    user := &User{}                 // 100B
    response := processRequest(buffer, user) // 내부에서 더 많은 할당
    
    // 함수 끝 = 모든 임시 객체가 GC 대상
}

// 초당 1000개 요청 = 초당 4MB+ 쓰레기 생성!
// GC가 없다면? 메모리 폭발! 💥
```

---

## Go GC의 진화 역사

### 📅 버전별 발전 과정

```
Go 1.0 (2012): Stop-The-World GC
├── STW 시간: 수백 ms
├── 간단한 Mark & Sweep
└── "일단 돌아가게 하자"

Go 1.1 (2013): Parallel Mark
├── STW 시간: 50-100ms
├── 여러 스레드가 동시에 마킹
└── "좀 빨라졌네"

Go 1.3 (2014): Concurrent Sweep
├── STW 시간: 30-50ms
├── Sweep 단계는 동시 실행
└── "절반의 성공"

Go 1.5 (2015): Concurrent Mark & Sweep 🎉
├── STW 시간: 10ms 목표
├── Tricolor 알고리즘 도입
└── "혁명의 시작"

Go 1.8 (2017): STW 최적화
├── STW 시간: 1ms 미만
├── Goroutine 협력 개선
└── "거의 완성"

Go 1.14 (2020): Preemptive Scheduling
├── STW 시간: 0.5ms 달성!
├── 비협조적 고루틴도 처리
└── "목표 달성!"

Go 1.19+ (2022~): Soft Memory Limit
├── 메모리 제한 설정 가능
├── OOM 방지
└── "더 똑똑해짐"
```

### 🎯 Rick Hudson의 유명한 발표

2015년 GopherCon에서 Rick Hudson은 선언했습니다:
> "우리의 목표는 어떤 힙 크기에서도 10ms 이하의 pause time입니다."

당시 Java 개발자들: "불가능해! 😂"
5년 후: "Go는 어떻게 했지? 😱"

---

## Tricolor Mark & Sweep 알고리즘

### 🎨 3색 마킹의 원리

Go GC는 객체를 3가지 색으로 분류합니다:

```
⚪ 흰색 (White): 아직 확인 안 함 (쓰레기 후보)
🔘 회색 (Gray): 확인 중 (자식을 아직 다 안 봄)
⚫ 검은색 (Black): 확인 완료 (살아있음!)
```

### 📊 단계별 진행 과정

**Step 1: 초기 상태**
```
모든 객체 = ⚪ 흰색

Root Set (스택, 전역변수) → 🔘 회색으로 변경
```

**Step 2: 마킹 진행**
```go
// 의사코드
while (회색_객체가_있음) {
    obj := 회색_객체_하나_선택()
    
    for child := range obj.pointers {
        if child.color == WHITE {
            child.color = GRAY  // 자식을 회색으로
        }
    }
    
    obj.color = BLACK  // 자신은 검은색으로
}
```

**Step 3: 스위핑**
```
남은 ⚪ 흰색 객체 = 쓰레기!
→ 메모리 해제
```

### 🎭 실제 예제로 이해하기

```go
type Node struct {
    Value int
    Left  *Node
    Right *Node
}

func example() {
    // GC 시작 시점의 객체 그래프
    root := &Node{Value: 1}           // Root Set
    root.Left = &Node{Value: 2}       
    root.Right = &Node{Value: 3}      
    root.Left.Left = &Node{Value: 4}  
    
    garbage := &Node{Value: 999}      // 참조 없음!
}
```

**GC 진행 과정:**
```
초기: 모든 노드 ⚪

Step 1: Root 스캔
root(1) → 🔘

Step 2: root 처리
root(1) → ⚫
root.Left(2) → 🔘
root.Right(3) → 🔘

Step 3: Left(2) 처리
Left(2) → ⚫
Left.Left(4) → 🔘

Step 4: Right(3) 처리
Right(3) → ⚫

Step 5: Left.Left(4) 처리
Left.Left(4) → ⚫

Step 6: 스위핑
garbage(999) → ⚪ (여전히 흰색) → 💀 삭제!
```

### 🔄 동시성의 문제와 해결

**문제: GC 중에 포인터가 바뀐다면?**

```go
// GC가 A를 검은색으로 마킹한 후
A.ptr = nil  // 원래 가리키던 B 해제
A.ptr = C    // 새로운 C를 가리킴

// 만약 C가 아직 흰색이라면?
// → C가 잘못 삭제될 수 있음! 😱
```

**해결책: Write Barrier! (다음 섹션에서 자세히)**

---

## Write Barrier의 비밀

### 🛡️ Write Barrier란?

> **"GC 중에 포인터 쓰기를 감시하는 보초병"**

```go
// 일반 코드
A.ptr = B

// GC 중에는 Write Barrier가 개입!
writeBarrier(&A.ptr, B)

func writeBarrier(slot *unsafe.Pointer, ptr unsafe.Pointer) {
    // 1. 새 포인터가 흰색이면 회색으로 변경
    if isWhite(ptr) {
        markGray(ptr)
    }
    
    // 2. 실제 쓰기 수행
    *slot = ptr
    
    // 3. GC에게 알림
    gcController.notify(slot, ptr)
}
```

### 📊 Dijkstra vs Yuasa Barrier

Go는 Hybrid Write Barrier를 사용합니다:

```go
// Dijkstra Barrier (새 포인터 보호)
func dijkstraBarrier(slot *unsafe.Pointer, newPtr unsafe.Pointer) {
    if gcPhase == MARKING && isWhite(newPtr) {
        markGray(newPtr)  // 새로 가리키는 객체 보호
    }
    *slot = newPtr
}

// Yuasa Barrier (기존 포인터 보호)
func yuasaBarrier(slot *unsafe.Pointer, newPtr unsafe.Pointer) {
    oldPtr := *slot
    if gcPhase == MARKING && isWhite(oldPtr) {
        markGray(oldPtr)  // 기존 객체도 보호
    }
    *slot = newPtr
}

// Go's Hybrid (둘 다 보호!)
func hybridBarrier(slot *unsafe.Pointer, newPtr unsafe.Pointer) {
    oldPtr := *slot
    
    // 스택은 Dijkstra만
    if isStack(slot) {
        if isWhite(newPtr) {
            markGray(newPtr)
        }
    } else {
        // 힙은 둘 다
        if isWhite(oldPtr) {
            markGray(oldPtr)
        }
        if isWhite(newPtr) {
            markGray(newPtr)
        }
    }
    
    *slot = newPtr
}
```

### ⚡ 성능 영향

```
Write Barrier 오버헤드:
- 포인터 쓰기마다 5-10ns 추가
- 전체 성능 영향: 약 5-10%
- But STW 시간 단축: 100ms → 0.5ms!
- 결과: 전체적으로 큰 이득!
```

---

## GC 튜닝과 최적화

### 🎛️ GOGC 환경변수

```bash
# 기본값: 100 (힙이 2배가 되면 GC)
GOGC=100 ./myapp

# 더 자주 GC (메모리 절약, CPU 많이 씀)
GOGC=50 ./myapp

# 덜 자주 GC (메모리 많이 씀, CPU 절약)
GOGC=200 ./myapp

# GC 비활성화 (위험!)
GOGC=off ./myapp
```

### 📊 GOMEMLIMIT (Go 1.19+)

```go
// 프로그램 내에서 설정
debug.SetMemoryLimit(2 << 30)  // 2GB 제한

// 환경변수로 설정
// GOMEMLIMIT=2GiB ./myapp
```

**동작 방식:**
```
메모리 사용량 < 50% limit: GOGC 규칙 따름
메모리 사용량 > 50% limit: GC 빈도 증가
메모리 사용량 > 90% limit: 지속적 GC
메모리 사용량 > 95% limit: 거의 항상 GC
```

### 🎯 할당 최적화 전략

#### 1. 객체 재사용 (sync.Pool)

```go
// 나쁜 예: 매번 할당
func processRequest() {
    buffer := make([]byte, 4096)  // 매번 4KB 할당
    // ... 사용 ...
    // GC가 처리해야 함
}

// 좋은 예: Pool 사용
var bufferPool = sync.Pool{
    New: func() interface{} {
        return make([]byte, 4096)
    },
}

func processRequestOptimized() {
    buffer := bufferPool.Get().([]byte)
    defer bufferPool.Put(buffer)  // 재사용을 위해 반환
    // ... 사용 ...
}

// 벤치마크 결과:
// BenchmarkAllocation: 50ns/op, 4096 B/op, 1 allocs/op
// BenchmarkPool:       10ns/op, 0 B/op,    0 allocs/op
```

#### 2. 스택 할당 유도

```go
// 힙 할당 (느림, GC 대상)
func heapAlloc() *User {
    return &User{Name: "Alice"}  // 포인터 반환 = 힙
}

// 스택 할당 (빠름, GC 무관)
func stackAlloc() User {
    return User{Name: "Alice"}  // 값 반환 = 스택
}

// 이스케이프 분석으로 확인
// go build -gcflags="-m"
```

#### 3. 사전 할당

```go
// 나쁜 예: 동적 증가
func bad() []int {
    var slice []int
    for i := 0; i < 1000; i++ {
        slice = append(slice, i)  // 여러 번 재할당
    }
    return slice
}

// 좋은 예: 사전 할당
func good() []int {
    slice := make([]int, 0, 1000)  // 용량 미리 확보
    for i := 0; i < 1000; i++ {
        slice = append(slice, i)  // 재할당 없음
    }
    return slice
}
```

---

## 실습: GC 관찰하기

### 🔬 실험 1: GC 추적

```go
package main

import (
    "fmt"
    "runtime"
    "runtime/debug"
    "time"
)

func main() {
    // GC 통계 활성화
    debug.SetGCPercent(100)
    
    // GC 이벤트 모니터링
    go func() {
        var m runtime.MemStats
        for {
            runtime.ReadMemStats(&m)
            fmt.Printf("Alloc: %d MB, GC: %d, Pause: %d ns\n",
                m.Alloc/1024/1024,
                m.NumGC,
                m.PauseNs[(m.NumGC+255)%256])
            time.Sleep(1 * time.Second)
        }
    }()
    
    // 메모리 압박 생성
    var data [][]byte
    for i := 0; i < 100; i++ {
        data = append(data, make([]byte, 1024*1024)) // 1MB씩
        time.Sleep(100 * time.Millisecond)
        
        if i%10 == 0 {
            runtime.GC()  // 수동 GC 트리거
            fmt.Println("Manual GC triggered")
        }
    }
}
```

**실행:**
```bash
# GC 추적 활성화
GODEBUG=gctrace=1 go run main.go

# 출력 예시:
# gc 1 @0.001s 5%: 0.018+1.0+0.021 ms clock
#              ^    ^     ^    ^     ^
#              |    |     |    |     └── sweep 시간
#              |    |     |    └──────── mark 시간  
#              |    |     └───────────── STW 시간
#              |    └─────────────────── CPU 사용률
#              └──────────────────────── GC 번호
```

### 🔬 실험 2: Write Barrier 관찰

```go
func observeWriteBarrier() {
    type Node struct {
        Next *Node
        Data [1024]byte  // 크게 만들어 힙 할당 유도
    }
    
    // GC 중에 포인터 변경
    root := &Node{}
    
    // GC 시작
    runtime.GC()
    
    // GC 중에 포인터 쓰기 (Write Barrier 동작!)
    done := make(chan bool)
    go func() {
        for i := 0; i < 1000000; i++ {
            newNode := &Node{}
            root.Next = newNode  // Write Barrier!
            root = newNode
        }
        done <- true
    }()
    
    // 동시에 GC 압박
    go func() {
        for {
            select {
            case <-done:
                return
            default:
                _ = make([]byte, 1024*1024)
                runtime.Gosched()
            }
        }
    }()
    
    <-done
}
```

### 🔬 실험 3: 메모리 프로파일링

```go
import (
    "os"
    "runtime/pprof"
)

func profileMemory() {
    // 메모리 프로파일 파일 생성
    f, _ := os.Create("mem.prof")
    defer f.Close()
    
    // 할당 추적 시작
    runtime.GC()
    pprof.WriteHeapProfile(f)
    
    // 분석
    // go tool pprof mem.prof
    // (pprof) top
    // (pprof) list main
    // (pprof) web
}
```

---

## 다른 언어와의 비교

### 📊 GC 방식 비교

| 언어 | GC 타입 | STW 시간 | 특징 |
|------|---------|----------|------|
| **Go** | Concurrent Mark&Sweep | <0.5ms | 낮은 지연시간 우선 |
| **Java (G1GC)** | Generational, Regional | 10-100ms | 처리량 우선 |
| **Java (ZGC)** | Concurrent | <10ms | 큰 힙 지원 (TB급) |
| **.NET Core** | Generational Mark&Sweep | 10-50ms | 균형잡힌 성능 |
| **Python** | Reference Counting + Cycle | N/A | GIL로 인한 제약 |
| **Rust** | 없음 (Ownership) | 0ms | 컴파일 타임 보장 |
| **JavaScript (V8)** | Generational, Incremental | 1-10ms | 작은 힙 최적화 |

### 🎯 Go GC의 트레이드오프

**장점:**
- ✅ 매우 낮은 지연시간 (<0.5ms)
- ✅ 예측 가능한 성능
- ✅ 설정이 간단 (GOGC만!)
- ✅ 큰 힙에서도 일정한 pause

**단점:**
- ❌ 처리량(throughput)은 Java보다 낮음
- ❌ CPU 오버헤드 (5-25%)
- ❌ Generational GC 없음 (모든 객체 동등)
- ❌ 수동 튜닝 옵션 제한적

### 📈 벤치마크 결과

```
시나리오: 웹 서버, 초당 10,000 요청 처리

처리량 (req/sec):
Java G1GC:  12,000  ← 최고 처리량
Go:         10,000
Java ZGC:    9,500
.NET Core:   9,000

99% 지연시간 (ms):
Go:          5ms  ← 최저 지연시간
Java ZGC:   10ms
.NET Core:  15ms
Java G1GC:  25ms

메모리 사용량:
Go:         500MB  ← 최소 메모리
.NET Core:  800MB
Java ZGC:   1.2GB
Java G1GC:  1.5GB
```

---

## FAQ

### ❓ 자주 묻는 질문들

**Q1: GC를 완전히 비활성화할 수 있나요?**

A: `GOGC=off`로 가능하지만 매우 위험합니다. 메모리가 계속 증가하여 OOM이 발생할 수 있습니다. 특수한 경우(단기 실행 프로그램)에만 사용하세요.

**Q2: Java처럼 Generational GC를 쓰지 않는 이유?**

A: Go 팀의 철학입니다:
- 단순함 > 복잡한 최적화
- 대부분의 Go 객체는 스택에 할당됨
- Generational GC의 복잡성이 이득보다 큼
- Write Barrier가 더 복잡해짐

**Q3: 수동으로 메모리를 해제할 수 있나요?**

A: 불가능합니다. 하지만 다음을 할 수 있습니다:
```go
runtime.GC()        // 수동 GC 트리거
obj = nil          // 참조 제거
runtime.KeepAlive(obj)  // GC 방지
```

**Q4: GC 압박을 줄이는 가장 좋은 방법은?**

A: 
1. 할당 줄이기 (객체 재사용)
2. 포인터 줄이기 (값 타입 선호)
3. sync.Pool 활용
4. 사전 할당 (make with capacity)

**Q5: GC가 실행되는 정확한 시점은?**

A: 다음 조건 중 하나:
- 힙 크기가 목표치 도달 (GOGC 기준)
- 2분 동안 GC 없었을 때
- runtime.GC() 호출
- 메모리 부족 시

**Q6: Write Barrier가 성능에 큰 영향을 주나요?**

A: 일반적으로 5-10% 정도입니다. 포인터가 많은 프로그램일수록 영향이 큽니다. 하지만 STW 시간 단축 효과가 훨씬 큽니다.

---

## 🎯 핵심 정리

### GC의 핵심 개념

1. **Concurrent Mark & Sweep**: 프로그램 실행 중 GC
2. **Tricolor Algorithm**: 객체를 3색으로 분류
3. **Write Barrier**: 포인터 쓰기 감시
4. **0.5ms STW**: 목표 달성!
5. **GOGC & GOMEMLIMIT**: 간단한 튜닝

### 최적화 체크리스트

- [ ] 불필요한 할당 줄이기
- [ ] sync.Pool 활용하기
- [ ] 값 타입 선호하기
- [ ] 사전 할당 활용하기
- [ ] 프로파일링으로 확인하기

### 기억할 수치

- **2KB**: 고루틴 초기 스택
- **100**: 기본 GOGC 값
- **0.5ms**: 목표 STW 시간
- **10-25%**: GC CPU 오버헤드
- **2분**: 강제 GC 주기

---

## 📚 참고 자료

- [Getting to Go: The Journey of Go's Garbage Collector](https://go.dev/blog/ismmkeynote)
- [Go GC: Prioritizing Low Latency](https://github.com/golang/proposal/blob/master/design/44167-gc-pacer-redesign.md)
- [A Guide to the Go Garbage Collector](https://tip.golang.org/doc/gc-guide)
- [Go Source: runtime/mgc.go](https://github.com/golang/go/blob/master/src/runtime/mgc.go)

---

*작성일: 2025년 8월*  
*Go 버전: 1.26 기준*