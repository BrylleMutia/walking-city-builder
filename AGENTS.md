# AGENTS.md — Walking Pack City Builder

Guidance for any AI agent or model working on this repo. Read it before changing anything; keep it up to date when a decision below changes.

This is an Expo/React Native mobile app. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

---

## 1. Product overview

A mobile game loop built around walking:

1. **Walk** — the phone counts steps; every step adds 1 **Step** (the currency) to the wallet.
2. **Shop** — spend Steps on **booster packs**. Each pack belongs to a **set** with its own theme and items.
3. **Open** — a tactile pack-opening sequence: tilt the pack, swipe-tear the top, glitter hints at rarity, cards come out in a stack.
4. **Build** — every card is a building/decoration placed on the player's **isometric city** grid.

**North star: feel.** The app is judged on crisp, responsive, reactive, satisfying animation and feedback (springs, haptics, light/glare). Never trade that away for convenience.

### Current status
| Area | State |
|---|---|
| Pack opening (`/open-pack`) | Done: tilt + glare, foil shader, tear/reseal swipe, rarity glitter, card stack, summary. Pack ≈70% of screen width; its body slides down while tearing to make room for the flap. |
| Home tab | Steps today + goal ring, stats, activity cards, "Walk +500" simulate button. |
| City tab | 12×12 isometric lawn, pan/pinch/zoom, place/remove items from inventory. Path tiles (street/sidewalk/lawn) auto-connect to walkable neighbours. |
| Shop tab + set detail (`/set/[id]`) | Cozy Downtown buyable (1,000 Steps); Neon Harbor and Blossom Gardens are "Coming soon" placeholders. |
| Profile tab | Level, lifetime stats, 7-day chart, collection grid, settings, Testing section (force legendary / all foil / +5,000 steps / reset). |
| Real step counting | Code in place (`useStepTracker`), but **Expo Go on Android can't read the step sensor**, so steps come from the simulate button there. |

### Game rules (source of truth: `src/data/rarity.ts`, `src/data/sets/`)
- Rarity per card: Common 55% · Uncommon 27% · Rare 12% · Epic 4% · Legendary 2%. Foil: independent 10%.
- 5 cards per pack, sorted lowest → highest rarity (best card revealed last).
- Set 1 **Cozy Downtown**: 13 items — 5 common (Cobblestone Street ×4 tiles, Brick Sidewalk ×4, Pocket Lawn ×2, Lamp Post, Park Bench), 4 uncommon, 2 rare, 1 epic, 1 legendary.
- Items have a `kind`: `path` (walkable ground, auto-connecting, bundled `tilesPerCard`), `prop`, or `building`. Inventory counts for paths are **tiles**, not cards.
- New players start with 3,000 Steps. Steps earn 1:1. City grid is 12×12 (`GRID_SIZE`).

### Set design guideline (apply to every new set)
- **Commons are mostly the set's themed walkable infrastructure** (e.g. cobblestones for Cozy Downtown, boardwalk planks for Neon Harbor, stepping stones for Blossom Gardens), bundled ×2–×4 tiles per card, plus a couple of common props. Duplicates must stay useful.
- **Uncommon and above are buildings and landmarks**; the rarest pulls are the set's showpieces.
- Walkable tiles form the walk graph (`walkGraph` in `gameLogic.ts`) that **future NPCs will walk along**, so keep `walkable` accurate. Don't block placement on road access (no hard rules yet).

---

## 2. Tech stack (check `package.json` before assuming versions)

- **Expo SDK 58**, React Native 0.88, React 19.3, TypeScript (strict).
- **Must run in Expo Go** — no development build. Only use native modules bundled in Expo Go.
- **Expo Router** (routes in `src/app/`), JS tabs from `expo-router/js-tabs` with a custom `TabBar`.
- **NativeWind 4 + Tailwind CSS 3** for styling (stable line; NativeWind 5 was still an RC when chosen).
- **Reanimated 4** + **react-native-worklets** (`scheduleOnRN`) for animation; **Gesture Handler 3** hook API (`usePanGesture`, `useTapGesture`, `useCompetingGestures`, `useSimultaneousGestures`).
- **@shopify/react-native-skia** for all illustration, item art, glare/foil shaders, glitter, and the city.
- **Supabase** (Postgres + Auth) as the game server: anonymous sign-in, server-authoritative game rules (see §5 Backend). Client: `@supabase/supabase-js`.
- **zustand** + AsyncStorage (persisted store, a local cache of the server state), **expo-sensors** (Pedometer), **expo-haptics**, **@expo-google-fonts/plus-jakarta-sans**, **@expo/vector-icons** (Feather / MaterialCommunityIcons).
- Jest (`jest-expo`) for unit tests, **Maestro** for end-to-end tests on the Android emulator.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

