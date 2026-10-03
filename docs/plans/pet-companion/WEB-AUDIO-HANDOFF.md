# 고양이 멀티모달 대화 웹·모바일 구현 핸드오프

## 목표

`apps/web`의 `/findthem`과 `apps/mobile`을 같은 사진·울음소리 관찰 제품으로 통합한다. 보호자는 한 번에 사진 또는 짧은 녹음 하나를 보내고, 관찰 가능한 신호·복수 가능성·한계·다음 행동을 받은 뒤 실제 반응을 기록해 후속 대화의 근거로 쓴다.

기준 문서는 `DECISIONS.md`의 2026-09-10 통합 결정, `WEB-AUDIO-SPEC.md`, `web-audio-flow.html`이다.

## API 작업

1. `POST /api/pet-companion/observations`가 `PHOTO|AUDIO`를 받도록 확장한다.
2. 사진은 현재 EXIF 제거·JPEG 재인코딩을 유지한다. 오디오는 실제 MIME·컨테이너·크기와 최대 길이를 검증하고 `durationMs`를 비공개 media metadata에 저장한다.
3. 분석 큐를 입력 종류별로 분기한다. 오디오는 Gemini 호환 멀티모달 경로와 음성 전용 안전 프롬프트를 사용하고, 공급자/신호가 지원되지 않으면 `ABSTAINED` 결과를 저장한다.
4. 재시도도 관찰 종류를 보존한다. 삭제·동의 철회와 경합해 완료 상태가 되지 않도록 기존 guard를 유지한다.
5. shared DTO에 media metadata를 추가하고 사진·오디오 양쪽의 계약 테스트를 만든다.

## 프론트엔드 작업

1. `/findthem`을 독립형 컴패니언 앱 셸로 교체한다. 홈, 고양이 등록, 사진/녹음 작성, 처리/결과, 기록/대화, 설정을 한 제품 안에서 연결한다.
2. 웹은 MediaRecorder와 파일 선택 폴백을 제공하고, 녹음 시간·중지·재생·폐기 상태를 키보드와 화면 판독기로 조작할 수 있게 한다.
3. 모바일은 Expo SDK 54 권장 `expo-audio`를 사용한다. 백그라운드 녹음은 켜지 않고 마이크 권한 이유와 거부 복구를 명시한다.
4. 처리 상태는 새로고침/앱 복귀 후 복구하고 `ABSTAINED`, `FAILED`, `NEEDS_CONTEXT`를 구분한다.
5. 기존 findthem 사용자 URL은 `/findthem`으로 replace 이동한다. `/`, `/partners`, `/n/:code`, `/partner-admin/*`, CoffeeCong·맑음 관리자 경로는 보존한다.

## 레거시 제거와 DB

새 사용자 경험과 API가 검증된 뒤 기존 실종 신고·목격·매칭·홍보·커뮤니티·게임·DM 코드와 findthem 전용 관리자 화면을 제거한다. route/job/cron/admin/test/static reference가 모두 사라진 모델만 Prisma schema와 forward drop migration에 포함한다. `User`, Companion 모델, 공통 운영 모델, CoffeeCong·맑음·기타 서비스 모델은 유지한다. 운영 migration은 실행하지 않는다.

## 완료 조건

- 웹과 모바일에서 사진 또는 녹음 관찰 생성 → 비동기 상태 → 해석 → 피드백 → 근거 대화가 이어진다.
- 타 사용자 media/record 접근, 동의 없는 upload, MIME 위장, idempotency 충돌이 차단된다.
- 웹/API/mobile 타입 검사·관련 테스트·빌드/Expo export가 통과한다.
- 제거한 Prisma 모델에 정적 참조가 없고 migration SQL의 FK 순서가 검토된다.
