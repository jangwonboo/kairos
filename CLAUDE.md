# CLAUDE.md — Kairos (Literary Clock, Windows Desktop)

> 이 파일은 Claude Code가 이 저장소에서 작업할 때 항상 참조하는 프로젝트 규약이다.
> 코드를 쓰기 전에 반드시 이 문서의 **Non-negotiables**와 **Architecture** 섹션을 따른다.

---

## 1. Project Overview

현재 시각(HH:MM)에 해당하는 문학 인용문을, 그 인용문의 **분위기에 어울리는 배경 이미지** 위에 표시하는
Windows 데스크톱 시계 앱.

| | |
|---|---|
| Platform | Windows 10/11 (x64) |
| Stack | Electron + TypeScript + Vite + React |
| Package | `electron-builder` → NSIS installer + portable exe |
| Quote source | **https://github.com/ligurio/litclock** |
| Inspiration | `mmattozzi/LiteraryClockScreenSaver` (동작 참고만, 데이터는 ligurio 사용) |

---

## 2. Non-negotiables (절대 규칙)

1. **런타임에 번역 API를 호출하지 않는다.** 한글 번역은 **빌드 타임**에 생성되어
   `resources/quotes.json`에 동봉된다. 런타임은 파일 읽기만 한다.
2. **Renderer는 외부 네트워크에 접근할 수 없다.** 모든 네트워크 호출은 main process에서만.
   CSP `connect-src 'none'`. Renderer는 main이 디스크에 저장한 **로컬 파일 경로**만 읽는다.
3. **네트워크가 끊기거나 방화벽에 막혀도 앱은 정상 동작한다.** 실패 시 조용히 로컬 배경으로 폴백.
   에러 팝업/토스트로 사용자를 방해하지 않는다.
