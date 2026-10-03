# 웹·모바일 고양이 멀티모달 대화 통합 명세

상태: 1차 구현 완료, 운영 검증 전. 기존 사진 중심 Sprint 01 위에 웹과 울음 녹음 입력을 추가했다.

## 제품 범위

보호자가 같은 고양이를 선택하고 사진 또는 짧은 울음 녹음을 남긴 뒤, 상황과 질문을 보태면 관찰 가능한 단서, 여러 가능한 의미, 알 수 없는 점, 다음에 확인할 행동을 받는다. 결과는 의학 진단이나 인간 언어의 번역이 아니며, 이후 실제 반응을 남기면 같은 고양이의 후속 대화가 그 기록을 인용한다.

- 웹의 새 제품 진입점은 `/findthem`이다.
- 네이티브와 웹은 `/api/pet-companion` 및 `@findthem/shared` DTO를 함께 쓴다.
- `/`, `/partners`, CoffeeCong, 맑음, partner-admin과 관련 API·데이터는 이 변경의 대상이 아니다.
- 기존 실종 신고·목격·매칭·커뮤니티·게임의 일반 사용자 경험은 제거한다. 내부 admin의 그 전용 화면도 제거 대상이지만, CoffeeCong·맑음·공통 운영 화면은 보존한다.
- 로그인 전에는 입력 예시와 한계만 볼 수 있다. 사진·오디오 업로드, 대화, 기록 조회는 계정과 보관 동의가 있어야 한다. 명시적 로컬 데모는 실데이터와 섞이지 않는다.

## 사용자 여정

| 단계 | 웹 `/findthem` | 모바일 | 완료 상태 |
| --- | --- | --- | --- |
| 1. 시작 | 고양이 목록 또는 `우리 아이 추가` | 홈의 선택기 또는 등록 | 현재 고양이와 소유권이 확정된다. |
| 2. 관찰 선택 | `사진으로 보기`와 `울음 녹음`을 동등한 두 CTA로 제시 | 중앙 기록 버튼에서 사진/녹음 선택 | 접근 권한을 설명하고 거부 시 파일 선택·사진 등 대체 경로를 제공한다. |
| 3. 입력 확인 | 사진 미리보기 또는 재생 가능한 짧은 오디오 파형, 질문, 상황 태그 | 같은 정보 구조 | 길이·형식·대상·잡음을 확인하고 한 번에 하나의 관찰을 만든다. |
| 4. 처리 | 업로드 → 대기 → 분석 중을 상태별로 표시하고 새로고침 후 복구 | 백그라운드 복귀 뒤 동일 상태 복구 | `QUEUED/PROCESSING/NEEDS_CONTEXT/COMPLETED/ABSTAINED/FAILED/CANCELLED`를 사람 말로 표시한다. |
| 5. 해석 | 입력 유형, 관찰 신호, 가능성, 한계, 다음 행동을 순서대로 표시 | 동일 | 사진과 소리의 단서를 혼합하거나 확정 번역처럼 표현하지 않는다. |
| 6. 피드백 | 해 본 행동·이후 반응·시각·메모를 기록 | 동일 | 피드백은 관찰의 후속 사실로 저장된다. |
| 7. 대화와 기록 | 질문을 보내고 인용된 관찰을 열어봄 | 동일 | 답변은 현재 계정·현재 고양이의 실제 피드백이 있는 기록만 인용한다. |

## 화면과 컴포넌트

### 웹

`apps/web`에는 findthem 전용 독립 레이아웃을 둔다. 허브의 공통 Header/BottomTab과 기존 `LandingPage`의 탐정·실종 언어를 사용하지 않는다.

1. **컴패니언 홈**: 현재 고양이, 최근 결과/피드백, 사진과 녹음 CTA, 안전한 제품 한계.
2. **고양이 등록·전환**: 이름, 프로필 사진(선택), 보호자가 확인한 정보, 삭제 진입.
3. **사진 관찰 작성**: 파일 선택/드래그 또는 카메라, 미리보기·재촬영, 질문·상황 태그, 업로드 진행률.
4. **울음 관찰 작성**: `MediaRecorder` 기반 녹음/중지, 최대 길이 안내, 파형·재생·다시 녹음, 질문·상황 태그. 마이크 불가 환경은 지원되는 오디오 파일 선택 또는 설명 상태를 보인다.
5. **처리·결과**: 상태 폴링/복구, 입력 종류별 신호 카드, 가능성, 한계, 관찰 제안, 피드백 CTA.
6. **기록·대화**: 날짜/고양이 필터, 사진 썸네일 또는 오디오 재생 카드, 인용 링크가 있는 대화.
7. **동의·데이터**: 서비스 보관과 연구 학습 참여를 독립 토글로 제공하고 내보내기·삭제의 비동기 상태를 보인다.

키보드 순서, 명확한 label, 녹음 중 시간/상태의 `aria-live`, 파형 이외의 텍스트 진행 표시, 재생 컨트롤, 실패 후 동일 입력 재시도와 포커스 복귀를 기본으로 한다. 색만으로 처리·위험·선택 상태를 전달하지 않는다.

