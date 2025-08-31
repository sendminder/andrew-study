# 프론트엔드 개념 쉽게 이해하기

## React란? 🏗️

**쉽게 말하면**: 웹사이트를 만들 때 사용하는 도구

**왜 생겼나?**
- 예전에는 HTML, CSS, JavaScript를 따로따로 관리했는데 너무 복잡했음
- 페이지가 복잡해질수록 코드가 스파게티처럼 얽혀버림
- "컴포넌트"라는 개념으로 UI를 레고 블록처럼 조립할 수 있게 해줌

**어떻게 다른가?**
```
기존 방식: HTML + CSS + JavaScript 따로
React: 모든걸 컴포넌트 단위로 묶어서 관리
```

**언제 써?**: 복잡한 웹 애플리케이션 만들 때 (페이스북, 넷플릭스 같은)

---

## TypeScript 📝

**쉽게 말하면**: JavaScript에 "타입"이라는 안전장치를 추가한 것

**왜 생겼나?**
```javascript
// JavaScript - 런타임에 에러 발생
function add(a, b) {
  return a + b;
}
add("hello", 5); // "hello5" 이상한 결과

// TypeScript - 코딩할 때 미리 에러 잡아줌
function add(a: number, b: number): number {
  return a + b;
}
add("hello", 5); // 빨간 줄로 에러 표시
```

**언제 써?**: 큰 프로젝트, 여러 명이 함께 작업할 때

---

## Vite ⚡

**쉽게 말하면**: 개발할 때 빠르게 화면을 새로고침해주는 도구

**왜 생겼나?**
- 예전 도구들(Webpack)은 코드 수정하면 새로고침이 너무 느렸음
- 개발자가 "아 답답해!" 하게 만듦
- Vite는 변경된 부분만 즉시 업데이트

**언제 써?**: 개발 속도를 빠르게 하고 싶을 때

---

## SWC 🚀

**쉽게 말하면**: JavaScript 코드를 빠르게 변환해주는 도구

**왜 생겼나?**
- 최신 JavaScript 문법을 구 버전 브라우저에서도 동작하게 변환해야 함
- Babel이라는 기존 도구가 있었지만 느렸음
- Rust로 만들어서 20배 더 빠름

**언제 써?**: 빌드 속도를 높이고 싶을 때

---

## TailwindCSS 🎨

**쉽게 말하면**: CSS를 HTML 안에서 클래스 이름으로 쉽게 쓸 수 있게 해주는 도구

```html
<!-- 기존 CSS -->
<div class="my-button">버튼</div>
<style>
.my-button {
  background-color: blue;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
}
</style>

<!-- Tailwind -->
<div class="bg-blue-500 text-white px-4 py-2 rounded">버튼</div>
```

**왜 생겼나?**: CSS 파일을 왔다갔다 하면서 스타일링하기 귀찮아서

**언제 써?**: 빠르게 예쁜 디자인을 만들고 싶을 때

---

## Zustand 🐻

**쉽게 말하면**: 여러 컴포넌트가 공유하는 데이터를 쉽게 관리해주는 도구

**왜 생겼나?**
- 컴포넌트 A에서 만든 데이터를 컴포넌트 B, C, D에서도 써야 할 때
- Props로 계속 전달하면 너무 복잡해짐
- Redux는 너무 어려웠음

```javascript
// 전역 상태 만들기
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))

// 어디서든 사용
function Counter() {
  const { count, increment } = useStore()
  return <button onClick={increment}>{count}</button>
}
```

**언제 써?**: 여러 페이지에서 같은 데이터를 써야 할 때

---

## React Router 🛣️

**쉽게 말하면**: 웹사이트 페이지 이동을 관리해주는 도구

**왜 생겼나?**
- React는 원래 한 페이지 앱(SPA)
- 하지만 실제로는 여러 페이지가 필요함
- URL을 바꾸면서 다른 화면을 보여줘야 함

```javascript
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/about" element={<About />} />
  <Route path="/contact" element={<Contact />} />
</Routes>
```

