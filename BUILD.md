# 우리 아이 모바일 빌드 · 배포

기본 CI는 **office-stable Jenkins**, macOS agent **svl-mac-01**이다.
앱 식별자는 iOS/Android 모두 `gg.pryzm.union`을 유지한다.

## 도구와 소스

- 파이프라인: `deploy/jenkins/Jenkinsfile.mobile`, 작업명 `findthem-mobile`.
- CLI: 독립 mobile 프로젝트의 devDependency `mimi-seed@0.19.13` (2026-09-10 npm latest 확인).
- 실행 중인 Mimi Seed MCP도 0.19.13. CLI는 앱 런타임 SDK가 아닌 CI/스토어 운영 도구다.
- 루트 `.mimi-seed.json`은 이 프로젝트의 작업을 지정하여 개인 CoffeeCong 기본 작업 상속을 방지한다.
- 웹/API GitHub Actions는 여러 서비스의 공유 배포이므로 유지한다. EAS는 수동 대체 빌드 경로다.
- 참조: `virgm-devops/jenkins/coffeecong/README.md`, CoffeeCong Jenkinsfile, `coffee/.mimi-seed.json`.

## office-stable 연결

- 사내: http://192.168.30.23:8080/job/findthem-mobile/
- Tailscale: http://100.106.148.39:8080/job/findthem-mobile/
- 이 PC에서는 2026-09-10 Tailscale 연결 확인. LAN 직접 접속은 실패했다.
- 개인 인증은 `~/.mimi-seed/jenkins.json`. 토큰은 저장소에 넣지 않는다.
- CLI는 개인 인증 URL과 manifest URL의 완전 일치를 요구한다. 현재 둘 다 사내 URL이다.
  외부 CLI 사용 시 두 URL을 같은 Tailscale 주소로 맞춘다. 다른 프로젝트에도 영향을 주므로 개인 URL을 자동 변경하지 않았다.
- 기존 MCP가 연결되어 있어 중복 등록하지 않는다.

## Jenkins 구성

작업은 활성 상태이며, `Jenkinsfile.mobile`을 유일한 실행 소스로 사용한다.
`node deploy/jenkins/jenkins.mjs sync`가 Jenkins 서버에서 문법 검증한 뒤
`job.mobile.xml`의 파라미터와 실행 스크립트를 함께 반영한다. 비밀값은 개인 Mimi Seed 설정과 Jenkins credentials에만 둔다.
controller에는 FindThem SSH 키가 없으므로 inline Pipeline이 Mac agent에서 private 저장소를 checkout한다.
임시 `Jenkinsfile.office-wrapper`는 삭제했다. 자동 트리거는 없다.

Agent 환경은 CoffeeCong와 동일하다:

```text
PATH+OFFICE_TOOLS=/Users/svlmac01/.nvm/versions/node/v24.13.0/bin:/opt/homebrew/bin:/usr/local/bin
LANG=en_US.UTF-8
LC_ALL=en_US.UTF-8
```

Xcode, CocoaPods, JDK/Android SDK와 기존 gg.pryzm.union 서명 인증서가 필요하다.
root shared workspace와 독립 mobile에서 각각 npm ci를 실행한다.
타입 검사·lint·테스트 후 Expo prebuild --clean으로 native 폴더를 재생성한다.
iOS workspace/scheme은 생성 결과에서 찾는다. Android release는 기존 keystore로 서명하며 debug 서명으로 대체하지 않는다.

| Credential / 자료 | 용도 · 상태 |
| --- | --- |
| `vir-gitlab-token` | office-stable 존재 확인. private devops 저장소 HTTPS 읽기 |
| `svl-mac-01-keychain-password` | 존재 확인. iOS codesign keychain unlock |
| `speakreward-app-key` | credential 설명이 공유 FindThem APP_KEY임을 확인. 공통 /api의 x-app-key로 사용. 관리자 키가 아님 |
| `findthem-googleplay-json` | gg.pryzm.union 조회에 성공한 Mimi Seed 기본 SA를 등록. production/internal 기존 versionCode 86 확인 |
| `findthem-appstore-p8` | .secret의 A97DY76WFW 키를 등록. gg.pryzm.union 앱/빌드 조회 성공 확인 |
| devops `jenkins/findthem/` | 기존 Android release keystore/properties. private checkout에서만 읽고 로그·산출물에 포함하지 않음 |

GitHub FindThem은 **private** 저장소다. Mac agent의 기존 `~/.ssh/id_ed25519_findthem` 키로 읽는다.
fetch 결과인 `FETCH_HEAD`를 detached checkout하여 remote branch 자동 생성 오류를 피한다. 다른 앱의 GitHub credential을 사용하지 않는다.
다른 앱의 Play credential이나 Android 서명을 대신 사용하지 않는다.