The same applies to Reanimated 4, Gesture Handler 3 and Skia 2: check the installed type definitions in `node_modules` before using an API from memory.

---

## 3. Commands

```bash
npx expo install <package>   # ALWAYS use instead of npm/yarn/pnpm add — resolves SDK-compatible versions
npx expo start --tunnel      # dev server for the physical phone (port 8081)
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint . (use this; `npx expo lint` fails its ESLint version check on SDK 58)
npm test                     # jest unit tests
npx expo-doctor              # dependency/config diagnosis
npm run e2e                  # full Maestro suite on the emulator (~6 min) — see Testing policy
npm run e2e -- -Flow 02-steps.yaml   # one flow
npm run e2e:emulator [-- -ColdBoot]  # boot the emulator
npm run e2e:shot -- -Name foo        # screenshot the emulator → e2e-artifacts/shots/foo.png
```

Run **typecheck and lint** before declaring any task done.

---

## 4. Project structure

```
src/
  app/                    Expo Router routes ONLY (every file is a screen)
    _layout.tsx           root: global.css, fonts, splash, store hydration, step tracker, Stack
    (tabs)/               index (Home), city, shop, profile + _layout (custom TabBar)
    set/[id].tsx          set detail + Buy pack
    open-pack.tsx         full-screen pack opening (fullScreenModal)
  screens/PackSession.tsx the whole pack-opening sequence (one pack, remounted per purchase via key)
  components/
    ui/                   design system: AppText, Tap, kit (Card, IconButton, PillButton, SquareButton,
                          ArrowButton, SectionHeader, PriceTag, Meta, StepsPill, StatTile), Screen,
                          TabBar, ProgressRing, illustrations (Avatar, WalkerHero, PackThumb)
    pack/                 BoosterPack (gestures), PackArt (Skia wrapper + tear), packGeometry
    card/                 Card, CardStack (in-pack → stack → summary)
    effects/              GlareOverlay, foilShader (SkSL), Glitter, tilt helpers
    items/                iso.ts (isometric drawing kit), itemShapes.ts (buildings/props), pathShapes.ts
                          (auto-connecting path tiles, 16 variants each, merged per colour), ItemArt
    city/                 CityMap (Skia grid, camera, hit-testing)
  data/                   rarity.ts, sets/ (cozyDowntown + SET_LISTINGS catalogue), items.ts (item lookup)
  logic/openPack.ts       pure pack rolling (+ tests)
  state/                  gameLogic.ts (pure rules + tests), useGameStore (zustand), useStepTracker
  theme/                  tokens.json (single source of colours/radii/fonts), tokens.ts
  lib/haptics.ts          all haptics go through here (respects the setting)
  lib/supabase.ts         Supabase client (AsyncStorage session, foreground-only token refresh)
  lib/database.types.ts   generated DB types — regenerate after schema changes
  state/backend.ts        typed wrappers for the game RPCs; errors → BackendReason
  state/serverState.ts    pure mapping server JSON → GameData / PackCard (+ tests)
  state/useCloudSync.ts   connect on launch and on every return to foreground
supabase/migrations/      every schema change, in order (the source of truth for the DB)
e2e/                      Maestro flows (flows/), README
scripts/e2e/              PowerShell helpers used by the npm e2e scripts
```

Keep non-route code out of `src/app/`.

---

## 5. Conventions

### Design system (match the reference UI)
The visual language follows a travel-app reference: **mint background, white rounded cards, green primary, orange accent, navy text, soft green-tinted shadows, friendly flat illustrations.**
- Colours, radii and font families live **only** in `src/theme/tokens.json`. Tailwind (`tailwind.config.js`) and `tokens.ts` both read it. Never hard-code a theme colour in a component; add a token instead.
- Style with **Tailwind classes** (`className`). Use inline `style` only for dynamic values, shadows (`cardShadow`), Skia, and animated styles.
- Text: always `AppText` with `weight` (`body|semi|strong|heavy`) and `tone` props — not font/colour classes. React Native needs one font family per weight, and two colour classes on one element have no reliable winner.
- Never combine `fontWeight` with a custom `fontFamily` (Android falls back to the system font). In plain `StyleSheet` text, use `fonts.*` from `tokens.ts`.
- Every tappable element uses `Tap` (or a kit button built on it): press-in spring, bouncy release, haptic. Give key controls a `testID`.
- Reuse kit components before creating new ones; new shared UI goes in `components/ui/`.