**언제 써?**: 여러 페이지가 있는 웹사이트 만들 때

---

## React Query (TanStack Query) 🔄

**쉽게 말하면**: 서버에서 데이터를 가져오고 관리해주는 도구

**왜 생겼나?**
- API 호출할 때마다 로딩, 에러, 캐싱을 매번 처리하기 귀찮음
- 같은 데이터를 또 요청하면 낭비
- 자동으로 최신 데이터로 업데이트하고 싶음

```javascript
function Profile() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => fetch('/api/profile').then(res => res.json())
  })

  if (isLoading) return <div>로딩중...</div>
  if (error) return <div>에러 발생!</div>
  return <div>{data.name}</div>
}
```

**언제 써?**: 백엔드 API를 많이 사용하는 앱 만들 때

---

## Radix UI 🎯

**쉽게 말하면**: 접근성이 좋은 UI 컴포넌트를 제공해주는 라이브러리

**왜 생겼나?**
- 모달, 드롭다운, 툴팁 같은 걸 직접 만들면 복잡함
- 특히 키보드 접근성, 스크린리더 지원 등을 고려하기 어려움
- 디자인은 자유롭게 하되 기능은 완성된 걸 쓰자

**언제 써?**: 고품질의 UI 컴포넌트가 필요할 때

---

## Next.js 🔄

**쉽게 말하면**: React 앱을 쉽게 만들고 배포할 수 있게 해주는 프레임워크

**왜 생겼나?**
- React만으로는 SEO(검색엔진 최적화)가 어려움
- 서버사이드 렌더링, 라우팅, 이미지 최적화 등을 직접 설정하기 복잡
- "모든 걸 한 번에 해결해주자"

**특징:**
- 파일 기반 라우팅 (폴더 구조가 URL이 됨)
- 서버사이드 렌더링 자동 지원
- API 라우트 제공

**언제 써?**: 검색에 잘 노출되어야 하는 웹사이트, 블로그, 쇼핑몰 등

---

## 과거 기술들 🕰️

### Babel
**뭘 하는 도구?**: 최신 JavaScript를 구버전으로 변환
**왜 안 쓰나?**: SWC가 더 빠름 (하지만 아직도 많이 쓰임)

### Webpack
**뭘 하는 도구?**: 여러 파일을 하나로 묶어주는 번들러
**왜 덜 쓰나?**: Vite가 개발 경험이 더 좋음

### jQuery
**뭘 하는 도구?**: DOM 조작을 쉽게 해주는 라이브러리
**왜 안 쓰나?**: React 같은 프레임워크가 더 체계적

---

## 스타일링 도구들 🎨

### Styled Components
**쉽게 말하면**: JavaScript 안에서 CSS를 작성할 수 있게 해주는 도구
```javascript
const Button = styled.button`
  background-color: ${props => props.primary ? 'blue' : 'gray'};
  color: white;
  padding: 10px;
`;
```
**언제 써?**: 컴포넌트별로 스타일을 관리하고 싶을 때

### Emotion
**쉽게 말하면**: Styled Components와 비슷하지만 더 가벼운 CSS-in-JS 라이브러리
**언제 써?**: 번들 크기를 줄이면서 CSS-in-JS를 쓰고 싶을 때

### PostCSS
**쉽게 말하면**: CSS를 변환해주는 도구 (CSS의 Babel 같은 역할)
**왜 필요해?**: 최신 CSS 문법을 구 브라우저에서도 쓸 수 있게 해줌

---

## 상태 관리 도구들 📦

### Redux Toolkit (RTK)
**쉽게 말하면**: Redux를 쉽게 사용할 수 있게 만든 도구
**왜 생겼나?**: 기존 Redux가 너무 복잡했음
**언제 써?**: 매우 복잡한 상태 관리가 필요할 때

### Jotai
**쉽게 말하면**: 원자(atom) 단위로 상태를 관리하는 도구
**특징**: Bottom-up 방식 (필요한 것만 구독)
**언제 써?**: 컴포넌트별로 독립적인 상태가 많을 때

