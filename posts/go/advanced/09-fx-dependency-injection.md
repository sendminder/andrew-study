# Go fx 프레임워크 완벽 가이드

## 📌 fx란 무엇인가?

fx는 Uber에서 개발한 Go 언어용 의존성 주입(Dependency Injection) 프레임워크입니다. 복잡한 애플리케이션에서 컴포넌트 간의 의존성을 관리하고, 애플리케이션 생명주기를 효과적으로 제어할 수 있게 해줍니다.

### 왜 fx를 사용해야 하는가?

```go
// ❌ fx 없이 - 수동으로 모든 의존성 관리
func main() {
    // 데이터베이스 연결 생성
    db, err := sql.Open("mysql", "connection-string")
    if err != nil {
        log.Fatal(err)
    }
    
    // 리포지토리 생성 (db 의존)
    userRepo := NewUserRepository(db)
    
    // 서비스 생성 (리포지토리 의존)
    userService := NewUserService(userRepo)
    
    // 핸들러 생성 (서비스 의존)
    userHandler := NewUserHandler(userService)
    
    // 서버 설정
    server := NewServer(userHandler)
    
    // 시작...
    server.Start()
}

// ✅ fx 사용 - 자동 의존성 주입
func main() {
    fx.New(
        fx.Provide(
            NewDatabase,
            NewUserRepository,
            NewUserService,
            NewUserHandler,
            NewServer,
        ),
        fx.Invoke(func(*Server) {}),
    ).Run()
}
```

## 🚀 빠른 시작 (Quick Start)

### 1. 설치

```bash
go get go.uber.org/fx
```

### 2. fx의 핵심 메서드 이해하기 (New, Provide, Invoke, Run)

#### 🎯 가장 간단한 예제부터 시작

```go
package main

import (
    "fmt"
    "go.uber.org/fx"
)

// Step 1: 아무것도 하지 않는 가장 단순한 fx 앱
func Example1_EmptyApp() {
    // fx.New()는 새로운 fx 애플리케이션을 생성합니다
    app := fx.New()
    
    // Run()은 애플리케이션을 실행합니다
    // 아무것도 없으므로 바로 종료됩니다
    app.Run()
}

// Step 2: 간단한 함수 실행하기
func Example2_SimpleInvoke() {
    app := fx.New(
        // Invoke는 앱이 시작될 때 함수를 실행합니다
        fx.Invoke(func() {
            fmt.Println("Hello, fx!")
        }),
    )
    
    app.Run()
    // 출력: Hello, fx!
}

// Step 3: 의존성 제공하고 사용하기
func Example3_ProvideAndInvoke() {
    // 간단한 구조체
    type Message struct {
        Text string
    }
    
    // 생성자 함수
    NewMessage := func() *Message {
        return &Message{Text: "Hello from fx!"}
    }
    
    app := fx.New(
        // Provide는 의존성을 제공합니다
        fx.Provide(NewMessage),
        
        // Invoke는 제공된 의존성을 사용합니다
        fx.Invoke(func(msg *Message) {
            fmt.Println(msg.Text)
        }),
    )
    
    app.Run()
    // 출력: Hello from fx!
}
```

#### 📚 fx.New() 상세 설명

```go
// fx.New()는 Option 패턴을 사용합니다
// 여러 옵션을 받아 애플리케이션을 구성합니다

func DetailedNew() {
    app := fx.New(
        // Option 1: Provider 등록
        fx.Provide(
            NewDatabase,
            NewLogger,
            NewService,
        ),
        
        // Option 2: Invoker 등록
        fx.Invoke(
            StartServer,
            InitializeCache,
        ),
        
        // Option 3: 모듈 포함
        fx.Module("user", 
            fx.Provide(NewUserService),
        ),
        
        // Option 4: 로거 설정
        fx.WithLogger(CustomLogger),
        
        // Option 5: 에러 핸들러
        fx.ErrorHook(HandleError),
    )
    
    // New()가 하는 일:
    // 1. 의존성 그래프 구성
    // 2. 순환 의존성 검사
    // 3. 모든 Provider 검증
    // 4. 애플리케이션 객체 반환
}
```

#### 🔄 fx.Provide() 점진적 이해

