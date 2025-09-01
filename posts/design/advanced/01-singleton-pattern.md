# Singleton Pattern: 오직 하나뿐인 인스턴스

## 왜 Singleton이 필요했을까?

### 하나면 충분한 것들

프로그램에서 어떤 객체는 딱 하나만 있어야 합니다.

```
실제 상황을 생각해보세요:
- 대통령: 한 나라에 한 명만
- 데이터베이스 연결 풀: 여러 개 만들면 자원 낭비
- 설정 관리자: 설정이 여러 개면 혼란
- 로거: 여러 로거가 같은 파일에 쓰면 충돌

문제 상황:
DB 연결을 매번 새로 만든다면?
- 연결 100개 → 메모리 폭발 💥
- 연결 제한 초과 → 서비스 장애
- 성능 저하 → 사용자 이탈
```

## Singleton의 핵심 개념

### 단 하나의 인스턴스 보장

```go
// Go 언어로 구현한 Singleton
package main

import (
    "sync"
    "fmt"
)

// Database 연결 관리자
type Database struct {
    connection string
}

var (
    instance *Database
    once     sync.Once  // 한 번만 실행 보장
)

// GetInstance는 항상 같은 인스턴스 반환
func GetInstance() *Database {
    once.Do(func() {
        fmt.Println("Creating single instance now.")
        instance = &Database{
            connection: "localhost:5432",
        }
    })
    return instance
}

// 사용 예시
func main() {
    db1 := GetInstance()
    db2 := GetInstance()
    
    // db1과 db2는 같은 인스턴스
    fmt.Printf("같은 인스턴스? %v\n", db1 == db2)  // true
}
```

## Singleton 구현 방법들

### 1. Eager Initialization (즉시 생성)

```go
// 프로그램 시작과 동시에 생성
var instance = &Database{
    connection: "localhost:5432",
}

func GetInstance() *Database {
    return instance
}

// 장점: 간단하고 스레드 안전
// 단점: 사용하지 않아도 메모리 차지
```

### 2. Lazy Initialization (지연 생성)

```go
// 처음 요청될 때 생성
var instance *Database
var mu sync.Mutex

func GetInstance() *Database {
    if instance == nil {
        mu.Lock()
        defer mu.Unlock()
        
        // Double-Check Locking
        if instance == nil {
            instance = &Database{
                connection: "localhost:5432",
            }
        }
    }
    return instance
}

// 장점: 필요할 때만 생성
// 단점: 복잡한 동기화 로직
```

### 3. sync.Once 사용 (Go 추천 방식)

```go
type singleton struct {
    data string
}

var (
    instance *singleton
    once     sync.Once
)

func GetInstance() *singleton {
    once.Do(func() {
        instance = &singleton{
            data: "initialized",
        }
    })
    return instance
}

// 장점: 간단하고 안전
// 단점: Go 특화 방식
```

## 실전 예제: 설정 관리자

```go
package config

import (
    "encoding/json"
    "os"
    "sync"
)

type Config struct {
    DatabaseURL string `json:"database_url"`
    RedisURL    string `json:"redis_url"`
    Port        int    `json:"port"`
    Debug       bool   `json:"debug"`
}

var (
    instance *Config
    once     sync.Once
)

func GetConfig() *Config {
    once.Do(func() {
        instance = loadConfig()
    })
    return instance
}

func loadConfig() *Config {
    file, err := os.Open("config.json")
    if err != nil {
        // 기본 설정 사용
        return &Config{
            DatabaseURL: "localhost:5432",
            RedisURL:    "localhost:6379",
            Port:        8080,
            Debug:       false,
        }
    }
    defer file.Close()
    
    config := &Config{}
    decoder := json.NewDecoder(file)
    decoder.Decode(config)
    
    return config
}

// 사용 예시
func main() {
    // 어디서든 같은 설정 객체 접근
    cfg := GetConfig()
    fmt.Printf("Database: %s\n", cfg.DatabaseURL)
    
    // 다른 패키지에서
    cfg2 := GetConfig()
    // cfg와 cfg2는 같은 인스턴스
}
```

## 실전 예제: 로거

```go
package logger

import (
    "fmt"
    "log"
    "os"
    "sync"
    "time"
)

type Logger struct {
    file *os.File
    log  *log.Logger
}

var (
    instance *Logger
    once     sync.Once
)

func GetLogger() *Logger {
    once.Do(func() {
        filename := fmt.Sprintf("app-%s.log", 
            time.Now().Format("2006-01-02"))
        
        file, err := os.OpenFile(filename, 
            os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
        if err != nil {
            panic(err)
        }
        
        instance = &Logger{
            file: file,
            log:  log.New(file, "", log.LstdFlags),
        }
    })
    return instance
}

func (l *Logger) Info(message string) {
    l.log.Printf("[INFO] %s\n", message)
}

func (l *Logger) Error(message string) {
    l.log.Printf("[ERROR] %s\n", message)
}

func (l *Logger) Close() {
    if l.file != nil {
        l.file.Close()
    }
}

// 사용 예시
func handleRequest() {
    logger := GetLogger()
    logger.Info("Request received")
    
    // 처리 로직...
    
    if err != nil {
        logger.Error(fmt.Sprintf("Error: %v", err))
    }
}
```

