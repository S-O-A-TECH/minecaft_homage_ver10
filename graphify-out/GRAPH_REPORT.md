# Graph Report - minecaft_homage_ver10  (2026-05-20)

## Corpus Check
- 26 files · ~25,689 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 297 nodes · 529 edges · 23 communities (7 shown, 16 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f05f0f31`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 22|Community 22]]

## God Nodes (most connected - your core abstractions)
1. `PlayerStats` - 30 edges
2. `TextureAtlas` - 28 edges
3. `UIManager` - 26 edges
4. `Game` - 18 edges
5. `World` - 18 edges
6. `compilerOptions` - 16 edges
7. `FirstPersonArms` - 15 edges
8. `Inventory` - 15 edges
9. `TimeSystem` - 13 edges
10. `InputManager` - 12 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (23 total, 16 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (32): Particle, FACE_NORMALS, FACE_VERTICES, BIOME_DATA, BLOCK_NAMES, BLOCK_TO_ITEM, CONFIG, CRAFTING_RECIPES (+24 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, noEmit (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (15): dependencies, simplex-noise, three, devDependencies, @types/three, typescript, vite, name (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (8): 1. Raycaster 방향 오류 (가장 흔한 원인), 2. 블록 경계선 소수점 오차 (Math.floor), 3. UI 십자선과 3D 카메라의 물리적 괴리, 4. 곡괭이 타격 모션(Pickaxe Swing)이 중앙을 때리지 않음, code:typescript (const blockX = Math.floor(hit.point.x - hit.face!.normal.x *), code:typescript (// 1. 회전 제어), Targeting & Crosshair Error Recovery Guide (에러 복구 가이드), 🚨 개요 (Overview)

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (6): 1. Core Orchestrator, 2. Entity Agents, 3. World & Environment Agents, 4. Interaction & Data Agents, 5. Critical System References & Recovery, Codebase Agents and Systems Overview

## Knowledge Gaps
- **51 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PlayerStats` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `UIManager` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `TextureAtlas` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0965166908563135 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10052910052910052 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14333333333333334 - nodes in this community are weakly interconnected._