## 실행과 산출물

- Play 업로드 중 HTTP 400 `This edit has expired`가 나면 새 edit를 만들어 최대 3회 시도한다(5초/10초 대기). 매번 현재 트랙과 교체할 초안 번호를 다시 확인한다.
  업로드 성공 이후 오류, 일반 네트워크 오류, 권한·심사·버전 충돌은 자동 반복하지 않는다. 이미 업로드된 번들이나 commit 결과를 먼저 확인해야 한다.
  업로드 중에는 같은 앱의 Play Console 변경과 다른 edit 기반 API 도구 실행을 피한다. 새 edit 생성/commit 또는 Console 변경이 진행 중인 edit를 무효화할 수 있다([Google 문서](https://developers.google.com/android-publisher/edits)).

- BUILD_TARGET: both / android / ios, 기본 both.
- SRC_GIT_COMMIT: 브랜치 또는 전체 SHA, 기본 master. 재현 가능한 재빌드에는 전체 SHA를 지정한다.
- STORE_BUILD_NUMBER: 비우면 Mac agent의 `~/.mewvoice-ci/build-number.json` 영속 카운터에서 다음 번호를 예약한다.
  공개 버전 86을 기준으로 87부터 시작한다. 이후 88, 89 순서이며 실패한 빌드 번호는 재사용하지 않는다.
  큰 날짜 기반 번호는 미출시 초안이며, 87의 스토어 수락을 확인하기 전에는 전환 완료로 간주하지 않는다.
  카운터 파일은 백업 대상이며 삭제하거나 다른 agent로 이전할 때 스토어 사용 번호를 먼저 확인한다.
- 사용자 요청에 따라 두 업로드 옵션 기본 true. 선택한 플랫폼만 업로드한다. APK/AAB/IPA, iOS dSYM, 소스 SHA·버전 build.json을 Jenkins artifacts로 보관한다.
- ANDROID_PUBLISH_TO_GOOGLEPLAY=true: Play internal draft까지만 저장. 테스터 배포/production 승격은 별도 출시 절차다.
- IOS_UPLOAD_TO_TESTFLIGHT=true: TestFlight 업로드. App Review 제출이나 공개 출시는 수행하지 않는다.
- 업로드 전 산출물을 보관한다. 성공/실패 후 이 작업의 checkout과 서명 임시파일을 정리한다.
- 소스 버전 자동 commit/push, Slack, Webfile, 구형 Play publisher 플러그인을 사용하지 않는다.

CLI deploy는 실제 실행 시 업로드 플래그를 켠다. 빌드만 확인하려면 Jenkins에서 두 업로드 플래그를 명시적으로 끈다.
다음 plan 명령은 네트워크 호출·빌드·스토어 쓰기가 없는 로컬 dry-run이다:

```bash
cd C:/Users/turbo08/mew_voice
npm ci
npm run mimi:plan:android
npm run mimi:plan:ios
npm run test:ci
npm run mimi:doctor
```

실제 CLI 출시에는 Mimi Seed 등록 앱 ID(--app-id)와 스토어 인증이 추가로 필요하다.
패키지명을 등록 ID로 임의 대체하지 않는다.

## 출시 전 확인

실기기 카메라·마이크·권한 거부·업로드 중단·세션 격리 확인이 남아 있다.
현재 제품 변경은 API와 함께 배포해야 한다. API 서버에는 울음 검증용 ffmpeg가 필요하며
COMPANION_FFMPEG_PATH로 경로를 지정할 수 있다. 모바일 빌드로 API 배포나 DB migration이 수행되지는 않는다.
기존 native 백업은 `.tmp/mobile-before-pet-companion-20260910`에 있고 새 빌드 입력으로 사용하지 않는다.

## Jenkins #23 오류 수정 검증 (2026-09-11)

- 실패 지점: Play bundle upload의 HTTP 400 edit 만료. Android/iOS native 빌드·산출물 보관·TestFlight 단계는 성공했다.
- CI 회귀 테스트 12개, 모바일 TypeScript·lint·Jest 30개, Android Hermes export 통과. Windows 샌드박스의 Hermes 실행 권한 오류는 일반 사용자 권한으로 export를 재실행하여 통과했다.
- 수정 코드는 로컬 검증 완료 상태이며, 원격 Jenkins 재실행과 새 스토어 업로드는 수행하지 않았다. #23의 기존 FAILURE 기록은 그대로다.

## 이번 변경 검증 (2026-09-10)

- 모바일 타입 검사, lint, Jest 14개, CI 스크립트 2개 테스트 통과.
- Android Hermes 번들 export 성공. iOS archive와 IPA 업로드는 #11에서 성공했다. Android native 빌드는 아래 이력 참조.
- Mimi Seed Android/iOS dry-run에서 findthem-mobile 작업 선택 확인.
- office-stable Jenkinsfile 검증 성공, svl-mac-01 온라인 확인. 아래 마켓 전송 이력 참조.

## 마켓 전송 진행 (2026-09-10)

- 커피콩의 환경변수 사전 주입, keychain unlock, Android Publisher API 업로드, Xcode exportArchive 업로드 흐름을 반영했다.
- 준비 단계가 native 재생성보다 먼저 실행되므로 앱 버전과 APP_KEY가 실제 바이너리에 반영된다.
- 기존 #1–#9는 소스 checkout 또는 임시 wrapper 문제로 실패했다. #10부터 통합 파이프라인으로 iOS 업로드를 진행한다.
- Google 인증은 Mimi Seed의 기본 서비스 계정으로 해결했다. Downloads의 Firebase 계정은 사용하지 않는다.
  별도 Google 로그인이나 새 API 활성화가 이 업로드 경로의 전제조건은 아니다.
- iOS #11: Jenkins SUCCESS, App Store Connect 빌드 `211200382` VALID 확인. 앱 ID `6760902018`.
  React/ReactNativeDependencies/Hermes 사전 빌드 framework의 dSYM 누락 경고는 있었으나 IPA 업로드·처리는 성공했고 앱 dSYM은 Jenkins에 보관했다.
- Android #12에서 Expo debug/release 서명 설정이 각각 존재하는 경우를 확인하여, release만 운영 키로 바꾸도록 수정하고 회귀 테스트를 추가했다.
- Android #13의 SDK 경로 누락은 커피콩과 같이 `local.properties`를 생성하여 해결했다.
- Android #14에서 운영 서명 APK/AAB native 빌드 및 Jenkins 보관 성공. Play AAB 전송·검증 후 commit의 `changesNotSentForReview` 옵션이 거부되어 수정했다.
  내부 트랙의 새 릴리스는 `draft`로 저장하고, 다른 심사가 진행 중이면 `ERROR_IF_IN_REVIEW`로 중단한다.
- Android #15: Jenkins SUCCESS, Google Play internal에 `1.1.0 (211201992)` draft 등록을 API로 확인했다. 기존 production/internal의 completed 버전 86은 유지됐다.
- 양 플랫폼 바이너리 전송은 완료했다. 공개 출시, App Review 제출, 테스트 사용자 초대는 수행하지 않았다. 실기기 검증과 새 제품 API 배포는 별도 작업이다.

## 2026-10-03 — 독립 프로젝트 이전

위치: C:/Users/turbo08/mew_voice. 브랜드는 brands/mewvo, 공유 계약 스냅샷은 packages/shared에 포함한다. API는 ../findthem/apps/api에 유지한다. 계약 변경 시 스냅샷도 동기화한다. npm ci의 postinstall에서 공유 타입을 빌드한다. Jenkins·Gradle 빌드와 기존 앱 식별자·서명을 유지한다.

원격 Jenkins 작업은 변경하지 않았다. 새 Git 원격에 소스를 게시하고 SRC_GIT_URL을 설정한 뒤 파이프라인 동기화가 필요하다. 기존 작업은 FindThem 원격 소스를 조회한다. 실제 native 빌드·스토어 업로드는 실행하지 않았다.
CLI trigger/build 사용 시 MEW_VOICE_GIT_URL 환경변수에 새 Git SSH URL을 지정한다. Jenkins UI에서는 SRC_GIT_URL 파라미터로 지정한다.
이전 후 검증: npm ci·shared 빌드, TypeScript, lint, Jest 8개 스위트/37개 테스트, Jenkins 회귀 테스트 12개, Android Hermes export 통과. Gradle native 빌드와 원격 Jenkins 동기화·스토어 업로드는 실행하지 않았다. Git은 독립 저장소로 초기화했으며 commit/push하지 않았다.

## 공개 교육용 저장소 전환

원격: https://github.com/jeonghwanko/mew_voice. 교육용 소스 공개 라이선스 적용. 제3자 모델은 원래 라이선스 유지. Jenkins SRC_GIT_URL 기본값은 새 HTTPS URL이며 MEW_VOICE_GIT_URL은 선택적 재정의다. source/ 루트에서 설치·검증·prebuild 후 Gradle로 빌드한다. 앱 식별자·서명은 유지한다.