## 실전 예제: 데이터베이스 연결 풀

```go
package database

import (
    "database/sql"
    "sync"
    _ "github.com/lib/pq"
)

type DBPool struct {
    db *sql.DB
}

var (
    pool *DBPool
    once sync.Once
)

func GetDB() *DBPool {
    once.Do(func() {
        db, err := sql.Open("postgres", 
            "user=admin dbname=myapp sslmode=disable")
        if err != nil {
            panic(err)
        }
        
        // 연결 풀 설정
        db.SetMaxOpenConns(25)
        db.SetMaxIdleConns(5)
        db.SetConnMaxLifetime(5 * time.Minute)
        
        pool = &DBPool{db: db}
    })
    return pool
}

func (p *DBPool) Query(query string, args ...interface{}) (*sql.Rows, error) {
    return p.db.Query(query, args...)
}

func (p *DBPool) Exec(query string, args ...interface{}) (sql.Result, error) {
    return p.db.Exec(query, args...)
}

// 사용 예시
func getUserByID(id int) (*User, error) {
    db := GetDB()
    
    var user User
    err := db.QueryRow(
        "SELECT id, name, email FROM users WHERE id = $1", 
        id,
    ).Scan(&user.ID, &user.Name, &user.Email)
    
    return &user, err
}
```

## Singleton의 문제점과 해결책

### 1. 테스트 어려움

```go
// 문제: Singleton은 테스트하기 어려움
func processOrder(order Order) error {
    db := GetDB()  // 실제 DB 연결
    // 테스트할 때도 실제 DB 필요...
}

// 해결: 인터페이스 사용
type Database interface {
    Query(string, ...interface{}) (*sql.Rows, error)
}

func processOrder(db Database, order Order) error {
    // 테스트 시 Mock 객체 주입 가능
}
```

### 2. 전역 상태 문제

```go
// 문제: 전역 상태는 예측하기 어려움
config := GetConfig()
config.Debug = true  // 다른 곳에 영향

// 해결: 불변 객체 사용
type Config struct {
    debug bool  // private field
}

func (c *Config) IsDebug() bool {
    return c.debug  // 읽기만 가능
}
```

### 3. 의존성 숨김

```go
// 문제: 의존성이 숨겨짐
func sendEmail(to string) {
    logger := GetLogger()  // 숨겨진 의존성
    // ...
}

// 해결: 명시적 의존성 주입
func sendEmail(logger *Logger, to string) {
    // 의존성이 명확
}
```

## Singleton 사용 시 주의사항

### 언제 사용할까?

```
✅ 적합한 경우:
- 시스템 전체에서 단 하나만 필요한 자원
- 상태를 공유해야 하는 전역 객체
- 생성 비용이 큰 객체
- 하드웨어 인터페이스 접근

예시:
- 로거, 설정 관리자
- 데이터베이스 연결 풀
- 캐시, 레지스트리
- 디바이스 드라이버
```

### 언제 피해야 할까?

```
❌ 부적합한 경우:
- 단순히 전역 변수가 필요한 경우
- 테스트가 중요한 비즈니스 로직
- 확장 가능성이 있는 객체
- 다중 인스턴스가 필요할 수 있는 경우

대안:
- 의존성 주입 (DI)
- 팩토리 패턴
- 일반 클래스 + 수명 관리
```

## 다른 언어에서의 Singleton

### Java
```java
public class Singleton {
    private static final Singleton INSTANCE = new Singleton();
    
    private Singleton() {}
    
    public static Singleton getInstance() {
        return INSTANCE;
    }
}
```

### Python
```python
class Singleton:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
```

### JavaScript
```javascript
class Singleton {
    constructor() {
        if (Singleton.instance) {
            return Singleton.instance;
        }
        Singleton.instance = this;
    }
}
```

## 정리

Singleton 패턴은 "단 하나의 인스턴스"를 보장하는 강력한 패턴입니다.

마치 한 나라에 대통령이 한 명만 있듯이, 프로그램에서도 단 하나만 있어야 하는 객체들이 있습니다. Singleton은 이런 요구사항을 우아하게 해결합니다.

하지만 과도한 사용은 독이 될 수 있습니다. 테스트 어려움, 전역 상태 문제 등을 고려하여 신중하게 사용해야 합니다.

"하나로 충분한 것은 하나만 만들자" - 이것이 Singleton의 철학입니다.