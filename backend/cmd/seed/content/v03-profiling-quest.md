---
title: Profiling Quest Builds: Draw Calls, Foveated Rendering and Hitting 72/90 Hz
author: bayu_w
category: unity-vr
difficulty: advanced
status: published
age: 44
featured: false
cover: unsplash:1535223289827-42f1e9919769
---

On a desktop game, dropping to 45 fps is a quality problem. In VR, it is a **comfort** problem: dropped frames make the world judder against head movement, and players feel it in their stomachs. A Quest headset is also a phone-class mobile chip that is thermally limited, rendering two eyes at once. Performance is not something you polish at the end; it is a design constraint from day one.

This scroll is the workflow we use at Palm Studio to get Quest builds to a stable 72 or 90 Hz: set a frame budget, measure on the device, find the actual bottleneck (CPU vs GPU), and apply the optimizations that give the most for the least effort.

![A player wearing a VR headset in a colorful setting](unsplash:1535223289827-42f1e9919769)
*A headset never lies about performance. The editor does.*

## Start with a budget

Frame time is the budget you spend on everything: game logic, physics, rendering, audio.

| Target refresh | Frame budget |
|---|---|
| 72 Hz | 13.9 ms |
| 90 Hz | 11.1 ms |
| 120 Hz | 8.3 ms |

Pick one refresh rate early and treat its budget as a hard limit. A **stable** 72 Hz is far better than an unstable 90 Hz. Leave ~10–15% headroom for thermal throttling and occasional spikes; a build that runs at 100% of the budget on a cold device will miss frames after ten minutes of play.

## Measure on the device, always

The Unity Editor on a desktop GPU tells you almost nothing about Quest performance. Use these tools, from quick to deep:

1. **OVR Metrics Tool** (on-device overlay): FPS, CPU/GPU utilization, CPU/GPU level, thermal state, stale frames, memory. Great for a quick "are we dropping frames?" check during a playtest.
2. **Unity Profiler** over USB/Wi-Fi (Development Build + Autoconnect Profiler): CPU timeline, GC allocations, rendering stats.
3. **Frame Debugger**: step through draw calls to see what is being rendered and why batching broke.
4. **RenderDoc for Meta Quest** / **Meta Quest Developer Hub** captures: GPU-side analysis, overdraw, shader cost.
5. **Android `adb logcat`** and `dumpsys` for thermal and memory events.

Process: record a 3–5 minute session through the *worst* scene (most enemies, most effects), then read the numbers.

![Headset VR putih](unsplash:1622979135225-d2ba269cf1ac)
*Headset VR putih.*

## CPU-bound or GPU-bound?

Fixing the wrong side wastes days. Diagnose first.

| Signal | Meaning |
|---|---|
| CPU util high, GPU util low | CPU-bound: scripts, physics, draw call submission |
| GPU util high, CPU util low | GPU-bound: pixels, shaders, overdraw, resolution |
| Both high | Reduce both, or cut features |
| Late frames (`stale`) with low util | Thermal throttling or a sync stall |

A fast experiment: lower the eye-buffer **render scale** to 0.7. If the frame time improves a lot, you are GPU/fill-rate bound. If it barely moves, look at the CPU.

## CPU: draw calls and scripts