4. **API 키를 코드에 하드코딩하지 않는다.** 사용자가 설정에서 입력, `safeStorage`로 암호화 저장.
5. `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. 예외 없음.
6. **native 모듈(better-sqlite3 등)을 쓰지 않는다.** 재배포 단순화를 위해 순수 JS만.
   quote 데이터(~2MB)는 메모리 `Map`으로 충분하다.

---

## 3. Repository Layout

```
kairos/
├─ CLAUDE.md                    # 이 파일
├─ package.json
├─ tsconfig.json
├─ tsconfig.node.json           # main + preload (Node 환경)
├─ tsconfig.web.json            # renderer (브라우저 환경)
├─ electron.vite.config.ts
├─ electron-builder.yml
├─ .gitignore
├─ data/                        # 빌드 중간 산출물 (커밋됨, .gitignore 제외)
│  ├─ raw-quotes.json           # Stage 1 출력
│  ├─ quotes.ko.json            # Stage 2 출력 (한글 번역)
│  └─ quotes.keywords.json      # Stage 3 출력 (이미지 키워드)
├─ scripts/
│  ├─ 1-fetch-quotes.ts         # ligurio/litclock 원본 → 정규화
│  ├─ 2-translate-quotes.ts     # LLM 번역 (빌드 타임 1회, 결과 커밋)
│  ├─ 3-extract-keywords.ts     # LLM 키워드 추출 (빌드 타임 1회, 결과 커밋)
│  └─ 4-build-quotes-json.ts    # 위 3개 병합 → resources/quotes.json
├─ src/
│  ├─ shared/
│  │  └─ types.ts               # main/preload/renderer 공통 타입
│  ├─ main/
│  │  ├─ index.ts               # BrowserWindow, tray, lifecycle
│  │  ├─ clock.ts               # drift-corrected minute tick
│  │  ├─ quote-store.ts         # quotes.json → Map<"HH:MM", Quote[]>
│  │  ├─ image/
│  │  │  ├─ image-service.ts    # provider orchestration, retry, fallback
│  │  │  ├─ providers/
│  │  │  │  ├─ unsplash.ts
│  │  │  │  ├─ pexels.ts
│  │  │  │  ├─ pixabay.ts
│  │  │  │  ├─ wikimedia.ts     # 키 불필요 — 사내망 최후 수단
│  │  │  │  └─ local.ts
│  │  │  ├─ image-cache.ts      # LRU disk cache + prefetch
│  │  │  └─ query-builder.ts    # quote.keywords → provider별 검색 쿼리
│  │  ├─ net/
│  │  │  ├─ proxy.ts            # system/manual/PAC/direct
│  │  │  ├─ http.ts             # timeout, retry, backoff, custom CA
│  │  │  └─ diagnostics.ts      # 설정 UI의 "연결 테스트"
│  │  ├─ settings.ts            # electron-store + schema + migration
│  │  └─ ipc.ts
│  ├─ preload/index.ts          # contextBridge only
│  └─ renderer/
│     ├─ index.html
│     ├─ App.tsx
│     ├─ main.tsx               # React entry
│     ├─ components/
│     │  ├─ BackgroundStage.tsx # 2-layer cross-fade
│     │  ├─ QuoteCard.tsx       # EN/KO + timeString highlight
│     │  ├─ CreditBadge.tsx     # photographer attribution
│     │  └─ settings/
│     │     ├─ SettingsPanel.tsx
│     │     ├─ NetworkSettings.tsx
│     │     ├─ DisplaySettings.tsx
│     │     └─ BackgroundSettings.tsx
│     ├─ transitions/
│     │  ├─ text/               # fade | blur-lift | typewriter | mask | slide-up
│     │  │  └─ index.ts
│     │  └─ image/              # dim-crossfade | pure-fade | blur-morph | slide | none
│     │     └─ index.ts
│     └─ styles/
│        └─ global.css
└─ resources/
   ├─ quotes.json               # Stage 4 산출물 (커밋됨)
   ├─ fallback-bg/              # 로컬 배경 30장 (webp, 1920x1080)
   │  └─ .gitkeep
   ├─ fonts/                    # EB Garamond (EN), Pretendard (KO)
   │  └─ .gitkeep
   └─ FIREWALL.md               # IT팀 제출용 도메인 화이트리스트
```

---

## 4. Quote Data Pipeline (빌드 타임)

### 4.1 Source: `ligurio/litclock`

- 원본은 `litclock_annotated.csv` 계열 (`time|time_string|quote|title|author|sfw`) 형식.
  **스크립트를 짜기 전에 실제 파일 구조를 먼저 확인할 것.** 스키마를 추측하지 말 것.
- 1,440분 전부가 커버되지 않는다 → fallback 규칙 필요 (§4.4)

### 4.2 Stage 2 — 한글 번역 (`2-translate-quotes.ts`)

- `quote`, `title`, `author`를 번역
- **문학적 톤 유지**. 직역 금지. 작품이 국내 정식 출간된 경우 **기존 번역 제목을 우선** 사용
  (예: *Mrs Dalloway* → "댈러웨이 부인", *The Great Gatsby* → "위대한 개츠비")
- 작가명은 국립국어원 외래어 표기법 기준
- 출력: `data/quotes.ko.json` (커밋)

### 4.3 Stage 3 — 이미지 키워드 추출 (`3-extract-keywords.ts`) ★

각 quote를 LLM으로 전처리해 **배경 이미지 검색용 키워드**를 추출한다.
이것이 이 앱의 핵심 차별점이다 — 랜덤 이미지가 아니라 **인용문에 어울리는 이미지**.

LLM에 보낼 프롬프트 스펙:

```
Given a literary quote, its title and author, produce JSON for background image search.

Rules:
- Output ONLY valid JSON. No prose.
- Prefer atmospheric, non-literal imagery. Avoid depicting people's faces.
- Keywords must be searchable on stock photo sites (Unsplash/Pexels).
- Avoid proper nouns, character names, and brand names.
- If the quote is dark/violent, choose a somber but SFW visual metaphor.

