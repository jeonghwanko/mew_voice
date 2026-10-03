# V13 앉기 ↔ 일어서기 동작본

기준은 `../realistic/rework/bicolor-a-v13.blend`이다. 원본은 수정하지 않았다. V13에서 평가된 표면/UV/색상 속성을 복사한 별도 작업본이며, 실패한 전신 리메시 실험은 사용하지 않는다.

## 결과

- `v13-sit-stand-study.blend`: 24개 뼈, 새 피부 가중치, SeatedSkinCompression 자세 보정, 30fps/121프레임.
- `v13-sit-stand.glb`: 웹에서 검증한 4초 앉기→서기→앉기 클립. 정점당 최대 4개 영향. 몸체 18,986정점.
- 미리보기: `http://localhost:8092/cat-v13-sit-stand/index.html`. 앉기/일어서기/전체 동작, 정면/측면/후면/사선, 시간 슬라이더, 회전/확대.

## 수정 근거

원래 발목 축이 V13의 실제 뒷발보다 앞에 있었으므로 메시 단면에서 위치를 재측정했다. 옛 Wolf 뼈의 잔여 가중치를 제거하고 몸통/골반/꼬리의 영향을 분리했다. 발가락은 발 뼈를 따르고 뒤쪽 중족부는 발목 뼈를 따라 눕는다. 연결된 표면을 따라 가중치 경계를 완화하고, 앉을 때의 배 아래 접힘과 접촉면에 자세 보정을 적용했다. 웹과 동일한 선형 스키닝으로 확인했다.

## 검증

- 정면/측면/후면 × 앉기/중간/서기의 Blender 렌더 9장.
- `motion-audit.json`: 25개 프레임의 유한 좌표 검사, 시작/종료 뼈 행렬 일치, 원본 파일 SHA256 기록. 바닥 높이는 -0.003이다. 수치 검사는 모든 표면의 자기 충돌을 보장하지 않는다.
- `browser-audit.json`: 실제 GLB의 4초 클립, 스킨 4개/보정 모프 1개 로드, 일어서기→앉기→전체→다시 일어서기→앉기 통과, pageerror 없음.
- `browser-*.png`: 실제 Three.js 출력. Blender 렌더와 웹 재질/조명은 동일하지 않다.

## 범위와 한계

앉기와 일어서기만 구현했다. 걷기/회전 동작과 얼굴 표정 액션 이관은 포함하지 않는다. 원본의 얼굴 외형은 가져왔지만 기존 얼굴 표정 shape key/action을 새 파일에 보존한 것은 아니다. 이 GLB는 앱 홈 런타임에 적용했으며 웹 번들과 Android export에서 로딩을 확인했다. 모바일 실기기 GPU·메모리·프레임 성능은 아직 검증하지 않았다. 골반·꼬리 밑동과 접힌 다리의 미세한 윤곽은 추가 아트 마감 대상으로 남긴다.

## 재현

레포 루트에서 Blender background로 `apps/mobile/scripts/build-v13-sit-stand-clean.py` 실행 후 `export-v13-sit-stand.py` 실행. `node apps/mobile/scripts/prepare-v13-sit-stand.mjs`로 로컬 미리보기 생성, 8092 정적 서버가 실행된 상태에서 `node apps/mobile/scripts/check-v13-sit-stand.cjs`로 브라우저 확인.

## 출처

Bicolor Cat by [kenchoo](https://sketchfab.com/3d-models/bicolor-cat-e623a618ca344a8393d7ba4d63ec23cf), based on [Fripouille by guillaume bolis](https://sketchfab.com/3d-models/3d-modelling-my-cat-fripouille-0ab14bf98e754f8d90fe1bf1c84ca66c). [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). V13의 외형/색상 수정에 이어 본 작업에서 리그·피부 가중치·앉기/서기 애니메이션·자세 보정을 변경했다. 원본 출처 기록은 `../realistic/SOURCE.md` 참조.
