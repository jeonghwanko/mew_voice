# 실사형 기본 고양이 애셋 조사

2026-09-11. 목적은 **처음부터 실제 고양이처럼 생긴 기본 모델을 확보하고, 이후 보호자의 고양이와 닮게 수정하는 것**이다. 기본 모델 선정에 사용자 사진은 필요하지 않다.

## 추천: Bicolor Cat

| 후보 | 확인한 근거 | 판단 |
| --- | --- | --- |
| [Bicolor Cat · kenchoo](https://sketchfab.com/3d-models/bicolor-cat-e623a618ca344a8393d7ba4d63ec23cf) | CC BY 4.0, 실제 다운로드 2.30 MB, 8,646 triangles, 리그와 애니메이션 1개. Three.js에서 원본 텍스처·외형·재생 확인 | 기본 모델 1순위. 자연스러운 해부학과 털 무늬가 있고 용량이 작다. 실기기 검증은 후속 |
| [Fripouille · guillaume bolis](https://sketchfab.com/3d-models/3d-modelling-my-cat-fripouille-0ab14bf98e754f8d90fe1bf1c84ca66c) | 저자가 실제 반려묘를 재현. 소개상 8.4k triangles, 간단한 리그, Blender 제작, CC Attribution | Bicolor의 원작. 모델링 수정의 원형 참고. 원본 별도 파일은 아직 다운로드하지 않음 |
| [Realistic Cat · picanco.felipe](https://sketchfab.com/3d-models/realistic-cat-3d-model-9cf0d4d9c380433e9ae04b05d2397368) | 소개상 196.6k triangles, 텍스처 팩, CC Attribution | 상세 비교 후보. 다운로드·리그·모바일 구동 미검증, 단순 폴리곤 수로 품질을 단정하지 않음 |

Quaternius의 블록 모델은 이번 아트 방향에서 제외한다. 무료 다운로드와 오픈 라이선스는 다르므로 Free Standard 표시 모델은 CC 후보와 별개로 다룬다.

## 확보한 파일과 한계

[원본 GLB와 출처 기록](../../../apps/mobile/assets/avatar/realistic/SOURCE.md)에 라이선스·저자·다운로드 경로·해시를 남겼다. GitHub 공개 미러의 GLB를 받아 내부 메타데이터의 원작/CC BY 4.0을 대조했다. 두 저작자를 함께 표시한다. [CC BY 4.0 조건](https://creativecommons.org/licenses/by/4.0/)에 따라 상업적으로 변형·배포할 수 있으며 출처와 변경 사실을 유지한다.

렌더 확인 결과 주황 태비와 흰색 털, 실제 고양이 비율, 수염이 표현된다. 게임용 실사 스타일이고 털 한 올의 볼륨까지 재현한 포토리얼은 아니다. 원작자가 별도로 만든 털 시뮬레이션 이미지를 GLB에 포함된 기능처럼 제시하지 않는다.

## 앱에 적용할 방향

1. 원래의 체형·텍스처를 보존한 기본 고양이로 출발한다. 기존 장난감형 모델의 단색 재질 덮어쓰기는 재사용하지 않는다.
2. 크림 배경, 부드러운 접지 그림자, 눈높이 카메라로 집에서 아이를 바라보는 구도를 만든다. 정면을 강요하지 않고 자연스러운 3/4 시점을 기본으로 둔다.
3. 홈 대기 동작은 호흡·고개·귀·느린 눈 깜빡임 위주로 제작한다. 기존 8.71초 클립이 모든 상호작용을 충족한다고 보지 않는다. 턱 관절이 있다는 사실만으로 립싱크를 완성했다고 하지 않는다.
4. 좌우 패널은 `외형 / 자세·시점 / 공간` 탭으로 구성한다. 털 무늬 텍스처와 눈 색은 영역 마스크를 만든 뒤 변경한다. 전신을 단색으로 칠하거나 머리를 과장해 실사 감성을 잃지 않도록 한다.
5. 사용자 고양이로 맞추는 단계에서 정면·측면·전신 사진을 참고해 체형과 무늬를 수정한다. 자동 사진→3D 재현은 별도 기능이다.
6. 제품 배포 전 Android/iOS에서 로드·텍스처·발열·프레임·백그라운드 복원을 검증한다. 필요 시 텍스처 압축과 LOD를 적용하되 목표 프레임은 측정으로 판단한다.

## 현재 완료 범위

원본 확보, 출처/라이선스 기록, GLB 구조 점검, 브라우저 검토 화면 완료. 검토 주소는 로컬 서버가 켜진 동안 `http://localhost:8092/research/index.html`이다. 앱 홈은 아직 이전 모델이며 실사형 교체·전용 외형 패널은 후속 구현이다.


## 추가 비교 — 정면 표정과 귀여움 (2026-09-11)

사용자는 Bicolor Cat의 정면 인상을 만족스럽게 평가하지 않았다. 따라서 위 추천은 기술 검토 당시의 판단이며 최종 디자인 선정으로 보지 않는다. 검토 화면에는 확대/축소 버튼, 거리 슬라이더, 얼굴/전신 보기, 부드러운 조명을 추가했고 버튼 동작을 브라우저에서 확인했다. 모델 형상 자체는 변경하지 않았다.

| 대안 | 판매자 자료상 특징 | 현재 판단/확인 범위 |
| --- | --- | --- |
| [British Shorthair Domestic Cat · Nyilonelycompany](https://superhivemarket.com/products/british-shorthair-domestic-cat) | $40, Royalty Free, 25,034 triangles, 19 animations, GLB/FBX/Blend | 실사 비율·둥근 얼굴 비교 우선. 판매자 대표 렌더와 가격을 직접 확인. 파일 미구매/미검증 |
| [Nebelung Cat · Nyilonelycompany](https://superhivemarket.com/products/nebulung-cat) | $30, Royalty Free, hair cards, 50.3k triangles, rigged/animated | 풍성한 털 비교 후보. Superhive 구버전 설명 기준. Fab V2의 17,072 triangles·25 animations·Groom/No Groom과 사양을 혼합하지 않음. 파일 미검증 |
| [Cute Kitten · ItsKrish7](https://sketchfab.com/3d-models/cute-kitten-c5b1469074d9494c9bcfb2a535a2ff32) | 무료, CC Attribution, 592k triangles | 공개 라이선스 외형 후보. 리그/애니메이션 미확인, 모바일용 경량화와 리깅 필요 여부부터 확인할 것 |
| [Cute Cat - British Shorthair · SEMA](https://www.fab.com/listings/dd07ae18-a16b-45c2-a3c6-55402bd985da) | 판매자 목록 $19.99부터, FBX, 21 animations, 여러 털색 | 실제 미리보기 확인 결과 머리/눈 비율의 캐릭터화가 강하다. 사실적 반려묘라는 사용자 요구의 1순위로 추천하지 않음 |

가격은 조사 시점 표기이며 판매 채널·라이선스에 따라 다르다. 유료 후보는 오픈소스가 아니며 구매하지 않았다. 판매자 렌더의 털 품질이 Three.js/Expo에서도 그대로 나온다고 보장하지 않는다. 최종 모델은 정면/3·4분면/앉기/눈 깜빡임을 같은 조명에서 비교한 뒤 고른다.