### 모바일

기존 사진 흐름의 화면 계층을 유지하고 `capture`에 사진/녹음 세그먼트를 추가한다. 녹음 시작 전 권한의 이유와 취소 결과를 설명하며, 녹음 중에는 경과 시간·중지·폐기를 화면 판독기가 알 수 있게 한다. 결과, 피드백, 기록, 대화는 웹과 같은 상태와 문구 키를 사용한다.

## 공유 계약과 API 변경

### 유지하는 계약

현재 `CompanionPet`, `CompanionObservation`, `CompanionInference`, `CompanionFeedback`, `CompanionConversation`, `CompanionConsent`, `CompanionCheckin`과 관찰 상태 enum을 유지한다. 모든 응답은 private/no-store이며 owner/pet 검사를 통과해야 한다.

### 확장할 DTO

`packages/shared/src/petCompanion.ts`에 다음을 추가하거나 현 DTO에 명시한다.

- `CompanionMedia`: `id`, `observationId`, `kind`, `mimeType`, `durationMs`, `createdAt`, 그리고 소유자에게만 발급되는 조회 URL 또는 별도 media 조회 DTO.
- `CompanionObservation`: 입력의 메타데이터와 `occurredAt`을 포함한다. 원본 저장 키나 공개 URL은 반환하지 않는다.
- `CompanionInference.observation`: 사진/오디오 각각에 적용되는 관찰 신호를 문자열 배열로 두되, 추후 `signals: { modality, label, evidence }[]`로 호환 확장할 수 있게 한다.
- 오류 코드: 지원하지 않는 오디오 형식, 길이/크기 초과, 손상 파일, 미디어 처리 실패, 공급자 분석 실패를 구별한다. 내부 provider 오류나 원본 경로는 노출하지 않는다.

### 관찰 업로드

첫 구현의 `POST /observations` multipart 방식을 계속 쓸 수 있다. 요청은 `petId`, `kind=PHOTO|AUDIO`, `question?`, `contextTags?`, `Idempotency-Key`, `media`를 포함한다. 사진은 EXIF/GPS 제거 후 재인코딩한다. 오디오는 서버가 실제 컨테이너·MIME·크기·duration을 검증하고, 허용 포맷을 하나의 정규 저장 형식으로 변환하거나 원본을 거부한다.

업로드 성공은 관찰 ID와 `202` 상태를 반환하고 분석 큐를 넣는다. 같은 idempotency key는 같은 pet/kind의 기존 관찰만 돌려주며 충돌은 `409`이다. 오디오 분석이 아직 제공자에서 지원되지 않으면 업로드를 성공처럼 끝내지 말고 `ABSTAINED`와 정확한 제한/다음 관찰을 남긴다.

### 비동기 처리

분석 worker는 `PHOTO`와 `AUDIO`를 분기한다. 사진 worker의 현 이미지 프롬프트는 유지하고, 오디오 worker는 실제 음향 신호(발성 길이, 반복, 간격, 높낮이 변화 등)만 입력으로 사용한다. 재생음·여러 동물·잡음·신호 부족은 `ABSTAINED` 또는 `NEEDS_CONTEXT`로 끝낸다. 어떤 worker도 삭제·동의 철회된 관찰을 다시 완료로 바꾸지 않는다.

결과 조회는 관찰 ID 폴링을 우선한다. 긴 처리 시간에는 polling backoff와 재개 상태를 제공하며, 웹은 중복 탭에서도 동일 idempotency 관찰을 재사용한다. 실패에는 안전한 재시도 가능 여부를 표시한다.

## 개인정보·안전

- 미디어는 공개 CDN 경로가 아닌 owner-scoped private storage에 둔다. 다운로드/재생 URL은 인증된 소유자에게만 짧게 발급한다.
- 서비스 보관 동의와 연구 학습 동의를 분리한다. 서비스 보관이 없으면 업로드 및 queued 작업을 취소하고 원본/파생 데이터를 지운다.
- 오디오에는 사람 목소리와 배경 대화가 섞일 수 있으므로 화면에서 녹음 범위와 삭제 정책을 더 분명하게 알린다. 원본 오디오·전사문·임베딩의 저장 여부와 보존기간은 구현 전 정책으로 확정한다.
- 건강·통증·응급 가능성을 진단하지 않는다. 즉시 위험을 의심할 만한 보호자 서술에는 확정 대신 신속한 수의학적 도움을 고려하라는 안전 문구를 일관되게 보인다.
- 결과의 의인화 `utterance`에는 항상 `추정 표현` 표기를 붙이고, 관찰 신호와 분리한다.

## URL 전환과 제거 순서