```go
// Level 1: 단순 Provider
func Level1_SimpleProvider() {
    // 의존성이 없는 Provider
    NewConfig := func() *Config {
        return &Config{Port: 8080}
    }
    
    app := fx.New(
        fx.Provide(NewConfig),
        fx.Invoke(func(c *Config) {
            fmt.Printf("Port: %d\n", c.Port)
        }),
    )
    app.Run()
}

// Level 2: 의존성이 있는 Provider
func Level2_DependentProvider() {
    type Logger struct{}
    type Database struct {
        logger *Logger
    }
    
    NewLogger := func() *Logger {
        return &Logger{}
    }
    
    // Database는 Logger에 의존합니다
    NewDatabase := func(logger *Logger) *Database {
        return &Database{logger: logger}
    }
    
    app := fx.New(
        fx.Provide(
            NewLogger,    // 먼저 Logger 제공
            NewDatabase,  // Logger를 사용하는 Database 제공
        ),
        fx.Invoke(func(db *Database) {
            fmt.Println("Database created with logger!")
        }),
    )
    app.Run()
}

// ⚠️ 중요: Provider 순서는 상관없습니다!
func ProviderOrderDoesNotMatter() {
    type Config struct{ Port int }
    type Logger struct{ Level string }
    type Database struct {
        config *Config
        logger *Logger
    }
    type Service struct {
        db     *Database
        logger *Logger
        config *Config
    }
    
    NewConfig := func() *Config {
        return &Config{Port: 8080}
    }
    
    NewLogger := func() *Logger {
        return &Logger{Level: "info"}
    }
    
    NewDatabase := func(c *Config, l *Logger) *Database {
        return &Database{config: c, logger: l}
    }
    
    NewService := func(db *Database, l *Logger, c *Config) *Service {
        return &Service{db: db, logger: l, config: c}
    }
    
    // 이 모든 방법이 동일하게 작동합니다!
    
    // 방법 1: 의존성 순서대로
    app1 := fx.New(
        fx.Provide(
            NewConfig,   // 1. Config (의존성 없음)
            NewLogger,   // 2. Logger (의존성 없음)
            NewDatabase, // 3. Database (Config, Logger 필요)
            NewService,  // 4. Service (Database, Logger, Config 필요)
        ),
    )
    
    // 방법 2: 역순으로
    app2 := fx.New(
        fx.Provide(
            NewService,  // Service가 먼저 등록되어도
            NewDatabase, // fx가 자동으로 의존성을 파악합니다
            NewLogger,
            NewConfig,
        ),
    )
    
    // 방법 3: 무작위 순서
    app3 := fx.New(
        fx.Provide(
            NewDatabase,
            NewConfig,
            NewService,
            NewLogger,
        ),
    )
    
    // 모두 정상 작동합니다!
    // fx가 의존성 그래프를 분석해서
    // Config, Logger → Database → Service 순으로 생성합니다
}

// Level 3: 에러를 반환하는 Provider
func Level3_ErrorProvider() {
    // ✅ Provider는 에러를 반환할 수 있습니다!
    NewConfig := func() (*Config, error) {
        // 설정 파일 읽기 실패 시나리오
        if _, err := os.ReadFile("config.json"); err != nil {
            return nil, fmt.Errorf("config 파일 읽기 실패: %w", err)
        }
        return &Config{Host: "localhost"}, nil
    }
    
    NewDatabase := func(config *Config) (*Database, error) {
        // 데이터베이스 연결 실패 시나리오
        if config.Host == "" {
            return nil, errors.New("host is required")
        }
        
        // 실제 DB 연결 시도
        db, err := sql.Open("mysql", config.Host)
        if err != nil {
            return nil, fmt.Errorf("DB 연결 실패: %w", err)
        }
        
        // Ping 테스트
        if err := db.Ping(); err != nil {
            return nil, fmt.Errorf("DB ping 실패: %w", err)
        }
        
        return &Database{conn: db}, nil
    }
    
    app := fx.New(
        fx.Provide(
            NewConfig,   // 에러를 반환할 수 있음
            NewDatabase, // 에러를 반환할 수 있음
        ),
        fx.Invoke(func(db *Database) {
            fmt.Println("DB 연결 성공!")
        }),
    )
    
    // Provider에서 에러가 발생하면 app.Run()이 실패합니다
    if err := app.Run(); err != nil {
        log.Fatal("앱 시작 실패:", err)
        // 출력 예시:
        // 앱 시작 실패: fx.Provide(main.NewConfig()) failed: config 파일 읽기 실패: open config.json: no such file or directory
    }
}

// 에러 처리의 다양한 패턴
func ErrorHandlingPatterns() {
    // 패턴 1: 단순 에러 반환
    NewSimple := func() (*Service, error) {
        return nil, errors.New("simple error")
    }
    
    // 패턴 2: 조건부 에러
    NewConditional := func(config *Config) (*Database, error) {
        if config.Port < 1024 {
            return nil, errors.New("port must be >= 1024")
        }
        return &Database{}, nil
    }
    
    // 패턴 3: 외부 리소스 에러
    NewExternal := func() (*RedisClient, error) {
        client, err := redis.Connect("localhost:6379")
        if err != nil {
            return nil, fmt.Errorf("Redis 연결 실패: %w", err)
        }
        return &RedisClient{client: client}, nil
    }
    
    // 패턴 4: 여러 값과 에러
    NewMultiple := func() (*UserRepo, *PostRepo, error) {
        db, err := connectDB()
        if err != nil {
            return nil, nil, fmt.Errorf("DB 연결 실패: %w", err)
        }
        return &UserRepo{db}, &PostRepo{db}, nil
    }
}

// Level 4: 여러 값을 반환하는 Provider
func Level4_MultiReturnProvider() {
    // 한 번에 여러 의존성 제공
    NewRepositories := func(db *Database) (*UserRepo, *PostRepo, error) {
        if db == nil {
            return nil, nil, errors.New("database is nil")
        }
        return &UserRepo{db}, &PostRepo{db}, nil
    }
    
    app := fx.New(
        fx.Provide(
            NewDatabase,
            NewRepositories, // 2개의 리포지토리를 한번에 제공
        ),
        fx.Invoke(func(users *UserRepo, posts *PostRepo) {
            fmt.Println("Both repositories ready!")
        }),
    )
    app.Run()
}
```

#### 🎬 fx.Invoke() 완벽 이해

```go
// Invoke는 애플리케이션이 시작될 때 함수를 실행합니다
// 주로 초기화 작업이나 서버 시작에 사용됩니다

// Level 1: 단순 실행
func InvokeLevel1() {
    app := fx.New(
        fx.Invoke(func() {
            fmt.Println("앱이 시작되었습니다!")
        }),
    )
    app.Run()
}

// Level 2: 의존성 주입받아 실행
func InvokeLevel2() {
    app := fx.New(
        fx.Provide(NewLogger, NewDatabase),
        fx.Invoke(func(logger *Logger, db *Database) {
            logger.Info("Database connected")
            // 초기화 로직
        }),
    )
    app.Run()
}

// Level 3: 여러 Invoke (순서대로 실행)
func InvokeLevel3() {
    app := fx.New(
        fx.Provide(NewDatabase),
        
        // Invoke는 등록된 순서대로 실행됩니다
        fx.Invoke(func(db *Database) {
            fmt.Println("1. 데이터베이스 마이그레이션")
        }),
        fx.Invoke(func(db *Database) {
            fmt.Println("2. 초기 데이터 생성")
        }),
        fx.Invoke(func(db *Database) {
            fmt.Println("3. 인덱스 생성")
        }),
    )
    app.Run()
    // 출력:
    // 1. 데이터베이스 마이그레이션
    // 2. 초기 데이터 생성
    // 3. 인덱스 생성
}

// Level 4: 에러 처리
func InvokeLevel4() {
    app := fx.New(
        fx.Provide(NewDatabase),
        fx.Invoke(func(db *Database) error {
            if err := db.Ping(); err != nil {
                return fmt.Errorf("database ping failed: %w", err)
            }
            fmt.Println("Database is healthy")
            return nil
        }),
    )
    
    // Invoke에서 에러가 발생하면 앱이 시작되지 않습니다
    if err := app.Start(context.Background()); err != nil {
        log.Fatal("Failed to start:", err)
    }
}
```

#### 🚀 Run() vs Start() vs Stop()

