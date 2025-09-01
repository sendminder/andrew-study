# Redis Pub/Sub과 Stream: 실시간 메시징 시스템 구축하기

## 왜 Redis에 메시징 기능이 필요했을까?

### 실시간 통신의 필요성

웹 애플리케이션이 발전하면서 실시간 기능이 필수가 되었습니다.

```
실시간 기능 예시:
- 채팅: 메시지 즉시 전달
- 알림: 실시간 푸시 알림
- 모니터링: 시스템 상태 실시간 업데이트
- 협업: 동시 편집, 실시간 동기화

기존 방식의 한계:
- Polling: 서버 부담, 지연 시간
- Long Polling: 연결 유지 비용
- 별도 메시지 브로커: 추가 인프라 필요

Redis의 해결책: 이미 있는 Redis로 해결하자!
```

## Pub/Sub: 발행-구독 패턴

### 기본 개념과 동작 원리

```
Pub/Sub 모델:

Publisher → Channel → Subscribers
   생산자     채널      구독자들

특징:
- Fire and Forget (발행 후 잊어버림)
- 구독자가 없어도 발행 가능
- 메시지 저장 안 함 (휘발성)
```

### Pub/Sub 사용하기

```bash
# Terminal 1 - 구독자
SUBSCRIBE news sports

# Terminal 2 - 또 다른 구독자  
SUBSCRIBE news

# Terminal 3 - 발행자
PUBLISH news "속보: Redis 7.0 출시!"
# 결과: 2 (2명의 구독자가 받음)

PUBLISH sports "손흥민 해트트릭!"
# 결과: 1 (1명의 구독자가 받음)
```

### Pattern Subscribe (패턴 구독)

```bash
# 패턴으로 여러 채널 구독
PSUBSCRIBE news:*
PSUBSCRIBE log:error:*

# 발행
PUBLISH news:sports "스포츠 뉴스"
PUBLISH news:tech "기술 뉴스"
PUBLISH log:error:db "데이터베이스 에러"
```

### 실제 구현 예제

```python
# Python 실시간 채팅 구현
import redis
import threading

r = redis.Redis(host='localhost', port=6379)

# 메시지 수신 스레드
def message_handler():
    pubsub = r.pubsub()
    pubsub.subscribe('chat:room:1')
    
    for message in pubsub.listen():
        if message['type'] == 'message':
            print(f"[{message['channel']}] {message['data']}")

# 메시지 발송
def send_message(username, text):
    message = f"{username}: {text}"
    r.publish('chat:room:1', message)

# 실행
thread = threading.Thread(target=message_handler)
thread.start()

send_message("Andrew", "안녕하세요!")
send_message("Kevin", "반갑습니다!")
```

### Pub/Sub의 한계

```
문제점:
1. 메시지 유실
   - 구독자가 오프라인이면 메시지 못 받음
   - 네트워크 끊기면 그동안 메시지 사라짐

2. 메시지 보장 없음
   - At-Most-Once만 지원
   - 전달 확인 불가

3. 메시지 저장 안 함
   - 과거 메시지 조회 불가
   - 재처리 불가능

이런 한계를 극복하기 위해 Redis Streams 등장!
```

## Redis Streams: 로그 구조의 메시지 스트림

### Streams의 핵심 개념

```
Stream 구조:

Stream: mystream
├─ Entry ID: 1526569495631-0
│  └─ Field: name, Value: Andrew
│  └─ Field: action, Value: login
├─ Entry ID: 1526569495632-0
│  └─ Field: name, Value: Kevin
│  └─ Field: action, Value: logout
└─ Entry ID: 1526569495633-0
   └─ Field: name, Value: Sarah
   └─ Field: action, Value: signup

특징:
✓ 메시지 영구 저장
✓ 순서 보장
✓ 여러 Consumer 지원
✓ 메시지 재처리 가능
```

### Stream 기본 사용법

```bash
# 메시지 추가 (Producer)
XADD mystream * name Andrew action login
# 반환: "1526569495631-0" (자동 생성된 ID)

XADD mystream * name Kevin action logout temp 36.5
# 여러 필드 가능

# ID 직접 지정
XADD mystream 1526569495631-1 name Sarah action signup

# 메시지 읽기 (Consumer)
XREAD STREAMS mystream 0
# 처음부터 모든 메시지 읽기

XREAD BLOCK 1000 STREAMS mystream $
# 새 메시지만 대기 (1초 타임아웃)
```

### Consumer Group: 작업 분산 처리

```bash
# Consumer Group 생성
XGROUP CREATE mystream mygroup 0

# Consumer가 메시지 읽기
XREADGROUP GROUP mygroup consumer1 COUNT 2 STREAMS mystream >
# consumer1이 2개 메시지 처리

XREADGROUP GROUP mygroup consumer2 COUNT 2 STREAMS mystream >
# consumer2가 다른 2개 메시지 처리

# 메시지 처리 확인 (ACK)
XACK mystream mygroup 1526569495631-0

# 처리 실패한 메시지 확인
XPENDING mystream mygroup
```

### Stream 실전 예제: 주문 처리 시스템