Schema:
{
  "mood":     ["melancholic", "quiet"],        // 1-3, from the mood enum below
  "subject":  ["empty train platform", "rain on window"],  // 1-3 concrete scenes
  "setting":  "interior" | "exterior" | "abstract",
  "timeOfDay":"dawn" | "morning" | "day" | "dusk" | "night" | "any",
  "palette":  ["muted blue", "warm amber"],    // 1-2
  "query":    "empty train platform at dusk, muted blue, melancholic",  // 최종 검색 문자열
  "avoid":    ["crowd", "bright neon"]         // negative hints (optional)
}

mood enum: melancholic | tense | serene | joyful | mysterious | nostalgic |
           ominous | romantic | absurd | contemplative | urgent | desolate
```

- 배치 처리 (50 quotes/request), 실패 시 재시도, 결과 캐시
- **정성 검증**: 무작위 50개 샘플을 사람이 리뷰한 후 커밋
- 키워드 추출 실패한 항목은 `keywords: null` → 런타임에 mood 기반 generic query 폴백
- 출력: `data/quotes.keywords.json` (커밋)

### 4.4 Stage 4 — 병합 (`4-build-quotes-json.ts`)

> **입력:** `data/raw-quotes.json` + `data/quotes.ko.json` + `data/quotes.keywords.json`
> **출력:** `resources/quotes.json` (커밋됨)

```ts
// resources/quotes.json
type QuotesFile = {
  version: string;
  generatedAt: string;
  quotes: Record<string /* "HH:MM" */, Quote[]>;
};

type Quote = {
  id: string;                 // "0723_01"
  time: string;               // "07:23"
  timeString: string;         // "twenty-three minutes past seven" — quote 본문 내 highlight 대상
  sfw: boolean;
  en: { quote: string; title: string; author: string };
  ko: { quote: string; title: string; author: string };
  keywords: ImageKeywords | null;
};

type ImageKeywords = {
  mood: string[];
  subject: string[];
  setting: 'interior' | 'exterior' | 'abstract';
  timeOfDay: 'dawn' | 'morning' | 'day' | 'dusk' | 'night' | 'any';
  palette: string[];
  query: string;
  avoid?: string[];
};

### 4.5 공통 보조 타입 (`src/shared/types.ts`)

main/preload/renderer 세 곳에서 공유하는 타입들. IPC 채널 페이로드에서 참조된다.

```ts
// 이미지 제공자 식별자
type Provider = 'unsplash' | 'pexels' | 'pixabay' | 'wikimedia' | 'local';

// bg:next IPC 페이로드의 사진 출처 정보
// Unsplash 라이선스상 photographerUrl + sourceUrl 노출 필수
type Credit = {
  provider: Provider;
  photographerName: string;
  photographerUrl: string;           // 사진가 프로필 URL
  sourceUrl: string;                 // 이미지 원본 URL (utm 파라미터 포함)
};

// net:test IPC 반환값의 단일 항목
type ProviderTestResult = {
  provider: Provider;
  ok: boolean;
  latencyMs?: number;                // 응답 시간 (ok=true인 경우)
  error?: string;                    // diagnostics.ts가 생성하는 한국어 원인 설명
};
```
```

**Fallback 규칙 (커버되지 않는 분):**
1. 정확히 일치하는 `HH:MM` 없음 → ±3분 이내 가장 가까운 quote (설정으로 조절 가능)
2. 그래도 없음 → 대형 타이포 디지털 시계 화면 (배경은 그대로 유지)

---

## 5. Image Service

### 5.1 Provider 우선순위 (설정으로 순서 변경 가능)

| # | Provider | Endpoint | Key | 비고 |
|---|---|---|---|---|
| 1 | Unsplash | `api.unsplash.com/search/photos` | 필요 | 최고 품질, attribution 필수 |
| 2 | Pexels | `api.pexels.com/v1/search` | 필요 | 폴백 |
| 3 | Pixabay | `pixabay.com/api/` | 필요 | 폴백 |
| 4 | Wikimedia Commons | `commons.wikimedia.org/w/api.php` | **불필요** | 사내망 최후 수단 |
| 5 | Local | `resources/fallback-bg/` | — | 완전 오프라인 |

### 5.2 검색 흐름

```
minute tick
  → quote 선택
  → 배경 교체 타이밍인가? (설정: quote마다 / N분마다 / 고정)
      → No: 유지
      → Yes: query-builder(quote.keywords) → provider 검색
              → orientation=landscape, 최소 1920px
              → 결과 중 랜덤 pick (최근 사용 20장 제외 → 반복 방지)
              → 다운로드 → cache → renderer에 로컬 경로 전달
