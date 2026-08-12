# Targeting & Crosshair Error Recovery Guide (에러 복구 가이드)

## 🚨 개요 (Overview)
화면 중앙의 십자선(`+`), 곡괭이 타격 지점, 그리고 실제 블록이 선택되는(Highlight) 위치가 서로 어긋나는 치명적인 버그가 발생했을 때, 이를 **100% 완벽하게 복구하기 위한 절대 원칙**을 기록한 문서입니다. 
추후 유사한 문제가 발생하면 **반드시 이 방식 그대로 롤백하거나 참고**해야 합니다.

---

## 1. Raycaster 방향 오류 (가장 흔한 원인)
**[증상]** 화면 중앙의 십자선이 아닌, 화면 약간 위나 아래 등 엉뚱한 곳의 블록이 하이라이트 됨.
**[원인]** `Game.ts`의 `updateHighlight()` 등에서 `raycaster.cast()`를 호출할 때, 잔류 마우스 좌표(`cursorX`, `cursorY`)를 넘겨주면 궤적이 틀어집니다.
**[절대 복구 원칙]**
- 게임 모드(Game Mode)에서는 **어떠한 경우에도 마우스 좌표를 전달하면 안 됩니다.**
- `this.raycaster.cast(this.camera)` 처럼 인자 없이 호출하여, Three.js의 `Raycaster`가 강제로 `(0, 0)`(화면 정중앙 NDC)을 기준으로 레이저를 쏘도록 고정해야 합니다.

---

## 2. 블록 경계선 소수점 오차 (Math.floor)
**[증상]** 블록의 모서리나 끝부분을 볼 때, 쳐다보는 블록이 아닌 바로 옆/앞 블록이 선택됨.
**[원인]** 충돌 지점(`hit.point`)에서 블록 안쪽으로 밀어넣는 깊이가 너무 얕으면(`0.1`), 부동소수점 오차로 인접 블록이 계산될 수 있습니다.
**[절대 복구 원칙]**
- `BlockRaycaster.ts`에서 hit point를 계산할 때 반드시 **0.5 (블록의 정중앙)** 만큼 깊숙이 밀어넣어야 합니다.
```typescript
const blockX = Math.floor(hit.point.x - hit.face!.normal.x * 0.5);
const blockY = Math.floor(hit.point.y - hit.face!.normal.y * 0.5);
const blockZ = Math.floor(hit.point.z - hit.face!.normal.z * 0.5);
```

---

## 3. UI 십자선과 3D 카메라의 물리적 괴리
**[증상]** 하이라이트 자체는 중앙에 잘 되는데, 눈에 보이는 `+` 기호가 미세하게 빗나가 있음.
**[원인]** HTML/CSS로 띄운 `#crosshair`는 브라우저 배율, 모니터 해상도, DOM 렌더링 방식에 따라 3D 엔진의 진짜 중앙(`Vector2(0,0)`)과 미세하게 분리될 수 있습니다.
**[절대 복구 원칙]**
- `index.html`의 `#crosshair`는 `display: none`으로 **영구히 숨겨야 합니다.**
- `Game.ts`에서 **WebGL 기반의 3D 십자선(Mesh)** 을 생성하여 `this.camera`의 `(0, 0, -1)` 위치에 직접 붙여야 합니다. (이래야 카메라 중심과 100% 물리적으로 일치함)

---

## 4. 곡괭이 타격 모션(Pickaxe Swing)이 중앙을 때리지 않음
**[증상]** 십자선과 하이라이트는 일치하는데, 곡괭이가 십자선을 때리지 않고 옆이나 아래를 헛치는 것처럼 보임.
**[원인]** 곡괭이를 쥔 팔(`this.rightArm`)이 단순히 X축으로 꺾이기만 하면, 위치가 화면 우측 하단에 머물러 있어 타격점이 중앙에 오지 않습니다.
**[절대 복구 원칙]**
- `CharacterModel.ts`의 `update()`에서 `swingProgress`가 진행됨에 따라 **(1) X축은 정확히 0(중앙)으로 이동 (2) Y축은 크게 위로 들어올리고 (3) Z축은 앞으로 뻗으며 (4) Z축 회전(Tilt)을 0으로 꼿꼿하게 세우는** 4가지 조작이 동시에 이루어져야 합니다.
```typescript
// 1. 회전 제어
this.rightArm.rotation.x = baseRotX - swingArc * (Math.PI * 0.3); // 아래로 내리찍음
this.rightArm.rotation.z = baseRotZ - swingArc * (Math.PI / 6);   // 수직으로 세움
// 2. 위치 제어
this.rightArm.position.x = 0.4 - (swingArc * 0.4); // X 0.0 (정중앙)
this.rightArm.position.y = baseY + bobOffset + (swingArc * 0.6); // 끝부분 높이 보정
this.rightArm.position.z = -0.8 - (swingArc * 0.7); // 앞으로 힘있게 전진
```