```go
// Run()의 이해
func UnderstandingRun() {
    // Run()은 다음 작업을 수행합니다:
    // 1. Start() 호출
    // 2. 시그널 대기 (SIGTERM, SIGINT)
    // 3. Stop() 호출
    
    app := fx.New(
        fx.Invoke(func(lc fx.Lifecycle) {
            lc.Append(fx.Hook{
                OnStart: func(ctx context.Context) error {
                    fmt.Println("앱 시작!")
                    return nil
                },
                OnStop: func(ctx context.Context) error {
                    fmt.Println("앱 종료!")
                    return nil
                },
            })
        }),
    )
    
    // Run()은 블로킹 호출입니다
    // Ctrl+C를 누르면 정상 종료됩니다
    app.Run()
}

// Start()와 Stop()을 직접 제어
func ManualControl() {
    app := fx.New(
        fx.Provide(NewServer),
        fx.Invoke(func(*Server) {}),
    )
    
    // 수동으로 시작
    ctx := context.Background()
    if err := app.Start(ctx); err != nil {
        log.Fatal(err)
    }
    
    // 어떤 작업 수행...
    time.Sleep(5 * time.Second)
    
    // 수동으로 종료
    if err := app.Stop(ctx); err != nil {
        log.Fatal(err)
    }
}

// 테스트에서 활용
func TestExample() {
    app := fx.New(
        fx.Provide(NewService),
    )
    
    // 테스트에서는 Run() 대신 Start/Stop 사용
    app.Start(context.Background())
    defer app.Stop(context.Background())
    
    // 테스트 로직...
}
```

#### 🔄 전체 흐름 이해하기

```go
// fx 애플리케이션의 전체 생명주기
func CompleteLifecycle() {
    fmt.Println("=== fx 애플리케이션 생명주기 ===")
    
    // 1. 생성 단계
    fmt.Println("1. fx.New() 호출")
    app := fx.New(
        // 2. Provider 등록 단계
        fx.Provide(func() *Config {
            fmt.Println("2. Config Provider 등록")
            return &Config{}
        }),
        
        fx.Provide(func(c *Config) *Database {
            fmt.Println("3. Database Provider 등록 (Config 의존)")
            return &Database{}
        }),
        
        // 3. Invoke 등록 단계
        fx.Invoke(func(db *Database) {
            fmt.Println("6. Invoke 함수 실행")
        }),
        
        // 4. Lifecycle Hook 등록
        fx.Invoke(func(lc fx.Lifecycle, db *Database) {
            lc.Append(fx.Hook{
                OnStart: func(ctx context.Context) error {
                    fmt.Println("7. OnStart Hook 실행")
                    return nil
                },
                OnStop: func(ctx context.Context) error {
                    fmt.Println("9. OnStop Hook 실행")
                    return nil
                },
            })
        }),
    )
    
    fmt.Println("4. 의존성 그래프 구성 완료")
    
    // 5. 실행 단계
    fmt.Println("5. app.Run() 호출")
    
    // 별도 고루틴에서 종료 시뮬레이션
    go func() {
        time.Sleep(2 * time.Second)
        fmt.Println("8. 종료 시그널 전송")
        app.Stop(context.Background())
    }()
    
    app.Run()
    
    fmt.Println("10. 애플리케이션 종료 완료")
}
```

### 3. 첫 번째 실전 fx 애플리케이션

```go
package main

import (
    "context"
    "fmt"
    "go.uber.org/fx"
    "go.uber.org/fx/fxevent"
    "go.uber.org/zap"
)

// 1단계: 구조체 정의
type Logger struct {
    *zap.Logger
}

type Database struct {
    logger *Logger
    dsn    string
}

type UserService struct {
    db     *Database
    logger *Logger
}

// 2단계: 생성자 함수 작성
func NewLogger() (*Logger, error) {
    zapLogger, err := zap.NewDevelopment()
    if err != nil {
        return nil, err
    }
    return &Logger{zapLogger}, nil
}

func NewDatabase(logger *Logger) *Database {
    logger.Info("데이터베이스 초기화")
    return &Database{
        logger: logger,
        dsn:    "localhost:3306/mydb",
    }
}

func NewUserService(db *Database, logger *Logger) *UserService {
    logger.Info("UserService 초기화")
    return &UserService{
        db:     db,
        logger: logger,
    }
}

// 3단계: 애플리케이션 시작
func main() {
    app := fx.New(
        // 의존성 제공
        fx.Provide(
            NewLogger,
            NewDatabase,
            NewUserService,
        ),
        
        // 애플리케이션 시작 시 실행
        fx.Invoke(func(service *UserService) {
            service.logger.Info("애플리케이션 시작됨!")
        }),
        
        // 로깅 설정
        fx.WithLogger(func(log *zap.Logger) fxevent.Logger {
            return &fxevent.ZapLogger{Logger: log}
        }),
    )
    
    app.Run()
}
```

## 🔧 핵심 개념

### 1. Provider (제공자)

Provider는 의존성을 생성하는 함수입니다.

```go
// 기본 Provider
func NewConfig() *Config {
    return &Config{
        Port: 8080,
        Host: "localhost",
    }
}

// 의존성이 있는 Provider
func NewServer(config *Config, logger *Logger) *Server {
    return &Server{
        config: config,
        logger: logger,
    }
}

// 에러를 반환하는 Provider
func NewDatabase(config *Config) (*Database, error) {
    db, err := sql.Open("mysql", config.DSN)
    if err != nil {
        return nil, err
    }
    return &Database{db: db}, nil
}

// 여러 값을 반환하는 Provider
func NewRepositories(db *Database) (*UserRepo, *PostRepo) {
    return &UserRepo{db: db}, &PostRepo{db: db}
}
```

### 2. Constructor (생성자)

fx에서 사용할 수 있는 다양한 생성자 패턴:

```go
// 1. 단순 생성자
type SimpleService struct{}

func NewSimpleService() *SimpleService {
    return &SimpleService{}
}

// 2. 의존성 주입 생성자
type ComplexService struct {
    db     *Database
    cache  *Cache
    logger *Logger
}

func NewComplexService(db *Database, cache *Cache, logger *Logger) *ComplexService {
    return &ComplexService{
        db:     db,
        cache:  cache,
        logger: logger,
    }
}

// 3. 옵션 패턴 사용
type ServiceOption func(*Service)

func WithTimeout(timeout time.Duration) ServiceOption {
    return func(s *Service) {
        s.timeout = timeout
    }
}

func NewServiceWithOptions(db *Database, opts ...ServiceOption) *Service {
    s := &Service{
        db:      db,
        timeout: 30 * time.Second,
    }
    
    for _, opt := range opts {
        opt(s)
    }
    
    return s
}
```