```

**query-builder 규칙:**
- 기본: `keywords.query` 그대로 사용
- 결과 0건 → `subject[0] + mood[0]` 로 축약 재시도
- 또 0건 → `mood[0] + setting` 만으로 재시도
- 또 0건 → 사용자 설정의 `defaultQuery` (기본: `"minimal, moody, atmospheric"`)
- 또 0건 → 로컬 폴백
- `keywords.avoid`는 Unsplash/Pexels가 negative query를 지원하지 않으므로 **후처리 필터**
  (결과 이미지의 `alt_description`/`tags`에 avoid 단어가 있으면 제외)

### 5.3 Cache

- 위치: `app.getPath('userData')/bg-cache/`
- LRU, 최대 **60장 / 250MB**
- **Prefetch**: 다음에 쓸 이미지를 미리 1~2장 받아둔다 → 전환 시 네트워크 대기 0
- 오프라인 진입 시 캐시된 이미지를 계속 순환 사용

---

## 6. Network Configuration (외부 API 접근 문제 대응)

사내망/방화벽 환경을 최우선 가정한다. 설정 UI에 아래를 **모두** 노출한다.

### 6.1 설정 항목

| 항목 | 값 | 기본값 |
|---|---|---|
| Proxy mode | `system` / `manual` / `pac` / `direct` | `system` |
| Manual proxy | `http://host:port`, `socks5://host:port` | — |
| Proxy bypass list | `localhost,127.0.0.1,*.corp.local` | — |
| Proxy auth | username / password (`safeStorage` 암호화) | — |
| PAC URL | `http://.../proxy.pac` | — |
| Custom CA cert | `.pem`/`.crt` 파일 경로 (사내 SSL 인스펙션 대응) | — |
| Ignore cert errors | boolean — **위험 경고 표시**, 기본 OFF | `false` |
| Request timeout | 3s / 5s / 10s / 15s | `5s` |
| Retry count | 0 / 1 / 2 / 3 | `2` |
| Retry backoff | exponential, base 500ms | — |
| Offline mode | boolean — 네트워크 완전 차단, 로컬 배경만 | `false` |
| Provider order | drag to reorder | Unsplash → Pexels → Pixabay → Wikimedia → Local |
| **Connection test** | 버튼 → 각 provider별 ✅/❌ + 실패 원인 표시 | — |

### 6.2 구현 노트

- `session.defaultSession.setProxy({ mode })` — Electron 기본 API 사용
- PAC: `setProxy({ mode: 'pac_script', pacScript: url })`
- Custom CA: `app.commandLine.appendSwitch('ignore-certificate-errors-spki-list', ...)` 대신
  `session.setCertificateVerifyProc()`로 명시적 검증 — 무분별한 무시 금지