### Animation & gestures
- Animate on the UI thread: shared values, `useAnimatedStyle`, `useDerivedValue`; Skia reads shared values directly. React state changes only at phase transitions.
- Write shared values from JS handlers with `.set(...)`, not `.value =` (the React Compiler lint rule flags the latter). Inside worklets `.value` is fine.
- Call JS from worklets with `scheduleOnRN(fn, ...args)` from `react-native-worklets`.
- Gesture-driven values follow the finger 1:1 while dragging; springs only on release.
- Compute geometry once and share it (e.g. `flapAngle`/`flapTopY` in `packGeometry.ts` drive both the drawing and the layout).
- Particles and effects are pure functions of a clock + seeds (no per-frame React state).

### State & data
- Game rules are **pure functions** in `src/state/gameLogic.ts` and `src/logic/openPack.ts`, with unit tests. The zustand store only wires them up and persists them.
- `buyPack` charges, rolls and adds cards to the collection in one step, so closing the opening screen can never lose cards.
- Add new sets in `src/data/sets/`, list them in `SET_LISTINGS`, and register their items in `src/data/items.ts`. Building/prop art goes in `components/items/itemShapes.ts`, path art in `pathShapes.ts`, using the `iso.ts` primitives on a 4×4 footprint. Follow the set design guideline above.
- Path tiles are numerous: merge same-coloured pieces into one path per colour (see `merge` in `pathShapes.ts`) to keep Skia draw calls low.

### Backend (Supabase) — server-authoritative
- Project ref `siiktkvhgvfbepksffoh` (URL + publishable key in `.env` as `EXPO_PUBLIC_SUPABASE_*`; both are public by design). **Never** put a secret/service-role key in the app or repo.
- Players sign in **anonymously** on first launch (`ensureSession`); upgrading to email/OAuth later = identity linking.
- **The server decides** balances, pack contents and city placement. Clients can only *read* their own rows (RLS) and *call* the game functions: `sync_steps`, `buy_pack`, `place_item`, `remove_item`, `update_profile`, `reset_progress`, `get_my_state`. Direct table writes are revoked.
- Game functions are `security definer` with `set search_path = ''`, resolve the caller via `private.require_uid()`, lock the profile row `for update`, and raise short error codes (`insufficient_steps`, `tile_occupied`, …) that `backend.ts` maps to `BackendReason`. Internal helpers go in the `private` schema (not exposed).
- Steps: `sync_steps(day, total)` only ever raises a day's total (credited delta), capped by `game_config.max_daily_steps`, days within the last week (+1 for time zones).
- Testing flags (force legendary/foil) are honoured only when `profiles.is_tester = true` (set by hand in the dashboard).
- App side: the zustand store is a cache. `buyPack` waits for the server; placing/removing is optimistic and re-fetches on rejection; steps sync debounced (~1.2 s) and on every connect.
- **Changing the DB:** add a migration (Supabase MCP `apply_migration` or CLI), save the same SQL in `supabase/migrations/<version>_<name>.sql`, regenerate `src/lib/database.types.ts`, run the security + performance advisors, and test functions by impersonating a throwaway user inside one SQL call (see git history for the pattern) — clean up test users afterwards.
- **Item/set catalog lives in two places** (app `src/data/` for art/UI, DB `items`/`card_sets`/`rarities` for rules). Keep ids, rarities, `tiles_per_card` and `walkable` identical; a new set needs both an app update and a seed migration.

### Code style
- TypeScript strict, functional components, `memo` for heavy Skia components.
- Comments explain *why* (constraints, non-obvious maths), not *what*.
- Scripts under `scripts/e2e/*.ps1` must stay **pure ASCII** (Windows PowerShell 5.1 reads BOM-less files as ANSI).

---

## 6. Decisions & preferences (don't undo without asking)