On mobile, CPU time is dominated by **render thread submission**: every draw call and state change costs CPU. A typical Quest target is on the order of a few hundred draw calls per frame (counting both eyes' work once with single-pass/multiview); treat it as a budget to measure, not a magic number.

What reduces CPU cost:

- **Batching.** Static batching for non-moving geometry; **GPU instancing** for repeated objects (trees, props) with the same material; SRP Batcher compatible shaders in URP.
- **Fewer materials.** Combine textures into **atlases** so many objects share one material.
- **Occlusion/Frustum culling.** Bake occlusion culling for indoor scenes; keep camera far-clip tight.
- **Light budget.** Prefer baked lighting; limit real-time lights to one directional (or none) and avoid real-time shadows from many sources.
- **Scripts.** Cache `GetComponent` results, avoid `Find` and LINQ in `Update`, pool objects (see our object-pooling scroll), and avoid allocations that trigger the GC.

```csharp
// Bad: allocates and searches every frame
void Update()
{
    var enemies = FindObjectsByType<Enemy>(FindObjectsSortMode.None);
    foreach (var e in enemies) e.Tick();
}

// Better: a registry, no search, no per-frame allocation
static readonly List<Enemy> Active = new();
void OnEnable()  => Active.Add(this);
void OnDisable() => Active.Remove(this);
```

Use the Profiler's **GC Alloc** column; a Quest game should allocate approximately **zero bytes per frame** in steady state.

## GPU: fill rate, overdraw and shaders

Mobile GPUs are **tile-based**: they are efficient at many tasks but punish certain things.

| Cost | Why | Fix |
|---|---|---|
| Overdraw (transparency stacked) | Every layer shades the same pixel again | Use alpha-test (cutout) over alpha-blend, shrink particle quads, avoid full-screen transparent effects |
| Expensive fragment shaders | Per-pixel math × millions of pixels | Use simple lit/unlit shaders, bake effects into textures |
| Post-processing | Full-screen passes cost bandwidth | Avoid bloom, SSAO, depth of field on Quest; use none or one cheap effect |
| High resolution | Pixels scale quadratically | Lower the eye-texture resolution scale (0.8–1.0) |
| MSAA | Costly but usually worth it on Quest | Use 4× MSAA (hardware assisted on tile GPUs), not post-process AA |
| Real-time shadows | Extra passes | Bake, or use blob shadows |

Check **overdraw** with the Scene view's Overdraw mode; bright white means many layers.

## Fixed Foveated Rendering (FFR) and friends

**Fixed Foveated Rendering** renders the periphery of each eye image at lower resolution while keeping the center sharp, saving significant GPU time because the lens optics already blur the edges.

- Set it through the Meta XR SDK (`OVRManager.fixedFoveatedRenderingLevel`) or the OpenXR foveation settings.
- Levels run from Off to High (Top High for the strongest). Start at **Medium or High** and look for visible shimmering at the edges.
- **Eye-Tracked Foveated Rendering** (on supporting headsets) moves the sharp area with the gaze for even better results.
- Pair with **Application SpaceWarp (ASW)** only when necessary: the app renders at half the display rate (e.g., 36/45 fps) and the system synthesizes the in-between frames. It saves a lot but introduces artifacts on fast-moving objects and needs motion vectors; treat it as a last resort, not a default.

```csharp
void Start()
{
    OVRManager.fixedFoveatedRenderingLevel = OVRManager.FixedFoveatedRenderingLevel.High;
    OVRManager.useDynamicFixedFoveatedRendering = true; // adapts to GPU load
}
```

Also set the **CPU/GPU levels** deliberately. Higher levels give more speed but burn battery and heat the device; use the lowest that holds the frame rate.

## Memory and thermals

- Quest has limited shared RAM. Compress textures with **ASTC**, keep texture sizes appropriate (1024–2048 for most), disable mipmaps only where it makes sense, and unload unused assets between scenes (`Resources.UnloadUnusedAssets`).
- Thermal throttling is the silent killer: a build that runs fine for 3 minutes then degrades has a thermal problem. Always test **20+ minutes** continuously and watch the thermal state in OVR Metrics.
- Keep the device charged and cool during profiling; a hot headset gives misleading numbers.

## A repeatable optimization loop

1. Pick the worst scene and a repeatable path through it.
2. Record baseline: frame time (avg, p95, worst), CPU/GPU levels, draw calls, GC allocs, thermals.
3. Identify CPU vs GPU bound.
4. Apply **one** change.
5. Re-record, compare, keep or revert.
6. Write down the result in the team wiki (what changed, how much it saved).

Changing five things at once teaches you nothing.

## Quick wins we collected

| Change | Typical effect |
|---|---|
| Static batching + atlases | −30–60% draw calls in environments |
| Replace real-time lights with baked lighting | Large GPU and CPU savings |
| Fixed foveated rendering (High) | Notable GPU savings, small visual cost |
| Turn off post-processing | Frees fill rate immediately |
| Alpha-test instead of alpha-blend for foliage | Less overdraw |
| Pool projectiles and VFX | Removes GC spikes |
| 4× MSAA instead of shader-based AA | Better quality at lower cost on tile GPUs |

## Closing

VR performance work is mostly discipline: set the budget, measure on hardware, find the real bottleneck, change one thing, and measure again. The headset is the final judge, and it is always right.

References: Meta Horizon developer documentation (*Performance and Optimization*, *OVR Metrics Tool*, *Fixed Foveated Rendering*, *Application SpaceWarp*), and the Unity Manual (*Profiler*, *Frame Debugger*, *URP SRP Batcher*).

<!--comments-->
intanp: The CPU vs GPU diagnosis with render scale 0.7 is such a useful trick. We were optimizing scripts for two days when we were fill-rate bound.
bayu_w: Classic trap, Intan. The first question is always: which side is the bottleneck?
gedesurya: Does fixed foveated rendering cause visible artifacts on text? Our menu text flickers at the edges with High.
bayu_w: Yes, text at the periphery can shimmer. Keep UI near the center or reduce the level during menus. Dynamic FFR can lower it when the GPU has headroom.
arief_s: Same principles for our 2D mobile builds: pool objects, atlas textures, measure on device. The Editor flatters everything.
rizkymaul: Your point about changing one thing at a time applies to web performance too. Same discipline, different tools.
kevin_h: Adding a "performance budget per scene" line to the VR project template. Thanks Bayu.
