# NITRO RUSH — Safe graphics baseline

This build protects the currently working procedural car by **disabling the experimental ToyCar GLB swap by default**. No gameplay physics, traffic AI, or save schema was changed.

## Why
The included `player-supercar.glb` is Khronos ToyCar, a sample model rather than an Asphalt-style supercar. In the previous implementation the GLB was loaded automatically and the entire procedural chassis hidden, resulting in tiny/floating bodies and detached wheels. This build retains the stable car for normal play.

## How to test the experimental GLB
Append `?experimentalGlb=1` to the game URL only in a test environment. This is an opt-in debug mode, **not** a finished realistic-car integration. Remove the query parameter to return to the stable vehicle.

## Next step for realistic visuals
1. Obtain a commercially licensed, game-ready sports-car GLB (preferably wheels as separate named nodes), with 1K–2K PBR textures and a mobile-friendly triangle budget.
2. Confirm forward axis, bounds, wheels and license in an isolated 3D model viewer.
3. Implement a separate GLB vehicle rig adapter that maps GLB wheel nodes to physics wheel pivots; do not remove the procedural car until in-game validation passes.
4. Test one car on desktop and portrait/landscape mobile, then extend to traffic and environment lighting.

This is a safety patch, **not an Asphalt-quality graphics upgrade**. Browser gameplay has not been verified in this environment.
