# 컴파일러와 런타임 내부: Go의 심장부 탐험

## 🎬 프롤로그: 소스코드에서 실행까지

Go 프로그램이 실행되기까지의 여정을 따라가 봅시다.

```go
// hello.go
package main

func main() {
    println("Hello, World!")
}
```

이 간단한 코드가 어떻게 기계어가 되고 실행될까요?

## 📚 Chapter 1: 컴파일 파이프라인

### 1단계: 렉싱과 파싱

```
소스코드 → 토큰 → AST (추상 구문 트리)
```

```go
// cmd/compile/internal/syntax/scanner.go
// 렉서가 문자를 토큰으로 변환

"func main()" → [FUNC, IDENT(main), LPAREN, RPAREN]

// cmd/compile/internal/syntax/parser.go  
// 파서가 토큰을 AST로 구성
type FuncDecl struct {
    Name *Name
    Type *FuncType
    Body *BlockStmt
}
```

### 2단계: 타입 체킹

```go
// cmd/compile/internal/types2/check.go
// 모든 표현식의 타입을 검증

x := 10        // int로 추론
y := "hello"   // string으로 추론
z := x + y     // 컴파일 에러: mismatched types
```

### 3단계: SSA (Static Single Assignment) 변환

일반 코드를 최적화하기 쉬운 형태로 변환합니다.

```go
// 원본 코드
x := 1
x = x + 2
y := x * 3

// SSA 형태
x_1 := 1
x_2 := x_1 + 2
y_1 := x_2 * 3
```

SSA의 장점:
- 각 변수가 한 번만 할당됨
- 데이터 흐름 분석이 쉬움
- 최적화가 단순해짐

### 4단계: 최적화 패스

```go
// cmd/compile/internal/ssa/compile.go
// 다양한 최적화 기법 적용

var passes = [...]pass{
    {name: "deadcode", fn: deadcode},      // 죽은 코드 제거
    {name: "cse", fn: cse},                // 공통 부분식 제거
    {name: "prove", fn: prove},            // 경계 체크 제거
    {name: "loopbce", fn: loopbce},        // 루프 최적화
    {name: "nilcheck", fn: nilcheckelim},  // nil 체크 제거
}
```

실제 최적화 예시:

```go
// 최적화 전
for i := 0; i < len(slice); i++ {
    _ = slice[i]  // 경계 체크 수행
}

// 최적화 후 (경계 체크 제거)
for i := 0; i < len(slice); i++ {
    _ = slice[i]  // 경계 체크 생략
}
```

### 5단계: 기계어 생성

```go
// cmd/compile/internal/amd64/ssa.go
// SSA를 x86-64 어셈블리로 변환

// Go 코드
func add(a, b int) int {
    return a + b
}

// 생성된 어셈블리 (간략화)
TEXT ·add(SB), NOSPLIT, $0-24
    MOVQ a+0(FP), AX    // a를 AX 레지스터로
    MOVQ b+8(FP), BX    // b를 BX 레지스터로
    ADDQ BX, AX         // AX = AX + BX
    MOVQ AX, ret+16(FP) // 결과 반환
    RET
```

## 🎯 Chapter 2: 런타임 시스템 심화

### 스케줄러 내부 구현

```go
// runtime/proc.go
// 핵심 스케줄링 로직

type g struct {  // 고루틴
    stack       stack
    stackguard0 uintptr
    m           *m       // 현재 실행 중인 M
    sched       gobuf    // 고루틴 컨텍스트
    atomicstatus atomic.Uint32
    goid         uint64
}

type m struct {  // OS 스레드
    g0       *g      // 스케줄링용 고루틴
    curg     *g      // 현재 실행 중인 고루틴
    p        puintptr // 연결된 P
    nextp    puintptr
    oldp     puintptr
}

type p struct {  // 논리 프로세서
    m           muintptr // 연결된 M
    runqhead    uint32   // 로컬 큐 헤드
    runqtail    uint32   // 로컬 큐 테일
    runq        [256]guintptr // 로컬 실행 큐
    runnext     guintptr // 다음 실행할 G
}
```

### 스케줄링 알고리즘 상세

```go
// runtime/proc.go - schedule() 함수 핵심 로직
func schedule() {
    mp := getm()
    pp := mp.p.ptr()
    
    // 1. STW(Stop The World)가 필요한지 확인
    if sched.gcwaiting.Load() {
        gcstopm()
        goto top
    }
    
    // 2. 안전 포인트 확인
    if pp.runSafePointFn != 0 {
        runSafePointFn()
    }
    
    // 3. 타이머 확인
    checkTimers(pp, 0)
    
    // 4. 고루틴 선택
    var gp *g
    var inheritTime bool
    
    // 4-1. 로컬 큐에서 가져오기 (대부분의 경우)
    if gp == nil {
        gp, inheritTime = runqget(pp)
    }
    
    // 4-2. 글로벌 큐에서 가져오기 (가끔)
    if gp == nil {
        gp, inheritTime = findrunnable()
    }
    
    // 5. 컨텍스트 스위칭
    execute(gp, inheritTime)
}
```

