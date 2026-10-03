# 뮤 보이스 모바일

교육용 소스 공개 프로젝트입니다. 개인 학습·수업·교육 실습에 한해 사용·수정·재배포할 수 있습니다. 상업 이용·유료 교육 상품·실서비스 운영은 별도 서면 허가가 필요합니다. 일반 학교 등록금은 수업 이용을 막지 않습니다. [LICENSE](LICENSE)와 [제3자 라이선스](THIRD_PARTY_NOTICES.md)를 확인하세요.

체험 모드는 로컬 데이터로 실행할 수 있습니다. 계정·AI 기능에는 별도 API 서버가 필요하며 운영 API 접근 권한은 제공하지 않습니다.

고양이 선택 → 오늘의 돌봄 기록 또는 사진 관찰 → 보호자 반응 → 기록을 인용하는 대화.
브랜드 이름·문구·에셋 상태는 [브랜드 SSOT](./brands/mewvo/README.md)에서 관리한다. 앱 표시명은 `app.config.js`가 원본 JSON을 직접 참조한다.

화면·컴포넌트·아이콘·이미지 제작 기준은 [design.md](design.md)를 먼저 확인한다. 승인된 고양이 말풍선 캐릭터를 바탕으로 한 다음 UI 개편 제안이며, 현재 적용 상태와 구분한다.

## 실행

독립 Expo SDK 54 / React Native 0.81 프로젝트다. 이 디렉터리에서 실행한다.

```sh
npm ci
npm run web
# 또는 Android/iOS custom dev client
npm start
```

첫 화면의 **체험으로 살펴보기**는 기기 내 데이터만 사용한다. 사진을 서버에 보내지 않으며 실제 AI 분석을 하지 않는다. 초기 모모는 가상 프로필이다. 입력한 반응 기록을 대화에서 실제로 다시 찾아볼 수 있다. 체험 데이터는 앱 파일 저장소(웹은 localStorage)에 유지된다.

**계정으로 시작하기**는 `.env`의 `EXPO_PUBLIC_API_URL`에 연결한다. 기본 예시는 `http://localhost:4000/api`다. Android 에뮬레이터에서는 `10.0.2.2`, USB 기기에서는 `adb reverse tcp:4000 tcp:4000` 등 해당 개발 환경에 맞게 설정한다. Expo Go를 실기기 검증 완료 기준으로 삼지 않는다.

## 실제 API 연결 전

- `20260910120000_pet_companion`, `20260910133000_companion_checkins` 두 migration을 검토한 뒤 개발 DB에 적용한다. 격리된 임시 PostgreSQL에서만 적용·검증했으며 운영 DB에는 적용하지 않았다.
- API의 PostgreSQL·Redis와 기존 AI provider 설정이 필요하다. 사진·대화 생성은 BullMQ worker가 처리한다.
- private-companion 디렉터리는 public uploads의 형제 디렉터리다. 공개 정적 경로로 마운트하지 않는다.
- 기존 계정 로그인 또는 명시적인 개발용 게스트 가입을 사용한다. 게스트 토큰을 잃으면 복구할 수 없으므로 정식 출시는 계정 연동을 보완해야 한다.

## 검증

```sh
npm run typecheck
npm run lint
npm test
npm run export:android
npm run export:web
```

검증된 범위와 남은 작업은 [PROJECT_STATUS.md](PROJECT_STATUS.md), 제품 목표는 [SPEC.md](SPEC.md), 개발 순서는 [HANDOFF.md](./docs/plans/pet-companion/HANDOFF.md)에 기록한다.

## 기존 앱 복구

기준 commit: `7a41e2a7752ac9de7a2aabfa15ec5d83874a8427`.
로컬 백업: 저장소 `.tmp/mobile-before-pet-companion-20260910` (Git 제외). 기존 소스·에셋·설정은 해시 검증 후 백업했고, 기존 android/dist/.expo 생성물도 보관했다. 비밀 설정은 백업에만 있으며 공유/commit하지 않는다.

기존 gg.pryzm.union / findthem / EAS 연결 식별자는 유지했다. 스토어 업데이트/신규 앱 선택 전 제출하지 않는다. 지도·실종 신고 클라이언트와 관련 SDK는 제거했지만 기존 공통 API·웹·데이터는 제거하지 않았다.

## 2026-10-03 — 독립 프로젝트 이전

위치: C:/Users/turbo08/mew_voice. 브랜드는 brands/mewvo, 공유 계약 스냅샷은 packages/shared에 포함한다. API는 ../findthem/apps/api에 유지한다. 계약 변경 시 스냅샷도 동기화한다. npm ci의 postinstall에서 공유 타입을 빌드한다. Jenkins·Gradle 빌드와 기존 앱 식별자·서명을 유지한다.

원격 Jenkins 작업은 변경하지 않았다. 새 Git 원격에 소스를 게시하고 SRC_GIT_URL을 설정한 뒤 파이프라인 동기화가 필요하다. 기존 작업은 FindThem 원격 소스를 조회한다. 실제 native 빌드·스토어 업로드는 실행하지 않았다.
