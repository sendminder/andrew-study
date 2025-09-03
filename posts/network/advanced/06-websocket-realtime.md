# WebSocket: 실시간 양방향 통신의 혁명

안녕하세요! 오늘은 실시간 웹을 가능하게 한 WebSocket에 대해 깊이 알아보겠습니다. HTTP의 한계를 극복하고 진정한 양방향 통신을 구현하는 WebSocket의 모든 것을 파헤쳐볼까요?

## WebSocket이 필요했던 이유

### HTTP의 근본적 한계

HTTP는 요청-응답 모델입니다. 클라이언트가 요청해야만 서버가 응답할 수 있죠.

```
문제 상황:
- 실시간 채팅: 새 메시지를 어떻게 즉시 받을까?
- 주식 시세: 변경된 가격을 어떻게 실시간으로?
- 온라인 게임: 다른 플레이어의 움직임을 어떻게?
- 협업 도구: 다른 사용자의 편집을 어떻게 반영?
```

### 과거의 해결 방법들

**1. Polling (폴링)**

```javascript
// 주기적으로 서버에 요청
setInterval(() => {
    fetch('/api/messages')
        .then(res => res.json())
        .then(messages => updateUI(messages));
}, 1000);  // 1초마다

문제점:
- 불필요한 요청 (변경 없어도 계속 요청)
- 서버 부하 증가
- 실시간성 부족 (최대 1초 지연)
- 대역폭 낭비
```

**2. Long Polling**

```javascript
// 서버가 응답을 보류하다가 데이터 있을 때 응답
function longPoll() {
    fetch('/api/messages/long-poll')
        .then(res => res.json())
        .then(messages => {
            updateUI(messages);
            longPoll();  // 다시 요청
        });
}

개선점:
- 실시간성 향상
- 불필요한 요청 감소

여전한 문제:
- HTTP 오버헤드
- 연결 재수립 반복
- 타임아웃 관리 복잡
```

**3. Server-Sent Events (SSE)**

```javascript
// 서버에서 클라이언트로 단방향 스트림
const eventSource = new EventSource('/api/events');
eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateUI(data);
};

장점:
- 실시간 푸시
- 자동 재연결
- 간단한 구현

한계:
- 단방향 통신만 가능
- HTTP 오버헤드 존재
```

## WebSocket의 등장

WebSocket은 2011년 RFC 6455로 표준화되었습니다. HTTP와 같은 포트(80/443)를 사용하지만, 완전히 다른 프로토콜이죠.

### WebSocket의 특징

```
1. 양방향 통신 (Full-Duplex)
   - 클라이언트 → 서버
   - 서버 → 클라이언트
   - 동시에 가능!

2. 낮은 오버헤드
   - 작은 프레임 헤더 (2-14 bytes)
   - HTTP 헤더 없음

3. 실시간성
   - 지연 시간 최소화
   - 즉시 전송

4. 지속 연결
   - 한 번 연결 후 유지
   - 재연결 오버헤드 없음
```

## WebSocket 핸드셰이크

WebSocket은 HTTP로 시작해서 프로토콜을 전환합니다.

### 연결 수립 과정

```
1. HTTP Upgrade 요청 (Client → Server)
GET /websocket HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Sec-WebSocket-Protocol: chat, superchat
Origin: http://example.com

2. HTTP 101 응답 (Server → Client)
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
Sec-WebSocket-Protocol: chat

3. 이제부터 WebSocket 프로토콜로 통신!
```

### Sec-WebSocket-Key/Accept의 비밀

```javascript
// 서버에서 Accept 값 생성
const crypto = require('crypto');

function generateAccept(key) {
    const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    const hash = crypto
        .createHash('sha1')
        .update(key + GUID)
        .digest('base64');
    return hash;
}

// 클라이언트가 보낸 Key
const key = 'dGhlIHNhbXBsZSBub25jZQ==';
// 서버가 응답할 Accept
const accept = generateAccept(key);
// 결과: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

이는 프록시가 캐시된 응답을 재사용하는 것을 방지합니다.

## WebSocket 프레임 구조

WebSocket의 효율성 비밀은 프레임 구조에 있습니다.

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127 |
+ - - - - - - - - - - - - - - - +-------------------------------+
|                               |Masking-key, if MASK set to 1  |
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
:                     Payload Data continued ...                :
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                     Payload Data continued ...                |
+---------------------------------------------------------------+

헤더 크기:
- 최소: 2 bytes (작은 메시지)
- 최대: 14 bytes (큰 메시지 + 마스킹)

비교: HTTP 헤더는 보통 수백 bytes!
```

### Opcode 타입

```
0x0: 연속 프레임
0x1: 텍스트 프레임
0x2: 바이너리 프레임
0x8: 연결 종료
0x9: Ping
0xA: Pong
```