### Work Stealing 구현

```go
// runtime/proc.go
func stealWork(pp *p) (*g, bool) {
    enum := stealOrder.start(fastrand())
    
    for i := 0; i < int(gomaxprocs); i++ {
        p2 := allp[enum.position()]
        if pp == p2 {
            continue
        }
        
        // 다른 P의 로컬 큐에서 절반 훔치기
        if gp := runqsteal(pp, p2, true); gp != nil {
            return gp, true
        }
    }
    
    return nil, false
}

func runqsteal(pp, p2 *p, stealRunNextG bool) *g {
    t := pp.runqtail
    n := runqgrab(p2, &pp.runq, t, stealRunNextG)
    if n == 0 {
        return nil
    }
    
    gp := pp.runq[(t+n-1)%uint32(len(pp.runq))].ptr()
    pp.runqtail = t + n
    return gp
}
```

## 🗑️ Chapter 3: 가비지 컬렉터 내부

### Tricolor Concurrent Mark & Sweep

Go의 GC는 삼색 마킹 알고리즘을 사용합니다.

```go
// runtime/mgc.go
// GC 사이클

func gcStart(trigger gcTrigger) {
    // 1. STW (Stop The World)
    systemstack(stopTheWorldWithSem)
    
    // 2. 마킹 준비
    gcMarkRootPrepare()
    
    // 3. STW 해제, 동시 마킹 시작
    systemstack(func() {
        startTheWorldWithSem()
    })
    
    // 4. 동시 마킹
    gcMarkWorkers()
    
    // 5. 마킹 종료
    gcMarkTermination()
    
    // 6. 동시 스위핑
    gcSweep()
}
```

### Write Barrier 구현

```go
// runtime/mbarrier.go
// 쓰기 장벽으로 동시 GC 지원

//go:nosplit
func gcWriteBarrier(dst *uintptr, src uintptr) {
    if writeBarrier.enabled {
        if src != 0 && src < minPhysPageSize {
            systemstack(func() {
                throw("bad pointer write")
            })
        }
        
        // 이전 값을 그레이 리스트에 추가
        if *dst != 0 {
            shade(*dst)
        }
    }
    
    *dst = src
}
```

### 메모리 할당자

```go
// runtime/malloc.go
// TCMalloc 기반 메모리 할당

// 크기별 클래스 (span class)
var class_to_size = [numSpanClasses]uint16{
    0, 8, 16, 24, 32, 48, 64, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224,
    240, 256, 288, 320, 352, 384, 416, 448, 480, 512, 576, 640, 704, 768,
    // ... 67개 크기 클래스
}

func mallocgc(size uintptr, typ *_type, needzero bool) unsafe.Pointer {
    if size == 0 {
        return unsafe.Pointer(&zerobase)
    }
    
    mp := acquirem()
    c := getMCache(mp)
    
    var span *mspan
    var x unsafe.Pointer
    
    if size <= maxSmallSize {
        // 작은 객체: mcache에서 할당
        if noscan && size < maxTinySize {
            // tiny 할당 (< 16 bytes)
            x = c.tiny + offset
        } else {
            // small 할당 (16 bytes ~ 32KB)
            spc := makeSpanClass(sizeclass, noscan)
            span = c.alloc[spc]
            x = span.allocBits.allocate()
        }
    } else {
        // 큰 객체: mheap에서 직접 할당
        span = c.allocLarge(size, noscan)
        x = unsafe.Pointer(span.base())
    }
    
    return x
}
```

## 🔄 Chapter 4: 채널 구현

### 채널 자료구조

```go
// runtime/chan.go
type hchan struct {
    qcount   uint           // 큐에 있는 데이터 개수
    dataqsiz uint           // 순환 큐 크기
    buf      unsafe.Pointer // 데이터 버퍼
    elemsize uint16         // 요소 크기
    closed   uint32         // 닫힘 상태
    elemtype *_type         // 요소 타입
    sendx    uint           // 송신 인덱스
    recvx    uint           // 수신 인덱스
    recvq    waitq          // 수신 대기 고루틴
    sendq    waitq          // 송신 대기 고루틴
    lock     mutex          // 뮤텍스
}

type waitq struct {
    first *sudog
    last  *sudog
}
```

### 송신과 수신 구현

```go
// 채널 송신
func chansend(c *hchan, ep unsafe.Pointer, block bool) bool {
    lock(&c.lock)
    
    // 수신자가 대기 중이면 직접 전달
    if sg := c.recvq.dequeue(); sg != nil {
        send(c, sg, ep, func() { unlock(&c.lock) })
        return true
    }
    
    // 버퍼에 공간이 있으면 버퍼에 저장
    if c.qcount < c.dataqsiz {
        qp := chanbuf(c, c.sendx)
        typedmemmove(c.elemtype, qp, ep)
        c.sendx++
        if c.sendx == c.dataqsiz {
            c.sendx = 0
        }
        c.qcount++
        unlock(&c.lock)
        return true
    }
    
    // 블로킹 모드면 대기
    if block {
        gp := getg()
        mysg := acquireSudog()
        mysg.g = gp
        c.sendq.enqueue(mysg)
        gopark(chanparkcommit, unsafe.Pointer(&c.lock))
    }
    
    unlock(&c.lock)
    return false
}
```