### 3. Invoke (실행)

애플리케이션 시작 시 실행할 함수를 지정합니다.

```go
func main() {
    app := fx.New(
        fx.Provide(
            NewDatabase,
            NewServer,
        ),
        
        // 단일 Invoke
        fx.Invoke(StartServer),
        
        // 여러 Invoke (순서대로 실행)
        fx.Invoke(
            MigrateDatabase,
            SeedData,
            StartServer,
        ),
    )
    
    app.Run()
}

func MigrateDatabase(db *Database) error {
    fmt.Println("데이터베이스 마이그레이션 실행")
    // 마이그레이션 로직
    return nil
}

func SeedData(db *Database) error {
    fmt.Println("초기 데이터 생성")
    // 시드 데이터 로직
    return nil
}

func StartServer(server *Server) {
    fmt.Println("서버 시작")
    // 서버는 fx 생명주기에 의해 관리됩니다
}
```

### 4. Lifecycle (생명주기) 관리

fx는 애플리케이션의 시작과 종료를 관리합니다.

```go
type HTTPServer struct {
    server *http.Server
    logger *Logger
}

func NewHTTPServer(lc fx.Lifecycle, logger *Logger) *HTTPServer {
    srv := &http.Server{
        Addr: ":8080",
    }
    
    s := &HTTPServer{
        server: srv,
        logger: logger,
    }
    
    // Lifecycle Hook 등록
    lc.Append(fx.Hook{
        OnStart: func(ctx context.Context) error {
            logger.Info("HTTP 서버 시작 중...")
            go func() {
                if err := srv.ListenAndServe(); err != http.ErrServerClosed {
                    logger.Error("서버 시작 실패", zap.Error(err))
                }
            }()
            return nil
        },
        OnStop: func(ctx context.Context) error {
            logger.Info("HTTP 서버 종료 중...")
            return srv.Shutdown(ctx)
        },
    })
    
    return s
}

// 데이터베이스 연결 관리 예제
func NewDatabaseConnection(lc fx.Lifecycle, config *Config) (*sql.DB, error) {
    db, err := sql.Open("mysql", config.DSN)
    if err != nil {
        return nil, err
    }
    
    lc.Append(fx.Hook{
        OnStart: func(ctx context.Context) error {
            // 연결 테스트
            return db.PingContext(ctx)
        },
        OnStop: func(ctx context.Context) error {
            // 연결 종료
            return db.Close()
        },
    })
    
    return db, nil
}
```

## 📦 모듈 시스템

fx의 모듈 시스템을 사용하면 관련 컴포넌트를 그룹화할 수 있습니다.

```go
// user 모듈
var UserModule = fx.Module("user",
    fx.Provide(
        NewUserRepository,
        NewUserService,
        NewUserHandler,
    ),
)

// auth 모듈
var AuthModule = fx.Module("auth",
    fx.Provide(
        NewAuthService,
        NewJWTManager,
        NewAuthMiddleware,
    ),
)

// database 모듈
var DatabaseModule = fx.Module("database",
    fx.Provide(
        NewDatabaseConfig,
        NewDatabaseConnection,
    ),
)

// 메인 애플리케이션에서 모듈 사용
func main() {
    app := fx.New(
        // 모듈 포함
        UserModule,
        AuthModule,
        DatabaseModule,
        
        // 추가 Provider
        fx.Provide(NewHTTPServer),
        
        // 시작 로직
        fx.Invoke(func(*HTTPServer) {
            fmt.Println("모든 모듈 로드 완료!")
        }),
    )
    
    app.Run()
}
```

## 🏷️ 파라미터 객체와 결과 객체

복잡한 의존성을 관리하기 위한 패턴입니다.

```go
// 파라미터 객체 (fx.In 임베딩)
type ServerParams struct {
    fx.In
    
    Config   *Config
    Logger   *Logger
    Database *Database
    
    // 선택적 의존성
    Cache *Cache `optional:"true"`
}

func NewServerWithParams(params ServerParams) *Server {
    server := &Server{
        config: params.Config,
        logger: params.Logger,
        db:     params.Database,
    }
    
    // 선택적 의존성 처리
    if params.Cache != nil {
        server.cache = params.Cache
    }
    
    return server
}

// 결과 객체 (fx.Out 임베딩)
type RepositoryResult struct {
    fx.Out
    
    UserRepo *UserRepository
    PostRepo *PostRepository
    
    // 이름으로 구분
    AdminRepo *AdminRepository `name:"admin"`
}

func NewRepositories(db *Database) RepositoryResult {
    return RepositoryResult{
        UserRepo:  &UserRepository{db: db},
        PostRepo:  &PostRepository{db: db},
        AdminRepo: &AdminRepository{db: db},
    }
}
```

## 🔀 이름 있는 의존성 (Named Dependencies)

같은 타입의 여러 인스턴스를 구분하기 위해 이름을 사용합니다.

```go
// 이름 있는 Provider
func NewPrimaryDatabase() (*Database, error) {
    return connectDB("primary-db-url")
}

func NewReplicaDatabase() (*Database, error) {
    return connectDB("replica-db-url")
}

// fx 설정
app := fx.New(
    fx.Provide(
        fx.Annotate(
            NewPrimaryDatabase,
            fx.ResultTags(`name:"primary"`),
        ),
        fx.Annotate(
            NewReplicaDatabase,
            fx.ResultTags(`name:"replica"`),
        ),
    ),
    fx.Invoke(func(params struct {
        fx.In
        Primary *Database `name:"primary"`
        Replica *Database `name:"replica"`
    }) {
        fmt.Println("Primary DB:", params.Primary)
        fmt.Println("Replica DB:", params.Replica)
    }),
)
```

## 🎯 고급 패턴

### 1. 데코레이터 패턴

```go
// 로깅 데코레이터
func LoggingDecorator(base Service, logger *Logger) Service {
    return &loggingService{
        base:   base,
        logger: logger,
    }
}

// fx 설정
fx.Provide(
    NewBaseService,
    fx.Annotate(
        LoggingDecorator,
        fx.ParamTags(``, `name:"logger"`),
    ),
)
```

### 2. 값 그룹 (Value Groups)