### Recoil
**쉽게 말하면**: Facebook에서 만든 상태 관리 도구 (개발 중단됨)
**현재 상황**: 유지보수만 하고 있어서 새 프로젝트에는 비추천

---

## 데이터 페칭 & API 도구들 🌐

### SWR
**쉽게 말하면**: React Query와 비슷한 데이터 페칭 라이브러리
**특징**: "stale-while-revalidate" 전략 사용
**언제 써?**: React Query 대신 더 가벼운 걸 원할 때

### Axios
**쉽게 말하면**: HTTP 요청을 쉽게 할 수 있는 라이브러리
```javascript
// fetch 대신 axios 사용
const response = await axios.get('/api/users');
```
**언제 써?**: 복잡한 HTTP 설정이 필요할 때

### GraphQL & Apollo Client
**쉽게 말하면**: API에서 필요한 데이터만 정확히 요청할 수 있는 방식
**왜 좋아?**: 오버페칭/언더페칭 문제 해결
**언제 써?**: 복잡한 데이터 요구사항이 있을 때

---

## 테스팅 도구들 🧪

### Jest
**쉽게 말하면**: JavaScript 테스트를 위한 프레임워크
**뭘 테스트?**: 함수, 컴포넌트 로직 등

### React Testing Library
**쉽게 말하면**: React 컴포넌트를 사용자 관점에서 테스트하는 도구
```javascript
test('버튼 클릭시 카운트 증가', () => {
  render(<Counter />);
  const button = screen.getByRole('button');
  fireEvent.click(button);
  expect(screen.getByText('1')).toBeInTheDocument();
});
```

### Cypress
**쉽게 말하면**: 실제 브라우저에서 자동으로 테스트하는 도구 (E2E 테스트)
**언제 써?**: 전체 사용자 시나리오를 테스트할 때

### Playwright
**쉽게 말하면**: Cypress보다 빠른 E2E 테스트 도구
**특징**: 여러 브라우저 동시 테스트 가능

---

## 개발 도구들 🛠️

### ESLint
**쉽게 말하면**: 코드의 문제점을 찾아주는 도구
**뭘 찾아줘?**: 문법 에러, 코딩 스타일 문제 등

### Prettier
**쉽게 말하면**: 코드를 예쁘게 정렬해주는 도구
**왜 필요해?**: 팀원들과 일관된 코드 스타일 유지

### Husky
**쉽게 말하면**: Git commit/push 전에 자동으로 검사하는 도구
**예시**: 커밋 전에 ESLint, 테스트 실행

### Storybook
**쉽게 말하면**: UI 컴포넌트를 독립적으로 개발하고 문서화하는 도구
**언제 써?**: 디자인 시스템을 만들거나 컴포넌트 카탈로그가 필요할 때

---

## 빌드 & 번들링 도구들 📦

### Rollup
**쉽게 말하면**: 라이브러리를 만들 때 사용하는 번들러
**Webpack과 차이**: 더 가볍고 Tree-shaking이 잘됨

### Parcel
**쉽게 말하면**: 설정이 거의 필요 없는 번들러
**특징**: "Zero Configuration"
**언때 써?**: 빠르게 프로토타입을 만들 때

### Turbopack
**쉽게 말하면**: Vercel에서 만든 초고속 번들러 (Webpack 후속작)
**현재 상황**: Next.js에서 실험적으로 사용 중

---

## 메타프레임워크들 🏗️

### Remix
**쉽게 말하면**: 웹 표준에 집중한 React 프레임워크
**특징**: Server-side rendering + 네이티브 웹 API 활용
**언제 써?**: 성능과 웹 표준을 중시할 때

### Gatsby
**쉽게 말하면**: 정적 사이트를 만드는 React 프레임워크
**특징**: 빌드 시점에 모든 페이지를 미리 생성
**언제 써?**: 블로그, 마케팅 사이트 등 정적 콘텐츠 위주일 때