## WebSocket 구현

### 서버 구현 (Node.js)

```javascript
const WebSocket = require('ws');

// WebSocket 서버 생성
const wss = new WebSocket.Server({ port: 8080 });

// 연결 관리
const clients = new Set();

wss.on('connection', (ws, req) => {
    console.log('새 클라이언트 연결:', req.socket.remoteAddress);
    clients.add(ws);
    
    // 메시지 수신
    ws.on('message', (message) => {
        console.log('받은 메시지:', message.toString());
        
        // 모든 클라이언트에게 브로드캐스트
        broadcast(message, ws);
    });
    
    // 에러 처리
    ws.on('error', (error) => {
        console.error('WebSocket 에러:', error);
    });
    
    // 연결 종료
    ws.on('close', () => {
        console.log('클라이언트 연결 종료');
        clients.delete(ws);
    });
    
    // Ping/Pong (연결 유지)
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
});

// 브로드캐스트 함수
function broadcast(message, sender) {
    clients.forEach(client => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// 주기적 연결 확인
setInterval(() => {
    clients.forEach(ws => {
        if (!ws.isAlive) {
            clients.delete(ws);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);  // 30초마다
```

### 클라이언트 구현

```javascript
class WebSocketClient {
    constructor(url) {
        this.url = url;
        this.reconnectInterval = 5000;
        this.shouldReconnect = true;
        this.messageQueue = [];
        this.connect();
    }
    
    connect() {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
            console.log('WebSocket 연결됨');
            this.flushMessageQueue();
        };
        
        this.ws.onmessage = (event) => {
            this.handleMessage(event.data);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket 에러:', error);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket 연결 종료');
            if (this.shouldReconnect) {
                setTimeout(() => this.connect(), this.reconnectInterval);
            }
        };
    }
    
    send(message) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // 연결이 끊긴 경우 큐에 저장
            this.messageQueue.push(message);
        }
    }
    
    flushMessageQueue() {
        while (this.messageQueue.length > 0) {
            this.send(this.messageQueue.shift());
        }
    }
    
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            // 메시지 처리 로직
            this.onMessage(message);
        } catch (e) {
            console.error('메시지 파싱 에러:', e);
        }
    }
    
    close() {
        this.shouldReconnect = false;
        this.ws.close();
    }
}

// 사용 예
const client = new WebSocketClient('ws://localhost:8080');
client.onMessage = (message) => {
    console.log('받은 메시지:', message);
};
```

## WebSocket 보안

### WSS (WebSocket Secure)

HTTPS처럼 WebSocket도 TLS로 암호화할 수 있습니다.

```javascript
// 서버 (HTTPS와 함께)
const https = require('https');
const fs = require('fs');

const server = https.createServer({
    cert: fs.readFileSync('cert.pem'),
    key: fs.readFileSync('key.pem')
});

const wss = new WebSocket.Server({ server });

// 클라이언트
const ws = new WebSocket('wss://example.com');
```

### 인증과 권한

```javascript
// JWT 토큰 검증
wss.on('connection', async (ws, req) => {
    // URL 파라미터에서 토큰 추출
    const token = new URL(req.url, `http://${req.headers.host}`)
        .searchParams.get('token');
    
    try {
        const user = await verifyToken(token);
        ws.userId = user.id;
        ws.authenticated = true;
    } catch (error) {
        ws.close(1008, 'Invalid token');
        return;
    }
    
    // 인증된 연결만 처리
    ws.on('message', (message) => {
        if (!ws.authenticated) {
            ws.close(1008, 'Not authenticated');
            return;
        }
        // 메시지 처리
    });
});
```

### Origin 검증

```javascript
wss.on('connection', (ws, req) => {
    const origin = req.headers.origin;
    const allowedOrigins = ['https://example.com', 'https://app.example.com'];
    
    if (!allowedOrigins.includes(origin)) {
        ws.close(1008, 'Origin not allowed');
        return;
    }
    
    // 연결 허용
});
```

## 실전 패턴과 최적화

### 1. 메시지 압축

```javascript
// permessage-deflate 확장 사용
const wss = new WebSocket.Server({
    port: 8080,
    perMessageDeflate: {
        zlibDeflateOptions: {
            level: 6,  // 압축 레벨 (1-9)
        },
        threshold: 1024,  // 1KB 이상만 압축
    }
});

// 큰 JSON 데이터 전송 시 50-70% 압축률
```

### 2. 하트비트와 재연결

```javascript
class RobustWebSocket {
    constructor(url) {
        this.url = url;
        this.heartbeatInterval = 30000;  // 30초
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.reconnectAttempts = 0;
        this.connect();
    }
    