## 💫 Chapter 5: 리플렉션 시스템

### 타입 정보 런타임 표현

```go
// runtime/type.go
type _type struct {
    size       uintptr
    ptrdata    uintptr
    hash       uint32
    tflag      tflag
    align      uint8
    fieldAlign uint8
    kind       uint8
    equal      func(unsafe.Pointer, unsafe.Pointer) bool
    gcdata     *byte
    str        nameOff
    ptrToThis  typeOff
}

// 인터페이스 런타임 표현
type iface struct {
    tab  *itab
    data unsafe.Pointer
}

type itab struct {
    inter *interfacetype
    _type *_type
    hash  uint32
    _     [4]byte
    fun   [1]uintptr // 메서드 테이블
}
```

### 동적 메서드 호출

```go
// reflect/value.go 간략화
func (v Value) Method(i int) Value {
    if v.typ == nil {
        panic("reflect: Method on zero Value")
    }
    
    // 메서드 테이블에서 함수 포인터 가져오기
    if v.flag&flagMethod != 0 {
        // 인터페이스 메서드
        tt := (*interfaceType)(unsafe.Pointer(v.typ))
        m := &tt.methods[i]
        return Value{m.typ, unsafe.Pointer(&m.tfn), v.flag}
    }
    
    // 구체 타입 메서드
    ms := v.typ.exportedMethods()
    m := ms[i]
    return Value{m.mtyp, unsafe.Pointer(&m.tfn), v.flag | flagMethod}
}
```

## 🚀 Chapter 6: 어셈블리 최적화

### SIMD 명령어 활용

```assembly
// bytes/bytes_amd64.s
// IndexByte의 AVX2 최적화 버전

TEXT ·indexByteAVX2(SB), NOSPLIT, $0-40
    MOVQ b_base+0(FP), SI   // 슬라이스 포인터
    MOVQ b_len+8(FP), BX    // 슬라이스 길이
    MOVB c+24(FP), AL       // 찾을 바이트
    
    // 32바이트씩 병렬 검색
    VPBROADCASTB AL, Y0     // 바이트를 YMM 레지스터에 복사
    
loop:
    CMPQ BX, $32
    JB tail
    
    VMOVDQU (SI), Y1        // 32바이트 로드
    VPCMPEQB Y0, Y1, Y2     // 병렬 비교
    VPMOVMSKB Y2, AX        // 결과 마스크
    
    TESTL AX, AX
    JNE found
    
    ADDQ $32, SI
    SUBQ $32, BX
    JMP loop
    
found:
    // 첫 번째 일치 위치 계산
    BSFL AX, AX
    ADDQ SI, AX
    SUBQ b_base+0(FP), AX
    MOVQ AX, ret+32(FP)
    RET
```

## 🎭 Chapter 7: 컴파일러 디렉티브

### 실용적인 디렉티브들

```go
//go:noinline
// 인라인 최적화 방지
func sensitiveOperation() {
    // 스택 추적에 나타나야 하는 함수
}

//go:nosplit
// 스택 분할 체크 생략 (빠르지만 위험)
func fastPath() {
    // 매우 작은 스택 사용
}

//go:linkname runtimeNano runtime.nanotime
// 내부 함수 접근
func runtimeNano() int64

//go:noescape
// 이스케이프 분석 무시
func unsafeOperation(p unsafe.Pointer)

//go:embed
// 파일 임베딩 (Go 1.16+)
var content string
```

## 💡 핵심 정리

### 컴파일러 최적화 활용

```bash
# 인라인 결정 확인
go build -gcflags="-m=2"

# 이스케이프 분석
go build -gcflags="-m"

# SSA 최적화 추적
go build -gcflags="-d=ssa/prove/debug=2"

# 어셈블리 출력
go build -gcflags="-S"
```

### 런타임 디버깅

```bash
# GC 추적
GODEBUG=gctrace=1 ./program

# 스케줄러 추적
GODEBUG=schedtrace=1000 ./program

# 메모리 할당 추적
GODEBUG=allocfreetrace=1 ./program
```

## 🎓 마무리

Go의 컴파일러와 런타임은 단순한 문법 뒤에 숨은 정교한 시스템입니다. 이러한 내부 동작을 이해하면 더 효율적이고 최적화된 Go 코드를 작성할 수 있습니다.

"Simplicity is the ultimate sophistication." - Leonardo da Vinci

---

*다음 문서에서는 에러 처리와 복구 전략을 다룹니다.*