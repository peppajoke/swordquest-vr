# SwordQuestVR

A browser-based first-person shooter built with React Three Fiber, targeting both desktop and WebXR VR headsets.

## What It Actually Is

This is a side project I've been building with my AI assistant Clea. The goal started as "WebXR sword game" and has evolved into something that looks suspiciously like a proper roguelike — wave-based combat, weapon pickups, stat progression, upgrade cards, and a whole prison breakout aesthetic.

Current state: early but genuinely playable on desktop. VR works too if you have a headset.

## Tech Stack

- **React Three Fiber** + Three.js (r170) — 3D scene
- **@react-three/xr** v6.6.25 — WebXR / VR support
- **Zustand** — game state
- **Vite** — build tooling
- **Express** — serves the thing
- **Drizzle + Neon** — Postgres, though we're mostly using in-memory storage right now
- **TypeScript** throughout

## Features (as of now)

- **Desktop mode** — WASD, mouse look, pointer lock. Jetpack on Shift.
- **VR mode** — controllers, hand tracking, full 6DOF
- **4-slot weapon inventory** — 2 melee + 2 ranged; physical 3D pickups scattered at spawn
- **6 melee weapons** — dagger through warhammer, all with tapered blade geometry, emissive glow, and per-weapon damage/speed configs
- **4 ranged weapons** — pistols, SMG (suppressed, auto-fire), shotgun, sniper
- **Bethesda-style enemy AI** — robot guards wander randomly when unaware, light up and pursue when they spot you within 14 units or take damage
- **Leg walk animation** — legs swing on a pivot, opposite phase, ease to neutral on stop
- **Prison environment** — concrete corridors, fluorescent lighting, guard rooms, back arena
- **Roguelike loop** — enemies drop XP, upgrade cards appear between waves, player stats (STR/AGI/VIT) scale weapon damage
- **Shatter effects, health bars, damage numbers, reticle pulse on hit**
- **Wall collision** — AABB system, slide physics preserved

## Controls (Desktop)

| Action | Key |
|--------|-----|
| Move | WASD |
| Look | Mouse |
| Jetpack | Shift |
| Ascend (while jetting) | Space |
| Fire / Swing | Left click (hold for auto) |
| ADS | Right click |
| Weapon slots | 1 / 2 / 3 / 4 |
| Drop weapon | G |

## Running Locally

```bash
npm install
PORT=8082 npm run dev
```

Open `http://localhost:8082`

## How It's Built

Most of the code was written by Clea (an AI assistant running on the OpenClaw platform) in response to increasingly unhinged design prompts from me. She writes, tests, commits, and deploys. I play, break things, and ask for more.

The architecture is honest: weapon configs drive all stats, nothing important is hardcoded, and the codebase is clean enough that future-me can understand it.

## Roadmap (roughly)

1. ✅ Core combat loop
2. ✅ Weapon system + inventory
3. ✅ Enemy AI (wander/pursuit state machine)
4. 🔄 Zone progression — prison → canyon → dungeon
5. Mobile controls
6. More enemy types (currently only Robot Guards active)
7. Boss encounters
8. Maybe multiplayer someday, maybe not

## Name

Working title is SwordQuestVR, which is a bad name. Leading candidates: **Arc** or **Crucible**.

---

*Private repo. Don't share the Railway URL.*