```go
// 핸들러 등록
type Route struct {
    Pattern string
    Handler http.HandlerFunc
}

// 여러 핸들러 제공
func NewUserRoutes() []Route {
    return []Route{
        {"/users", ListUsers},
        {"/users/{id}", GetUser},
    }
}

func NewPostRoutes() []Route {
    return []Route{
        {"/posts", ListPosts},
        {"/posts/{id}", GetPost},
    }
}

// fx 설정
app := fx.New(
    fx.Provide(
        fx.Annotate(
            NewUserRoutes,
            fx.ResultTags(`group:"routes"`),
        ),
        fx.Annotate(
            NewPostRoutes,
            fx.ResultTags(`group:"routes"`),
        ),
    ),
    fx.Invoke(func(params struct {
        fx.In
        Routes []Route `group:"routes"`
    }) {
        for _, route := range params.Routes {
            fmt.Printf("Route registered: %s\n", route.Pattern)
        }
    }),
)
```

### 3. 조건부 Provider

```go
func NewProvider(config *Config) fx.Option {
    if config.UseRedis {
        return fx.Provide(NewRedisCache)
    }
    return fx.Provide(NewMemoryCache)
}

// 사용
app := fx.New(
    fx.Provide(NewConfig),
    fx.Invoke(func(c *Config) fx.Option {
        return NewProvider(c)
    }),
)
```

## 🌟 실전 예제: REST API 서버

완전한 REST API 서버 구현 예제입니다.

```go
package main

import (
    "context"
    "encoding/json"
    "net/http"
    "time"
    
    "github.com/gorilla/mux"
    "go.uber.org/fx"
    "go.uber.org/zap"
)

// Domain 모델
type User struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"created_at"`
}

// Repository 계층
type UserRepository interface {
    FindAll(ctx context.Context) ([]User, error)
    FindByID(ctx context.Context, id string) (*User, error)
    Create(ctx context.Context, user *User) error
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id string) error
}

type userRepository struct {
    db     *Database
    logger *zap.Logger
}

func NewUserRepository(db *Database, logger *zap.Logger) UserRepository {
    return &userRepository{
        db:     db,
        logger: logger,
    }
}

func (r *userRepository) FindAll(ctx context.Context) ([]User, error) {
    r.logger.Info("Finding all users")
    // 실제 DB 쿼리 로직
    return []User{
        {ID: "1", Name: "John", Email: "john@example.com"},
        {ID: "2", Name: "Jane", Email: "jane@example.com"},
    }, nil
}

func (r *userRepository) FindByID(ctx context.Context, id string) (*User, error) {
    r.logger.Info("Finding user by ID", zap.String("id", id))
    // 실제 DB 쿼리 로직
    return &User{ID: id, Name: "John", Email: "john@example.com"}, nil
}

func (r *userRepository) Create(ctx context.Context, user *User) error {
    r.logger.Info("Creating user", zap.Any("user", user))
    // 실제 DB 삽입 로직
    return nil
}

func (r *userRepository) Update(ctx context.Context, user *User) error {
    r.logger.Info("Updating user", zap.Any("user", user))
    // 실제 DB 업데이트 로직
    return nil
}

func (r *userRepository) Delete(ctx context.Context, id string) error {
    r.logger.Info("Deleting user", zap.String("id", id))
    // 실제 DB 삭제 로직
    return nil
}

// Service 계층
type UserService interface {
    GetAllUsers(ctx context.Context) ([]User, error)
    GetUserByID(ctx context.Context, id string) (*User, error)
    CreateUser(ctx context.Context, user *User) error
}

type userService struct {
    repo   UserRepository
    logger *zap.Logger
}

func NewUserService(repo UserRepository, logger *zap.Logger) UserService {
    return &userService{
        repo:   repo,
        logger: logger,
    }
}

func (s *userService) GetAllUsers(ctx context.Context) ([]User, error) {
    s.logger.Info("Service: Getting all users")
    return s.repo.FindAll(ctx)
}

func (s *userService) GetUserByID(ctx context.Context, id string) (*User, error) {
    s.logger.Info("Service: Getting user by ID", zap.String("id", id))
    return s.repo.FindByID(ctx, id)
}

func (s *userService) CreateUser(ctx context.Context, user *User) error {
    s.logger.Info("Service: Creating user")
    user.CreatedAt = time.Now()
    return s.repo.Create(ctx, user)
}

// Handler 계층
type UserHandler struct {
    service UserService
    logger  *zap.Logger
}

func NewUserHandler(service UserService, logger *zap.Logger) *UserHandler {
    return &UserHandler{
        service: service,
        logger:  logger,
    }
}

