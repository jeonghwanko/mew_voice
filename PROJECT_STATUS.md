# 뮤 보이스 모바일 — 현재 구현 상태

## 2026-09-11 — TestFlight 3D 파일 로딩 호환성 수정

TestFlight 1.2.0 (91)에서 홈 3D 오류 안내가 나타나는 문제를 조사했다. 설치된 Fiber 9.3.0 native 로더가 Expo SDK 54의 `expo-file-system` 루트에서 제거/런타임 오류 처리된 legacy API와 상수를 사용하고 있었다. Metro에서 Fiber native 모듈의 파일 시스템 import만 `expo-file-system/legacy`로 연결한다. 일반 앱의 File/Directory API와 웹 해석은 유지하며, Expo 버전·V13 모델·텍스처·리그는 변경하지 않는다. 검증과 후속 빌드 상태는 `./docs/plans/pet-companion/NATIVE-3D-2026-09-11.md`에 기록한다.

## 2026-09-11 — V13 동작본 홈 적용

홈 런타임을 `assets/avatar/v13-sit-stand/v13-sit-stand.glb`(6,277,224 bytes)로 교체했다. 최초 앉기, 앉기/일어서기 버튼, 전환 중 방향 반전, 고정 크기/접지 기준을 연결했다. 동작 줄이기는 즉시 자세 전환, 비활성 화면에서는 프레임 정지. 원본의 텍스처와 피부 보정을 유지하며 이전 모델 전용 털색/리본/얼굴 크기/체형 옵션을 숨겼다. 방향 설정은 유지한다. 메뉴에 두 원작자·작품 링크·CC BY 4.0·수정 내역을 표시한다. 기존 얼굴 표정 액션은 이 동작본에 없으며 골반/꼬리 밑동 마감은 후속이다. 원본 V13과 다른 세션의 제작 파일은 보존한다. 네이티브 실기기 GPU/텍스처 성능은 별도 확인 대상이다.

검증: 수정 후 별도 TypeScript 검사 통과, lint 통과, Jest 7개 스위트/34개 테스트 통과, 최종 웹 및 Android Hermes export 통과. Chrome 홈에서 V13 렌더/앉기·일어서기와 메뉴·탭 등 6개 그룹 통과. `output/v13-home/verification.json` 및 앉기/서기 스크린샷 보관, 재현은 `node scripts/verify-mewvoice-v13.mjs`. 반복 검사 묶음의 지연된 타입 검사 1건은 중단했고, 앞서 완료된 별도 타입 검사를 근거로 사용했다. 실기기 QA 및 스토어 배포는 수행하지 않았다.

## 2026-09-11 — V13 앉기·일어서기 별도 동작본

`assets/avatar/v13-sit-stand/`에 V13 원본 표면과 텍스처를 이용한 새 24본 리그/피부 가중치/앉기 자세 보정과 4초 GLB를 만들었다. 원본 발 위치를 재측정하여 뒷발 회전축을 수정했고, 몸통을 다리가 당기는 가중치를 분리했다. `/cat-v13-sit-stand/`에서 정면 앉은 자세로 시작하여 앉기·일어서기·전체 동작과 시점/확대/시간 슬라이더로 확인할 수 있다. Blender 9개 자세 렌더와 실제 브라우저의 반복 전환을 확인했다. 이 결과는 별도 동작 검토본이며 최종 아트 승인이나 앱 적용이 아니다. 골반/꼬리 밑동의 미세 윤곽 마감, 기존 얼굴 액션 이관과 네이티브 통합은 남아 있다. 상세 및 검증 근거는 해당 폴더 README.md 참조. 아래의 rebuild-v2 실패 결과와는 별도다.

## 전신 재제작 검증 실패 — 미완성·미적용
중간 승인 없이 전신 작업을 진행했으나 9개 렌더에서 품질 실패. QuadriFlow는 작업 스케일100배 후 복원하여 해결(6865면)했지만, wholebody-rig-trial.blend의 앉은 뒷다리 고리 변형·꼬리 꺾임·UV/색상 전이 오류가 발생했다. 최종 모델로 채택하지 않았고 새 결과를 미리보기/앱에 적용하지 않았다. V13 원본 보존. 상세 assets/avatar/rebuild-v2/QUALITY-RESULT.md 및 quality-rejection.json.


## 2026-09-11 — 전신 재제작으로 방향 초기화
사용자가 결합식 수정 결과를 거부하여 fullbody-fit/weld를 제작 기준에서 제외했다. 원래 A 원화와 V13으로 돌아감. rebuild-v2에 2D 전신 참고 시트와 하나의 voxel 기초 메시/보존된 원본 Blender 파일을 생성. QuadriFlow 두 시도 실패(CANCELLED); 관절 토폴로지/앉은 자세/리깅은 미완료. 새 기초 메시를 완성 모델로 취급하지 않는다. /cat-restart에서 2D 참고와 3D 미완성 메시를 명시적으로 구분. assets/avatar/rebuild-v2/README.md 참조.


## 2026-09-11 — 고양이 중심 홈 UI

- 상단 재화 영역/햄버거, 좌측 말 걸기(`/meow`)·울음 듣기(`/capture?mode=audio`)·사진 살피기(`/capture?mode=photo`), 하단 홈/기록/상점으로 개편했다. 기존 글 대화·TTS·근거는 접이식 패널에서 동작한다.
- 햄버거의 공지·우편·재화는 서비스 준비 안내, FAQ는 펼치기/접기, 친구 초대는 시스템 공유와 웹 링크 복사 대안이다. 공개 Google Play 페이지는 아직 이전 앱 이름으로 표시되어 초대 화면에 업데이트 전 상태를 안내한다. 추천 보상/가족 권한 기능은 아니다.
- 상점은 구매 준비 상태와 기존 무료 꾸미기 진입을 제공한다. 결제·재화 원장·우편/공지 API를 추가하지 않았다.
- 기록 화면을 cream/sage 톤으로 맞추고 타임라인·돌봄 추가·대화 기록 접근을 유지했다. 기존 대화/우리 아이 경로는 숨김 탭으로 남아 메뉴에서 열린다.
- 이미지 생성 3종과 SVG 15종 적용. 이미지 원본·프롬프트 및 160px 번들 파생본은 `assets/ui/quick-actions/`, 런타임 3개 합계 90,309 bytes.
- 사진/오디오 초안을 분리하고 오래된 초안은 같은 입력 종류에서만 복원한다. 성공한 요청의 일치하는 이전 초안은 지운다.
- 이번 변경은 UI와 탐색 구조다. 기존 런타임의 미채택 블록 모델과 별도 V13 아트 작업은 변경하지 않았다.
- 검증 결과는 `output/home-ui/verification.json`과 [계획/검증 기록](./docs/plans/pet-companion/HOME-UI-2026-09-11.md)에 기록한다. 네이티브 실기기 QA·스토어 배포는 이 변경에서 완료한 작업이 아니다.


## 2026-09-11 — 뒷다리 연결 메시 재구성: 검토 실패, 미적용

`build-v13-hind-rebuild.py`와 `rebuild-hind-topology.py`로 기존 하퇴 면을 제거하고 경계 루프에 새 quad ring/발을 연결하는 별도 작업본을 제작했다. 좌우 개별 연결과 골반 공통 경계를 두 다리로 분기하는 구성을 시험했다. 새 발 표면은 매끈해졌으나 골반 접합부가 사선 아래에서 늘어나거나 벌어져 품질 검증에 실패했다. 뒷발 문제가 해결된 상태가 아니다.

작업본 `assets/avatar/realistic/rework/bicolor-v13-hind-rebuild.blend` / `.glb`, 검토 렌더 `hind-rebuild-side.png`, `hind-rebuild-under-quarter.png`, `hind-rebuild-back-quarter.png`, 실행 로그 `hind-rebuild.log`. 기준 제작 경로 및 `/cat-motion/`의 sit-4 GLB는 변경하지 않았다. 이 작업본은 실패한 실험이며 다음 제작의 채택 기준으로 쓰면 안 된다. 얼굴 원본과 V13 원본은 보존했다.


## 2026-09-11 — 뒷발 입체 형태 보정 시험 실패, 미적용

사용자 사선 아래 스크린샷에서 sit-4 뒷발 위쪽의 겹침/얇은 접힘을 확인했다. 접지 검사만으로 형태 수정을 완료했다고 판단한 것은 잘못이었다. 단면 재배치와 굽은 중심선을 사용하는 두 보정 시험을 진행했으나 사선 아래에서 팽창/접힘이 남아 채택하지 않았다. 시험 코드/Blender는 `heel-volume-cage-experiment.py`, `heel-volume-cage-experiment.blend`로 보관. 활성 제작 스크립트는 시험 이전으로 복원하며 `/cat-motion/`의 모델 GLB는 변경하지 않았다.

현재 문제는 미해결이다. 뒷발~중족부~하퇴의 연결 메시를 재구성하고 자세별 볼륨을 검토해야 한다. sit-4의 바닥 접촉 확인은 유지되지만 입체 형태 품질 검증을 통과한 모델이 아니다.


## 2026-09-11 — sit-4 뒷발 전체를 눕혀 접지

사용자 옆모습 그림을 기준으로 뒷발을 더 앞으로 이동하고, 발끝 목표만 푸는 대신 비절 위치와 발목을 함께 정하는 풀이로 변경했다. 앉은 자세에서 비절~발목 구간은 수평 대비 약 2.25도다. 발목·중족부·골반 피부 영향을 분리하고, 앉기 보정으로 발바닥에서 뒤쪽까지의 하단 접촉면을 맞췄다. 다섯 길이 구간의 하단 높이를 검사해 각각 바닥 0 부근 접촉(수치 오차 3e-8 이하)을 확인했다. 이는 구간별 하단 표본 검사이며 모든 표면점/프레임의 충돌 검증은 아니다.

`check-sit-heel.py` / `sit-heel.log`에 관절 기울기와 표면 접촉 검사 기록. 시작·종료 동일과 기본 메시/기존 표정 키 보존도 기존 audit으로 검사했다. `/cat-motion/?view=side&review=sit-4`에서 이전 sit-3와 비교한다. 가슴의 피부 연결과 동작 전 구간의 피부 겹침은 별도 보정 대상이다.


## 2026-09-11 — sit-3 엉덩이 바닥 접촉

