# `apps/mobile` 에이전트 작업 가이드

이 파일은 `apps/mobile/**`에 적용된다. 독립 프로젝트에 적용한다. API 서버는 ../findthem/apps/api에 유지한다.

## 작업 전 필독

1. [`PROJECT_STATUS.md`](PROJECT_STATUS.md)에서 현재 구조와 기능 상태를 확인한다.
2. 변경할 Expo route와 가장 가까운 `src/components`/`src/hooks` 구현을 읽는다.
   - 화면·스타일·아이콘·이미지 작업은 [`design.md`](design.md)를 먼저 읽는다. 제안·제작 기준과 실제 적용 상태를 구분하고, 공식 브랜드 값은 `./brands/mewvo/brand.json`을 우선한다.
3. API 계약을 바꾸면 `../findthem/apps/api/src/routes/`의 실제 라우트와 `./packages/shared/src/` 소비자를 함께 검색한다.
4. 빌드·서명 작업이면 [`BUILD.md`](BUILD.md)와 `../findthem/.claude/references/deployment-mobile.md`를 코드/설정과 대조한다.

구현 상태의 진실 순서는 `app.json`/`app.config.js`/`eas.json` → `package.json`/lockfile → `app/`과 `src/` → `PROJECT_STATUS.md` → `SPEC.md`/기존 `.claude` 문서다.

## 프로젝트 경계

- 루트 workspace 밖의 독립 프로젝트다. 설치·TypeScript·Expo 명령은 이 디렉터리에서 실행한다.
- `packages/shared`의 빌드 결과를 Metro가 직접 해석한다. 공유 타입을 바꾸면 프로젝트 루트에서 `npm run build:shared`를 먼저 실행하고 API 및 다른 소비자도 확인한다.
- 모바일은 `/api/*`의 소비자다. 요청/응답 변경은 가능한 한 하위 호환으로 하고 웹 클라이언트도 검색한다.
- 생성되는 `android/`, `ios/`는 gitignore 대상이다. 네이티브 수정은 가능하면 config plugin 또는 Expo 설정에 반영해 `prebuild` 재생성 후에도 유지한다.

## 구현 규칙

- expo-router 파일 기반 라우팅을 유지한다. 페이지는 `app/`, 재사용 로직은 `src/`에 둔다.
- 서버 상태는 기존 TanStack Query 훅을 우선 사용하고, 앱 전역 상태는 현재 Context 구조(`Auth`, `Location`)를 따른다.
- API 요청은 `src/lib/api.ts`의 `api`를 사용한다. 토큰은 SecureStore의 `ft_token`, 인증 헤더는 `Authorization`과 필요 시 `x-app-key`다.
- 공용 계약은 `@findthem/shared`를 우선한다. 모바일 전용 표시 모델만 `src/types`에 둔다.
- 스타일은 React Native `StyleSheet`이 기준이다. NativeWind/web DOM API를 도입하지 않는다.
- 앱은 한국어 전용이므로 이 앱 범위에서는 UI 문자열 직접 사용이 허용된다.
- 위치·카메라·사진·알림 권한은 거부/재허용/설정 복귀 상태를 모두 처리한다.
- Naver Map은 네이티브 모듈이다. Expo Go 성공을 완료 기준으로 삼지 않는다.
- `console.*`는 제품 코드에서 추가하지 않는다. 불가피한 진단 로그는 기존 패턴처럼 `__DEV__`로 제한하고 제거 가능하게 둔다.
- 환경변수와 토큰을 문서·코드·스크린샷에 실제 값으로 넣지 않는다. `EXPO_PUBLIC_*`는 비밀이 아니다.

## 변경별 확인 위치

| 변경 | 먼저 볼 파일 | 함께 확인할 영역 |
| --- | --- | --- |
| 동네 지도 | `app/(tabs)/browse.tsx` | `src/features/nearby`, `LocationContext`, `/reports` radius query |
| retired deep link | `app/(tabs)/index`, `community`, `alerts`, `app/community`, `app/dm` | redirect stub 이외 구현을 다시 넣지 않음 |
| 알림 | `app/notifications.tsx` | Expo Notifications, 신고·제보 상세 이동 |
| 신고·제보 | `app/reports`, `app/sightings` | 이미지 압축/FormData, shared 타입, API route |
| 인증 | `src/hooks/useAuth.ts`, `src/lib/socialAuth.ts` | SecureStore 키, OAuth callback/deep link, 게스트 fallback |
| 결제 재도입 | 별도 kickoff 필요 | OneSub 서버, 스토어 상품, 복구·영수증·transaction finish 전체 감사 |

## 검증

최소 검증은 의존성 설치 후 다음과 같다.

```bash
npm run typecheck
npm run lint
npm test
npm run export:android
```

화면 변경은 custom dev client에서 대상 화면을 직접 확인한다. 권한·딥링크·푸시·지도 변경은 Android와 iOS의 차이를 고려한다. 테스트/빌드를 실행하지 못했다면 이유를 결과에 명시한다. 배포, 스토어 제출, 구매, DB 변경은 단순 검증으로 실행하지 않는다.

## 문서 유지

이름·소개·아이콘·마켓 이미지 등 브랜드 작업은 [`./brands/mewvo/README.md`](./brands/mewvo/README.md)와 `brand.json`을 먼저 읽는다. 공식 값은 해당 JSON을 참조하고 중복 상수를 만들지 않는다. 브랜드 합의와 실제 구현·출시 상태를 구분한다.

라우트, Provider, 환경변수, 핵심 기능 상태, 빌드 방식 또는 알려진 위험이 바뀌면 같은 변경에서 `PROJECT_STATUS.md`를 갱신한다. 제품 아이디어나 목표 설계는 `SPEC.md`, 현재 구현 사실은 `PROJECT_STATUS.md`에 기록한다.
