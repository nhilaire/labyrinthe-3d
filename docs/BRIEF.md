# Brief: labyrinthe-3d

Date: 2026-10-18
Project slug: labyrinthe-3d
Final app name: Labyrinthe 3D

## Original brief

> je veux passer dans l'usine mon jeu de labyrinthe et le dédier uniquement à android (voi C:\dev\Maze)
> familial, inspiration du labyrinthe de the 7th guest. Optimisé android et fluide

Source project (local, not a git repository): `C:/dev/Maze` - "Labyrinthe 3D", a first-person 3D maze with one
shared core and two apps:

- `shared/core` (pure JS, no dependency): maze generation (backtracker, `straightness`, optional `braid`), BFS
  validation, entrance/exit on two random borders with the exit among the cells farthest from the entrance,
  navigation (choices available at each decision point, route to the next junction, journey history), wall
  emblems (landmarks), score, wall-follower strategy, 2D plan geometry.
- `shared/three` (Three.js, no platform): world dimensions, merged walls and pillars, camera walker (turn in place,
  rounded corners, slower in curves), footprint decals, wall plaques (textures injected by the app).
- `web/` (Three.js + Vite): the reference version, with synthesised WebAudio sound (drone, footsteps in time with
  the walk, whoosh on turns, chime near emblems, chord at the exit) and Node test suites (core, rules,
  reachability, camera).
- `mobile/` (Expo SDK 53 + expo-gl + three + react-native-svg, landscape, immersive): same game, procedural
  `DataTexture` textures painted in JS, SVG plan, scores in AsyncStorage, **no sound**, maze 14 x 9, debug-signed APK.

Rules (from the source READMEs): the plan is shown at start (3 s, then waits for a touch, and pauses the game);
the camera walks by itself from decision to decision; overlay arrows offer exactly what is possible (U-turn only in
a dead end); "H" recalls the plan with position and heading (-8 % each); footprints mode shows where you walked
(-12 % per activation); at the exit the plan shows the walked path (darker when repeated), the shortest path and
the score `1000 x (perfect steps / steps) x (1 - 0.08 x peeks - 0.12 x footprints)`, compared with a wall-follower
on the same maze; local score history with replay of the same seed.

## Clarifying questions

Answers are summarised in English. Format: `- **Q:** question` then `  **A:** answer`.
Mark assumptions the user accepted as `(default accepted)`.

### Concept and players

- **Q:** What goes into v0.1 from the existing game?
  **A:** Everything, rules unchanged: plan to memorise at start, automatic walk with overlay arrows, wall emblems,
  plan recall ("H", with position), footprints mode, score compared with the wall-follower, local score history with
  replay of the same maze. The source code and READMEs in `C:/dev/Maze` are the rules reference. (default accepted)
- **Q:** Who is it for?
  **A:** Family (stated in the brief): children and adults, playing on the same phone. Android only, no web version.

### Story (About screen)

- **Q:** Why this game?
  **A:** Two memories: one of the first games the user copied by hand in GFA Basic on an Atari ST as a child, and the
  manor maze of The 7th Guest. Challenged once (age removed as personal data); the user chose this French text:
  « Enfant, j'ai recopié ligne à ligne en GFA Basic un petit jeu de labyrinthe sur mon Atari ST : un de mes premiers
  programmes. Quelques années plus tard, le labyrinthe du manoir de The 7th Guest m'a fait frissonner. J'ai créé ce
  jeu pour réunir ces deux souvenirs et les partager en famille. »
  The About screen also says it was made by a passionate independent developer, not affiliated with The 7th Guest.

### Gameplay and controls

### Progression, scoring, difficulty

- **Q:** How does the player progress from one game to the next?
  **A:** Maze size chosen on the menu (small / medium / large), a new random maze every game, so children and
  adults can play together at their own level. (default accepted)
- **Q:** Which maze sizes on the menu?
  **A:** Small 8 x 6 (children), medium 14 x 9 (current mobile default), large 20 x 12 (current web default).
  (default accepted)
- **Q:** End condition and scoring?
  **A:** Unchanged from the source: the game ends at the exit; score
  `1000 x (perfect steps / steps) x (1 - 0.08 x peeks - 0.12 x footprints activations)`, rating scale
  900/750/600/450/300, compared with the wall-follower on the same maze. (from source rules)

### Look, sound and feel

- **Q:** What sound for the Android version (the current port is silent)?
  **A:** Port the web ambience: drone, footsteps in time with the walk, whoosh on turns, chime near emblems, chord at
  the exit, pre-rendered as audio files (no WebAudio on React Native), with a mute toggle. (default accepted)
- **Q:** What should "inspired by The 7th Guest" change on screen?
  **A:** A mysterious-manor mood by default: dark manor/hedge corridors, warm light, slightly eerie but
  family-friendly, procedural textures (no copyrighted assets). Plus a settings switch, **off by default**, that turns
  on a darker, scarier mode.

### Screens and settings

- **Q:** How does a new player learn to play?
  **A:** A guided first game: explanation bubbles during the first small maze.
- **Q:** When and how is the guided game run?
  **A:** Offered at first launch on a small maze, with a "Passer" (skip) button, replayable from the settings; its
  score is not recorded. (default accepted)
- **Q:** Haptics?
  **A:** Yes, light: a short tick when an arrow is chosen, stronger at the exit, can be turned off in the settings.
  (default accepted)

- **Q:** Tu or vous in player-facing text?
  **A:** Tu. (default accepted)

### Telemetry and success metrics

- **Q:** What does success mean for you (measured only after opt-in consent)?
  **A:** All four: (1) mazes completed, per size, with score and helps used (peeks, footprints); (2) retention -
  players come back on the following days; (3) smoothness and zero crash - Crashlytics plus cold start time, to
  prove the optimisation; (4) whether the scary-mode setting is turned on.

### Constraints

- **Q:** "Optimised for Android and smooth": what is wrong today on the phone?
  **A:** Nothing specific. Target: a steady 60 fps while walking and turning, on the user's phone.
- **Q:** What is explicitly out of scope for v0.1?
  **A:** Online leaderboard (scores stay on the phone), web and iOS versions (Android only), daily maze (same seed
  for everyone), inner-exit mode that defeats the wall-follower.

## Decisions taken during discovery

- Port of `C:/dev/Maze`, Android only: the shared core rules are kept unchanged and become the pure, tested
  TypeScript engine; the source code and READMEs are the rules reference. The web app is not ported.
- New Android package `io.github.nhilaire.labyrinthe3d`: it installs next to the old `com.nhilaire.maze3d` APK.
- Additions over the source: size choice (8 x 6 / 14 x 9 / 20 x 12), sound ported from the web version as audio
  files with a mute toggle, manor mood with an optional scary mode (off by default), guided first game, light
  haptics, About screen, opt-in telemetry.
- Landscape and immersive fullscreen kept from the source (portrait narrows the field of view too much).
- Performance target: steady 60 fps while walking and turning on the user's phone; cold start measured.
- Family audience: the scary mode stays opt-in; no copyrighted asset from The 7th Guest (inspiration only).
- Player-facing text in French, "tu".