앉기에서 골반 하강을 0.14→0.18 모델 단위로 늘리고 몸통 회전을 28→40도로 조정했다. 목의 보상 각도와 꼬리 각도를 함께 수정했다. 앞발 목표 위치는 유지하며 앉기 보정 표면의 하한과 검토 바닥을 모두 0으로 맞췄다. `수정 전 앉기`는 sit-2와 비교한다. V13 원본은 보존한다. 수정 범위는 골반 접지이며 가슴/앞다리의 피부 연결 완성은 별도 과제다.


## 2026-09-11 — sit-2 뒷다리 앉기 수정

실제 앉은 옆모습과 뒷다리 골격을 참고해 무릎/비절 방향을 지정하고 뒷발 목표를 앞으로 이동했다. 발목 가중치와 접힌 허벅지의 피부 영향을 보정하고 앉을 때만 적용하는 `SitFoldCorrective`를 추가했다. 기본 메시/UV/기존 표정 키는 보존하며 V13 원본 파일은 변경하지 않았다. `/cat-motion/`의 `수정 전 앉기` 버튼으로 이전 고리형 뒷발과 비교한다. 상세 조사·출처·한계: `assets/avatar/realistic/rework/SITTING-RESEARCH.md`. 전체 몸통 기울기와 가슴/앞다리 접합은 추가 개선 대상이다.


## 2026-09-11 — V13 관절 애니메이션 초안

V13 원본 GLB/Blender는 그대로 보존한다. 별도 `/cat-motion/index.html`에서 최초 앉기·눈맞춤 → 일어서기 → 제자리 한 바퀴 → 다시 앉기·눈맞춤의 10초 동작을 확인할 수 있다. `일어서서 한 바퀴` 재생 버튼, 동작 구간 슬라이더, V13 원래 자세 비교가 있다. 기존 `/cat-rework/` 기준 화면은 변경하지 않았다.

원본의 몸통에 척추 영향이 거의 없고 다리/MAIN 관절 영향이 섞여 있어 별도 작업본의 몸통 가중치를 재배분했다. 다리 길이를 고정한 CCD 역운동학으로 자세를 구하고 관절 키프레임으로 베이크했다. 실시간 IK 컨트롤러를 완성한 리그가 아니다. 회전에는 발의 교대 들기/이동이 포함된다. 원화와 같은 최종 앉은 실루엣, 뒷다리 접힘, 회전 중 발 미끄러짐은 추가 보정 대상이며 완성품으로 채택하지 않는다.

제작: `scripts/build-v13-motion.py` → `package-v13-motion.py` → `prepare-v13-motion.mjs`. Blender 작업본 `assets/avatar/realistic/rework/bicolor-v13-motion-study.blend`, 동작 GLB `bicolor-v13-motion-preview.glb`. `audit-v13-motion.py`에서 원본과 정점/면/UV/표정 shape key 동일, 시작·종료 관절 행렬 동일(오차 1e-4 미만), 관절 스케일 고정 확인. 브라우저에서 재생·회전 중간·종료 자세 및 눈맞춤 복귀 확인. Expo 런타임 변경 없음, 네이티브 빌드/실기기 성능 미검증.


## 2026-09-11 — 사용자 요청에 따라 V13으로 복원

현재 기준 자산은 `assets/avatar/realistic/rework/bicolor-a-v13.glb`다. 원본 V13 파일을 그대로 사용한다. 검토 화면의 manifest는 원본 Bicolor와 V13만 포함하며 이후 V14~V30 실험은 기본 로딩/모델 선택에서 제외했다. 과거 `model=rebuilt`·`previous` 링크도 새로고침하면 V13으로 열린다. 원본/실험 자산은 보관하지만 채택 상태가 아니다. 깊은 접힘의 V30 수정 작업은 취소하고, 다음 작업은 V13을 기준으로 한다.

V13의 눈맞춤·깜빡임·작은 입술 움직임을 유지한다. 이후의 앉은 몸 재제작·독립 턱·입체 털은 현재 기준 모델에 포함하지 않는다. 앱 런타임은 변경하지 않았다.

## 2026-09-11 — V29 입체 단모와 뒤통수 음영 보정

최종 채택본은 V28의 머리·목·몸 정점 위치와 연결 구조를 유지한다. 뒤통수 노멀을 둥근 두상의 방향과 혼합해 표면의 날카로운 음영을 완화했다. 양옆의 깊은 접힘 자체가 완전히 제거된 것은 아니다. 국소 면 재구성 시험은 두상/목 변형과 경계 주름 때문에 채택하지 않았다. `rebuild-occiput-v29.py`, `refit-occiput-v29.py`, `finish-patch-v29.py`와 `v29-patch-check.json`은 실험 자료이며 최종 모델의 제작/검증 근거가 아니다.

볼 바깥·뒤통수·목에 18,000개의 가는 단모를 솔리드 메시로 추가했다. 각 가닥은 피부 UV의 뿌리 색, 보간한 관절 가중치, 얼굴 shape key 변위를 공유한다. 별도 `A_ShortCoat`이며 투명 카드나 정적인 화면 효과가 아니다. 처음의 굵고 짧은 가닥은 제외하고, 길이 0.003~0.005 모델 단위·반경 0.00003~0.000065로 수정했다. 렌더의 윤곽/볼륨 표현을 위한 고밀도 검토본이다.

재현: V28 입력으로 `finish-coatnormals-v29.py` → 생성된 V29에 `groom-shortcoat-v29.py` 한 번 → `package-bicolor-v29.py` → `prepare-bicolor-rework.mjs`. 기본 비교는 이전 V28/V29이며 `입체 털 보기` 버튼으로 피부와 털을 비교한다. 털을 생성하는 단계는 중복 실행하지 않는다. `v29-fur-check.json`, `v29-jaw-check.json`, `v29-glb-check.json`이 최종 검사 기록이다. 색상은 검증된 V28 코트 아틀라스를 공유하며 실험용 V29 재베이크 텍스처는 최종 모델에 사용하지 않는다.

앱 런타임 변경 없음. Expo/네이티브 빌드·실기기 성능은 미검증이며, 모바일용 폴리곤·텍스처 최적화가 남아 있다. 최종 원화 품질이나 접힘의 완전 제거를 주장하지 않는다.


V29 최종 검사: 71,098,352 bytes / 597,520 triangles / 41관절. 털 180,000정점·18,000가닥 및 얼굴 morph 5개 연결. JawOpen/SlowBlink/LookAround 클립, 턱 동작 시 안구 변위 0, 전체 기본 자세 복귀 오차 0, 작은 고개 회전의 목 최대 길이비 1.0497 확인. UV 채널 0, manifest SHA와 원본 해시 보존 확인. `v29-final-status.json`에 채택 파이프라인과 미완료 항목을 명시했다.

## 2026-09-11 — V28 목의 실제 접합과 연속 코트 텍스처

V27의 머리/몸 겹침을 제거했다. 턱을 피하는 비스듬한 절단으로 머리 536정점·몸 156정점 경계를 만들고, 중간 3개 링과 2,300개 연결면으로 접합했다. `mesh_0.001` 안에서 머리부터 발까지 실제 모서리로 연결된다. 접합부 모든 모서리는 두 면을 공유하며 비다양체 목 모서리 0개다. 원본 얼굴 6개 shape key와 별도 안구/혀/입술 및 41관절을 보존했다.

목 전체의 root/head 가중치를 연속적으로 정규화했다. 뒤통수/목의 접힌 면은 국소 평활화했다. 뒤통수에서 목으로 이어지는 태비 색상과 방향성 미세 노이즈를 새 4096px 색상·탄젠트 노멀 텍스처 `a-coat-color-v28.png`, `a-coat-normal-v28.png`로 베이크했다. 이는 표면 털 결이며 털 가닥 지오메트리/그루밍은 아니다. 원화 수준의 실루엣·털 볼륨 완성이나 모든 동작의 무충돌을 주장하지 않는다.

재현 순서: V27 입력 → `stitch-bicolor-v28.py` → 생성된 V28에 `relax-neck-v28.py` 한 번 적용 → `package-bicolor-v28.py` → `prepare-bicolor-rework.mjs`. relax 단계는 누적 변형이므로 반복 적용하지 않는다. `.blend`/`.glb`, 정면·뒤·옆·입 열기/닫기·목 확대·작은 고개 회전 렌더를 보존했다. 검사 파일은 `v28-neck-check.json`, `v28-jaw-check.json`, `v28-glb-check.json`이다. 로컬 비교 화면은 이전 V27과 V28을 제공한다.

앱 런타임 변경 없음. Expo 테스트·네이티브 빌드·실기기 성능 검증은 실행하지 않았다. 고밀도 검토용 자산으로 모바일 최적화가 남아 있다.


V28 최종 검증: 45,480,968 bytes / 309,520 triangles / 41관절 / 세 애니메이션 클립. 고개 0.14rad 회전에서 목 모서리 최대 길이비 1.0497. 턱 1/35/76 프레임에서 안구 변위와 기본 자세 복귀 오차 0. 얼굴/몸 UV 채널 0과 노멀 맵, 미리보기 manifest SHA 일치를 확인했다. 뒤통수 양옆의 원본 음영/표면 흔적은 남아 있어 최종 미술 마감으로 간주하지 않는다.

## 2026-09-11 — V27 뒤통수 UV·목 경계·입꼬리 수정

V26을 보존하고 V27 비교본을 추가했다. 뒤통수 캡 경계의 원본 UV 색을 샘플링해 내부로 확산하고, 아래쪽 색 번짐을 완화한 뒤 얼굴 전체를 새 2048px `a-face-color-v27.png` UV 아틀라스로 베이크했다. 원본 얼굴 텍스처는 소스 UV를 명시해 보존했다. 세밀한 털 가닥을 새로 그린 텍스처는 아니며, 뒤통수 중앙의 무늬 밀도는 주변보다 낮다.

아래 뒤통수를 국소 평활화하고 목 안쪽으로 정리했다. 몸의 목 상단을 연장해 겹침을 보정했다. 머리와 몸은 여전히 별도 메시이므로 용접된 접합이나 최종 리토폴로지로 표현하지 않는다. 입꼬리의 상·하악 가중치를 연속적으로 연결하고 JawRound의 양끝 폭을 줄였다. 큰 입 벌림은 개선 중이며 치아·음성 립싱크는 범위 밖이다.