func (h *UserHandler) GetAllUsers(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    users, err := h.service.GetAllUsers(ctx)
    if err != nil {
        h.logger.Error("Failed to get users", zap.Error(err))
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(users)
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    vars := mux.Vars(r)
    id := vars["id"]
    
    user, err := h.service.GetUserByID(ctx, id)
    if err != nil {
        h.logger.Error("Failed to get user", zap.Error(err))
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    var user User
    
    if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
        h.logger.Error("Failed to decode user", zap.Error(err))
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    if err := h.service.CreateUser(ctx, &user); err != nil {
        h.logger.Error("Failed to create user", zap.Error(err))
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(user)
}

// Router 설정
func NewRouter(handler *UserHandler) *mux.Router {
    r := mux.NewRouter()
    
    r.HandleFunc("/users", handler.GetAllUsers).Methods("GET")
    r.HandleFunc("/users/{id}", handler.GetUser).Methods("GET")
    r.HandleFunc("/users", handler.CreateUser).Methods("POST")
    
    return r
}

// HTTP 서버
type HTTPServer struct {
    server *http.Server
    logger *zap.Logger
}

func NewHTTPServer(lc fx.Lifecycle, router *mux.Router, logger *zap.Logger) *HTTPServer {
    srv := &http.Server{
        Addr:    ":8080",
        Handler: router,
    }
    
    httpServer := &HTTPServer{
        server: srv,
        logger: logger,
    }
    
    lc.Append(fx.Hook{
        OnStart: func(ctx context.Context) error {
            logger.Info("Starting HTTP server on :8080")
            go func() {
                if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
                    logger.Fatal("Failed to start server", zap.Error(err))
                }
            }()
            return nil
        },
        OnStop: func(ctx context.Context) error {
            logger.Info("Stopping HTTP server")
            return srv.Shutdown(ctx)
        },
    })
    
    return httpServer
}

// 데이터베이스 (더미 구현)
type Database struct {
    logger *zap.Logger
}

func NewDatabase(lc fx.Lifecycle, logger *zap.Logger) *Database {
    db := &Database{logger: logger}
    
    lc.Append(fx.Hook{
        OnStart: func(ctx context.Context) error {
            logger.Info("Connecting to database")
            // 실제 DB 연결 로직
            return nil
        },
        OnStop: func(ctx context.Context) error {
            logger.Info("Disconnecting from database")
            // 실제 DB 연결 종료 로직
            return nil
        },
    })
    
    return db
}

// 로거 설정
func NewLogger() (*zap.Logger, error) {
    return zap.NewDevelopment()
}

// 모듈 정의
var CoreModule = fx.Module("core",
    fx.Provide(
        NewLogger,
        NewDatabase,
    ),
)

var UserModule = fx.Module("user",
    fx.Provide(
        NewUserRepository,
        NewUserService,
        NewUserHandler,
    ),
)

var HTTPModule = fx.Module("http",
    fx.Provide(
        NewRouter,
        NewHTTPServer,
    ),
)

// 메인 함수
func main() {
    app := fx.New(
        // 모듈 등록
        CoreModule,
        UserModule,
        HTTPModule,
        
        // 앱 시작
        fx.Invoke(func(*HTTPServer) {}),
    )
    
    app.Run()
}
```

## 🧪 테스트

### fxtest란?

`fxtest`는 fx 애플리케이션을 테스트하기 위한 전용 패키지입니다. 실제 애플리케이션과 동일한 의존성 주입 메커니즘을 사용하면서도 테스트 환경에 최적화된 기능들을 제공합니다.

#### fxtest의 주요 특징

1. **테스트 실패 통합**: 테스트 프레임워크와 자동 통합되어 fx 에러가 테스트 실패로 연결됩니다
2. **자동 정리**: 테스트 종료 시 자동으로 리소스를 정리합니다
3. **동기 실행**: 비동기 작업을 동기적으로 처리하여 테스트를 단순화합니다
4. **격리된 환경**: 각 테스트는 독립된 fx 컨테이너에서 실행됩니다

### fxtest 기본 사용법

```go
package main

import (
    "context"
    "testing"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "go.uber.org/fx"
    "go.uber.org/fx/fxtest"
    "go.uber.org/zap"
)

// 1. 기본 fxtest 사용
func TestBasicFxTest(t *testing.T) {
    // fxtest.New는 fx.New와 동일하지만 테스트에 최적화됨
    app := fxtest.New(
        t, // testing.T를 첫 번째 인자로 전달
        fx.Provide(
            NewLogger,
            NewDatabase,
            NewUserService,
        ),
    )
    
    // 앱 시작과 종료를 자동으로 처리
    defer app.RequireStart().RequireStop()
    
    // 테스트 로직
}

// 2. fx.Populate를 사용한 의존성 추출
func TestWithPopulate(t *testing.T) {
    var (
        db      *Database
        service UserService
        logger  *zap.Logger
    )
    
    app := fxtest.New(
        t,
        fx.Provide(
            NewLogger,
            NewDatabase,
            NewUserRepository,
            NewUserService,
        ),
        // Populate를 사용하여 특정 의존성을 변수에 할당
        fx.Populate(&db, &service, &logger),
    )
    
    app.RequireStart()
    defer app.RequireStop()
    
    // 추출된 의존성 사용
    assert.NotNil(t, db)
    assert.NotNil(t, service)
    assert.NotNil(t, logger)
    
    // 서비스 테스트
    users, err := service.GetAllUsers(context.Background())
    assert.NoError(t, err)
}

// 3. 테스트용 Provider 교체
func TestWithMockProvider(t *testing.T) {
    // 테스트용 Mock Provider
    mockDBProvider := func() *Database {
        return &Database{
            // 테스트용 설정
            connectionString: "test-db",
        }
    }
    
    app := fxtest.New(
        t,
        fx.Provide(
            NewLogger,
            mockDBProvider, // 실제 DB 대신 Mock DB 사용
            NewUserRepository,
            NewUserService,
        ),
    )
    
    defer app.RequireStart().RequireStop()
}
```

### Mock 객체와 함께 사용하기

```go
// Mock 인터페이스 정의
type MockUserRepository struct {
    mock.Mock
}

func (m *MockUserRepository) FindAll(ctx context.Context) ([]User, error) {
    args := m.Called(ctx)
    return args.Get(0).([]User), args.Error(1)
}

func (m *MockUserRepository) FindByID(ctx context.Context, id string) (*User, error) {
    args := m.Called(ctx, id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*User), args.Error(1)
}

// Mock을 사용한 단위 테스트
func TestUserServiceWithMock(t *testing.T) {
    // 1. 직접 Mock 생성 (fx 없이)
    mockRepo := new(MockUserRepository)
    logger, _ := zap.NewDevelopment()
    
    service := NewUserService(mockRepo, logger)
    
    // Mock 동작 설정
    expectedUsers := []User{
        {ID: "1", Name: "Test User"},
    }
    mockRepo.On("FindAll", mock.Anything).Return(expectedUsers, nil)
    
    // 테스트 실행
    users, err := service.GetAllUsers(context.Background())
    
    // 검증
    assert.NoError(t, err)
    assert.Equal(t, expectedUsers, users)
    mockRepo.AssertExpectations(t)
}

// fxtest와 Mock을 함께 사용
func TestWithFxTestAndMock(t *testing.T) {
    mockRepo := new(MockUserRepository)
    
    var service UserService
    
    app := fxtest.New(
        t,
        fx.Provide(
            NewLogger,
            // Mock을 Provider로 제공
            func() UserRepository { return mockRepo },
            NewUserService,
        ),
        fx.Populate(&service),
    )
    
    // Mock 설정
    mockRepo.On("FindByID", mock.Anything, "123").
        Return(&User{ID: "123", Name: "Test"}, nil)
    
    app.RequireStart()
    defer app.RequireStop()
    
    // 테스트
    user, err := service.GetUserByID(context.Background(), "123")
    assert.NoError(t, err)
    assert.Equal(t, "123", user.ID)
    mockRepo.AssertExpectations(t)
}
```

### 통합 테스트

```go
// 전체 애플리케이션 통합 테스트
func TestFullAppIntegration(t *testing.T) {
    var (
        server  *HTTPServer
        handler *UserHandler
        service UserService
    )
    
    app := fxtest.New(
        t,
        // 실제 모듈 사용
        CoreModule,
        UserModule,
        HTTPModule,
        
        // 테스트를 위한 의존성 추출
        fx.Populate(&server, &handler, &service),
    )
    
    // 앱 시작
    app.RequireStart()
    defer app.RequireStop()
    
    // HTTP 요청 테스트
    req := httptest.NewRequest("GET", "/users", nil)
    rec := httptest.NewRecorder()
    
    handler.GetAllUsers(rec, req)
    
    assert.Equal(t, http.StatusOK, rec.Code)
    
    var users []User
    json.Unmarshal(rec.Body.Bytes(), &users)
    assert.NotEmpty(t, users)
}

// 모듈별 통합 테스트
func TestUserModuleIntegration(t *testing.T) {
    var service UserService
    
    app := fxtest.New(
        t,
        // 특정 모듈만 테스트
        fx.Provide(
            NewLogger,
            NewDatabase,
        ),
        UserModule, // 사용자 모듈 테스트
        fx.Populate(&service),
    )
    
    app.RequireStart()
    defer app.RequireStop()
    
    // 모듈 기능 테스트
    ctx := context.Background()
    users, err := service.GetAllUsers(ctx)
    
    assert.NoError(t, err)
    assert.NotNil(t, users)
}
```

### 생명주기 테스트

```go
// fx 생명주기 Hook 테스트
func TestLifecycleHooks(t *testing.T) {
    var (
        startCalled  bool
        stopCalled   bool
        startOrder   []string
        stopOrder    []string
    )
    
    app := fxtest.New(
        t,
        fx.Invoke(func(lc fx.Lifecycle) {
            // 첫 번째 Hook
            lc.Append(fx.Hook{
                OnStart: func(ctx context.Context) error {
                    startCalled = true
                    startOrder = append(startOrder, "first")
                    return nil
                },
                OnStop: func(ctx context.Context) error {
                    stopCalled = true
                    stopOrder = append(stopOrder, "first")
                    return nil
                },
            })
            
            // 두 번째 Hook
            lc.Append(fx.Hook{
                OnStart: func(ctx context.Context) error {
                    startOrder = append(startOrder, "second")
                    return nil
                },
                OnStop: func(ctx context.Context) error {
                    stopOrder = append(stopOrder, "second")
                    return nil
                },
            })
        }),
    )
    
    // 시작
    app.RequireStart()
    assert.True(t, startCalled)
    assert.Equal(t, []string{"first", "second"}, startOrder)
    
    // 종료 (역순으로 실행됨)
    app.RequireStop()
    assert.True(t, stopCalled)
    assert.Equal(t, []string{"second", "first"}, stopOrder)
}

// 생명주기 에러 처리 테스트
func TestLifecycleError(t *testing.T) {
    app := fxtest.New(
        t,
        fx.Invoke(func(lc fx.Lifecycle) {
            lc.Append(fx.Hook{
                OnStart: func(ctx context.Context) error {
                    return errors.New("start failed")
                },
            })
        }),
    )
    
    // RequireStart는 에러 발생 시 테스트를 실패시킴
    // 에러를 예상하는 경우 Start() 사용
    err := app.Start(context.Background())
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "start failed")
}
```

### 테스트 헬퍼 함수

```go
// 테스트용 헬퍼 함수들
type TestDependencies struct {
    DB      *Database
    Logger  *zap.Logger
    Service UserService
    Repo    UserRepository
}

// 테스트 의존성을 쉽게 설정하는 헬퍼
func SetupTestDependencies(t *testing.T, opts ...fx.Option) *TestDependencies {
    deps := &TestDependencies{}
    
    defaultOpts := []fx.Option{
        fx.Provide(
            NewLogger,
            NewDatabase,
            NewUserRepository,
            NewUserService,
        ),
        fx.Populate(
            &deps.DB,
            &deps.Logger,
            &deps.Service,
            &deps.Repo,
        ),
    }
    
    allOpts := append(defaultOpts, opts...)
    
    app := fxtest.New(t, allOpts...)
    app.RequireStart()
    t.Cleanup(func() {
        app.RequireStop()
    })
    
    return deps
}

// 사용 예
func TestWithHelper(t *testing.T) {
    deps := SetupTestDependencies(t)
    
    // 간단하게 의존성 사용
    users, err := deps.Service.GetAllUsers(context.Background())
    assert.NoError(t, err)
    assert.NotNil(t, users)
}

// 테스트 환경별 설정
func TestWithEnvironment(t *testing.T) {
    tests := []struct {
        name string
        env  string
        opts []fx.Option
    }{
        {
            name: "development",
            env:  "dev",
            opts: []fx.Option{
                fx.Provide(NewDevConfig),
            },
        },
        {
            name: "production",
            env:  "prod",
            opts: []fx.Option{
                fx.Provide(NewProdConfig),
            },
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            app := fxtest.New(
                t,
                append(tt.opts, 
                    fx.Provide(NewLogger, NewDatabase),
                )...,
            )
            
            app.RequireStart()
            app.RequireStop()
        })
    }
}
```

### 벤치마크 테스트

```go
// fx 애플리케이션 성능 벤치마크
func BenchmarkFxApp(b *testing.B) {
    for i := 0; i < b.N; i++ {
        app := fx.New(
            fx.Provide(
                NewLogger,
                NewDatabase,
                NewUserRepository,
                NewUserService,
            ),
            fx.Invoke(func(*UserService) {}),
        )
        
        ctx := context.Background()
        app.Start(ctx)
        app.Stop(ctx)
    }
}