- Proxy auth: `app.on('login', (e, wc, req, authInfo, cb) => cb(user, pass))`
- **모든 요청은 HTTPS/443 표준 포트만.** WebSocket, 커스텀 포트, P2P 금지
- **Diagnostics**: 실패 시 사용자에게 보여줄 원인 분류
  - `ENOTFOUND` → "DNS 해석 실패 — 도메인이 차단되었을 수 있습니다"
  - `ECONNREFUSED` / `ETIMEDOUT` → "연결 차단 — 프록시 설정을 확인하세요"
  - `CERT_*` → "SSL 인증서 오류 — 사내 CA 인증서 등록이 필요할 수 있습니다"
  - `401`/`403` → "API 키가 잘못되었습니다"
  - `429` → "요청 한도 초과 — 다음 provider로 폴백합니다"

### 6.3 `resources/FIREWALL.md` (IT팀 제출용, 앱과 함께 생성)

허용 필요 도메인 (443/TCP outbound):
```
api.unsplash.com          images.unsplash.com
api.pexels.com            images.pexels.com
pixabay.com               cdn.pixabay.com
commons.wikimedia.org     upload.wikimedia.org
```
> 이 앱은 inbound 연결을 받지 않으며, 텔레메트리를 전송하지 않는다.

---

## 7. Transitions

### 7.1 Image Transition (설정으로 선택)

| id | 이름 | 동작 | 기본 duration |
|---|---|---|---|
| `dim-crossfade` ★ | Dimming Cross-fade | A dim down(0.8s) → B fade in(1.6s) → B dim up(1.2s). 총 2.6s | 2600ms |
| `pure-fade` | Simple Fade | opacity만 | 800ms |
| `blur-morph` | Blur Morph | A `blur(0→12px)` + B `blur(12→0)` 동시 | 1400ms |
| `slide` | Slide | B가 왼→오 `translateX` 진입 | 1200ms |
| `none` | Instant | 즉시 교체 | 0ms |

`dim-crossfade` 타임라인 (기본값):
```
t=0.0        A: opacity 1.0, brightness 1.0
t=0.0→0.8    A: brightness 1.0 → 0.35
t=0.6→2.2    B: opacity 0 → 1        (B는 이미 디코딩 완료 상태)
t=1.4→2.6    B: brightness 0.35 → 1.0
t=2.6        A 언마운트
easing: cubic-bezier(0.4, 0, 0.2, 1)
```

**추가 설정:**
- `kenBurns`: boolean (기본 OFF) — `scale(1.0 → 1.06)` 60s linear
- `overlayOpacity`: 0.0 ~ 0.6 (기본 0.35) — 텍스트 가독성용 dark overlay
- `duration multiplier`: 0.5x / 1x / 1.5x / 2x

### 7.2 Text Transition (설정으로 선택)

| id | 이름 | 동작 | 성격 |
|---|---|---|---|
| `blur-lift` ★ | Blur Lift | out: `opacity 1→0, translateY -8px, blur 0→4px` (400ms) / in: `opacity 0→1, translateY 12px→0, blur 6px→0` (600ms) | 기본값. 미니멀 + 문학적 |
| `fade` | Simple Fade | opacity만 (300ms) | 가장 절제됨, 저사양 |
| `typewriter` | Typewriter | 글자 단위 순차 노출 (한글은 음절 단위, 20ms/char, 최대 2.5s clamp) | 문학적, 긴 인용문엔 부적합 |
| `mask` | Mask Reveal | `clip-path: inset()` 왼→오 wipe (400ms), 라인별 stagger | 세련됨 |
| `slide-up` | Slide Up | `translateY(20px→0)` + opacity (500ms) | 담백 |
| `none` | Instant | 즉시 교체 | — |

**Stagger** (모든 모드 공통, 설정으로 ON/OFF):
`EN quote → EN attribution → KO quote → KO attribution` 순서, 각 80ms 지연.
easing: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo)

**충돌 회피 규칙 (중요):**
텍스트는 매 분, 배경은 N분마다 바뀐다. 동시에 발생할 때는
**텍스트 전환을 200ms 선행**시켜 두 모션이 겹쳐 보이지 않게 한다.