`refine-bicolor-v27.py`는 V26 입력으로 재현한다. `.blend`, `.glb`, 정면·측면·뒤·입 열기/닫기 렌더와 구조 검사 기록을 보존한다. 비교 페이지는 이전 V26과 새 V27을 동일 카메라에서 전환한다. 앱 런타임은 변경하지 않았으며 Expo 검사·네이티브 빌드·실기기 성능 검증은 실행하지 않았다.


V27 최종 GLB는 사용하지 않는 얼굴 UV/정점색을 제거해 얼굴 색상 UV 채널을 0으로 정리했다. 29,698,224 bytes, 322,664 triangles, 41관절 및 JawOpen/SlowBlink/LookAround 세 클립. 1/35/76 프레임 검사에서 턱 동작의 안구 변위와 기본 자세 복귀 오차는 0이다. manifest SHA 일치와 원본 파일 해시 보존을 확인했다. 검토용 고밀도 자산이며 모바일 최적화는 미완료다.

## 2026-09-11 — V26 입술·목·코트 질감 수정

V23에서 입술 테두리 두께를 32%로 줄이고 입 벌림 시 위쪽 입술의 곡선을 보정했다. 뒤통수 아래 면과 목 앞쪽 돌출을 안으로 넣었다. 뒤통수의 큰 캡 면은 분할 후 둥근 두상에 맞춰 조정했다. 캡의 기존 UV가 비어 있어 별도 기본색 재질을 지정했으며, 해당 면의 털 무늬/UV 연결과 목의 접합 마감은 아직 미완성이다.

몸/꼬리 배색을 얼굴 톤에 맞춰 어둡게 하고 미세 결을 각각 1024px 색상·탄젠트 노멀 PNG로 베이크했다. `a_seatedbody-color-v25.png`, `a_seatedbody-normal-v25.png`, `a_tail-color-v25.png`, `a_tail-normal-v25.png`가 실제 텍스처다. GLB normalTexture 포함 확인. 실제 털 지오메트리나 최종 그루밍 완성을 뜻하지 않는다.