// 의존성 주입 성능 테스트
func BenchmarkDependencyInjection(b *testing.B) {
    app := fxtest.New(
        b,
        fx.Provide(
            NewLogger,
            NewDatabase,
            NewUserRepository,
            NewUserService,
        ),
    )
    
    app.RequireStart()
    defer app.RequireStop()
    
    var service UserService
    fx.Populate(&service)(app)
    
    b.ResetTimer()
    
    for i := 0; i < b.N; i++ {
        service.GetAllUsers(context.Background())
    }
}
```

### 테스트 모범 사례

```go
// 1. 테스트용 모듈 생성
var TestModule = fx.Module("test",
    fx.Provide(
        NewTestLogger,    // 테스트용 로거
        NewTestDatabase,  // 인메모리 DB
        NewUserRepository,
        NewUserService,
    ),
)

// 2. 테스트 설정 구조체
type TestConfig struct {
    UseMock      bool
    LogLevel     string
    DBConnection string
}

func NewTestApp(t *testing.T, cfg TestConfig) *fxtest.App {
    opts := []fx.Option{}
    
    if cfg.UseMock {
        opts = append(opts, fx.Provide(NewMockRepository))
    } else {
        opts = append(opts, fx.Provide(NewUserRepository))
    }
    
    return fxtest.New(t, opts...)
}