**`prefers-reduced-motion` 또는 설정의 `reduceMotion: true`** →
image = `pure-fade` 500ms, text = `fade` 300ms 로 강제 다운그레이드.

---

## 8. Settings Schema

```ts
interface Settings {
  display: {
    language: 'en' | 'ko' | 'both';        // 'both'
    sfwOnly: boolean;                       // true
    fontScale: number;                      // 1.0  (0.8 ~ 1.6)
    theme: 'auto' | 'dark' | 'light';       // 'auto'
    quoteFallbackWindowMin: number;         // 3
    showCredit: boolean;                    // true (Unsplash 라이선스상 강제 권장)
  };
  background: {
    enabled: boolean;                       // true
    providerOrder: Provider[];              // ['unsplash','pexels','pixabay','wikimedia','local']
    keys: { unsplash?: string; pexels?: string; pixabay?: string };  // safeStorage 암호화
    useQuoteKeywords: boolean;              // true — false면 defaultQuery만 사용
    defaultQuery: string;                   // 'minimal, moody, atmospheric'
    changeMode: 'per-quote' | 'interval' | 'fixed';   // 'interval'
    intervalMin: 1 | 5 | 10 | 30 | 60;      // 10
    cacheMaxItems: number;                  // 60
    cacheMaxMB: number;                     // 250
  };
  transition: {
    image: {
      effect: 'dim-crossfade' | 'pure-fade' | 'blur-morph' | 'slide' | 'none';  // 'dim-crossfade'
      durationMult: 0.5 | 1 | 1.5 | 2;      // 1
      kenBurns: boolean;                    // false
      overlayOpacity: number;               // 0.35
    };
    text: {
      effect: 'blur-lift' | 'fade' | 'typewriter' | 'mask' | 'slide-up' | 'none'; // 'blur-lift'
      durationMult: 0.5 | 1 | 1.5 | 2;      // 1
      stagger: boolean;                     // true
    };
    reduceMotion: boolean;                  // false
  };
  network: {
    proxyMode: 'system' | 'manual' | 'pac' | 'direct';  // 'system'
    proxyUrl?: string;
    proxyBypass?: string;
    proxyAuth?: { user: string; pass: string };          // safeStorage 암호화
    pacUrl?: string;
    customCaPath?: string;
    ignoreCertErrors: boolean;              // false
    timeoutMs: 3000 | 5000 | 10000 | 15000; // 5000
    retryCount: 0 | 1 | 2 | 3;              // 2
    offlineMode: boolean;                   // false
  };
  startup: {
    autoLaunch: boolean;                    // false
    fullscreen: boolean;                    // false
    minimizeToTray: boolean;                // true
  };
}
```

---

## 9. IPC Contract

| Channel | Direction | Payload |
|---|---|---|
| `clock:tick` | main → renderer | `{ time: "07:23", quote: Quote \| null }` |
| `bg:next` | main → renderer | `{ localPath: string, credit: Credit \| null }` |
| `bg:error` | main → renderer | `{ reason: string }` — UI는 조용히 무시 (로그만) |
| `settings:get` | renderer → main | `() => Settings` |
| `settings:set` | renderer → main | `(patch: DeepPartial<Settings>) => Settings` |
| `net:test` | renderer → main | `() => ProviderTestResult[]` |
| `app:toggleFullscreen` | renderer → main | `()` |
| `app:openExternal` | renderer → main | `(url: string)` — allowlist 검증 후 `shell.openExternal` |

preload는 `contextBridge.exposeInMainWorld('api', {...})` 만 사용. `ipcRenderer` 직접 노출 금지.

**`app:openExternal` 허용 도메인 (allowlist):**
```ts
const OPEN_EXTERNAL_ALLOWLIST = [
  /^https:\/\/unsplash\.com\//,
  /^https:\/\/www\.pexels\.com\//,
  /^https:\/\/pixabay\.com\//,
  /^https:\/\/commons\.wikimedia\.org\//,
];
// main/ipc.ts에서 shell.openExternal 호출 전 검증
```