- **Expo Go only** for now (no dev build / EAS build).
- **Tilt is touch-driven** (press and drag). The gyroscope tilt was tried and **removed** as too cumbersome — don't re-add it.
- Pack-opening screen uses the **light mint theme** (outlined glitter so pale colours stay visible).
- Pack is **≈70% of screen width**; while tearing, the pack body **slides down** so the flap never overlaps the header.
- Steps are simulated in Expo Go (Walk +500 / Add 5,000); the real pedometer code stays wired for iOS/dev builds.
- Original game content only — don't recreate existing games' names, art or characters.
- **Server-authoritative** game state with **anonymous** Supabase accounts (no login screen yet).
- Only commit when the user asks. Never push.

---

## 7. Testing policy

**Don't run the full e2e suite after every small change.** Pick the narrowest check that proves the change works:

1. Always: `npm run typecheck` and `npm run lint`.
2. Logic changes: `npm test` (add/extend a unit test in the matching `*.test.ts`).
3. UI/animation change: run **one** relevant Maestro flow (`npm run e2e -- -Flow <flow>.yaml`) or just take a screenshot of the affected screen (`npm run e2e:shot`) and look at it.
4. **Full `npm run e2e` only** for potentially app-breaking changes (navigation/routing, store shape or persistence, root layout, dependency/config changes, gesture-zone changes on the pack) — **or when the user asks.**

If the user says stop, stop the run immediately and make sure no Maestro/runner processes are left.

### E2E setup (Android emulator + Expo Go + Maestro)
- Emulator: Android Studio AVD `Pixel_10_Pro` (Android 17). Fallback `loro-verification-api35` only if something is incompatible — say so when you switch.
- Maestro is installed at `%USERPROFILE%\.maestro\bin`. Scripts disable its analytics.
- **Two dev servers**: 8081 (tunnel, for the user's phone — leave it alone) and **8082 (local, for the emulator/tests)**. A tunnel server sends the emulator over the internet, which fails.
- The emulator reaches Metro via **`adb reverse tcp:8082 tcp:8082`** and `exp://localhost:8082` (the `10.0.2.2` alias fails to download the bundle on this image). `start-app.ps1` sets this up.
- `start-app.ps1` installs the Expo Go version matching the SDK if the emulator has another one.
- Flows run in the order in `e2e/flows/config.yaml` and share state (`00-reset` first). Use `testID`s for selectors; add `retryTapIfNoChange: false` to taps that change game state.
- Gesture coordinates are screen percentages tied to the pack layout — update `03-buy-and-open.yaml` (and the note in `e2e/README.md`) whenever the pack size/position changes.
- Artifacts (screenshots, JUnit report, logcat) go to `e2e-artifacts/<timestamp>/` (git-ignored). Look at the screenshots; a green run isn't proof the UI looks right.

---

## 8. Known pitfalls

- `adjustsFontSizeToFit` + `letterSpacing` on Android can compute a font size of 0 and crash ("FontSize should be a positive value"). Don't use auto-shrink; size text explicitly.
- **Never run `adb emu avd snapshot save`** — it froze the emulator. Use `npm run e2e:emulator -- -ColdBoot` if the emulator starts broken.
- Don't launch the emulator with `-no-snapshot-save` (installs like an Expo Go upgrade are lost on shutdown).
- Expo Go on the emulator/phone must match SDK 58 (`Project is incompatible with this version of Expo Go` otherwise).
- Expo Go shows its developer menu on first launch; flows close it.
- NativeWind needs `npx expo start --clear` after changing `tailwind.config.js`, `babel.config.js`, `metro.config.js` or `global.css`.
- Anonymous sign-ins must be enabled in the Supabase dashboard (Authentication → Sign In / Providers); otherwise the app shows Cloud save: "Sign-in disabled" and can't buy packs.
- `.env` is read when the dev server starts: restart `npx expo start` after changing it.
- Testing Postgres functions: a set-returning function called in `cross join lateral` without referencing the outer row is evaluated **once** — correlate it (e.g. pass a value derived from the row) when you need one call per row.
- In Git Bash, `adb shell` paths like `/sdcard/...` get rewritten to Windows paths — prefix with `MSYS_NO_PATHCONV=1`.

---

## Expo reference

### Navigation & Routing
- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

### Building with EAS
Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

### Rules
- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`. **This project stays on Expo Go — don't add such libraries without asking.**
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
- Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present). It currently uses npm.
