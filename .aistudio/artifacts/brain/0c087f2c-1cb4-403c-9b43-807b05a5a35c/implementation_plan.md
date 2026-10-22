# Implementation Plan - Nitro Rush Phase 6 Highway Traffic Upgrade

## 1. Overview
Upgrade the Highway Traffic Racing mode in NITRO RUSH: STREET LEGENDS to AAA arcade quality:
- Replace placeholder traffic cubes with detailed 3D procedural car models (Sedan, SUV, Hatchback, Sports Car, Van, Truck) complete with wheels, windows, bumpers, headlights, and taillights.
- Upgrade highway environment with high-grade asphalt textures, lane markings, concrete barriers, streetlights, overhead bridge overpasses, distant skyscrapers/mountains, and illuminated tunnels with interior lighting and smooth transition boundaries.
- Refine chase camera positioning (slightly closer, balanced framing where player car occupies ~20% of screen height with wide forward road view).
- Ensure dense rush hour traffic spawning with safe gaps and efficient recycling.
- Preserve 100% of existing working features, save data, career, and core vehicle physics.

## 2. Proposed Changes

### `src/game/HighwayTrafficManager.ts`
- Replace simple box meshes with fully modeled procedural cars (Sedan, SUV, Hatchback, Sports Car, Van, Truck) featuring colored body paint, wheels, headlights, and taillights.
- Tune traffic spawning parameters and lateral/longitudinal safety checks to support heavy rush hour traffic density without clustering or unavoidable walls.

### `src/game/HighwayTrackBuilder.ts`
- Enhance road segments with realistic lane markings, concrete Jersey barriers, streetlights, overhead bridge overpasses, and periodic illuminated tunnels with interior ceiling lights.
- Ensure continuous road geometry and precise collision boundaries.

### `src/game/HighwaySimulation.ts`
- Adjust chase camera height and back distance to frame the player car at ~20-22% screen height while expanding forward road visibility.
- Refine near-miss detection and combo multiplier logic for high-speed weaving.

## 3. Verification Plan
- Run `compile_applet` and `lint_applet` to ensure clean TypeScript build.
- Test preview in browser for responsive mobile portrait/landscape layout and 60 FPS performance.