### Astro
**쉽게 말하면**: 여러 프레임워크를 섞어서 쓸 수 있는 도구
**특징**: React, Vue, Svelte 등을 한 프로젝트에서 함께 사용
**언제 써?**: 정적 사이트에 부분적으로만 인터랙션이 필요할 때

---

## 디자인 & 프로토타이핑 🎨

### Figma
**쉽게 말하면**: 웹 기반 디자인 도구
**개발자에게 왜 중요?**: 디자이너와 협업할 때 필수

### Framer Motion
**쉽게 말하면**: React용 애니메이션 라이브러리
```javascript
<motion.div
  animate={{ x: 100 }}
  transition={{ duration: 2 }}
>
  애니메이션!
</motion.div>
```
**언제 써?**: 화려한 애니메이션이 필요할 때

### Lottie
**쉽게 말하면**: After Effects 애니메이션을 웹에서 재생하는 도구
**언제 써?**: 복잡한 애니메이션을 디자이너가 만들어줄 때

---

## 백엔드 연동 도구들 🔗

### Socket.io
**쉽게 말하면**: 실시간 통신을 위한 라이브러리
**언제 써?**: 채팅, 라이브 업데이트 등이 필요할 때

### Auth0 / Firebase Auth
**쉽게 말하면**: 사용자 인증을 쉽게 구현할 수 있는 서비스
**왜 써?**: 로그인/회원가입을 직접 구현하는 건 복잡하고 위험

### Prisma
**쉽게 말하면**: 데이터베이스를 타입스크립트로 쉽게 다루는 ORM
**특징**: 타입 안전성 + 자동완성 제공

---

## 성능 최적화 도구들 ⚡

### Lighthouse
**쉽게 말하면**: 웹 성능을 측정해주는 Chrome 도구
**측정 항목**: 로딩 속도, 접근성, SEO 등

### Web Vitals
**쉽게 말하면**: Google이 정한 웹 성능 지표
**주요 지표**: LCP, FID, CLS

### Bundle Analyzer
**쉽게 말하면**: 번들 파일이 얼마나 큰지 시각화해주는 도구
**언제 써?**: 앱이 느릴 때 원인 분석

---

## 모바일 & 크로스플랫폼 📱

### React Native
**쉽게 말하면**: React로 네이티브 모바일 앱을 만드는 도구
**장점**: 하나의 코드로 iOS/Android 앱 개발

### Expo
**쉽게 말하면**: React Native를 더 쉽게 사용할 수 있게 해주는 도구
**특징**: 네이티브 코드 작성 없이도 대부분 기능 구현 가능

### PWA (Progressive Web App)
**쉽게 말하면**: 웹앱을 네이티브 앱처럼 동작하게 만드는 기술
**특징**: 오프라인 지원, 푸시 알림, 홈 화면 추가 등

---

## 새로운 트렌드들 🚀

### Server Components (React 18+)
**쉽게 말하면**: 서버에서 실행되는 React 컴포넌트
**왜 혁신적?**: 클라이언트 번들 크기 대폭 감소

### Suspense
**쉽게 말하면**: 비동기 작업 중 로딩 UI를 쉽게 처리하는 React 기능
```javascript
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>
```

### Concurrent Features
**쉽게 말하면**: React가 여러 작업을 동시에 처리할 수 있게 해주는 기능
**결과**: 더 부드러운 사용자 경험

### Micro Frontends
**쉽게 말하면**: 큰 프론트엔드를 작은 앱들로 나누어 개발하는 방식
**언제 써?**: 매우 큰 조직에서 여러 팀이 협업할 때

---

## 렌더링 방식들 🖥️

### CSR (Client Side Rendering)
**쉽게 말하면**: 브라우저에서 JavaScript로 화면을 그리는 방식
```
서버 → HTML (거의 빈 껍데기) → 브라우저에서 JS 실행 → 화면 완성
```
**장점**: 페이지 이동 시 빠름, 서버 부하 적음
**단점**: 첫 로딩 느림, SEO 어려움
**언제 써?**: 관리자 페이지, 대시보드 등 SEO가 중요하지 않을 때