// 3. 테이블 기반 테스트
func TestUserServiceScenarios(t *testing.T) {
    scenarios := []struct {
        name     string
        setup    func(*MockUserRepository)
        test     func(*testing.T, UserService)
        wantErr  bool
    }{
        {
            name: "successful user retrieval",
            setup: func(m *MockUserRepository) {
                m.On("FindAll", mock.Anything).
                    Return([]User{{ID: "1"}}, nil)
            },
            test: func(t *testing.T, s UserService) {
                users, err := s.GetAllUsers(context.Background())
                assert.NoError(t, err)
                assert.Len(t, users, 1)
            },
        },
        {
            name: "database error",
            setup: func(m *MockUserRepository) {
                m.On("FindAll", mock.Anything).
                    Return([]User{}, errors.New("db error"))
            },
            test: func(t *testing.T, s UserService) {
                _, err := s.GetAllUsers(context.Background())
                assert.Error(t, err)
            },
            wantErr: true,
        },
    }
    
    for _, sc := range scenarios {
        t.Run(sc.name, func(t *testing.T) {
            mockRepo := new(MockUserRepository)
            sc.setup(mockRepo)
            
            var service UserService
            
            app := fxtest.New(
                t,
                fx.Provide(
                    NewLogger,
                    func() UserRepository { return mockRepo },
                    NewUserService,
                ),
                fx.Populate(&service),
            )
            
            app.RequireStart()
            defer app.RequireStop()
            
            sc.test(t, service)
            mockRepo.AssertExpectations(t)
        })
    }
}
```

## 🐛 디버깅과 문제 해결

### 1. 의존성 그래프 시각화

```go
import "go.uber.org/fx/fxevent"

app := fx.New(
    // ... providers
    fx.WithLogger(func(log *zap.Logger) fxevent.Logger {
        return &fxevent.ZapLogger{Logger: log}
    }),
    // 의존성 그래프 출력
    fx.Invoke(func(dotGraph fx.DotGraph) {
        fmt.Println(dotGraph)
    }),
)
```

### 2. 일반적인 에러와 해결법

```go
// 에러 1: 순환 의존성
// ❌ 잘못된 예
func NewA(b *B) *A { return &A{b: b} }
func NewB(a *A) *B { return &B{a: a} }

// ✅ 해결: 인터페이스 사용
type AInterface interface { /* methods */ }
type BInterface interface { /* methods */ }

func NewA(b BInterface) *A { return &A{b: b} }
func NewB() *B { return &B{} }

// 에러 2: 누락된 의존성
// ❌ UserService가 필요하지만 제공되지 않음
fx.Provide(NewUserHandler) // UserService 의존

// ✅ 해결: 모든 의존성 제공
fx.Provide(
    NewUserRepository,
    NewUserService,
    NewUserHandler,
)

// 에러 3: 중복 타입
// ❌ 같은 타입의 여러 인스턴스
fx.Provide(
    NewPrimaryDB,  // *Database 반환
    NewReplicaDB,  // *Database 반환
)

// ✅ 해결: 이름 태깅
fx.Provide(
    fx.Annotate(NewPrimaryDB, fx.ResultTags(`name:"primary"`)),
    fx.Annotate(NewReplicaDB, fx.ResultTags(`name:"replica"`)),
)
```

## 🎓 베스트 프랙티스

### 1. 구조화된 프로젝트 레이아웃

```
myapp/
├── cmd/
│   └── server/
│       └── main.go          # fx 앱 진입점
├── internal/
│   ├── config/
│   │   └── config.go         # 설정 관리
│   ├── database/
│   │   └── database.go       # DB 연결
│   ├── repository/
│   │   └── user.go           # 리포지토리 계층
│   ├── service/
│   │   └── user.go           # 비즈니스 로직
│   ├── handler/
│   │   └── user.go           # HTTP 핸들러
│   └── module/
│       ├── core.go           # 핵심 모듈
│       ├── user.go           # 사용자 모듈
│       └── http.go           # HTTP 모듈
└── pkg/
    └── logger/
        └── logger.go         # 로깅 유틸리티
```

### 2. 모듈별 분리

```go
// internal/module/core.go
package module

import "go.uber.org/fx"

var Core = fx.Module("core",
    fx.Provide(
        config.New,
        logger.New,
        database.New,
    ),
)

// internal/module/user.go
var User = fx.Module("user",
    fx.Provide(
        repository.NewUserRepository,
        service.NewUserService,
        handler.NewUserHandler,
    ),
)

// cmd/server/main.go
func main() {
    fx.New(
        module.Core,
        module.User,
        module.HTTP,
        fx.Invoke(server.Start),
    ).Run()
}
```

### 3. 환경별 설정

```go
func NewApp(env string) *fx.App {
    options := []fx.Option{
        CoreModule,
        UserModule,
    }
    
    switch env {
    case "development":
        options = append(options, DevModule)
    case "production":
        options = append(options, ProdModule)
    case "test":
        options = append(options, TestModule)
    }
    
    return fx.New(options...)
}
```

## 📚 추가 리소스

- [공식 문서](https://uber-go.github.io/fx/)
- [GitHub 저장소](https://github.com/uber-go/fx)
- [예제 프로젝트](https://github.com/uber-go/fx/tree/master/examples)

## 💡 핵심 정리

1. **fx는 의존성 주입을 자동화**하여 복잡한 애플리케이션 구조를 단순화합니다
2. **Provider와 Invoke**가 핵심 개념입니다
3. **생명주기 관리**로 안전한 시작과 종료를 보장합니다
4. **모듈 시스템**으로 큰 애플리케이션을 관리 가능한 단위로 나눕니다
5. **테스트가 쉬워집니다** - 의존성을 쉽게 모킹할 수 있습니다

fx를 사용하면 Go 애플리케이션의 구조를 더 명확하고 유지보수하기 쉽게 만들 수 있습니다. 특히 마이크로서비스나 대규모 애플리케이션에서 그 진가를 발휘합니다.