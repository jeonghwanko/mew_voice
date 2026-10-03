# 뮤 보이스 마켓 이미지 v1

브랜드 revision 3을 사용한 홍보 시안. 승인된 밈 고양이 원본을 HTML/CSS로 배치하고 로컬 Black Han Sans 폰트와 Chrome/Playwright로 PNG를 렌더했다. 새 AI 그림을 생성하지 않아 캐릭터 모양을 그대로 보존한다.

## 산출물

- `ko-01-hello.png` ~ `ko-03-reply.png`: 한국어 세로형 3장, 각 1080×1920.
- `en-01-hello.png` ~ `en-03-reply.png`: 영어 세로형 3장, 각 1080×1920.
- `ko-feature.png`, `en-feature.png`: 가로 대표 이미지, 각 1024×500.
- `icon-512.png`, `icon-1024.png`: 승인된 아이콘의 크기별 렌더.
- `index.html`, `contact-sheet.png`: 전체 미리보기.
- `campaign.json`: 언어별 이미지 문구. `manifest.json`: 사용 revision 및 파일 규격.

아이콘·캐치프레이즈·마켓 이미지는 사용자 승인 완료. Google Play ko-KR/en-US 등록정보에 업로드했으며 검증 기록은 `playstore-upload.json`에 보관한다. 앱 설정에도 승인 아이콘이 적용됐다. 업로드·심사·공개 게시 상태는 각각 구분한다.

이 이미지는 실제 앱 스크린샷을 대신할 제출용 완성 세트가 아니다. 특히 03번은 ‘말을 고양이 울음소리로 생성·재생’하는 목표 기능의 홍보 시안이며, 출시 전 실제 구현과 일치하는지 확인해야 한다. 기존 `store-screenshots`는 이전 실종 서비스 화면이므로 재사용하지 않았다.

Google Play 대표 이미지 크기는 [공식 가이드](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)를 참고했다. iOS 제출용 스크린샷은 [Apple 공식 규격](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)에 맞춰 실제 화면과 함께 별도 제작한다.

## 재생성

저장소 루트에서 `node brands/mewvo/market/v1/render.mjs` 실행. 로컬 Chrome과 Playwright 필요. `campaign.json`의 브랜드 revision이 최신 원본과 다르면 렌더를 중단한다. 문구와 구현 상태를 검토한 뒤 revision을 맞춰 재생성한다.

아이콘 원본 생성: built-in image_gen. 최종 프롬프트 요지: 오렌지 배경의 흰 고양이 말풍선, 반쯤 감긴 균형 잡힌 눈, 크게 벌린 야옹 입, 굵은 짙은 갈색 외곽선, 납작한 밈 캐릭터, 글자 없음. 원본: `brands/mewvo/assets/icon-meme-v1.png`.