### SSR (Server Side Rendering)
**쉽게 말하면**: 서버에서 완성된 HTML을 만들어서 보내주는 방식
```
서버에서 HTML 완성 → 브라우저로 전송 → 바로 화면 표시
```
**장점**: 첫 로딩 빠름, SEO 좋음
**단점**: 서버 부하 큼, 페이지 이동 시 새로고침
**언제 써?**: 블로그, 뉴스 사이트, 쇼핑몰 등

### SSG (Static Site Generation)
**쉽게 말하면**: 빌드할 때 미리 모든 HTML을 만들어두는 방식
```
빌드 시점에 모든 페이지 생성 → CDN에 배포 → 초고속 로딩
```
**장점**: 가장 빠름, CDN 활용 가능, 서버 부하 없음
**단점**: 동적 콘텐츠 어려움
**언제 써?**: 마케팅 페이지, 문서 사이트, 포트폴리오

### ISR (Incremental Static Regeneration)
**쉽게 말하면**: 필요할 때마다 정적 페이지를 다시 생성하는 방식
**특징**: SSG + SSR의 장점을 결합
**언제 써?**: 콘텐츠가 가끔 바뀌는 사이트 (Next.js에서 주로 사용)

### Hydration
**쉽게 말하면**: SSR로 받은 HTML에 JavaScript 기능을 붙이는 과정
```
서버에서 HTML 받음 → 화면 표시 → JS 로딩 → 인터랙션 가능
```
**문제점**: JS 로딩 전까지는 버튼이 안 눌림 (상호작용 불가)

---

## 아키텍처 패턴들 🏗️

### MVC (Model-View-Controller)
**쉽게 말하면**: 데이터, 화면, 로직을 분리하는 방식
```
Model (데이터) ↔ Controller (로직) ↔ View (화면)
```
**프론트엔드에서**: React에서는 잘 안 씀 (백엔드에서 주로 사용)
**예시**: Angular의 초기 버전

### MVVM (Model-View-ViewModel)
**쉽게 말하면**: View와 Model 사이에 ViewModel이 데이터 바인딩을 담당
```
Model ↔ ViewModel ↔ View
      (데이터 바인딩)
```
**특징**: 양방향 데이터 바인딩
**예시**: Vue.js, Angular

### MVP (Model-View-Presenter)
**쉽게 말하면**: View가 수동적이고 Presenter가 모든 로직을 담당
**프론트엔드에서**: 잘 안 씀 (주로 Android 개발에서 사용)

### Component-Based Architecture
**쉽게 말하면**: UI를 재사용 가능한 컴포넌트로 나누는 방식 (React의 철학)
```
App
├── Header
├── Main
│   ├── Sidebar
│   └── Content
└── Footer
```
**장점**: 재사용성, 유지보수성, 테스트 용이성

### Flux/Redux Pattern
**쉽게 말하면**: 단방향 데이터 흐름을 강제하는 패턴
```
Action → Dispatcher → Store → View
    ←─────────────────────────┘
```
**왜 필요?**: 복잡한 상태 변화를 예측 가능하게 만들기 위해

---

## 상태 관리 패턴들 📊

### Props Drilling
**쉽게 말하면**: 데이터를 여러 컴포넌트를 거쳐서 전달하는 현상
```
App → Header → Navigation → UserMenu (props 계속 전달)
```
**문제점**: 중간 컴포넌트들이 불필요한 props를 받게됨
**해결책**: Context API, 상태 관리 라이브러리

### Lifting State Up
**쉽게 말하면**: 여러 컴포넌트가 공유하는 상태를 상위로 올리는 패턴
```
// Before: 각자 state 가짐
ComponentA (state) ↔ ComponentB (state)

// After: 부모가 state 관리
Parent (state)
├── ComponentA
└── ComponentB
```