    connect() {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
            console.log('연결 성공');
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;
            this.startHeartbeat();
        };
        
        this.ws.onclose = () => {
            this.stopHeartbeat();
            this.scheduleReconnect();
        };
    }
    
    startHeartbeat() {
        this.pingInterval = setInterval(() => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, this.heartbeatInterval);
    }
    
    stopHeartbeat() {
        clearInterval(this.pingInterval);
    }
    
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        );
        
        console.log(`재연결 시도 ${this.reconnectAttempts}, ${delay}ms 후`);
        setTimeout(() => this.connect(), delay);
    }
}
```

### 3. 백프레셔 처리

```javascript
// 서버에서 클라이언트 속도 제어
class BackpressureWebSocket {
    constructor(ws) {
        this.ws = ws;
        this.messageBuffer = [];
        this.sending = false;
        this.maxBufferSize = 100;
    }
    
    async send(message) {
        if (this.messageBuffer.length >= this.maxBufferSize) {
            console.warn('버퍼 가득 참, 메시지 드롭');
            return false;
        }
        
        this.messageBuffer.push(message);
        
        if (!this.sending) {
            this.processBuffer();
        }
        
        return true;
    }
    
    async processBuffer() {
        this.sending = true;
        
        while (this.messageBuffer.length > 0) {
            const message = this.messageBuffer.shift();
            
            // 버퍼가 비워질 때까지 대기
            if (this.ws.bufferedAmount > 1024 * 1024) {  // 1MB
                await new Promise(resolve => setTimeout(resolve, 10));
                continue;
            }
            
            this.ws.send(JSON.stringify(message));
        }
        
        this.sending = false;
    }
}
```

### 4. 방(Room) 시스템

```javascript
class RoomManager {
    constructor() {
        this.rooms = new Map();
    }
    
    joinRoom(roomId, client) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        
        this.rooms.get(roomId).add(client);
        client.rooms = client.rooms || new Set();
        client.rooms.add(roomId);
        
        this.broadcast(roomId, {
            type: 'user_joined',
            userId: client.userId
        }, client);
    }
    
    leaveRoom(roomId, client) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.delete(client);
            if (room.size === 0) {
                this.rooms.delete(roomId);
            }
        }
        
        if (client.rooms) {
            client.rooms.delete(roomId);
        }
        
        this.broadcast(roomId, {
            type: 'user_left',
            userId: client.userId
        }, client);
    }
    
    broadcast(roomId, message, exclude) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        
        room.forEach(client => {
            if (client !== exclude && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}
```

## 실제 사용 사례

### 1. 실시간 채팅

```javascript
// 채팅 메시지 처리
ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    switch (message.type) {
        case 'chat':
            // 메시지 저장
            saveMessage(message);
            // 방에 브로드캐스트
            roomManager.broadcast(message.roomId, {
                type: 'chat',
                userId: ws.userId,
                text: message.text,
                timestamp: Date.now()
            });
            break;
            
        case 'typing':
            roomManager.broadcast(message.roomId, {
                type: 'typing',
                userId: ws.userId
            }, ws);
            break;
    }
});
```

### 2. 실시간 협업

```javascript
// 문서 동시 편집
class CollaborativeDocument {
    constructor() {
        this.document = '';
        this.operations = [];
        this.clients = new Set();
    }
    
    handleOperation(operation, client) {
        // Operational Transform 적용
        const transformed = this.transform(operation);
        
        // 문서 업데이트
        this.applyOperation(transformed);
        
        // 다른 클라이언트에게 전파
        this.clients.forEach(c => {
            if (c !== client) {
                c.send({
                    type: 'operation',
                    op: transformed
                });
            }
        });
    }
}
```

### 3. 실시간 게임

```javascript
// 게임 상태 동기화
class GameServer {
    constructor() {
        this.gameState = {};
        this.players = new Map();
        this.tickRate = 60;  // 60 FPS
    }
    
    start() {
        setInterval(() => this.gameTick(), 1000 / this.tickRate);
    }
    
    gameTick() {
        // 게임 로직 업데이트
        this.updateGameState();
        
        // 상태 브로드캐스트
        const state = this.getVisibleState();
        this.players.forEach(player => {
            player.send({
                type: 'state_update',
                state: state,
                timestamp: Date.now()
            });
        });
    }
    
    handlePlayerInput(player, input) {
        // 입력 검증
        if (!this.validateInput(input)) return;
        
        // 즉시 응답 (클라이언트 예측)
        player.send({
            type: 'input_ack',
            inputId: input.id
        });
        
        // 게임 상태 업데이트
        this.applyInput(player, input);
    }
}
```

## WebSocket vs 대안 기술

### Socket.IO

```javascript
// Socket.IO는 WebSocket의 추상화 레이어
const io = require('socket.io')(server);