1. 새 `/findthem` 라우트와 인증·업로드·기록 경험을 추가한다.
2. 기존 일반 사용자 findthem routes를 새 `/findthem`으로 replace redirect한다. 쿼리와 해시를 전달하지 않고, 외부 조작 가능한 이전 ID는 새 제품 화면에서 해석하지 않는다.
3. 웹에서 기존 `userRoutes`, 탐정 LandingPage, Header/BottomTab의 findthem 메뉴/카피 의존성을 제거한다. `/`, `/partners`, `/n/:code`, partner-admin 및 CoffeeCong/맑음 라우트는 변경하지 않는다.
4. API에서 레거시 findthem 라우터·jobs·관리자 전용 화면을 제거한다. 그 뒤 `apps/api/src/routes/index.ts`, queues, cron/worker 등록, tests, web imports를 다시 검사한다.
5. 삭제 대상 모델에 대한 정적 참조가 0이고 API/web 빌드·테스트가 통과한 뒤에만 forward Prisma migration을 생성한다. 이 문서는 migration 실행·운영 데이터 삭제를 승인하지 않는다.

## 레거시 제거 후보 인벤토리

아래는 현 코드에 정적 참조가 있으므로 **지금 삭제할 수 없는 모델**이다. 새 제품 전환 후 해당 API·job·admin·test를 함께 제거하고 다시 검증했을 때에만 후보가 된다.

| 기능 묶음 | Prisma 모델 | 현재 참조의 예 | 제거 전 확인 |
| --- | --- | --- | --- |
| 실종 반려동물/신고 | `Pet`, `Report`, `Narrative`, `Photo`, `Sighting`, `Match`, `MatchVote`, `AdoptionInterest` | pets/reports/sightings/matches/feed/og/jobs/admin | 공개·관리자·crawler·이미지/매칭 worker 및 OG가 모두 제거됐는지 |
| 신고 홍보 | `Promotion`, `PromotionStrategy`, `PromotionLog` | promotions, promotion jobs/monitor/repost | queue·cron·외부 게시 설정이 함께 제거됐는지 |
| 기존 챗봇·외부 에이전트 | `ChatSession`, `ChatMessage`, `ExternalAgent` | chat/webhooks, webhookDispatcher, admin | 기존 chat/webhook/agent admin과 설정 참조가 없는지 |
| 커뮤니티/DM/모더레이션 | `CommunityPost`, `CommunityComment`, `ContentReport`, `UserBlock`, `DMRoom`, `DirectMessage` | community/moderation/dm/notifications | 어떤 공통 또는 타서비스 기능도 이를 쓰지 않는지 |
| 구형 참여 기능 | `UserReward`, `XpLog`, `GamePlay`, `Transform`, `Notification`, `PushSubscription`, `AgentCheer` | users/game/feed/engagement/push/notification jobs | 범용 푸시·사용자 XP가 타서비스에서 재사용되지 않는지; 특히 `Notification`과 `PushSubscription`은 별도 소유권 감사 필요 |
| 클러스터 | `SightingCluster`, `ClusterMembership`, `SightingLink`, `ClusterReportMatch` | clusters와 matching pipeline | clusters route, 백그라운드 작업, FK가 모두 사라졌는지 |

`User`와 Companion 모델(`CompanionPet`, `CompanionObservation`, `CompanionMedia`, `CompanionInference`, `CompanionFeedback`, `CompanionConversation`, `CompanionConsent`, `CompanionCheckin`)은 유지한다. CoffeeCong 전용 모델과 `CoffeecongSkanDaily`은 이 전환과 무관하므로 제거 대상이 아니다.

## 검증

- 웹: 로그인/소유권, 사진·오디오 업로드, 권한 거부, 새로고침 복구, 결과·보류·실패, 피드백 인용, 키보드/스크린리더, 390px·1440px.
- 모바일: 실기기 사진/마이크 권한, 녹음 중 앱 전환, 녹음 재생, 업로드 재시도, 계정/고양이 전환 격리.
- API: MIME 실제 바이트 검증, duration/size 제한, idempotency, private media 접근 차단, 동의 철회와 worker 경쟁, audio abstention/provider failure, 다른 owner/pet의 citation 차단.
- 전환: 이전 public URL은 안전하게 `/findthem`으로 이동하고, Hub/partners/CoffeeCong/맑음/partner-admin smoke test를 통과한다.
- DB: migration SQL의 FK drop 순서를 검토하고, 스테이징 백업·restore 검증을 한 뒤에만 운영 적용을 별도 승인받는다.

## 가정과 차단 요인

- 웹은 기존 인증 세션을 재사용할 수 있다고 가정한다. 익명 체험을 실제 미디어 저장까지 확대하지 않는다.
- 브라우저 녹음은 지원 형식이 브라우저마다 달라 서버의 허용·정규화 정책이 먼저 필요하다.
- 현재 구현은 사진과 최대 45초 오디오를 수락하고 worker를 입력 종류별로 분기한다. Gemini 호환 경로가 아니거나 신호가 부족하면 결과를 꾸미지 않고 `ABSTAINED`로 제한을 남긴다. 운영 보존 정책과 실제 기기 품질은 출시 전에 확정·검증한다.
- 기존 레거시 데이터의 보존·내보내기/폐기 기한은 아직 결정되지 않았다. 따라서 forward migration은 코드 제거와 독립된 마지막 단계로 유지한다.