### Container/Presentational Pattern
**쉽게 말하면**: 로직을 담당하는 컨테이너와 UI만 담당하는 컴포넌트를 분리
```javascript
// Container (로직)
const UserContainer = () => {
  const [users, setUsers] = useState([]);
  // API 호출, 상태 관리 로직
  return <UserList users={users} onDelete={handleDelete} />;
};

// Presentational (UI만)
const UserList = ({ users, onDelete }) => (
  <div>
    {users.map(user => <UserItem key={user.id} user={user} onDelete={onDelete} />)}
  </div>
);
```

---

## 데이터 흐름 패턴들 🔄

### One-way Data Flow
**쉽게 말하면**: 데이터가 한 방향으로만 흐르는 패턴 (React 기본)
```
Parent (state) → Child (props) → Grandchild (props)
```
**장점**: 예측 가능, 디버깅 쉬움

### Two-way Data Binding
**쉽게 말하면**: 데이터와 UI가 자동으로 동기화되는 패턴 (Vue.js)
```javascript
// Vue.js 예시
<input v-model="message" />
<p>{{ message }}</p>
// input 값이 바뀌면 p 태그도 자동 업데이트
```

### Event-Driven Architecture
**쉽게 말하면**: 이벤트를 통해 컴포넌트 간 통신하는 방식
**예시**: DOM 이벤트, Custom Events, EventEmitter

---

## 모듈 시스템 📦

### CommonJS (Node.js)
```javascript
// 내보내기
module.exports = { getData };
// 가져오기
const { getData } = require('./api');
```

### ES6 Modules (ESM)
```javascript
// 내보내기
export const getData = () => {};
export default UserComponent;
// 가져오기
import UserComponent, { getData } from './components';
```

### UMD (Universal Module Definition)
**쉽게 말하면**: CommonJS, AMD, 글로벌 변수를 모두 지원하는 방식
**언제 써?**: 라이브러리 제작할 때

---

## API 통신 패턴들 🌐

### REST API
**쉽게 말하면**: URL과 HTTP 메서드로 데이터를 주고받는 방식
```
GET /api/users     - 사용자 목록 조회
POST /api/users    - 사용자 생성
PUT /api/users/123 - 사용자 수정
DELETE /api/users/123 - 사용자 삭제
```

### GraphQL
**쉽게 말하면**: 필요한 데이터만 정확히 요청할 수 있는 방식
```graphql
query {
  user(id: "123") {
    name
    email
    posts {
      title
    }
  }
}
```

### RPC (Remote Procedure Call)
**쉽게 말하면**: 마치 함수 호출하듯이 서버 함수를 실행하는 방식
**예시**: Next.js API Routes, tRPC

---

## 성능 최적화 패턴들 ⚡

### Lazy Loading
**쉽게 말하면**: 필요할 때만 데이터나 컴포넌트를 로드하는 방식
```javascript
const LazyComponent = React.lazy(() => import('./HeavyComponent'));
```

### Code Splitting
**쉽게 말하면**: 코드를 여러 파일로 나누어 필요한 것만 로드
```javascript
import('./heavyLibrary').then(module => {
  module.doSomething();
});
```

### Memoization
**쉽게 말하면**: 계산 결과를 기억해뒀다가 재사용하는 방식
```javascript
const ExpensiveComponent = React.memo(({ data }) => {
  // data가 같으면 리렌더링 안함
  return <div>{heavyCalculation(data)}</div>;
});
```

### Virtual Scrolling
**쉽게 말하면**: 보이는 부분만 렌더링해서 긴 리스트를 최적화
**언제 써?**: 수천 개의 아이템이 있는 리스트

---

## 결론: 언제 뭘 써야 할까? 🤔

### 간단한 웹사이트
- HTML, CSS, 바닐라 JavaScript

### 중간 규모 웹앱
- React + Vite + TailwindCSS + React Router

### 복잡한 웹앱
- React + TypeScript + Vite + TailwindCSS + Zustand + React Query + React Router

### SEO가 중요한 웹사이트
- Next.js + 위의 도구들

### 회사 프로젝트
- 위의 모든 것 + Radix UI + 테스팅 도구들

---

**핵심**: 각 도구는 특정 문제를 해결하기 위해 만들어졌습니다. 문제를 이해하면 도구 선택이 쉬워져요!