```python
import redis
import json
import time

r = redis.Redis(decode_responses=True)

# 1. 주문 생성 (Producer)
def create_order(user_id, items, amount):
    order_data = {
        'user_id': user_id,
        'items': json.dumps(items),
        'amount': amount,
        'status': 'pending',
        'timestamp': int(time.time())
    }
    
    # Stream에 주문 추가
    order_id = r.xadd('orders:stream', order_data)
    print(f"주문 생성: {order_id}")
    return order_id

# 2. 주문 처리 (Consumer Group)
def process_orders():
    # Consumer Group 생성 (이미 있으면 무시)
    try:
        r.xgroup_create('orders:stream', 'order_processors', '0')
    except:
        pass
    
    while True:
        # 새 주문 읽기
        messages = r.xreadgroup(
            'order_processors',
            'worker-1',
            {'orders:stream': '>'},
            count=1,
            block=1000
        )
        
        if messages:
            for stream_name, stream_messages in messages:
                for msg_id, data in stream_messages:
                    try:
                        # 주문 처리
                        process_single_order(msg_id, data)
                        
                        # 처리 완료 확인
                        r.xack('orders:stream', 'order_processors', msg_id)
                        print(f"주문 처리 완료: {msg_id}")
                    except Exception as e:
                        print(f"주문 처리 실패: {msg_id}, 에러: {e}")

def process_single_order(order_id, order_data):
    # 결제 처리
    print(f"결제 처리 중: {order_data['amount']}원")
    time.sleep(1)
    
    # 재고 확인
    items = json.loads(order_data['items'])
    print(f"재고 확인: {items}")
    
    # 배송 준비
    print(f"배송 준비: 사용자 {order_data['user_id']}")
```

### Stream 고급 기능

#### 1. Capped Stream (크기 제한)

```bash
# 최대 1000개 메시지만 유지
XADD mystream MAXLEN 1000 * field value

# 약 1000개 유지 (성능 최적화)
XADD mystream MAXLEN ~ 1000 * field value
```

#### 2. Range 조회

```bash
# 시간 범위로 조회
XRANGE mystream 1526569495631-0 1526569595631-0

# 최근 10개
XREVRANGE mystream + - COUNT 10

# 특정 시간 이후
XRANGE mystream (1526569495631-0 +
```

#### 3. 메시지 삭제

```bash
# 특정 메시지 삭제
XDEL mystream 1526569495631-0

# 오래된 메시지 정리
XTRIM mystream MAXLEN 1000
```

## Pub/Sub vs Streams 비교

```
┌──────────────┬─────────────────┬──────────────────┐
│   특징        │    Pub/Sub      │    Streams       │
├──────────────┼─────────────────┼──────────────────┤
│ 메시지 저장   │       X         │        O         │
│ 과거 조회     │       X         │        O         │
│ 소비자 그룹   │       X         │        O         │
│ 메시지 확인   │       X         │        O         │
│ 순서 보장     │       △         │        O         │
│ 성능          │    매우 빠름     │      빠름        │
│ 메모리 사용   │     최소        │    메시지 저장    │
└──────────────┴─────────────────┴──────────────────┘
```

## 실제 사용 사례

### 1. 실시간 알림 (Pub/Sub)
```python
# 실시간 알림 시스템
def send_notification(user_id, message):
    channel = f"notifications:{user_id}"
    r.publish(channel, json.dumps({
        'type': 'alert',
        'message': message,
        'timestamp': time.time()
    }))

# 클라이언트는 자신의 채널 구독
def listen_notifications(user_id):
    pubsub = r.pubsub()
    pubsub.subscribe(f"notifications:{user_id}")
    
    for message in pubsub.listen():
        if message['type'] == 'message':
            notification = json.loads(message['data'])
            show_alert(notification)
```

### 2. 로그 수집 (Streams)
```python
# 중앙 로그 수집
def log_event(service, level, message):
    r.xadd(f'logs:{service}', {
        'level': level,
        'message': message,
        'timestamp': time.time()
    }, maxlen=10000)  # 최근 10000개만 유지

# 로그 분석
def analyze_errors():
    # 에러 로그만 필터링
    logs = r.xrange('logs:api-server', '-', '+')
    errors = [log for log in logs if log[1]['level'] == 'ERROR']
    return errors
```

### 3. 이벤트 소싱 (Streams)
```python
# 모든 상태 변경을 이벤트로 저장
def save_event(aggregate_id, event_type, data):
    r.xadd(f'events:{aggregate_id}', {
        'type': event_type,
        'data': json.dumps(data),
        'version': get_next_version(aggregate_id)
    })

# 이벤트 재생으로 상태 복원
def rebuild_state(aggregate_id):
    events = r.xrange(f'events:{aggregate_id}', '-', '+')
    state = {}
    
    for event_id, event_data in events:
        apply_event(state, event_data['type'], 
                   json.loads(event_data['data']))
    
    return state
```

## 성능 고려사항

### Pub/Sub 최적화
```
팁:
- 채널 수 제한 (수천 개 이하)
- 메시지 크기 최소화
- 구독자 수 모니터링
- 패턴 구독 신중히 사용
```

### Streams 최적화
```
팁:
- MAXLEN으로 크기 제한
- ~ 옵션으로 근사 삭제
- Consumer Group 활용
- XPENDING 주기적 확인
```

## 정리

Redis의 메시징 기능은 두 가지 선택지를 제공합니다:

- **Pub/Sub**: 단순하고 빠른 실시간 브로드캐스트
- **Streams**: 안정적이고 영구적인 메시지 스트림

Pub/Sub은 "지금 이 순간"이 중요한 실시간 알림에, Streams는 "모든 메시지가 중요한" 작업 큐나 이벤트 로그에 적합합니다.

마치 Pub/Sub은 라디오 방송처럼 지금 듣는 사람만 들을 수 있고, Streams는 녹화 방송처럼 나중에도 다시 볼 수 있는 것과 같습니다.

"실시간의 가벼움과 영속성의 안정감, Redis가 모두 제공합니다!"