---

## 10. Security

```ts
new BrowserWindow({
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
    preload: path.join(__dirname, '../preload/index.js'),
  },
});
```

CSP (renderer `index.html`):
```
default-src 'self';
img-src 'self' file: data: blob:;
font-src 'self';
style-src 'self' 'unsafe-inline';
script-src 'self';
connect-src 'none';
```

- `contents.setWindowOpenHandler` → 전부 `{ action: 'deny' }`, 외부 링크는 IPC 경유
- `will-navigate` 차단
- API 키·프록시 비밀번호는 `safeStorage.encryptString()` 후 저장

---

## 11. Build & Distribution

```yaml
# electron-builder.yml
appId: com.example.kairos
productName: Kairos
directories: { output: dist }
win:
  target:
    - { target: nsis, arch: [x64] }
    - { target: portable, arch: [x64] }
  icon: build/icon.ico
nsis:
  oneClick: false
  perMachine: false                # 관리자 권한 불필요
  allowToChangeInstallationDirectory: true
extraResources:
  - resources/quotes.json
  - resources/fallback-bg/**
  - resources/fonts/**
  - resources/FIREWALL.md
```

- 코드 서명 없으면 SmartScreen 경고 발생 → 사내 배포 시 IT 화이트리스트 등록 안내
- 자동 업데이트는 **구현하지 않는다** (사내망 고려)

---

## 12. Licensing Notes

| 항목 | 조치 |
|---|---|
| Quote 데이터 (`ligurio/litclock`) | 원본 라이선스를 **반드시 확인 후** `THIRD_PARTY.md`에 명시 |
| 한글 번역본 | 기계번역 2차 저작물 — 사내/개인 사용 한정 권장 |
| Unsplash | Unsplash License. **photographer attribution + `?utm_source=kairos&utm_medium=referral` 링크 필수** |
| Pexels / Pixabay | attribution 권장 |
| Fonts | EB Garamond (OFL), Pretendard (OFL) — 임베드 가능 |

---

## 13. Milestones

| M | 내용 | Done 조건 |
|---|---|---|
| **M1** | `scripts/1~4` 파이프라인 → `resources/quotes.json` | EN+KO+keywords 포함, 샘플 50개 사람 검수 통과 |
| **M2** | Electron 스켈레톤 + clock tick + QuoteCard (로컬 배경 고정) | 창모드에서 매 분 quote 갱신 확인 |
| **M3** | image-service + providers + cache + query-builder | 인용문에 어울리는 이미지가 실제로 뜨는지 눈으로 확인 |
| **M4** | net/proxy + diagnostics + Connection test UI | 프록시 환경에서 동작 검증 |
| **M5** | 전환 효과 5종 × 2 (image/text) + 설정에서 실시간 프리뷰 | 모든 조합이 끊김 없이 동작 |
| **M6** | 설정 UI 전체 + tray + fullscreen + autoLaunch | 기능 완성 |
| **M7** | `electron-builder` 패키징 + FIREWALL.md + QA | `.exe` 설치 → 오프라인 PC에서 정상 동작 |

---

## 14. Working Agreements (Claude Code 작업 규칙)

- **스키마를 추측하지 말 것.** `ligurio/litclock` 실제 파일을 먼저 열어보고 파서를 작성한다.
- 마일스톤 순서대로 진행. M1 완료 전 M3를 건드리지 않는다.
- 새 npm 의존성 추가 전에 **native 모듈 여부를 확인**한다 (§2.6 위반 금지).
- 전환 효과는 CSS로 구현한다. 애니메이션 라이브러리(framer-motion 등) 도입 시 번들 크기를 근거로 제시할 것.
- 네트워크 실패 경로를 **먼저** 작성하고 성공 경로를 나중에 붙인다. 폴백이 기본이다.
- 커밋 단위는 마일스톤 하위 기능 1개.
