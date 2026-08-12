# Agent Steering Directive: Codebase Knowledge Graph (Graphify)

이 문서는 AI 어시스턴트가 Minecraft Homage 프로젝트의 코드 구조를 완전하고 토큰 효율적(Token-efficient)으로 파악하고, 실시간으로 동기화하며 복잡한 아키텍처 의존성을 추적하기 위한 **마스터 에이전트 지침서**입니다.

사용자가 **"graph-agents.md를 읽고 그 안의 내용대로 진행해!"**라고 지시하면, 에이전트는 즉시 본 가이드의 단계를 차례대로 실행해야 합니다.

---

## 🚀 에이전트 행동 지침 (Agent Action Plan)

에이전트는 사용자의 세션 상태(새 세션 시작, 코드 수정 중, 빌드 및 커밋 직전)에 맞춰 아래의 대응 프레임워크를 엄격하게 수행합니다.

### 1단계: 새 세션 시작 시 - 코드베이스 즉시 인지 및 파악 (Session Ingestion)
새로운 대화 세션이 시작되면 수많은 소스 파일을 하나씩 수동으로 읽지 말고, 이미 빌드된 그래프 자산을 활용해 아키텍처를 순식간에 인지해야 합니다.

1. **마스터 리포트 조회**:
   - `graphify-out/GRAPH_REPORT.md` 파일을 우선 탐색하여 **God Nodes(핵심 모듈)**와 **Communities(군집화된 하위 컴포넌트)**를 파악합니다.
2. **구조 탐색 도구 활용**:
   - 특정 기능이나 의존성 흐름에 의문이 생길 때, 광범위한 Grep 대신 다음 CLI 명령어를 사용하여 로컬 컨텍스트를 압축 조회합니다.
     - **특정 질문 검색**: `graphify query "<질문 내용>"` (예: `"Save/Load 시스템이 어디에서 입력을 받아서 처리되는가?"`)
     - **컴포넌트 관계 추적**: `graphify explain "<심볼명>"` (예: `graphify explain "PlayerStats"`)
     - **모듈 간 의존 경로 탐색**: `graphify path "<출발 심볼>" "<도착 심볼>"` (예: `graphify path "Player" "World"`)

> [!TIP]
> 그래프 기반 조회를 우선 사용하면 AI 컨텍스트 창에 입력되는 원본 토큰 양이 최대 **70배 이상** 감소하여 더욱 정확하고 왜곡 없는 분석이 가능해집니다.

---

### 2단계: 개발 진행 시 - 실시간 동적 업데이트 (Live Update)
코드를 수정하거나 새로운 기능/파일을 작성할 때마다 그래프가 실제 소스 코드와 다르게 왜곡(Stale)되는 것을 방지해야 합니다.

* **실시간 동기화 실행**:
  에이전트가 어떤 파일이든 수정을 마친 후에는 **반드시** 아래 명령어를 즉시 백그라운드에서 실행하여 `graph.json`, `graph.html`, `GRAPH_REPORT.md`를 갱신해야 합니다.
  ```powershell
  graphify update .
  ```
  *(이 명령어는 AST 분석 전용이므로 LLM API 키나 별도의 비용이 전혀 발생하지 않으며, 단 몇 초 만에 그래프를 새로 고침합니다.)*

> [!WARNING]
> 파일 삭제, 클래스 이름 변경, 또는 대규모 구조 변경(Refactoring)이 완료된 후 노드 수가 급격히 줄어들면, 갱신이 누락될 수 있으므로 필요시 강제 업데이트 플래그를 사용하십시오.
> ```powershell
> graphify update . --force
> ```

---

### 3단계: 아키텍처 및 안전 검증 (Verification & Integrity)
Minecraft Homage 프로젝트는 Three.js 렌더링 파이프라인과 프레임 루프가 얽혀 있어 의존성 결합도가 매우 민감합니다.

* **DOM 조작 격리 검증**:
  `UIManager`를 통하지 않고 다른 파일(`Player.ts` 등)에서 직접 HTML DOM이나 오버레이를 조작하려는지 분석할 때, `graphify path` 명령어로 의존선 규칙을 어기지 않는지 확인하십시오.
* **레이캐스팅 물리 괴리 방지**:
  블록 정렬 및 크로스헤어 타겟팅 계산 시 `Error_Recovery_Targeting.md` 규칙을 충족하는지 검증을 거쳐야 합니다.

---

## 🛠️ Graphify 명령어 카탈로그

에이전트는 상황에 따라 터미널(PowerShell) 환경에서 다음 명령어를 실행하여 그래프를 제어합니다.

| 작업 요구사항 | 실행할 터미널 명령어 |
| :--- | :--- |
| **그래프 빌드 / 실시간 동기화** | `graphify update .` |
| **강제 업데이트 (파일 삭제/대규모 리팩터링 후)** | `graphify update . --force` |
| **대화형 자연어 질의** | `graphify query "<구체적인 질문>"` |
| **특정 기호(클래스/함수) 설명서 보기** | `graphify explain "<심볼이름>"` |
| **두 컴포넌트 간 의존성 추적** | `graphify path "<출발지>" "<목적지>"` |
| **계층형 인터랙티브 트리 파일 빌드** | `graphify tree` |
| **Git 자동 병합 훅 설치 (협업용)** | `graphify hook install` |

---

## 💾 시각화 자산 조회 및 저장 가이드

에이전트는 사용자가 물리적인 시각화 맵을 조회하고자 할 때 다음 파일 링크를 제공하고 탐색 방법을 안내합니다.

* **인터랙티브 그래프 맵 (`graphify-out/graph.html`)**
  - **용도**: 브라우저에서 마우스 드래그, 줌, 필터링을 통해 290개 이상의 모듈과 함수 간 관계를 실시간으로 탐색할 수 있는 시각 노드 뷰어입니다.
  - **열기**: 브라우저에서 [graph.html](file:///d:/codedprograms/game/mine_craft_homage/minecaft_homage_ver10/graphify-out/graph.html) 링크를 클릭하거나 파일을 열어 조작합니다.
* **마스터 리포트 (`graphify-out/GRAPH_REPORT.md`)**
  - **용도**: 의존성 중심도가 가장 높은 클래스 목록 및 코드베이스의 모듈 군집 분석이 수록된 마크다운 문서입니다.
  - **조회**: 프로젝트 내 [GRAPH_REPORT.md](file:///d:/codedprograms/game/mine_craft_homage/minecaft_homage_ver10/graphify-out/GRAPH_REPORT.md)에서 텍스트로 읽을 수 있습니다.

> [!IMPORTANT]
> 작업이 끝난 후에는 생성된 `graphify-out/` 안의 파일들을 원본 소스 코드와 함께 Git에 커밋하여, 다음 커스텀 세션이나 다른 공동 작업자 개발 도구가 아키텍처 맥락을 그대로 이어받을 수 있도록 지식 상태를 저장해야 합니다.
