# Codebase Agents and Systems Overview

This document provides an overview of the core "agents" (systems, managers, and entities) within the Minecraft Homage codebase. The architecture is built around a central game loop orchestrating various specialized managers.

## 1. Core Orchestrator
- **`Game.ts` (`Game`)**: The central hub that ties everything together. It initializes the Three.js scene, renderer, camera, and all underlying systems. It runs the main game loop (`animate`), handles game mode switching (Cursor, Game, UI modes), and passes delta time updates to the player, world, UI, and time systems.

## 2. Entity Agents
- **`Player.ts` (`Player`)**: Represents the user-controlled entity in the world. It manages the first-person camera rotation (mouse look), movement physics (velocity, gravity, jumping), and bounding-box collision detection against world blocks.
- **`CharacterModel.ts` (`FirstPersonArms`)**: Handles the visual first-person model (arms and held tools/blocks), managing procedural animations like view bobbing while moving and swinging animations when mining.

## 3. World & Environment Agents
- **`World.ts` (`World`)**: Manages the macroscopic environment. It handles the loading and unloading of chunks based on the player's position and render distance (using frustum culling). It acts as the unified interface for getting and setting blocks across chunk boundaries.
- **`Chunk.ts` (`Chunk`) & `ChunkMeshBuilder.ts`**: Represents a segmented column of the world. Stores local block data in a typed array and dynamically generates optimized 3D meshes (only rendering visible faces) when the chunk's blocks are modified.
- **`NoiseGenerator.ts` (`NoiseGenerator`)**: The procedural generation agent responsible for providing 2D/3D noise values used to generate terrain height, caves, and biomes.
- **`TimeSystem.ts` (`TimeSystem`)**: Manages the day/night cycle. It dynamically interpolates sky colors, fog, and light source positions/intensities based on the in-game clock.

## 4. Interaction & Data Agents
- **`InputManager.ts` (`InputManager`)**: The bridge between DOM events (keyboard, mouse, pointer lock) and game logic. It tracks key states, mouse deltas, and the current active mode.
- **`BlockRaycaster.ts` (`BlockRaycaster`)**: Calculates line-of-sight intersections from the camera through the block grid to determine which block the player is looking at for breaking or placing.
- **`Inventory.ts` (`Inventory`)**: Manages the data structure for the player's collected items, the active hotbar selection, and crafting resource tracking.
- **`PlayerStats.ts` (`PlayerStats`)**: An autonomous tracking agent that manages player Health (HP), Energy/Stamina (EP), and Hunger. It calculates regeneration or damage based on environmental states (e.g., being near a campfire or in a tent).
- **`UIManager.ts` (`UIManager`)**: The DOM manipulation agent that synchronizes the internal game state (stats, inventory, FPS, target block) with the HTML overlay interface.

## 5. Critical System References & Recovery
- **Targeting & Crosshair Systems**: The alignment between the physical raycast, the visual crosshair, and the pickaxe strike animation is highly sensitive. 
  - **DO NOT** use HTML/CSS crosshairs. Always use WebGL-based crosshairs bound to the camera.
  - **DO NOT** pass mouse coordinates to the raycaster in Game Mode.
  - If any targeting/alignment issues occur, **IMMEDIATELY REFERENCE**: [`Error_Recovery_Targeting.md`](./Error_Recovery_Targeting.md) for the absolute mathematical rules required to restore perfect pixel alignment.