io.on('connection', (socket) => {
    // 자동 재연결
    // 폴백 메커니즘 (WebSocket → HTTP Long Polling)
    // 방 시스템 내장
    // 이벤트 기반 API
    
    socket.join('room1');
    socket.to('room1').emit('message', 'Hello room!');
});

장점:
- 브라우저 호환성 (자동 폴백)
- 풍부한 기능
- 쉬운 사용

단점:
- 오버헤드
- 표준이 아님
- 더 많은 리소스 사용
```

### Server-Sent Events (SSE)

```javascript
// 서버 → 클라이언트 단방향
app.get('/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    
    setInterval(() => {
        res.write(`data: ${JSON.stringify({time: Date.now()})}\n\n`);
    }, 1000);
});

적합한 경우:
- 서버 → 클라이언트만 필요
- HTTP/2 사용 가능
- 간단한 구현 선호
```

### WebTransport

```javascript
// 차세대 양방향 통신 (QUIC 기반)
const transport = new WebTransport('https://example.com/wt');
await transport.ready;

// 신뢰성 있는 스트림
const stream = await transport.createBidirectionalStream();
const writer = stream.writable.getWriter();
await writer.write(data);

// 신뢰성 없는 데이터그램
const datagrams = transport.datagrams;
datagrams.writable.getWriter().write(data);

장점:
- QUIC 기반 (더 빠름)
- 신뢰성 선택 가능
- 멀티플렉싱

단점:
- 아직 실험적
- 브라우저 지원 제한
```

## 성능 최적화와 스케일링

### 수평 확장

```javascript
// Redis를 사용한 서버 간 메시지 동기화
const Redis = require('ioredis');
const pub = new Redis();
const sub = new Redis();

// 메시지 발행
function broadcastToAllServers(message) {
    pub.publish('websocket_channel', JSON.stringify(message));
}

// 메시지 구독
sub.subscribe('websocket_channel');
sub.on('message', (channel, message) => {
    const data = JSON.parse(message);
    // 로컬 클라이언트에게 전송
    localBroadcast(data);
});
```

### 로드 밸런싱

```nginx
# Nginx 설정 (IP Hash로 세션 유지)
upstream websocket_servers {
    ip_hash;
    server ws1.example.com:8080;
    server ws2.example.com:8080;
    server ws3.example.com:8080;
}

server {
    location /ws {
        proxy_pass http://websocket_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 문제 해결과 디버깅

### 일반적인 문제들

1. **연결이 자주 끊김**
   - 프록시/방화벽 타임아웃
   - 해결: 주기적 ping/pong

2. **메시지 유실**
   - 재연결 중 메시지 손실
   - 해결: 메시지 큐, ACK 메커니즘

3. **메모리 누수**
   - 연결 정리 안 됨
   - 해결: 적절한 cleanup, WeakMap 사용

4. **스케일링 문제**
   - 단일 서버 한계
   - 해결: Redis Pub/Sub, 로드 밸런서

### 디버깅 도구

```javascript
// Chrome DevTools
// Network 탭 → WS → Messages

// 커스텀 로깅
ws.addEventListener('message', (event) => {
    console.group('WebSocket Message');
    console.log('Time:', new Date().toISOString());
    console.log('Data:', event.data);
    console.log('Size:', event.data.length);
    console.groupEnd();
});

// 성능 모니터링
let messageCount = 0;
let bytesReceived = 0;

ws.addEventListener('message', (event) => {
    messageCount++;
    bytesReceived += event.data.length;
});

setInterval(() => {
    console.log(`Messages/sec: ${messageCount}`);
    console.log(`Bytes/sec: ${bytesReceived}`);
    messageCount = 0;
    bytesReceived = 0;
}, 1000);
```

## 마무리: WebSocket의 미래

WebSocket은 실시간 웹의 핵심 기술입니다. 제가 WebSocket을 사용하면서 배운 교훈:

1. **연결 관리가 핵심**: 재연결, 하트비트, 에러 처리
2. **확장성 고려**: 처음부터 수평 확장 설계
3. **보안 우선**: WSS, 인증, Origin 검증
4. **성능 모니터링**: 메트릭 수집과 분석
5. **폴백 준비**: 모든 환경에서 작동하도록

WebSocket은 채팅, 게임, 협업 도구, 실시간 대시보드 등 다양한 분야에서 필수 기술이 되었습니다. HTTP/3와 WebTransport 같은 새로운 기술이 나오고 있지만, WebSocket은 앞으로도 오랫동안 실시간 웹의 중심에 있을 것입니다.

실시간의 마법을 만들어보세요! 🚀