[입술·목·질감 V26](http://localhost:8092/cat-rework/index.html?model=rebuilt&view=full&review=26)은 V23과 같은 카메라로 비교한다. `.blend`/`.glb`, 정면·측면·입 열기/닫기 렌더, `v26-surface-check.json`·`v26-jaw-check.json`·`v26-glb-check.json` 보존. 1/35/76 프레임에서 턱이 안구를 움직이지 않고(변위 0), 기본 자세로 복귀(변위 0)함을 확인했다. 구문 검사 통과. 입꼬리 형태·뒤통수 텍스처·목 접합·얼굴/몸의 미술적 일치는 추가 작업 대상이다.

앱 런타임 변경 없음. Expo 테스트·네이티브 빌드와 실기기 성능 검증은 미실행이다. 최종 원화 품질로 완료 처리하지 않는다.


## 2026-09-11 — V23 몸 재제작·얼굴 UV 텍스처·독립 턱 구조

`bicolor-a-v23.blend` / `.glb`를 별도 구조 검토본으로 추가했다. Bicolor 얼굴과 기존 눈 morph를 보존하고, 실패했던 하체 변형을 연속 단면 몸통·앞다리·골반·발·별도 꼬리 메시로 교체했다. 몸 길이를 줄이고 목 가중치를 연결했으며, 머리 뒤 절단부를 막고 꼬리 뿌리를 골반 안으로 이동했다. 새 몸은 원본 몸 메시를 변형한 결과가 아니라 재제작 메시다. 다리의 완성된 보행 리깅을 주장하지 않는다.

얼굴 색은 원본 UV의 명암을 주황/크림 영역으로 재매핑한 셰이더를 2048px PNG로 베이크했다. `a-face-color-v19.png`는 실제 UV 텍스처이며 Blender/GLB에 포함된다. 원화 텍스처를 그대로 복사한 결과는 아니다. 몸은 별도의 정점색 태비/크림 배색이다.

`A_Jaw` 관절(총 41관절), 입구 개방, 입 내부 메시, 혀, 스킨 입술 테두리와 JawRound 보정 morph를 추가했다. `JawOpen`, `SlowBlink`, `LookAround` 클립을 GLB에 포함한다. 큰 입 벌림에서 입술이 각지고, 목 접합 및 얼굴/몸 질감 일치와 발 디테일은 미완성이다. 치아·정교한 구강 해부·음성 립싱크·최종 원화 품질이 완성됐다고 주장하지 않는다.

[새 몸·턱 V23](http://localhost:8092/cat-rework/index.html?model=rebuilt&view=full&review=23). V13 비교와 눈맞춤·깜빡임·턱 벌리기·입 벌림 정지 확인을 제공한다. Blender 1/35/76프레임에서 턱 작동 시 안구 이동 0, 복귀 변위 0을 확인했다. `v23-jaw-check.json`, `v23-glb-check.json` 기록. 정면·측면·입 벌림 렌더와 브라우저 GLB 실제 턱/혀 표시를 확인했다. 전체 시점/동작 충돌, 실기기 성능은 미검증이다. 앱 런타임 수정이 없어 Expo 테스트·네이티브 빌드는 실행하지 않았다.


## 2026-09-11 — V13 표정 제어 / 외형·앉은 자세 미완료

요청 범위는 원화 외형·눈맞춤·입 움직임·앉은 자세 모두다. 이 범위 전체는 완료하지 못했다.

V13은 V8 외형에 안구 전용 LookLeft/Right/Up/Down morph와 작은 MouthOpen 입술 변형을 추가했다. 원본 Head_Jaw 관절은 안구까지 움직여 사용하지 않았다. GLB에는 SlowBlink·LipMotion·LookAround 클립을 넣었다. Blender에는 morph와 깜빡임 action이 있고 LipMotion/LookAround 타이밍은 `package-bicolor-v13.py`가 GLB에 작성한다. 이는 입 내부를 갖춘 큰 입 벌림이나 음성 립싱크가 아니다. 눈맞춤은 카메라/포인터를 제한된 범위에서 따른다.

[표정 V13](http://localhost:8092/cat-rework/index.html?model=face&review=13). 정면/사선 안구 렌더, 입술 변형 렌더, 브라우저 사선 눈맞춤, 모듈 구문과 GLB 구조를 확인했다. `v13-check.json` 기록. Blink와 gaze를 함께 적용할 때 눈감김에 따라 시선 변형을 줄인다. 실제 모바일 성능과 전체 동작 충돌은 미검증이다.

앉은 자세 v10/v11/v12/v14에서는 뒷다리 단면 회전, 발 접지, 몸 길이, 머리 폭, 꼬리 두께를 실험했다. 등·골반·꼬리 형태가 품질 기준에 못 미쳐 라이브 모델로 채택하지 않았다. A 주황/크림 정점 배색도 털 무늬 소실로 미채택했다. `.blend`, `.glb`, 전후 렌더는 보존한다. 현재의 자동 수치 변형 결과를 원화 수준 완성품으로 부르지 않는다. 새 골반·발·꼬리의 수작업 수준 재조형, 얼굴 배색·털, 입 내부/턱 가중치 재구성이 남았다.

앱 런타임은 변경하지 않았으며 Expo 테스트·네이티브 빌드·실기기 검증은 실행하지 않았다.


## 2026-09-11 — V9 느린 깜빡임

V8 조형을 유지하고 원본 target_0가 양쪽 눈감기임을 실제 morph별 렌더로 확인했다. 이를 이용해 3초 SlowBlink 클립(감기·유지·뜨기)을 만들었다. `bicolor-a-v9.blend` / `.glb`, `animate-bicolor-v9.py`, `morph-study-0/1/2.png`, `v9-glb-check.json`을 보존한다. 원본 동작은 이전 V8 및 Blender의 보존 action에 남아 있고 V9 GLB에는 SlowBlink만 포함한다. 40관절 스킨과 기존 morph 유지.

[깜빡임 V9 검토](http://localhost:8092/cat-rework/index.html?model=face&review=9): 한 번 재생, 닫힘 상태 확인, 기본 자세 복귀 제공. 브라우저에서 GLB 해시 검증과 정면 눈감김을 확인했다. 전체 시점·블렌딩 충돌 검증은 아니다. 조형·배색의 원화 일치, 앉은 자세, 입 내부/입 연기, 눈맞춤·대기 클립은 아직 미완료다. 앱 코드 변경 없음. Expo 테스트·네이티브 빌드 및 실기기 성능 검증 미실행.


## 2026-09-11 — V8 주둥이 비율 수정과 애니메이션 제작 기준

Bicolor 기반 V8에서 눈 변형을 제한하면서 코 아래 길이·주둥이 돌출과 수염 볼·입꼬리를 조정했다. V7의 눈이 눌리는 변형은 미채택. `bicolor-a-v8.blend` / `.glb` 및 정면·사선·측면·전신·무채색 렌더를 보존한다. 기존 40관절과 morph를 유지했으며 원본 GLB는 변경하지 않았다. 원화 수준의 최종 아트는 아니며 배색·볼 윤곽·앉은 자세는 후속 작업이다.

[원본/V6/V8 비교](http://localhost:8092/cat-rework/index.html?model=face&review=8)는 모델 전환 시 사용자 카메라와 확대를 유지한다. GLB 해시 확인, 모듈 구문 검사, 브라우저 사선 표시·기존 동작 재생을 확인했다. Blender 7개 프레임의 변형 좌표 유한성 검사는 통과했으나 모든 프레임의 충돌을 보장하지 않는다. `v8-animation-check.json` / `v8-glb-check.json` 기록.

사용자가 최종 애니메이션 필요성을 명시했다. [동작 제작 기준](assets/avatar/realistic/rework/ANIMATION.md)에 Idle·LookAt·SlowBlink·Listen·Meow·TailIdle과 각 검수 기준을 정리했다. 기존 morph의 의미는 미확정이며 일부 항목은 변형량 0이다. 새 깜빡임/입 연기 클립 완성을 주장하지 않는다. 앱 런타임 변경이 없어 Expo 테스트·네이티브 빌드 미실행, 실기기 성능 미검증.


## 2026-09-11 — Bicolor 기반 얼굴 수정 V6 (제작 중)

원본 기반 `assets/avatar/realistic/rework/bicolor-a-v6.blend` / `.glb`를 제작했다. 얼굴 비율과 귀 높이를 조정하고, 일치하는 UV 경계 정점을 용접한 뒤 표면 분할과 기존 morph 재샘플링을 적용했다. 실제 안구에 둥근 동공·호박색 홍채를 만들고 원본 털에 정점 색상으로 따뜻한 색조를 더했다. 원본의 흰 얼굴 무늬는 남아 있으며 A 원화 수준의 최종 조형·배색은 아니다.

[원본/얼굴 수정 비교](http://localhost:8092/cat-rework/index.html?model=face). 자유 회전·확대와 시점 버튼을 제공한다. 이전 cat-foundation 주소는 이 비교 화면으로 연결하며 종전 검토 HTML은 archive.html에 보존한다. 원본과 수정본의 다운로드 해시를 확인하고 정면 렌더, 기존 애니메이션 재생 및 기본 자세 복귀를 브라우저에서 점검했다. 전체 프레임의 충돌 검증은 아니다.

V6: 8,070,904 bytes / 62,896 triangles / 3 meshes / 40 joints / 애니메이션 1개(120 channels). 원본 GLB SHA-256 보존 확인. 앉은 자세 V1~V5 실험은 골반·뒷다리와 턱 연결이 기준에 못 미쳐 공개 비교에서 제외했다. 다음 작업은 볼·주둥이와 입꼬리 재조형, A 배색, 앉은 몸의 골반·다리 연결 재제작이다. 앱 런타임 변경 없음. 에셋/독립 검토 페이지 작업이므로 Expo 테스트·네이티브 빌드는 실행하지 않았고 모바일 성능은 미검증이다.


## 2026-09-11 — Bicolor 기반 A 원화 재제작으로 방향 전환

사용자가 처음 가져온 실사형 Bicolor Cat 재활용을 제안하고 해당 모델임을 확인했다. 직접 조형 V15~V20에서는 색·짧은 메시 털·수염·눈 재질, 앉은 몸 길이, 귀 재제작을 시험했다. V20은 원화 수준의 최종 모델로 채택된 상태가 아니며 실험 파일로 보존한다.

새 기반은 `assets/avatar/realistic/bicolor-cat.glb`이다. 원본 8,646 triangles / 40 joints / 3 meshes 구조를 확인하고 `realistic/rework/bicolor-source-study.blend`에 별도 편집 작업본을 만들었다. 원본 파일은 무변형이다. A에 맞춘 재조형은 아직 이 작업본에 적용하지 않았다. 몸·발·꼬리·UV·본 계층을 재사용하되 얼굴/표정용 토폴로지, 앉은 포즈와 털 재질은 실질적인 수정 대상이다. [제작 범위와 확인 근거](assets/avatar/realistic/rework/README.md)를 따른다. 앱 런타임은 변경하지 않았으며 네이티브 빌드와 실기기 성능 검증은 하지 않았다.


## 2026-09-11 — V14 귀 조형 수정 / V13 추가 머리 축소

V13은 V12 머리 전체를 추가로 8% 축소했다. V11 대비 높이·깊이 배율 0.8464, 폭 0.821008. 얼굴 부품과 morph를 같이 변환하고 목을 부드럽게 연결했다. 하부 몸통·꼬리 정점 변화 0을 확인했다.

이어 사용자가 귀 형태를 지적해 V14에서 기존 연속 메시의 귀 영역을 국소 변형했다. 위쪽 귀 높이를 줄이고 너비·안쪽 깊이를 늘리며 바깥 테두리를 회전하고 끝을 국소 완화했다. 변형 목표 배율은 높이 0.76 / 너비 1.26 / 깊이 1.7이며 영역별 가중치를 적용하므로 전체 귀 실측 배율은 아니다. V13의 머리 크기와 얼굴·표정 구조는 유지한다. 털 가이드는 기본 비활성으로 귀 조형을 직접 검토한다.

[귀 전후 비교 V13/V14](http://localhost:8092/cat-foundation/index.html?review=14&view=front). `resize-cat-v13.py`, `refine-cat-ears-v14.py`와 버전별 `.blend`/`.glb`를 보존한다. `v13-proportion-check.json`, `v14-ear-check.json`에서 연속 몸 메시 non-manifold edge 0과 양의 체적 확인. `v14-motion-check.json`의 완전 닫힘 프레임 정면 안구 정점 4,996개 노출 0. V14 사선·측면 렌더 확인. 귀 밑동의 자연스러운 접합과 전체 미술적 완성도는 계속 검토할 대상이다. 실제 털·최종 얼굴 리그·모바일 성능·앱 홈 적용은 미완료이며 앱 런타임 변경이 없어 네이티브 빌드는 하지 않았다.


업데이트: 2026-09-10. 상태: **뮤 보이스 네이티브 릴리스 준비, 야옹 생성·재생 구현**. 기반 API 커밋 3a5a17f12의 GitHub Actions 34473640332 서버 배포 단계 성공을 확인했다. 실제 공급자·실기기 전체 플로우 검증과 스토어 심사 완료는 별개다.

## 2026-09-11 — V12 털을 고려한 머리 비율 비교

머리 높이·깊이를 8%, 폭을 10.76% 줄였다. 눈·코·입·눈꺼풀과 모든 morph를 함께 변환하고 목에는 완만한 전환을 적용했다. 하부 몸통과 꼬리의 정점 변화는 0이다. [V11/V12 비교](http://localhost:8092/cat-foundation/index.html?review=12)는 같은 카메라·확대·조명을 유지한다.

`예상 털 윤곽`은 볼·관자·뒤통수의 여유를 표시하는 별도 정적 가이드다. 실제 털이 아니며 최종 털 길이나 머리 비율 승인을 뜻하지 않는다. 얼굴 앞면은 가이드를 비워 눈·입을 가리지 않는다. 반응 재생 시 가이드는 꺼진다. 색·실제 털·감정 표정·모바일 최적화와 앱 홈 적용은 후속이다.

검증: V12 GLB 2,202,392 bytes / 13 meshes / 228,232 vertices / 453,908 triangles / 5 materials / 1 skin(2 joints) / 1 animation(10 channels). 4개 눈꺼풀 각각 4 morph 유지. 몸·코·꼬리 non-manifold edge 0 및 양의 체적. `v12-proportion-check.json`, `v12-motion-check.json` 기록. 완전히 감은 50프레임의 정면 샘플 안구 정점 4,996개 모두 가림을 확인했다. 모든 시점·프레임 보장은 아니다.

실제 정면·사선·측면·눈 감기 렌더를 검토하고 Blender V12를 열었다. 브라우저에서 두 모델/가이드 해시 검증과 동일 시점 비교를 확인했다. 앱 런타임 변경이 없어 Expo 테스트·네이티브 빌드는 실행하지 않았다. 실기기 성능은 미검증이다.

## 2026-09-11 — 이전 V11 눈맞춤·눈 주변 수정과 반응 시험

`refine-cat-v11.py`가 V10에서 눈 주변 돌출, 안구 깊이, 홍채/동공 비율과 코 두께·접합을 조정한다. 몸 조형의 과밀 메시를 줄인 후 위/아래 눈꺼풀 4개에 단계별 곡면 morph를 만들고, 2관절 스킨 리그로 작은 고개 기울임을 추가했다. 볼 전체를 접는 초기 blink 실험은 결함으로 제외했다. 최신 산출물은 `cat-a-foundation-v11.blend` / `.glb`, 실제 렌더 `v11-final-*.png`다.

GLB **2,202,300 bytes / 13 meshes / 228,232 vertices / 453,908 triangles / 5 materials / 1 skin(2 joints) / 1 animation(10 channels)**. 눈꺼풀 4개 각각 Blink25/Blink50/Blink75/SlowBlink morph를 가진다. body/코/꼬리 non-manifold edge 0 및 양의 체적. 눈꺼풀은 의도된 열린 곡면이다. `check-cat-v11-motion.py`가 1/44/50/60/80 프레임을 검사했고 완전히 감은 50프레임의 정면 투영에서 안구 정점 4,996개 모두 가림을 확인했다. 샘플 프레임/방향 검사이며 모든 동작·시점의 충돌 보장은 아니다.

MCP로 실제 Blender V11 열기 성공. 웹에서 해시 확인 후 V10/V11 비교, 눈 감기, 재생 중 실제 깜빡임, 정지·기본 표정 복귀를 확인했다. 약 5초 반응은 명시적 재생이며 숨겨진 화면에서는 갱신을 중지한다. 검토용 얼굴·리그이고 최종 아트, 감정 표정/입 연기, 털·색, 모바일 LOD/실기기 성능과 앱 홈 적용은 미완료다. 앱 런타임을 수정하지 않아 Expo 테스트·네이티브 빌드는 실행하지 않았다.

## 2026-09-11 — 이전 V10 얼굴 집중 수정

사용자가 V9의 얼굴 자료 적용 수준을 지적했고, 충분히 반영하지 못했음을 인정했다. `rebuild-cat-face-v10.py`와 `finish-cat-face-v10.py`로 눈구멍·눈꺼풀에서 광대로 이어지는 피부 면, 좌우 수염 볼, 콧밑에서 갈라지는 입선, 코 두께·턱 깊이를 수정했다. 안구 앞뒤 두께를 줄였다. V9 몸통/꼬리 설계는 유지하되 연속 표면 재생성으로 몸 메시의 정점 구성은 달라졌다.

`cat-a-foundation-v10.blend` / `.glb` 저장, 실제 Blender 열기 성공. 최신 GLB **2,729,408 bytes / 9 meshes / 467,608 vertices / 933,444 triangles / 5 materials / no skins, animations or morphs**. 실제 정면·사선·측면·전신 렌더 `v10-release-*.png`를 제작했다. 몸·꼬리·코 non-manifold edge 0 및 양의 체적 검사 통과. 눈 바깥 흰 줄을 발견해 보정했고 정면 투영의 예정 눈구멍 밖 정점 각 1,600개 검사에서 안구 노출 0을 확인했다. 이 검사는 모든 시점/애니메이션의 충돌 보장이 아니다.

로컬 비교는 V9↔V10 같은 카메라·확대·조명과 얼굴 정면/사선/측면 버튼을 제공하며 실제 다운로드 SHA-256을 검증한다. `?review=9`는 이전 V9, `?review=10`은 V10을 선택한다. 브라우저 로드·사선 표시 확인. 무채색 조형 검토이며 눈꺼풀 두께·원화 인상, 리토폴로지·털·리그·모바일 LOD/실기기 성능과 앱 홈 적용은 미완료다. 앱 런타임 변경이 없어 Expo 테스트·네이티브 빌드는 실행하지 않았다.

## 2026-09-11 — 이전 V9 실루엣·얼굴·꼬리 재구성

`rebuild-cat-a-v9.py`로 V8의 고양이 메시를 교체하고 스튜디오·참고 자료만 유지했다. 머리/몸통 단면, 앞다리·발, 얼굴의 눈/코/입 간격과 주둥이 깊이, 안쪽에 배치한 안구를 새로 구성했다. 꼬리는 골반 뒤에서 바깥으로 돌아 나오며 뿌리 이후 몸통·발과 간격을 갖는다. 정적 정점 BVH 검사에서 해당 구간 침투 0 / 최소 간격 0.2015 장면 단위. 뿌리는 별도 메시가 몸 안에 겹쳐 연결하며 리그·용접은 없다.

`cat-a-foundation-v9.blend` / `.glb` 저장 및 라이브 Blender에서 열기 성공. 실제 Cycles 6시점 `v9-final-*.png` 렌더를 검토했고, 몸·꼬리·코 non-manifold edge 0 및 양의 체적 검사를 통과했다. GLB 1,261,448 bytes / 9 meshes / 196,659 vertices / 389,552 triangles / 5 materials / no skins, animations or morphs.

로컬 화면은 V8↔V9 동일 카메라 비교, 꼬리 연결·상단 시점, 해시 파일명과 실제 다운로드 SHA-256 검증을 제공한다. 브라우저에서 두 모델 로드·전환과 꼬리 간격을 확인했다. 무채색 조형 시안이며 최종 아트 승인·표정용 리토폴로지·털·리그·모바일 최적화·앱 홈 적용은 미완료다. 런타임 변경이 없어 Expo 테스트·네이티브 빌드는 실행하지 않았다.

## 2026-09-11 — 이전 V8 등·얼굴 구조 수정 및 참고 자료 수집

사용자는 V8에서 변화가 보이지 않는다고 지적했다. 원본/미리보기/HTTP 응답 SHA-256이 `7894ec59a2897ff0925277229691569974426cc79fa7af01db228f5554569ed0`으로 일치함을 확인했다. 이는 현재 서버 파일의 확인이며 사용자가 이전에 보던 탭의 캐시 상태를 입증하지 않는다. V8은 부분 변형으로 전체 얼굴형·체형을 충분히 개선하지 못했다. 검토 화면에 같은 카메라/확대/조명을 유지하는 V6↔V8 전환을 추가했다. 파일 내용 해시가 들어간 GLB 경로, no-store 요청, 브라우저 SHA-256 검증을 사용한다. 모델 자체는 이번 확인 작업에서 다시 변경하지 않았다.

`assets/avatar/blender/cat-a-foundation-v8.blend`와 GLB 제작. V6에서 등 폭·깊이, 좌우 수염 볼·콧밑·입선·턱을 수정하고, 별도 코 표면과 실제 오목한 콧구멍을 모델링했다. V7의 과도한 골반 확대 실험은 채택하지 않았다. `references/anatomy/README.md`에 LOOF/CFA 도해·사진, TICA/FIFe 문헌, CC BY 모델의 정사영 3뷰와 한계를 기록했다. `prepare-cat-reference-preview.mjs`로 `/cat-references/index.html`을 만든다.

V8 실제 Blender 렌더 4장, 몸·꼬리·코의 non-manifold edge 0 및 양의 체적, GLB 구조와 라이브 Blender 파일 열기 성공 확인. GLB 1,194,304 bytes / 7 meshes / 364,026 triangles / no skins or animations. 원화 수준 완성도·모바일 최적화·앱 적용은 미완료다. 애셋/로컬 검토 화면만 변경하여 Expo 테스트·네이티브 빌드를 실행하지 않았다.

## 2026-09-11 — 이전 V6 기본 조형 재구성

사용자 피드백에 따라 색·털 보강을 멈추고 `assets/avatar/blender/cat-a-foundation-v6.blend`와 `.glb`를 제작했다. 머리/귀/목/몸통/다리를 연속 표면으로 결합하고 주둥이·콧밑·턱, 앞발 홈, 닫힌 꼬리 끝을 조형했다. 무채색이며 리그·애니메이션·털은 없다. A 원화 수준의 최종 아트는 미완료다.

실제 Blender 정면/45도/측면/후면 렌더, 몸 표면·꼬리의 non-manifold edge 0 및 양의 체적, GLB 구조 검사와 브라우저 로드를 확인했다. GLB는 1,190,608 bytes, 7 meshes, 364,382 triangles로 Draco 압축 크기만 작으며 모바일 성능 최적화 완료를 뜻하지 않는다. `node scripts/prepare-cat-foundation-preview.mjs`로 `/cat-foundation/index.html`을 준비한다. 앱 런타임 변경이 없어 Expo 검사·네이티브 빌드/실기기 검증은 실행하지 않았다. [상세 제작 기록](assets/avatar/blender/README.md).

## 2026-09-11 — 이전 A V3 실제 3D 검토 시안 제작

`assets/avatar/blender/cat-a-study-v3.blend`와 `.glb`를 제작했다. 연속 얼굴 표면, 통합 몸통, UV bake한 A 원화 색상, 짧은 메시 털, 6관절 고개/귀/꼬리 반응 클립이 있다. 눈은 페인팅이며 깜빡임/시선 추적이 없다. Head의 Content/Plead morph는 작은 볼 변형 실험으로 6표정 완성을 뜻하지 않는다. 11 mesh, 122,474 triangles, 11,224,840 bytes로 모바일 최적화 전 검토용이다.

`node scripts/prepare-cat-a-preview.mjs` → `/cat-a/index.html`에 실제 GLB 검토 화면을 만든다. Blender 정면/45°/측면 렌더와 GLB 구조 검사, 브라우저 GLB 로드·시점 전환·재질 비교·리그 재생을 검증한다. 상세 실제 검증 결과와 한계는 [Blender README](assets/avatar/blender/README.md). 앱 런타임을 변경하지 않아 Expo 타입검사·전체 테스트·네이티브 빌드/실기기 검증은 이번 애셋 제작 범위에서 실행하지 않았다. 앱 홈 교체·최종 아트 승인은 미완료다.

승인한 A 원화 한 장의 Hyper3D/Rodin 무료 생성은 `API_INSUFFICIENT_FUNDS`로 실패했다. 외부 생성 모델·유료 구매는 없다. 현재 산출물은 로컬 Blender 제작본이다.

## 2026-09-11 — 원화 A 선택, 표정·다각도 시트 제작 (설치 단계 이력)

built-in image_gen으로 얼굴 원화 3안을 만들었고 사용자가 A(큰 눈·부드러운 볼)를 선택했다. `assets/avatar/concepts/v1/`에 후보 3장·A 6표정·A 4시점 참고 이미지·전체 프롬프트·검토 HTML을 저장했다. 모두 2D 원화이며 실제 3D 메시·리그·애니메이션을 제작했다는 의미는 아니다. 브라우저에서 96px 썸네일·표정 선택·흑백/컬러 비교를 확인했다. 앱 홈 교체는 아직 수행하지 않았다.

사용자 승인으로 Blender 4.5.10 LTS·MCP 1.9.1을 설치하고 Codex 전역 `blender` 서버를 등록했다. 실제 MCP STDIO 연결로 장면 조회·임시 메시 생성/삭제·파일 저장을 확인했다. `assets/avatar/blender/cat-a-workspace.blend`는 원화 이미지 3개를 pack한 작업 파일이며 고양이 메시는 아직 없다. 상세 설치·재실행·검증은 [Blender README](assets/avatar/blender/README.md). 이번 원화/도구 설정 단계는 앱 런타임 변경이 없어 Expo 빌드·실기기 검증을 실행하지 않았다.

## 2026-09-11 — 직접 조형 미채택, 카툰 제작 방식 재조사 (이력)

사용자가 현재 고양이를 제품에 사용할 수 없다고 판단했다. `/original-cat/index.html`은 실패 원인 확인용 시안으로 보존하며 출시 후보에서 제외한다. [제작 방식 조사](./docs/plans/pet-companion/CARTOON-CAT-ART-DIRECTION-2026-09-11.md)와 design.md에 원화·표정·조형·반응 연기를 먼저 검증하는 새 순서를 제안했다. 새 디자인 선정·모델 제작·앱 홈 교체는 아직 수행하지 않았다. 최신 털·눈가 실험 GLB는 5,251,092 bytes이며, 아래 최초 GLB의 재로드/브라우저 검증 기록을 최신 실험의 검증으로 해석하지 않는다. 이번 리서치 단계는 문서 변경이며 앱 빌드·실기기 검증은 수행하지 않았다.

## 2026-09-11 — 직접 모델링한 고양이 첫 조형 (미채택 이력)

사용자가 장화신은 고양이의 큰 눈·모자 잡는 표정을 참고 이미지로 지정했다. `assets/avatar/original/`에 직접 만든 Three.js 메시 소스와 정적 GLB, 별도 검토 화면을 추가했다. 얼굴·동공 크기 조절, 회전/확대, 호흡·느린 깜빡임을 제공한다. 재생성은 `node scripts/prepare-original-cat.mjs`. GLB 재로드와 브라우저 정면/측면·확대/축소 확인. 전신 스킨/클립·최종 털 질감·앱 홈 교체는 미완료다. 세부 내용은 해당 폴더 README를 따른다.

## 2026-09-11 — 사용자 디자인 정정

사용자는 블록/마스코트 고양이 시안을 채택하지 않았다. 목표는 **실제 키우는 고양이를 닮은 사실적 3D 재현**이다. 현재 앱 홈 코드는 이전 시안이다. 기본 실사형 모델을 먼저 확보하고, 이후 사용자 고양이와 닮게 맞추는 순서다. Bicolor Cat CC BY 4.0 원본을 `assets/avatar/realistic/`에 확보했고, GLB 구조와 Three.js 검토 화면에서 텍스처·외형·클립 재생을 확인했다. 8,646 triangles, 2,297,972 bytes, 40관절, 애니메이션 1개. 앱 홈 교체·실기기 검증·개체별 외형 제작은 아직 진행 전이다. 검토 화면은 정면·눈높이를 맞춘 기본 시점과 `눈 맞추기` 복귀 버튼을 제공한다. 측면에서 정면 복귀를 브라우저에서 확인했다. `node scripts/prepare-realistic-cat-preview.cjs`로 재생성한다. 최신 기준은 design.md 최상단을 따른다.

## 2026-09-11 — 가상 3D 고양이 홈 (이전 시안 구현 기록)

- `src/features/avatar/` 추가. 첫 체험 화면과 홈에 Quaternius CC0 Cat의 변형 GLB를 표시한다. 원본·변형본·해시·출처는 `assets/avatar/SOURCE.md`, 재현 스크립트는 `scripts/prepare-cat.cjs`에 있다.
- 크림/세이지 무대, 4개 탭(우리 공간·대화·기록·우리 아이), 좌/우 외형 패널. 털·눈·리본·체형·얼굴 크기·방향을 미리 보고 저장한다. SecureStore에 안전한 사용자/아이별 키를 사용하며 웹은 탭 세션 저장이다.
- 기존 ask/대화 조회 API에 홈 입력을 연결했다. 대기 응답 조회·실패 재확인·참고 기록 이동, 선택 아이 변경 시 이전 요청 무시, 명시적 TTS 재생·화면 이탈/백그라운드 정지를 추가했다. 체험 답변은 실제 AI 답변과 구별한다.
- Three.js + React Three Fiber, native expo-gl, expo-speech, expo-asset 추가. GLB 280,612B를 번들에 포함한다. 화면 이탈/동작 줄이기 처리와 렌더러 실패 안내·재시도 지원.
- 검증: TypeScript, ESLint, Jest 30개, Android Hermes/web export 통과. 브라우저 390×844·360×640에서 모델 로드·털색/눈색 변경·좁은 패널·저장/새로고침 복원·패널 좌우 이동·첫 체험 진입·체험 질문/답변을 확인했다. 실기기 미연결로 native GL 성능·복원·접근성·음성은 아직 미검증이다. 새 dev client/설치 빌드가 필요하며 스토어 배포하지 않았다.
- 범위: 첫 안내·홈·탭 바가 새 디자인이다. 로그인/기록/상세/야옹 생성 화면의 전체 스타일 통일과 상세 내부 탭은 후속이며, 원본에 턱 리그가 없어 입술 동기화·자유 음성 인식은 포함하지 않는다. 현 디자인·아이콘/이미지 제작 제안은 `design.md`가 기준이다.

## 브랜드 관리

- 2026-09-10 심사 준비: `/meow`에서 최대 6초 보호자 녹음의 강약·쉼·길이를 바탕으로 기기 내 WAV 합성, 미리 듣기·정지·재녹음 지원. 의미 번역이나 실제 고양이 음성 복제는 아니다. 원본은 변환/취소 후 삭제, 결과는 화면 종료 시 삭제한다. 서버/API 변경 없음.
- 무음·비정상 입력, 출력 길이·PCM 진폭·base64 검증 포함 Jest 17개, typecheck/lint, 웹/Android export 통과. Chrome 가상 마이크에서 녹음→생성→재생→정지→재녹음→취소 smoke 통과. 실기기 음질·권한 smoke는 아직 미완료.
- 승인 아이콘을 Expo/iOS/Android/splash/favicon에 연결했다. 이 변경은 새 네이티브 빌드 이후 설치 앱에 반영된다.

- 공식 이름·문구·디자인 확정 상태는 [브랜드 SSOT](./brands/mewvo/README.md)를 따른다. `app.config.js`가 한글명을 읽어 Expo/iOS 표시명에 적용한다.
- 밈 고양이 아이콘·한영 마켓 이미지·캐치프레이즈는 사용자 승인 후 SSOT에 등록하고 Google Play에 업로드했다. 승인 아이콘을 앱 설정에 연결했으며 기술 식별자는 유지한다. 웹·인앱 전체 이름 및 OS 표시명 다국어 연결은 후속 작업이다.
- 보호자의 말을 고양이 울음소리로 만들어 재생하는 양방향 대화가 합의된 제품 방향이다. 이 기능의 출시 준비 검증은 아직 완료되지 않았다.

## 빌드 환경

- 2026-09-11 Jenkins 오류 점검: #23의 native Android/iOS 빌드·산출물 보관·TestFlight 업로드는 SUCCESS, Play bundle upload만 HTTP 400 `This edit has expired`로 실패했다. 기존 릴리스 기록의 동일 AAB 수동 업로드 복구와 Jenkins의 FAILURE 표시는 구분한다. 업로드 성공 전 명시적인 edit 만료만 새 세션으로 최대 3회 시도하는 로직과 충돌/실패 회귀 테스트를 추가했다. 원격 Jenkins 재실행 검증은 아직 수행하지 않았다.

- 최신 빌드: Jenkins #23의 `1.2.0 (90)`. TestFlight 내부 테스트 및 Apple 심사 버전 연결, Google 내부 초안 업로드를 확인했다. 심사 제출은 아직 완료되지 않았다. 번호는 날짜 기반 대신 영속 카운터로 +1 증가한다. 최신 제출 결과는 [릴리스 기록](./brands/mewvo/release/README.md), 번호 기준은 [빌드 번호 정책](./brands/mewvo/release/build-number-policy.md)을 따른다.

- Mimi Seed CLI 0.19.13 고정, MCP 실행 버전 0.19.13 확인. 루트 manifest는 office-stable의 `findthem-mobile`에 고정한다.
- `deploy/jenkins/Jenkinsfile.mobile`로 Android/iOS 빌드와 Google Play internal draft·App Store Connect 업로드를 수행한다. 사용자 요청으로 기본 both/업로드 true.
- agent `svl-mac-01`, 기존 앱 식별자/서명 유지, Expo native 재생성. 상세는 [BUILD.md](BUILD.md).
- Jenkins 기본 소스는 master이며 작업 브랜치 삭제에 의존하지 않는다. Play 기본 SA의 gg.pryzm.union 접근 검증 후 전용 Jenkins credential 등록 완료.
- office-stable의 `findthem-mobile` 작업 활성화. #1–#9 소스 checkout 오류 수정 후 #10 iOS 전송 파이프라인 실행. Apple 앱/빌드 조회 및 API 키 등록 완료.
- 원격 Jenkinsfile 검증·모바일 타입/lint·14개 테스트·CI 2개 테스트·Android Hermes export·Mimi Seed 양 플랫폼 dry-run 통과. 네이티브 결과는 BUILD.md 이력 참조.
- iOS #11에서 IPA 전송 성공, App Store Connect 빌드 211200382 VALID 확인. Android #15도 성공했고 Google Play internal에 빌드 211201992 draft 등록 확인. 공개 출시·심사 제출은 별도이며 실기기 검증과 새 API 배포가 남아 있다.

## 구현

- 2026-09-11: API 계정 설정에 영구 계정 삭제/확인 창을 추가했다. 기존 DELETE /auth/me 성공 후 세션을 지운다. 취소·성공·실패·체험 모드 비노출 테스트 포함 총 21개 통과. 심사 제출 상태는 릴리스 기록을 따른다.

- Expo Router 기반 앱 전면 재작성. 홈/기록/촬영/대화/우리 아이, 고양이 등록, 결과·피드백, 설정.
- 한국어, React Native StyleSheet, dark/sky 디자인, 자체 벡터 고양이 일러스트와 아이콘.
- 명시적인 체험 모드: local data persistence, 사진·질문·맥락 기록, 실제 행동/반응 저장, 동일 고양이의 저장된 반응 인용. AI로 분석하지 않았음을 항상 표시.
- 실제 API 모드: 기존 계정 로그인/개발용 게스트 생성, SecureStore ft_token, 세션별 Query cache.
- 사진첩/카메라와 최대 45초 울음 녹음·재생·재녹음, JPEG 전환·리사이즈, 권한 거부 시 파일 선택, 업로드 오류와 재시도, native 미완료 요청 ID 저장.
- 분석 큐 상태 조회, 관찰/가능한 의미/한계/추정 표현/반응 제안 분리, 실패·판단 보류 표시.
- 기록별 후속 반응, 인용 기록 상세 링크, 최근 7일 기록 횟수 요약(행동 변화 리포트 아님).
- 보관 동의, 기록 JSON 확인/native 공유, 고양이별 기록 삭제, 로그아웃.

## 실제 API 계약 (첫 구현)

공통 prefix `/api/pet-companion`. 모든 API가 인증과 소유권 검사를 사용한다.

| 경로 | 계약 |
| --- | --- |
| GET/PUT `/consent` | serviceStorage, researchTraining, PUT version |
| GET/POST `/pets` | GET {pets}; POST {name, confirmedTraits} → CompanionPet |
| GET `/observations` | {items,nextCursor}, 현재 최대 50건 |
| POST `/observations` | multipart media(사진/오디오), petId, kind=PHOTO/AUDIO, durationMs(오디오), question, contextTags JSON, Idempotency-Key UUID → Observation |
| GET `/observations/:id` | status, inference, feedback[] |
| GET `/observations/:id/media` | 인증된 소유자만 private 사진/오디오 조회 |
| POST `/observations/:id/feedback` | action, reaction, happenedAt, note |
| POST `/observations/:id/retry` | 실패한 분석 재시도 |
| POST `/pets/:id/conversations` | message, idempotencyKey → queued Conversation |
| GET `/conversations/:id` | 답변 상태 조회 |
| GET `/pets/:id/conversations` | 이전 대화 목록 |
| DELETE `/pets/:id` | 즉시 숨김 → 202 PENDING → BullMQ 사진·관계 데이터 삭제; 실패 재요청 가능 |
| GET `/deletions` | 소유자의 삭제 진행/실패 목록; 완료 후 목록에서 제거 |
| GET `/data-export` | JSON 메타데이터; 원본 미디어 제외 |

모델은 기존 공개 Pet과 분리된 CompanionPet/Observation/Media/Inference/Feedback/Conversation/Consent다. shared 계약은 packages/shared/src/petCompanion.ts다.

## 검증 기록

- 390px 웹 미리보기: 홈, 촬영, 테스트 이미지 선택, 사진 기록 생성, 반응 저장, 대화의 정확한 문구 인용, 근거 링크, 새로고침 후 사진/반응 유지 확인.
- 모바일 demo 테스트: 6개 통과(다른 고양이·미래 관찰 분리, AI 결과 미조작, 기록 근거, 저장 실패 원자성, 동시 쓰기).
- 모바일 typecheck·lint 통과. Android Hermes export(1,630 modules, 4.62 MB)와 web export(1,329 modules, 2.73 MB) 통과.
- API/shared typecheck·Prisma schema validation 완료. API 파서·소유권/동의 guard·private 저장 경로 단위 테스트 8개 통과. 사진/AI worker의 실제 DB·Redis 통합은 미검증. 돌봄 기록의 별도 PostgreSQL 통합 결과는 아래 참조.

## 아직 하지 않은 것

- 운영/개발 DB 마이그레이션 적용, 실제 AI 공급자 호출, EAS 빌드/스토어 제출/배포.
- Android/iOS 기기 smoke: 연결된 Android 기기 없음. 웹과 JS 번들 검증은 실제 카메라/권한/OS 검증을 대신하지 않는다.
- 영상 분석, 품종/연령 AI 추정·프로필 사진, 계정 OAuth 연동, 가족/강아지, 구독, 자동 주간 AI 요약·변화 탐지.
- 학습 참여 운영/동의 이력·보관 기간 자동 정리·전체 계정 삭제·미디어 포함 내보내기.
- 고양이 삭제는 BullMQ 작업·재시도·앱의 진행 상태 표시를 구현했다. JSON 내보내기는 동기 처리이며 대용량 비동기 내보내기와 보관 정책은 후속 구현이다.
- 사진·관찰 목록은 클라이언트에서 50건씩 cursor pagination을 사용한다. 돌봄 기록 pagination은 그대로다. 계정 API는 기존 목록 응답의 nextCursor를 cursor로 다시 보낸다. native upload는 요청 직전 draft 저장, 업로드 전 화면 편집 전체 자동 저장은 아직 없다.
- 공식 명칭은 '뮤 보이스' / 'MewVoice'. 기존 bundle/package gg.pryzm.union 식별자를 유지하며 기존 사용자 업그레이드 실기기 검증은 남아 있다.

## 10만 DAU 계획의 첫 개발 범위 — 2026-09-10

- 전역 고양이 선택: 오늘·기록·촬영·대화 연결, 계정별 선택 보존, 새 고양이 등록 시 선택.
- 사진 없는 돌봄 기록 4종: 생성·시각/내용 수정·삭제, 계정/고양이별 로컬 초안, KST 오늘 경계.
- 오늘 화면과 통합 타임라인: 실제 최신 사진 fallback, 불러온 기록 기준 통계, 돌봄 cursor pagination.
- 사진 관찰에 행동·반응 칩, 모름/직접 입력 제공. 체크인 후속 반응 모델과 사진 피드백 편집은 후속 범위.
- API: 생성 fingerprint + owner/key unique, 수정 version CAS, soft delete, 삭제 재전송 차단, 동의 철회 후 삭제 허용, export·pet cascade.
- 격리 PostgreSQL 18에 신규 두 migration을 적용하고 실제 HTTP 통합 테스트 7개 통과. production .env나 운영 DB는 사용하지 않았다. 테스트 클러스터는 종료했다.
- 모바일 단위 테스트 14개 통과. 브라우저 체험에서 사진 없는 생성·오늘 표시·새로고침 유지·편집 내용 복원을 확인했다.

계획·실제 API 계약: [SPRINT-01.md](./docs/plans/pet-companion/SPRINT-01.md). 재현 가능한 DB 테스트: [README](../api/tests/companion/README.md).

다음은 분석 수집/내부 QA 제외, 온보딩·대표 사진, 실기기/파일럿 검증이다. 이후 가족 권한·초대 → 주간 회고·공유로 진행한다. 10만 DAU의 수요·잔존·인프라 용량을 검증한 상태는 아니다.

최종 검증: 모바일 typecheck·lint(경고 0)·테스트 14개, API typecheck, Android Hermes 1,635 modules(약 4.66 MB) 및 Web 1,334 modules(약 2.75 MB) export 통과. 테스트 DB의 날짜 문자열/미래 시각 검증 포함 7개 통과. 기기에서 카메라·OS 권한·강제 종료를 검증한 결과는 아니다.

브라우저 추가 확인: 새 고양이 등록 후 자동 선택, 새 고양이의 기록 목록이 비어 있음, 원래 고양이로 전환하면 수정된 기록 복원. 생성/수정은 체험 모드 검증이며 계정 API의 권한·저장은 별도 격리 DB HTTP 테스트로 확인했다.

## Generated artwork refresh

Three optimized generated assets are stored in assets/companion: welcome-cat-app, today-cat-app, quiet-memories-app. Built-in image_gen was used; its model version cannot be selected/verified as 2.5. Exact prompts and use cases are in assets/companion/README.md. The start/registration screens use the portrait, today's empty-photo hero uses the landscape illustration, and the empty history uses the sleeping cat. Private uploaded photos still take priority. Browser visual checks cover the start screen and home composition; this is an artwork refresh, not 100k DAU readiness.

화면 검수: 시작·오늘·빈 기록 화면의 생성 이미지 표시, 홈 카피/고양이 비중, 고정 이미지 높이 확인. 앱은 합계 약 144 KB의 화면별 JPG를 사용하며 사용하지 않는 고해상도 PNG 원본은 제거했다. 실제 기기 성능과 스토어 빌드 검증은 별도다. 단위 테스트 14개는 로컬 Watchman 오류를 우회한 `npm test -- --watchman=false`로 통과했다.

애셋 적용 최종 검증: mobile typecheck/lint(경고 0), 단위 테스트 14개, Android Hermes export 및 Web export 통과. 경량 JPG 3개가 런타임 번들에 포함되고 원본 PNG는 포함되지 않음을 확인했다. 1024px PNG 아이콘은 iOS·Android adaptive icon·splash·web favicon 설정에 연결했다.

## 사용하지 않는 파일 정리

2026-09-10: 이전 findthem 화면·컴포넌트·품종 이미지·폰트의 기존 삭제 상태를 유지하고, 새 앱에서도 참조하지 않는 구형 `icon.png`, 고해상도 생성 원본 4장, 구형 아이콘 생성 스크립트를 추가 제거했다. `dist`와 `.expo` 캐시도 제거했으며 필요할 때 빌드 도구가 다시 생성한다. 현재 `assets`에는 런타임 JPG 3장, 생성 프롬프트 문서, `icon-v2.png`만 남겼다. 정리 후 typecheck·lint와 단위 테스트 14개가 통과했고 Expo 공개 설정에서 새 아이콘 경로를 확인했다.

## 웹·울음 관찰 통합

2026-09-10: 웹 `/findthem`을 모바일과 같은 고양이 사진·울음 관찰 제품으로 교체했다. 양쪽 모두 고양이 선택, 보관 동의, 사진/오디오 입력, 결과 대기·재시도, 기록·피드백·후속 대화를 제공한다. 오디오는 최대 45초이며 실제 파일 서명·길이·크기를 서버에서 다시 검증한다. 지원 공급자가 아니거나 신호가 부족하면 `ABSTAINED`로 끝낸다.

검증 결과는 모바일 typecheck·lint·단위 테스트 14개, 웹 production build·회귀 테스트 88개, API build·미디어/해석/비공개 저장 테스트 13개 통과다. 운영 DB 마이그레이션, 실제 AI 공급자 호출, 실기기 마이크 인터럽트·백그라운드 복귀 검증은 아직 실행하지 않았다.

## 사족 고양이 기반 검토 — 2026-09-11
공개 뷰어 비교 페이지 /cat-rig-review 추가. Milo 공개 동작 36개와 무료 Lowpoly Cat의 run 1개를 실제 조회하고 Chrome에서 선택·재생·정지 확인. 두 공개 목록 모두 앉기 전환 미확인. 편집용 파일 미확보·미구매이며 V13/sit-4 모델은 변경하지 않았다. 내장 브라우저 외부 iframe 지연 있음. 상세: [검토 기록](assets/avatar/references/quadruped/README.md).

사족 에셋 추가 확인: Milo 제작자 영상 약 2:03에서 앉은 자세를 확인했으나 전환 동작/접합은 미검증. Cat Animset Pro 판매 파일 목록에 FBX/BLEND 미명시. Ursa CAT & DOG는 전환·회전·FBX를 명시하지만 각진 외형으로 원화와 차이가 큼. Milo 제작자 문의 초안(assets/avatar/references/quadruped/MILO-INQUIRY.md) 준비, 미발송·미구매·모델 미교체.

## 독립 뒷다리 리그 연구 — 2026-09-11
V13과 별개로 골반·뒷다리 연속 부피 메시와 7관절 리그, 앉기→서기→앉기 121프레임을 제작했다. 옆/뒤/사선 3자세 렌더 9장 생성. 가중치 평활화 후에도 앉은 자세의 골반-허벅지 경계와 무릎 안쪽 접힘이 남아 전체 고양이에 연결하지 않았다. Blender Preserve Volume 사용으로 GLB 동일 변형은 미검증. 파일: assets/avatar/references/hind-rig-study/hind-rig-study.blend. 연구용 시험 모델이며 최종 품질 통과 상태가 아니다.

## 앉은 뒷다리 정지 조형 — 2026-09-11
골반 단면과 허벅지/하퇴 감싸는 부피, 앞으로 드러나는 낮은 뒷발을 별도 재조형했다. 4방향 렌더 및 닫힌 경계 검사(비매니폴드 edge 0) 완료. /cat-haunch에서 이전 연구와 비교. 파일 assets/avatar/references/seated-haunch-target/seated-haunch-target.blend. 정지 sculpt 기준이며 최종 관절 topology/서기 형태/가중치/전환 보정은 미완료. V13 미변경.


## V13 발가락 이식 연구 — 2026-09-11
V13 실제 뒷발 끝 표면을 새 앉은 조형에 재사용한 별도 정지 작업본 생성. /cat-haunch-toes에서 단순 발끝과 비교. 부피 합치기와 연결부 평활화를 적용했으나 얕은 띠 형태 잔존. 원본 UV/가중치 보존 graft가 아니며 텍스처/리깅/서기 검증 미완료. V13 및 이전 조형 보존. assets/avatar/references/seated-haunch-toes/README.md 참조.


## 발가락 연결부 추가 마감 — 2026-09-11
별도 seated-haunch-toes-finished 작업본에서 발등/양옆 띠 단차를 가중 평활화. 확대·옆모습 확인 및 5뷰 렌더 저장. 보호한 발가락 앞쪽/낮은 접촉면 정점 이동 0, 비매니폴드 edge 0. /cat-haunch-toes?review=finish1에 반영. 정지 표면 마감이며 텍스처·리깅·전환 미적용. 이전 작업본과 V13 보존.


## 발가락 비율 재조형 — round2
사용자 피드백으로 V13 발끝 추출 범위와 이식 비율을 다시 조정. 폭/길이 축소, 두께 조정, 세 개의 얕은 발가락 굴곡 추가. 확대 렌더에서 형태 변화 확인. /cat-haunch-toes?review=round2에 반영. 원본 정점 보존 수정이 아니며 정지 조형/리깅 미적용. V13과 finish1 보존. 상세 assets/avatar/references/seated-haunch-toes-rounded/README.md.


## 뒷발 리서치 기반 배열 수정 — anatomy3
Cats Protection의 뒷발 4개 발가락 설명, NPS/Alaska의 leading toe 배열 자료를 참고. 긴 등쪽 홈을 줄이고 발끝을 비대칭 곡선으로 재배치했다. 정량 조정은 조형값이며 종별 실측 재현이 아님. 확대 렌더 확인, /cat-haunch-toes?review=anatomy3에서 round2와 비교. 발바닥 패드/리깅 미구현. 상세 assets/avatar/references/PAW-RESEARCH.md.


## 패드와 발가락 소규모 리그 — 2026-09-11
각 발 4개 작은 패드/1개 중앙 패드, 발가락 뼈 총8개 및 고정뼈1개, 최대4도 벌림/복귀 연구. Blender 5뷰 및 GLB 클립1개 내보내기, Chrome 로드/카메라/시간 변경 확인. /cat-paw-rig 제공. 패드 노출/삽입깊이·접촉/전체 앉기서기 연결 미완료. 기존 파일 보존. assets/avatar/references/paw-pad-rig/README.md 참조.



## 발바닥 패드 밀착 마감 — fit2
패드 면적/돌출 깊이를 줄이고 피부와 가중치를 보간해 작은 벌림 동작을 개선. Blender 5뷰 및 브라우저 1.5초 클립 확인, 0초/1초 본 행렬 복귀 오차0, JS 오류0. /cat-paw-rig?review=fit2 반영. 전체 앉기서기·압축·충돌검사 미완료. 기존 모델 보존. assets/avatar/references/paw-pad-fit/README.md 참조.


## 발목·하퇴와 앉기↔서기 연구 — 2026-09-11
fit2 기반 별도 뒷몸통에 골반/허벅지/하퇴/발목/발/발가락 17본 리그, 약 4.7초 앉기→서기→복귀 클립을 연결했다. 2본 길이 기반 무릎 위치, 발끝 고정, 가중치 확산 및 중간/서기 표면 보정 2개를 적용. /cat-paw-stand에서 관절·옆/뒤/사선·시간 조작 가능. Blender 9뷰 및 Chrome GLB 재생 검증, 표본 피부 정점 2934개의 복귀 오차0, JS 오류0. 서기 하퇴가 두껍고 허벅지 경계가 남아 외형 품질은 미완료. 전체 V13/앞다리/머리 미연결, 모바일 앱 미적용. 기준 fit2/V13은 보존. assets/avatar/references/paw-stand-rig/README.md 참조.


## 하퇴 단면·발목 윤곽 — contour2
중간/선 자세 하퇴를 관절 축 기준으로 가늘게 조정하고 경계를 평활화. /cat-paw-stand?review=contour2에 반영하고 카메라·동작 시점을 유지하는 이전/수정 비교 추가. Blender9뷰 및 Chrome 표본2934정점 확인: 이전 대비 앉은 형태 변화0, 복귀오차0, 서기 변화 확인, JS 오류0. 뒤 허벅지 경계 단차와 전신 연결 미완료. 원본 보존. assets/avatar/references/paw-stand-contour/README.md 참조.


## 뒤쪽 허벅지·하퇴 경계 보정 — junction3
뒤쪽 전이 구간을 넓게 평활화하여 중간/서기 shape key를 다시 생성. /cat-paw-stand?review=junction3에 반영, 비교 대상은 contour2. Blender9뷰 및 Chrome2934정점 표본에서 앉은 형태 변화0·복귀오차0·서기 보정 변화 확인, JS 오류0. 뒤 경계 흔적은 완전히 없어지지 않아 접합 마감 완료로 판정하지 않는다. 추가 평활화 반복보다 관절 구간 토폴로지/가중치 재설계가 필요. 전신 V13 미연결. assets/avatar/references/paw-stand-junction/README.md 참조.


## 관절 거리 기반 가중치 재설계 — weights4
높이 구간별 관절 가중치를 연속 거리장으로 교체, 발 고정에 높이 제한 추가. 새 변형에 중간/서기 보정을 다시 계산하여 뒤쪽 띠 경계를 크게 완화. 기존 메시 연결 검사 1컴포넌트/열린 경계0/비매니폴드0; 새 리토폴로지를 수행한 것은 아님. Chrome2934정점에서 앉은 형태 변화6.74e-8, 복귀오차0, JS오류0. /cat-paw-stand?review=weights4 적용, 이전 junction3와 비교. 전신 연결/최종 관절루프/허벅지 부피 조정 미완료. assets/avatar/references/paw-stand-weights-finished/README.md 참조.


## V13 전신 정지 조립 검토
V13 motion-study의 프레임1 상체 평가 표면과 weights4 하체 평가 표면을 별도 복사·배치. /cat-fullbody-fit 제공. 하체 크기/위치/상부 전방 기울기를 조정해 등 실루엣을 맞춤. Blender4뷰 및 Chrome15메시/애니메이션0/JS오류0 확인. 얼굴 원본/V13 미변경. 상체 절단 경계와 앞발 접지 문제 잔존, 용접/표정키 복원/꼬리/UV/전신리그 미완료. 배치본을 완성 모델로 간주하지 않음. assets/avatar/references/fullbody-fit/README.md 참조.


## 몸통 표면 결합·앞발 접지
fullbody-fit의 기존 뒷발 잔여 파편3개를 제거하고 주 상체와 새 하체를 결합. 국소 면분할/평활화 및 앞발 지지면 조정. 최종 열린 경계0/비매니폴드0/얼굴 정점변화0. Blender4뷰, Chrome14메시/애니메이션0/JS오류0. /cat-fullbody-weld 제공. 옆구리 눌린 접합 흔적 잔존; 시각적 마감 완료 아님. 꼬리/UV/표정키/전신리그 미완료. 기존 원본 보존. assets/avatar/references/fullbody-weld/README.md 참조.

## 2026-10-03 — 독립 프로젝트 이전

위치: C:/Users/turbo08/mew_voice. 브랜드는 brands/mewvo, 공유 계약 스냅샷은 packages/shared에 포함한다. API는 ../findthem/apps/api에 유지한다. 계약 변경 시 스냅샷도 동기화한다. npm ci의 postinstall에서 공유 타입을 빌드한다. Jenkins·Gradle 빌드와 기존 앱 식별자·서명을 유지한다.

원격 Jenkins 작업은 변경하지 않았다. 새 Git 원격에 소스를 게시하고 SRC_GIT_URL을 설정한 뒤 파이프라인 동기화가 필요하다. 기존 작업은 FindThem 원격 소스를 조회한다. 실제 native 빌드·스토어 업로드는 실행하지 않았다.
이전 후 검증: npm ci·shared 빌드, TypeScript, lint, Jest 8개 스위트/37개 테스트, Jenkins 회귀 테스트 12개, Android Hermes export 통과. Gradle native 빌드와 원격 Jenkins 동기화·스토어 업로드는 실행하지 않았다. Git은 독립 저장소로 초기화했으며 commit/push하지 않았다.

## 공개 교육용 저장소 전환

원격: https://github.com/jeonghwanko/mew_voice. 교육용 소스 공개 라이선스 적용. 제3자 모델은 원래 라이선스 유지. Jenkins SRC_GIT_URL 기본값은 새 HTTPS URL이며 MEW_VOICE_GIT_URL은 선택적 재정의다. source/ 루트에서 설치·검증·prebuild 후 Gradle로 빌드한다. 앱 식별자·서명은 유지한다.
2026-10-03 완료: 교육용 라이선스로 공개 Git 저장소 게시 및 원격 Jenkins 소스 전환을 완료했다. Jenkins 설정 재조회에서 기존 FindThem checkout 제거와 source/ 루트 적용을 확인했다.

## 2026-10-03 — 체험 영상 기록과 주간 요약

체험 모드에서 약 10초 영상을 촬영·보관함 선택·미리보기·버리기·선택한 고양이의 로컬 관찰로 저장한다. 파일은 앱 문서 디렉터리에만 두고 서버로 올리지 않으며, AI 분석이나 감정 번역으로 표시하지 않는다. 카메라 권한 거부는 한국어로 안내하고 보관함 선택을 대신 제공한다. 브라우저 체험은 새로고침 뒤 영상 바이트가 남지 않을 수 있다.

기록 화면에서 최근 7일(한국 시간, 기존 dayKey 경계) 요약으로 이동한다. 선택한 고양이의 관찰·돌봄 수, 상황 태그, 반응 기록 여부를 보여주고, 관찰이 2건 미만이면 이유를 말한다. 기록이 많다는 것을 행동 악화로 해석하지 않는다.

영상 업로드와 주간 요약은 packages/shared의 구현된 pet-companion 계약에 없다. 계정 모드에서는 가짜 API를 호출하지 않고 체험/로컬만 동작한다. 관찰 목록만 기존 GET /observations의 nextCursor를 이어서 불러온다.

실제 AI 호출, 실기기 카메라·권한 QA, 스토어 제출은 하지 않았다.

체험 화면 문구는 기록이 기기에만 남고, 실제 AI 분석이 아니며, 시작 프로필 모모는 가상이고, 목소리 야옹은 놀이이지 의미 번역이 아님을 드러내도록 맞췄다. 건강 수치나 감정 번역 홍보는 넣지 않았다.


## 2026-10-03 — 체험 울음 파일을 관찰 기록에 남김

체험 모드에서 녹음한 울음이 관찰 저장 시 버려지던 문제를 고쳤다. 네이티브에서는 앱 문서 디렉터리 `companion-audio/`에만 복사하고, 관찰의 `localAudioUri`로 다시 듣는다. 주소는 비어 있어 서버 업로드가 아니다. 브라우저 체험은 세션 안에서만 재생되며 새로고침 뒤 파일이 없을 수 있다고 안내한다. 파일이 없는 예전 기록은 사진으로 오인하지 않고 재생 불가 안내를 보여 준다. 아이 삭제 시 해당 폴더의 녹음만 지우고, 내보내기 JSON에는 파일 주소를 넣지 않는다. 소리를 분석하거나 뜻으로 번역하지 않는다.

실제 AI 호출, 실기기 마이크 QA, 스토어 제출은 하지 않았다.
