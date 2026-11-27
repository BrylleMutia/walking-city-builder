# AGENTS.md — Stridewood

Guidance for any AI agent or model working on this repo. Read it before changing anything; keep it up to date when a decision below changes.

This is an Expo/React Native mobile app. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

---

## 1. Product overview

**Stridewood** — *Build your town, one step at a time.* Store title: **Stridewood — Walk & Build**. Use these exact strings wherever the app is named (app config, store listings, marketing). Internal ids from before the rename stay as they are: the persisted-store key `walking-pack-city/v1`, the Supabase project name, the GitHub repo and the mascot SVG file names.

A mobile game loop built around walking:

1. **Walk** — the phone counts steps; every step has a 10% chance to drop 1 **Wood** (the currency, icon `assets/log-currency.svg`). Steps themselves are a stat (today, goal, history, lifetime), not money.
2. **Shop** — spend Wood on **booster packs**. Each pack belongs to a **set** with its own theme and items.
3. **Open** — a tactile pack-opening sequence: tilt the pack, swipe-tear the top, glitter hints at rarity, cards come out in a stack.
4. **Build** — every card is a building/decoration placed on the player's **isometric city** grid.

**North star: feel.** The app is judged on crisp, responsive, reactive, satisfying animation and feedback (springs, haptics, light/glare). Never trade that away for convenience.

### Current status
| Area | State |
|---|---|
| First-run onboarding (`/onboarding`, `/save-progress`, `/edit-name`) | 3 intro slides (Walk / Collect / Build: curved art panel, SKIP + dots, Get Started), then "What should we call you?" (pick one of 5 portraits + a name, with a live greeting preview; changeable later via Profile → name → `/edit-name`), then the first useful action without an account: count my steps (permission asked here, in context) → set my daily goal → "Keep your city safe" (Continue with email is the only filled button; Apple/Google are one "coming soon" line; Skip for now is a `TextButton`). Every onboarding and auth screen uses **final illustrations**, drawn with Skia `useImage` inside the curved `ArtPanel` (`ART` in `components/onboarding/OnboardingArt.tsx` maps scene → file): the intro slides `assets/onboarding-preview-1..3.png` (beaver, ≈66% of the screen, less on short phones so the text fits), the setup/auth screens `assets/onboarding/*-objects.png` (objects only, bottom-anchored so short phones crop sky; the code screen reuses the envelope). Replay from Profile → Testing. |
| Save progress with email (`/account/email` → `/account/code`) | Guest → email account with a **6-digit code**: `updateUser({ email })` sends it, `verifyOtp({ type: 'email_change' })` confirms it; same user id, so all progress stays. Opened from "Keep your city safe" (onboarding) or Profile → Account. Apple/Google still "Soon". An email that already has an account offers "Sign in instead". **Needs in the Supabase dashboard:** the "Change email address" template must include `{{ .Token }}`; the built-in mailer sends only ~2 emails/hour, so set up custom SMTP before real players. |
| Sign in with email (`/account/sign-in` → `/account/code?mode=signin`) | Returning player on a new phone / after a reinstall: `signInWithOtp({ shouldCreateUser: false })` sends a 6-digit code (an unknown email → `no_account`, never a new account), `verifyOtp({ type: 'email' })` confirms it, then the store's `signIn` switches accounts. Opened from the intro slides ("Already have an account? Sign in"), "email already taken" on save, and Keep your city safe (guests only). A guest with progress (`hasGuestProgress`) sees a warning first: the account's city **replaces** the guest's, nothing is merged. **Needs in the Supabase dashboard:** the "Magic Link" template must include `{{ .Token }}`. |
| Pack opening (`/open-pack`) | Done: tilt + glare, foil shader, tear/reseal swipe, rarity glitter, card stack, summary. The summary **deals the cards into the grid in place** (`components/card/summaryDeal.ts`: fade + 14 dp rise, 70 ms stagger, best card last with a 4% pop and its rarity haptic, eased, no spring); cards never fly back from where they were flicked (that crossed the whole screen). **Rarity reveals** (`logic/revealFx.ts` `REVEAL_FX`, one table): each card coming to the top plays its rarity's haptic rhythm (`haptic.reveal` / `haptic.pattern`), chime (`lib/sound.ts`) and Skia layers (`effects/RevealFx.tsx`: `RevealBackdrop` behind the stack = glow, light rays, tease; `RevealOverlay` above = flash, sparkle ring, gold shower). Commons stay quiet; rare adds a glow, sparkle ring and a light sweep across the card; epic adds rays; legendary adds a gold flash, shower and rays that keep turning while it's on top. Before an epic/legendary, its colour glows from under the stack (and the stack trembles before a legendary). Reduced motion drops rotation, tremble and shower. Sound effects can be turned off in Profile → Settings (`soundOn`). Pack ≈70% of screen width; its body slides down while tearing to make room for the flap. |
| Home tab | Greeting row with the notification bell, steps today + goal ring, stats, activity cards (Wallet = `WoodPill`), "Walk +500" simulate button. |
| Notifications (bell on Home → `/notifications`) | `NotificationBell` (`home-notifications`, `variant="dot"`, `glow`): always shown; an orange dot breathes while anything is unread. The list shows the newest 50; a notification stays unread until **tapped**, which opens it in place and marks it read (`markNotificationRead`, optimistic, queued offline in `notificationsReadPending`). Every new player gets a **welcome** with their account (the first anonymous sign-in, `handle_new_user`); opened, it shows the walk → Wood → pack → open → build walkthrough and one next step (`welcomeNextStep`: buy the first pack / walk for it / build / keep walking). **Reset all data** makes the welcome unread again. Server-only kinds render title + body. |
| Wood popup (`components/wood/WoodHaulModal.tsx`) | "Your walk paid off!": on every app open (launch or back to the foreground, i.e. a successful `connect()`), once **500+ steps** were credited since it last showed (`haul` in the store, persisted), it shows the steps and the Wood the server rolled for them (log pops in, chip burst, odometer). Wood is already in the wallet; "Nice!" (`wood-haul-close`) starts a new haul. Under 500 the haul keeps adding up. Not shown during onboarding. |
| Multiple cities (`/cities`) | Tap the town name on the City tab (`city-switcher`) for a `formSheet` listing every city with a Skia **mini-map** (`components/city/MiniMap.tsx`, one path per colour), lots built, rename (inline) and delete (`DeleteButton`; buildings return to the inventory, no refund, the last city stays). **New city** costs (number of cities) × 1,000 Wood (2nd 1,000, 3rd 2,000, …), up to `MAX_CITIES` = 10. One shared pool of cards: a card stands in one city at a time. Only the active city is loaded and drawn; switching shows cached tiles at once, then refreshes. Default names: "<name>'s Town" for the first city, "Town N" after. |
| City tab | 16×16 isometric lawn (256 lots), pan/pinch/zoom (0.7–3.5×), a crosshair **recenter** button under the map controls (`city-recenter`: whole lawn, centred, zoom 1), place/remove items from inventory. Path tiles (street/sidewalk/lawn) auto-connect to walkable neighbours. **Top-down view** (toggle `city-view-toggle`): the lawn morphs flat (one Skia transform on a shared value), buildings/props become rarity-tinted tokens, paths keep their real shape; press-and-hold + drag moves an object (all its target lots outlined: green = fits, blue = swap, red = blocked or off the lawn), and a selected object has **Move** (then tap a lot for its anchor) and **Return**. Dropping exactly on an object with the **same footprint** swaps the two (`move_item`). **Multi-lot items**: buildings cover 1×1 up to 3×2 lots, including an L (see Game rules); tapping any of their lots selects them, a placement that doesn't fit shows a "Doesn't fit here" toast, and inventory tiles show the size. |
| Shop tab + set detail (`/set/[id]`) | Three live sets: Cozy Downtown (200 Wood, ≈2,000 steps), Neon Harbor and Blossom Gardens (300 Wood each). A listing without `set:` still shows as "Coming soon". The City inventory and the Profile collection (one grid per set) span every playable set (`PLAYABLE_SETS`); the City header reads "<name>'s Town". |
| Profile tab | Level, lifetime stats, 7-day chart, collection grid, settings (incl. Account · Guest → `/save-progress`), Testing section (force legendary / all foil / +5,000 steps / replay onboarding / UI components / reset). |
| Real step counting | `useStepTracker`: starts once onboarded (or when onboarding asks). On **iOS** it reads the phone's "steps since midnight" (`getStepCountAsync`) at start, on foreground and on every watcher event, raising today's count to it (`raiseStepsToday`, never double-counts). On **Android (development build)** it reads the same daily total from **Health Connect** (`lib/healthSteps.ts`) and adds live sensor steps on top while it lags (`logic/dailySteps.ts`, never double-counts); without Health Connect access it counts live sensor steps while the app is open. **Expo Go on Android can't read steps**, so the simulate buttons are the only source there. |

### Game rules (source of truth: `src/data/rarity.ts`, `src/data/sets/`)
- Rarity per card: Common 55% · Uncommon 27% · Rare 12% · Epic 4% · Legendary 2%. Foil: independent 10%.
- 5 cards per pack, sorted lowest → highest rarity (best card revealed last).
- Set 2 **Neon Harbor** (`data/sets/neonHarbor.ts`, art in `components/items/neonHarborShapes.ts`, migration `neon_harbor_set`): 13 items — 5 common (Boardwalk Planks ×4, Quay Stones ×4, Sandy Strip ×2, Neon Lamp, Cargo Crates), 4 uncommon (Noodle Stand 1×1, Boathouse 1×2, Fish Market 2×1, Neon Diner mirrored L `##`/`.#`), 2 rare (Retro Arcade 3×1, Cargo Crane 2×2), 1 epic (Harbor Lighthouse), 1 legendary (Ferris Wheel 2×3). Paths of every set connect to each other.
- Set 3 **Blossom Gardens** (`data/sets/blossomGardens.ts`, art in `components/items/blossomGardensShapes.ts`, migration `blossom_gardens_set`, 2026-11-20): 13 items — 5 common (Stepping Stones ×4, Raked Gravel ×4, Moss Lawn ×2, Stone Lantern, Bamboo Grove), 4 uncommon (Tea Hut 1×1, Greenhouse 1×2, Koi Pond 2×1, Garden Shop L `#.`/`##`, the third L orientation), 2 rare (Moon Bridge 3×1, Wisteria Pavilion 2×2), 1 epic (Garden Pagoda), 1 legendary (Great Cherry Tree 3×3, the biggest footprint so far).
- Set 1 **Cozy Downtown**: 13 items — 5 common (Cobblestone Street ×4 tiles, Brick Sidewalk ×4, Pocket Lawn ×2, Lamp Post, Park Bench), 4 uncommon, 2 rare, 1 epic, 1 legendary.
- Items have a `kind`: `path` (walkable ground, auto-connecting, bundled `tilesPerCard`), `prop`, or `building`. Inventory counts for paths are **tiles**, not cards.
- **Footprints** (`shape` mask on each item, e.g. `['##', '#.']`; `cellsOf` in `data/items.ts`): rows run +y, columns +x, row 0 col 0 is the **anchor** where the object is stored (`city_tiles` row, `Placed`, `CityOp`). No rotation. Cozy Downtown: paths, props, Flower Kiosk and Clock Tower 1×1 · Brick Townhouse 1×2 · Bakery and Bookshop 2×1 · Corner Café L (3 lots, its windows face the notch) · Fountain Plaza 2×2 · Grand Theater 3×2. Server copy: `items.cells` (migration `item_footprints`, 2026-11-19, which also took back objects that overlapped once footprints applied; the cache sanitizer does the same with `fitCity`). The app's `fits`/`moveItem` and the server's `private.fit_error`/`move_item` must agree: an object fits when every lot is on the lawn and free; a move that doesn't fit swaps only with an object of the identical footprint anchored on the target.
- **Wood:** each credited step rolls once, `game_config.wood_drop_chance` = 10% for 1 Wood (server-side in `sync_steps`; `WOOD_DROP_CHANCE` in the app only feeds "~N steps to go" hints). Packs: Cozy Downtown 200 Wood, later sets 300. New players start with 400 Wood (`STARTING_WOOD` = `game_config.starting_balance`). Wood replaced Steps as the currency on 2026-11-19: migration `wood_currency` divided every wallet by 5 (same buying power: 1,000 Steps → 200 Wood per pack), and cache v4 does the same on the phone. `profiles.balance` / `balance` in the app kept their names and now hold Wood.
- City grid is 16×16 (`GRID_SIZE` in the app and `game_config.grid_size` on the server must match). It grew from 12×12 on 2026-11-18: migration `city_grid_16` moved every placed tile by +2,+2 to re-center old towns, and cache v3 (`CITY_SHIFT`) does the same on the phone.
- **Cities** (migration `multi_city`, 2026-11-20): each player has 1 to `game_config.max_cities` (10) cities; the next one costs (count) × `game_config.city_price_step` (1,000) Wood. `CITY_PRICE_STEP` / `MAX_CITIES` / `CITY_NAME_MAX` (24) in `gameLogic.ts` must match. Every city is its own 16×16 lawn; **the card pool is shared** (placeable = owned − placed in *any* city, server and app alike).

### Set design guideline (apply to every new set)
- **Commons are mostly the set's themed walkable infrastructure** (e.g. cobblestones for Cozy Downtown, boardwalk planks for Neon Harbor, stepping stones for Blossom Gardens), bundled ×2–×4 tiles per card, plus a couple of common props. Duplicates must stay useful.
- **Uncommon and above are buildings and landmarks**; the rarest pulls are the set's showpieces. Commons stay 1×1; uncommon and up may span several lots in varied shapes, and the rarest are the biggest.
- Walkable tiles form the walk graph (`walkGraph` in `gameLogic.ts`) that **future NPCs will walk along**, so keep `walkable` accurate. Don't block placement on road access (no hard rules yet).

---

## 2. Tech stack (check `package.json` before assuming versions)

- **Expo SDK 58**, React Native 0.88, React 19.3, TypeScript (strict).
- **Runs in Expo Go and in an Android development build** (EAS, `eas.json` profile `development`, app id `com.stridewood.app`). Expo Go stays the default for UI work and e2e tests. A native module outside Expo Go is only allowed **behind a runtime guard with an Expo Go fallback** (see `lib/healthSteps.ts`: dynamic `import()`, `executionEnvironment` check), and only when asked.
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

### Expo agent skills (`expo@claude-plugins-official`)
The official Expo plugin ([expo/skills](https://github.com/expo/skills)) is enabled for this project in `.claude/settings.json`. Install it once per machine with `claude plugin install expo@claude-plugins-official --scope project`, then start a new session. Other agents (Cursor, Copilot, …) can use `npx skills@latest add expo/skills --skill '*'` instead; don't install both into Claude Code (duplicate skills).
- **Use:** `expo-overview`, `expo-router`, `expo-animation` (Reanimated/Gesture Handler/haptics), `expo-upgrade` (SDK bumps), `expo-data-fetching` (caching/offline ideas — our sync rules in §5 still win).
- **Use for the dev build:** `expo-dev-client` and the EAS build skills (Android, development profile).
- **Ignore for now:** `expo-module`, `expo-ui`, `expo-app-clip`, `expo-brownfield`, and the store/submit/update/hosting `eas-*` skills (no release yet).
- **Careful:** `expo-design-system` / `expo-native-ui` describe generic conventions; our NativeWind + `tokens.json` + `AppText` rules in §5 take precedence.
- Skills are advisory. When one conflicts with this file (especially §6 Decisions), **this file wins**.

### Software Mansion skills (`skills@swmansion`)
[software-mansion-labs/skills](https://github.com/software-mansion-labs/skills), from the makers of Reanimated and Gesture Handler. The marketplace and plugin are declared in `.claude/settings.json`; install once per machine with `claude plugin install skills@swmansion --scope project` (Claude Code offers it when you trust the folder). Skills only, no hooks or MCP server.
- **Use:** `react-native-best-practices`, the animation/gesture/Skia references (Reanimated 4 + `scheduleOnRN`, Gesture Handler 3 hook API, Skia canvas/Atlas/shaders) — they match our stack. Prefer them over generic animation advice.
- **Ignore:** `react-native-executorch`, `fishjam`, `react-native-moq`, `moq-kit`, `typegpu`, `detour`, `rnrepo`, `expo-horizon`, `radon-mcp` (not used in this project), and `pulsar-haptics` (all haptics go through `src/lib/haptics.ts` on expo-haptics). Anything needing a native module outside Expo Go is out unless guarded with an Expo Go fallback (§6).
- Every tappable element still uses our `Tap` component; don't swap it for raw `Pressable`/`Gesture.Tap` because a skill suggests it.

### Context7 docs (`context7@claude-plugins-official`)
[Context7](https://context7.com/docs/clients/claude-code) is an MCP server that returns current, version-specific library docs. It's enabled in `.claude/settings.json` and also worth having at user scope for other repos: install once per machine with `claude plugin install context7@claude-plugins-official --scope project` (add `--scope user` to use it everywhere), then run `claude` in a terminal, open `/mcp`, pick Context7 and finish the browser sign-in (OAuth, no API key; free plan ≈1,000 calls/month). Tools: `resolve-library-id`, `query-docs`.
- **Use it first** for API lookups in Expo 58 / Expo Router, Reanimated 4, Gesture Handler 3, Skia 2, NativeWind 4, Supabase (`supabase-js`, Postgres/RLS) and zustand: always name the version from `package.json` in the query. It replaces fetching doc pages by hand; the installed type definitions in `node_modules` still win when they disagree.
- If it's not signed in or out of calls, fall back to the steps above (versioned docs, `llms.txt`, type definitions). Never answer from memory instead.
- Docs show what a library *allows*, not what this project *does*: the Library picks table, §5 conventions and §6 decisions win over any example it returns.

### Frontend design skill (`frontend-design@claude-plugins-official`)
Anthropic's `frontend-design` skill (one `SKILL.md`, no hooks or MCP): guidance for distinctive, non-templated visual design and UI copy. Enabled in `.claude/settings.json`: install once per machine with `claude plugin install frontend-design@claude-plugins-official --scope project` (add `--scope user` to use it everywhere). When it's missing, follow §5 alone.
- **Use:** when designing a **new** screen, flow, set or piece of art: grounding choices in the subject (walking, wood, town-building, each set's theme), spending boldness in one place, its plan → review → build → critique loop (screenshot with `npm run e2e:shot`), and its writing advice (active-voice buttons, one name per action, errors that say how to fix them, empty states that invite an action).
- **Our design system wins:** the skill is written for web pages and tells you to pick a fresh palette and typefaces. Here the look is already chosen (§5): mint background, white cards, green primary, orange accent, navy text, Plus Jakarta Sans, colours only from `tokens.json`, text only through `AppText`, one filled button per screen. Treat that as "the brief pins down a visual direction"; apply the skill inside it, not over it.
- **Ignore:** its web-only parts (hero sections, CSS selector specificity, line lengths for long-form pages, hover states). Motion follows our §1 north star and §5 animation rules: press feedback, springs and haptics everywhere are intended, not "scattered effects".

### UI UX Pro Max (`ui-ux-pro-max@ui-ux-pro-max-skill`)
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT): 7 skills backed by local CSV data and Python 3 scripts (no hooks or MCP). The marketplace and plugin are declared in `.claude/settings.json`; install once per machine with `claude plugin install ui-ux-pro-max@ui-ux-pro-max-skill --scope project` (add `--scope user` to use it everywhere). On Windows its scripts run with `python`, not `python3`.
- **Use:** `ui-ux-pro-max` for **reviews and checks**: its UX guidelines (accessibility, touch targets, contrast, form errors, loading/empty states) and the React Native stack notes (`--stack react-native`). Good for a second opinion on a screen before calling it done.
- **Don't let it pick the look:** its "design system" mode generates palettes, fonts and `tokens.json`/`tokens.css` under `design-system/`. Never write those into this repo or copy its colours/fonts in: §5 (`src/theme/tokens.json`, Plus Jakarta Sans, `AppText`, one filled button) is fixed. Same for the `design-system` skill.
- **Ignore:** `ui-styling` (shadcn/ui, Radix, web Tailwind: not our stack), `slides`, `banner-design`, `brand`, and the `design` skill's logo/icon/CIP generators (they send prompts to Gemini/AtlasCloud/MuAPI/UberLLM and need API keys; item and city art stays Skia).

### User-level web skills (not for this repo)
Some machines have web-only skills in `~/.claude/skills/` that load in every project. Don't use them here:
- **`webapp-testing`** (Anthropic, Python Playwright against a local web server): this app has no web build (`react-native-web` isn't installed, so `npm run web` can't render it), and every screen is Skia/gesture-driven, which a DOM-selector script can't see into anyway. Test with the §7 policy instead: Maestro flows and `npm run e2e:shot` on the Android emulator.
- **`web-design-guidelines`** (Vercel) triggers on "review my UI" / "check accessibility". Don't use it for Stridewood reviews: most of its ~90 rules are DOM/CSS (`aria-*`, `<button>`, `:focus-visible`, `hover:`, `<link rel=preconnect>`, hydration, URL state) and would produce false findings on React Native, and some contradict our copy style (it wants Title Case buttons; we use sentence case). Use `ui-ux-pro-max` (`--stack react-native`) for UI reviews instead. The few rules that do carry over are already ours: `accessibilityLabel` on icon-only `Tap`s, Reanimated reduced motion, transform/opacity animation, FlashList for long lists, safe-area insets, `Intl` number/date formats, error messages that say how to fix it, `DeleteButton` for destructive actions, and a tap alternative for gesture-only actions.

### Library picks (Expo Go)
When a task needs a library, pick from this table: name the need (not the library someone mentioned), check `package.json` first, and give **one** answer. Everything below runs in Expo Go: it is either pure JS on top of what we have, or listed in `node_modules/expo/bundledNativeModules.json` (the versions `npx expo install` resolves). Still try a newly added native module in Expo Go on Android before building on it. If a need isn't listed, say so and check that it works in Expo Go before suggesting anything.

| Need | Use | Notes |
|---|---|---|
| Animation, gestures | Reanimated 4 + Gesture Handler 3 hooks *(installed)* | No Moti, Framer Motion or `Animated` API. |
| Illustration, effects, particles | Skia *(installed)* | |
| Charts | Hand-built: Views (like the Profile 7-day chart), or Skia for anything curved or animated | No chart library. |
| Presses | `Tap` (`components/ui`) | Never `Pressable`/`Touchable*` directly. |
| Haptics | `src/lib/haptics.ts` (expo-haptics) | Respects the player's setting. |
| Icons | `@expo/vector-icons` Feather / MaterialCommunityIcons *(installed)* | |
| App state + persistence | zustand + AsyncStorage *(installed)* | Not MMKV: it needs a dev build. |
| Server data | `@supabase/supabase-js` through `state/backend.ts` + the store | No React Query/SWR layer without asking (sync rules in §5). |
| Long lists (~50+ rows) | `@shopify/flash-list` | Short, fixed lists (collection grid, settings) can stay `ScrollView` + `map`. |
| Raster / remote images | `expo-image` | Item and city art stays Skia. |
| Bottom sheets, dialogs | Expo Router screen with `presentation: 'formSheet'` / `'modal'`, or RN `Modal` + kit `Card` | Not `@gorhom/bottom-sheet` (untested with GH3 + Reanimated 4). Check `formSheet` on Android. |
| Toasts, snackbars | `toast()` / `toast.success()` / `toast.promise()` from `components/ui/toast` | `<Toaster />` is already mounted in the root layout. No toast library. |
| Animated numbers (balances, prices, badges) | `AnimatedCounter` | Odometer wheels on the UI thread; cheap enough for values that change every sync. |
| Destructive confirm (remove, reset) | `DeleteButton` | Confirms in place; use `Alert` only for app-wide, irreversible actions. |
| Password / auth fields | `PasswordInput` | Strength meter is a nudge only; Supabase Auth enforces the real rules. |
| Dropdowns, context menus, tooltips | Kit `Popover` (`components/ui/Popover.tsx`, e.g. the set screen's drop rates) on `Tap` + Reanimated | Not zeego / `@react-native-menu/menu` (native, dev build). |
| Gradients, blur (outside Skia) | `expo-linear-gradient`, `expo-blur` | Inside a Skia canvas, use Skia shaders instead. |
| Sound effects, music | `expo-audio` *(installed)* through `lib/sound.ts` | Loaded lazily (never imported at the top of a file: it touches its native module on import). Its config plugin has microphone, `RECORD_AUDIO` and background playback turned off in `app.json`: we only play short foreground sounds. Chimes are generated by `scripts/audio/make-chimes.py` into `assets/sounds/`. |
| Video | `expo-video` | |
| Keyboard avoidance | `react-native-keyboard-controller` | Only once there is a text-entry screen. |
| Share a city snapshot | Skia `makeImageSnapshot` + `expo-sharing` | Use `react-native-view-shot` for non-Skia views. |
| Secrets on device | `expo-secure-store` | The Supabase session stays in AsyncStorage (`lib/supabase.ts`). |
| Notifications | `expo-notifications`, local only | Remote push doesn't work in Expo Go on Android. |
| Real steps on Android | `react-native-health-connect` *(installed)* through `lib/healthSteps.ts` | **Dev build only.** Never import it at the top of a file (throws in Expo Go); `useStepTracker` is its only caller. Its config plugin adds no data permissions: list each one in `app.json` `android.permissions` (now `android.permission.health.READ_STEPS`). |
| Fonts | `@expo-google-fonts/*` loaded at runtime *(installed)* | Not a config-plugin font (needs prebuild). |

Generic React Native skills (for example Vercel's `react-native-skills`) recommend zeego, LegendList, config-plugin fonts and raw `Pressable`. Where they disagree with this table, **this table wins**.

---

## 3. Commands

```bash
npx expo install <package>   # ALWAYS use instead of npm/yarn/pnpm add — resolves SDK-compatible versions
npx expo start --go --tunnel # Expo Go on the physical phone (port 8081); see --dev-client below
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint . (use this; `npx expo lint` fails its ESLint version check on SDK 58)
npm test                     # jest unit tests
npx expo-doctor              # dependency/config diagnosis
npm run e2e                  # full Maestro suite on the emulator (~6 min) — see Testing policy
npm run e2e -- -Flow 02-steps.yaml   # one flow
npm run e2e:emulator [-- -ColdBoot]  # boot the emulator
npm run e2e:shot -- -Name foo        # screenshot the emulator → e2e-artifacts/shots/foo.png
npx expo start --dev-client --tunnel # dev server for the Android dev build on the phone (8081)
npx expo prebuild -p android --no-install                   # (re)generate android/ (git-ignored) after native changes
# local dev build: see §8 "Local dev build on Windows" (short copy in C:\sw, CMake 3.31.6, Skia at -j3); latest APK is copied to builds/stridewood-dev.apk (git-ignored)
adb install -r builds/stridewood-dev.apk                     # install on the emulator or a USB-connected phone
```

A new dev build is only needed after **native** changes (a native package, `app.json` plugins/permissions, SDK upgrade). JS changes load from Metro like in Expo Go.

Run **typecheck and lint** before declaring any task done.

---

## 4. Project structure

```
src/
  app/                    Expo Router routes ONLY (every file is a screen)
    _layout.tsx           root: global.css, fonts, splash, store hydration, step tracker, Stack with
                          route guards (Stack.Protected on `onboarded`), Toaster
    onboarding/           first-run flow: index (intro slides), name, steps, goal + _layout
    account/              email.tsx (save, step 1), sign-in.tsx (sign in, step 1) and code.tsx (step 2 of both: OTP,
                          resend countdown; `mode=signin` switches accounts)
    save-progress.tsx     last onboarding step / account reminder (sign-in "Soon")
    edit-name.tsx         change the player's name later (Profile header)
    notifications.tsx     the bell's list (welcome walkthrough, empty state)
    (tabs)/               index (Home), city, shop, profile + _layout (custom TabBar)
    cities.tsx            city switcher (formSheet): mini-maps, new city, rename, delete
    set/[id].tsx          set detail + Buy pack
    open-pack.tsx         full-screen pack opening (fullScreenModal)
  screens/PackSession.tsx the whole pack-opening sequence (one pack, remounted per purchase via key)
  components/
    ui/                   design system: AppText, Tap, kit (Card, IconButton, PillButton, SquareButton,
                          TextButton, ArrowButton, SectionHeader, PriceTag, Meta, StepsPill, StatTile), Screen,
                          TabBar, ProgressRing, illustrations (Avatar, WalkerHero, PackThumb),
                          AnimatedCounter (odometer), toast() + Toaster (mounted in root layout),
                          NotificationBell, Popover (tooltip above a trigger), DeleteButton (in-place confirm), PasswordInput (+ strength),
                          OtpInput (one-time code: rolling characters, sliding caret, success/error rings)
    onboarding/           ArtPanel (curved-bottom art area), PageDots, SetupScreen (setup-step layout), NameStep,
                          OnboardingArt (scene → final illustration, drawn with Skia inside ArtPanel)
    pack/                 BoosterPack (gestures), PackArt (Skia wrapper + tear), packGeometry
    card/                 Card, CardStack (in-pack → stack → summary)
    effects/              GlareOverlay, foilShader (SkSL), Glitter, tilt helpers
    items/                iso.ts (isometric drawing kit), itemShapes.ts (buildings/props), pathShapes.ts
                          (auto-connecting path tiles, 16 variants each, merged per colour), ItemArt
    city/                 CityMap (Skia grid, camera, hit-testing), MiniMap (switcher previews)
  data/                   avatars.ts (the 5 player portraits; ids are stored, never rename), rarity.ts, sets/ (cozyDowntown + SET_LISTINGS catalogue), items.ts (item lookup)
  logic/openPack.ts       pure pack rolling (+ tests)
  logic/dailySteps.ts     combines a lagging daily step total with live sensor steps (+ tests)
  state/                  gameLogic.ts (pure rules + tests), useGameStore (zustand), useStepTracker
  theme/                  tokens.json (single source of colours/radii/fonts), tokens.ts
  lib/haptics.ts          all haptics go through here (respects the setting)
  lib/healthSteps.ts      Health Connect steps (Android dev build only; null in Expo Go)
  lib/sound.ts            UI sounds (pack-reveal chimes; respects the sound setting, fails silently)
  logic/revealFx.ts       per-rarity reveal ladder (haptics, sound, effects) + effect maths (+ tests)
  lib/supabase.ts         Supabase client (AsyncStorage session, foreground-only token refresh)
  lib/database.types.ts   generated DB types — regenerate after schema changes
  state/backend.ts        typed wrappers for the game RPCs; errors → BackendReason
  state/serverState.ts    pure mapping server JSON → GameData / PackCard (+ tests)
  state/useCloudSync.ts   connect on launch and on every return to foreground; pause live sync in background
  state/cache.ts          persisted-cache version, migrate + sanitize (+ tests)
  state/notifications.ts  notification list rules: server mapping, read state, timeAgo, welcome next step (+ tests)
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
- **One filled button per screen.** A second action beside the main one is `PillButton variant="outline"` or a `TextButton`; show a Wood cost on the button with `price` (it adds the Wood icon). No decorative controls: a button without a real action is left out until it has one.

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
- Add new sets in `src/data/sets/` (export the set's id union and add it to `ItemId` in `sets/types.ts`), and list them with `set:` in `SET_LISTINGS`: that alone makes them playable (`PLAYABLE_SETS`) and registers their items in `src/data/items.ts`. New path ids go in `PATH_IDS` (`pathShapes.ts`); a set's other art can live in its own `<set>Shapes.ts`, spread into `BUILDERS`. `data/sets/sets.test.ts` checks every set has every rarity, unique ids and the guideline. Building/prop art goes in `components/items/itemShapes.ts`, path art in `pathShapes.ts`, using the `iso.ts` primitives on 4×4 iso units **per lot** (a 2×1 draws on 8×4, with `slab()` underneath). A non-rectangular footprint is drawn as several rectangular **pieces** (`ArtPiece`), each depth-sorted on its own by `logic/depthOrder.ts`; the city never sorts by x + y alone any more. Follow the set design guideline above.
- Path tiles are numerous: merge same-coloured pieces into one path per colour (see `merge` in `pathShapes.ts`) to keep Skia draw calls low.

### Backend (Supabase) — server-authoritative
- Project ref `siiktkvhgvfbepksffoh` (URL + publishable key in `.env` as `EXPO_PUBLIC_SUPABASE_*`; both are public by design). **Never** put a secret/service-role key in the app or repo.
- Players sign in **anonymously** on first launch (`ensureSession`); upgrading to email/OAuth later = identity linking.
- **The server decides** balances, pack contents and city placement. Clients can only *read* their own rows (RLS) and *call* the game functions: `sync_steps`, `buy_pack`, `place_item`, `remove_item`, `move_item` (move, or swap with the object on the target lot), `create_city`, `rename_city`, `delete_city`, `get_city`, `update_profile`, `reset_progress`, `mark_notifications_read`, `get_my_state`. Direct table writes are revoked.
- **Cities on the server:** `cities` table (RLS read-own, live-sync trigger); `city_tiles` is keyed `(city_id, x, y)` and keeps `user_id` for the shared-pool count. City RPCs take `p_city_id` first (`null` = the player's first city, via `private.require_city`, which also refuses other players' cities). The overloads *without* `p_city_id` are kept as wrappers on the first city, for apps from before `multi_city`; drop them once no such build is in use. `get_my_state(p_since, p_city_id)` returns `cities` (with lots), `city_id`, the tiles of **that city only** and `placed` (per-item counts across all cities), so its size doesn't grow with the number of cities.
- **Cities in the app:** `GameData.city` is always the *active* city, so every placement rule and `CityMap` work on one city. `placedElsewhere` holds the other cities' copies (`available()` subtracts it); `switchCity` moves counts between the two. `cityTiles` (persisted) caches the last-seen tiles of inactive cities, so switching back is instant and works offline; a switch bumps `localGen` so a late answer for the old city can't undo it (`adopt` in the store also guards this). Every `CityOp` carries its `cityId`.
- Game functions are `security definer` with `set search_path = ''`, resolve the caller via `private.require_uid()`, lock the profile row `for update`, and raise short error codes (`insufficient_steps`, `tile_occupied`, …) that `backend.ts` maps to `BackendReason`. Internal helpers go in the `private` schema (not exposed).
- Steps: `sync_steps(day, total)` only ever raises a day's total (credited delta), capped by `game_config.max_daily_steps`, days within the last week (+1 for time zones). Each credited step rolls for Wood exactly once (re-sending a total can't reroll); it returns `credited` and `wood`, which the store adds to the popup's `haul`. The app never adds Wood locally: the balance is always the server's.
- Testing flags (force legendary/foil) are honoured only when `profiles.is_tester = true` (set by hand in the dashboard).
- App side: the zustand store is a cache. Screens subscribe with **narrow selectors** (`useShallow` for several fields), never `useGameStore()` without one: the store changes on every step sync. `buyPack` waits for the server; placing/removing is optimistic and re-fetches on rejection; steps sync debounced (~1.2 s) and on every connect.
- **Offline city changes are queued, never dropped:** place/remove/move while offline (or when a request fails with `offline`) appends to the persisted `pendingCity` queue (`CityOp`: `place`, `remove`, `move` with `fx, fy, tx, ty`). `connect()` replays it in order *before* downloading the server state; ops the server rejects are dropped (server wins). Every adoption of server state re-applies still-queued ops (`applyCityOps`), so offline buildings never vanish. Any new player-data action should follow the same pattern (or be server-only like `buyPack`).
- **Notifications on the server:** `notifications` table (RLS read-own; `kind`, `title`, `body`, `created_at`, `read_at`), written only by server code (`private.add_welcome_notification`, called by `handle_new_user` and `reset_progress`; one welcome per player via a partial unique index). `get_my_state` returns the newest 50; `mark_notifications_read(p_ids)` marks the caller's own unread ones. The app renders kinds it knows (`welcome`) its own way and any other kind as title + body, so a new kind can ship from the server alone. Persisted in cache v6 (`notifications`, `notificationsReadPending`); a refresh keeps not-yet-confirmed reads read (`mergeServerNotices`), `connect()` re-sends them, and an account switch clears both.
- **Live multi-device sync:** DB triggers on `profiles` (update), `city_tiles`, `cities` and `notifications` send a data-free `changed` nudge via `realtime.send` to the **private** topic `player:<uid>` (RLS on `realtime.messages` lets players read only their own topic). The app subscribes after `connect()` (`subscribePlayer`), debounces nudges (~0.4 s) into one `get_my_state` refresh, and closes the channel in the background. Refreshes re-apply in-flight city ops, keep today's not-yet-synced steps, and are retried if a purchase finished meanwhile. Any new table that changes player-visible state needs the same trigger (or must always change together with the profile row). Don't use Postgres Changes for player data: it can't apply RLS to DELETEs.
- **Onboarding gate:** the persisted `onboarded` flag drives `Stack.Protected` in the root layout: onboarding routes only while false, game routes only while true (flipping it navigates by itself). Caches from before onboarding existed migrate to `onboarded: true` (cache v2), so only fresh installs see it. `reset()` keeps it.
- **Profile changes (name, step goal, avatar) are queued, never dropped:** `setGoal` / `setDisplayName` / `setAvatar` mark `profilePending` until the server confirms (`updateProfile` sends all three to `update_profile`); while pending, adopting server state keeps the local values, and `connect()` re-sends them. (Before this, a goal set while connecting/offline was overwritten by the server's.) Names are cleaned by `cleanDisplayName` (trim, 1–20 chars; the server allows 32 and defaults to "Walker"); `reset()` keeps the name and avatar, like the server. **Avatars:** `profiles.avatar_id` only checks the id format (`^[a-z0-9-]{1,32}$`), so adding a portrait to `data/avatars.ts` needs no migration; ids the app doesn't know fall back to the default.
- **Account switch (sign-in) resets the local cache:** `signIn` first quiets the guest (waits for `connect`, pauses live sync, cancels the step-sync timer) so nothing from the guest reaches the account's session, then verifies the code, resets local data to `initialData()` with empty `pendingCity` / `profilePending` (settings, tester flags and `onboarded` stay) and reconnects. Any new module-level sync state in the store must be cleared there too.
- **Persisted cache is versioned** (`CACHE_VERSION` in `state/cache.ts`). When a persisted field changes shape, bump the version and add a step to `migrateCache`; every load is also sanitized field by field (`merge`), so a bad cache falls back to defaults until the server sync. Persisted fields are an allow-list (`toCache`): add new durable fields there.
- **Changing the DB:** add a migration (Supabase MCP `apply_migration` or CLI), save the same SQL in `supabase/migrations/<version>_<name>.sql`, regenerate `src/lib/database.types.ts`, run the security + performance advisors, and test functions by impersonating a throwaway user inside one SQL call (see git history for the pattern) — clean up test users afterwards.
- **Item/set catalog lives in two places** (app `src/data/` for art/UI, DB `items`/`card_sets`/`rarities` for rules). Keep ids, rarities, `tiles_per_card` and `walkable` identical; a new set needs both an app update and a seed migration.

### Code style
- TypeScript strict, functional components, `memo` for heavy Skia components.
- Comments explain *why* (constraints, non-obvious maths), not *what*.
- Scripts under `scripts/e2e/*.ps1` must stay **pure ASCII** (Windows PowerShell 5.1 reads BOM-less files as ANSI).

---

## 6. Decisions & preferences (don't undo without asking)

- **Expo Go + an Android development build** (EAS cloud, `development` profile). No iOS build, no store/production build yet. Keep every screen working in Expo Go.
- **Tilt is touch-driven** (press and drag). The gyroscope tilt was tried and **removed** as too cumbersome — don't re-add it.
- Pack-opening screen uses the **light mint theme** (outlined glitter so pale colours stay visible).
- Pack is **≈70% of screen width**; while tearing, the pack body **slides down** so the flap never overlaps the header.
- Steps are simulated in Expo Go (Walk +500 / Add 5,000); real steps come from the iOS pedometer or, in the Android dev build, Health Connect. The simulate buttons stay in every build for testing.
- Original game content only — don't recreate existing games' names, art or characters.
- `AnimatedCounter`, `Toaster`, `NotificationBell`, `DeleteButton`, `PasswordInput` and `OtpInput` follow Rare UI's designs (rareui.com) but are original React Native code written from its behaviour docs. Keep the credit comments, and never paste Rare UI source: its license (MIT + Commons Clause + attribution) forbids ports to other frameworks.
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
- **Two dev servers**: 8081 (tunnel, `--dev-client`, for the user's phone and its dev build — leave it alone) and **8082 (local, `--go`, for the emulator/tests)**. With `expo-dev-client` installed, `expo start` targets the dev build unless given `--go`. A tunnel server sends the emulator over the internet, which fails.
- The emulator reaches Metro via **`adb reverse tcp:8082 tcp:8082`** and `exp://localhost:8082` (the `10.0.2.2` alias fails to download the bundle on this image). `start-app.ps1` sets this up.
- `start-app.ps1` installs the Expo Go version matching the SDK if the emulator has another one.
- Flows run in the order in `e2e/flows/config.yaml` and share state (`00-reset` first). Use `testID`s for selectors; add `retryTapIfNoChange: false` to taps that change game state.
- Gesture coordinates are screen percentages tied to the pack layout — update `03-buy-and-open.yaml` (and the note in `e2e/README.md`) whenever the pack size/position changes. `08-city-top-view.yaml` taps lots by screen percentage in the top view (lot 7,7 ≈ 47%, 47%): update it when the top view's zoom (`TOP_ZOOM` in `CityMap.tsx`) or the City layout changes. The press-and-hold drag isn't covered by Maestro; check it by hand (`adb shell input motionevent DOWN/MOVE/UP`).
- Artifacts (screenshots, JUnit report, logcat) go to `e2e-artifacts/<timestamp>/` (git-ignored). Look at the screenshots; a green run isn't proof the UI looks right.

---

## 8. Known pitfalls

- **Keep source files UTF-8 when editing from a shell.** On 2026-11-20 thirteen player-facing strings showed `â€™` instead of `’` (UTF-8 read as Windows-1252, then saved again as UTF-8). In PowerShell 5.1, `Get-Content`/`Set-Content` default to ANSI: pass `-Encoding utf8`, or use the editor tools. `src/lib/encoding.test.ts` fails on any double-encoded text under `src/`.
- `adjustsFontSizeToFit` + `letterSpacing` on Android can compute a font size of 0 and crash ("FontSize should be a positive value"). Don't use auto-shrink; size text explicitly.
- **Never run `adb emu avd snapshot save`** — it froze the emulator. Use `npm run e2e:emulator -- -ColdBoot` if the emulator starts broken.
- Don't launch the emulator with `-no-snapshot-save` (installs like an Expo Go upgrade are lost on shutdown).
- Expo Go on the emulator/phone must match SDK 58 (`Project is incompatible with this version of Expo Go` otherwise).
- Expo Go shows its developer menu on first launch; flows close it.
- NativeWind needs `npx expo start --clear` after changing `tailwind.config.js`, `babel.config.js`, `metro.config.js`, `global.css` **or `src/theme/tokens.json`** (Tailwind reads it). Symptom: newly used classes (e.g. a first `px-7`) silently do nothing. That includes the e2e server on 8082, which `start-app.ps1` starts without `--clear`.
- **Never start Metro with `CI=1`** (e.g. to make `npx expo start` non-interactive in a background shell): CI mode turns off file watching, so the dev server keeps serving the bundle from when it started, and even a cold start or Reload in Expo Go shows old code. To check what Expo Go really gets, fetch its exact bundle URL (`…index.ts.bundle?platform=android&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=src%2Fapp&unstable_transformProfile=hermes-stable`) and grep it for a new identifier.
- Anonymous sign-ins must be enabled in the Supabase dashboard (Authentication → Sign In / Providers); otherwise the app shows Cloud save: "Sign-in disabled" and can't buy packs.
- `.env` is read when the dev server starts: restart `npx expo start` after changing it.
- `realtime.messages` is partitioned per day; the partitions are created by the Realtime service once a client has connected. On a fresh project `realtime.send` silently does nothing (it only logs a WARNING) until then.
- Testing Postgres functions: a set-returning function called in `cross join lateral` without referencing the outer row is evaluated **once** — correlate it (e.g. pass a value derived from the row) when you need one call per row.
- In Git Bash, `adb shell` paths like `/sdcard/...` get rewritten to Windows paths — prefix with `MSYS_NO_PATHCONV=1`.
- **Health Connect needs a step source on the phone** (Google Fit, Samsung Health, Fitbit, or the phone's own step recording on newer Android versions). Without one it answers 0, and the app shows only live sensor steps. A Play Store release also needs Google's Health Connect declaration in the Play Console (about 2 weeks).
- `eas build --local` doesn't run on Windows; build in the EAS cloud.
- **Build the dev APK locally, not on EAS's free tier.** Three EAS free builds (2026-11-18) died in Skia's C++ step ("Gradle build daemon disappeared unexpectedly") even with one CPU type, 2 Gradle workers and a 3 GB heap; `eas.json` keeps those settings for a future paid `large` worker. Locally `prebuild` + `gradlew assembleDebug` works (JDK 17 from `JAVA_HOME`, Android SDK, Windows long paths enabled). `android/` is generated: never edit it by hand, regenerate it with `prebuild`.
- **Local dev build on Windows: three workarounds, all needed** (found 2026-11-18). (1) **Path length:** the SDK's default CMake 3.22.1 ships `ninja` 1.10, which can't create folders past 260 characters even with Windows long paths on (`ninja: error: mkdir(CMakeFiles/...): No such file or directory`). Use CMake **3.31.6** (`sdkmanager "cmake;3.31.6"`, ships `ninja` 1.12.1) via `cmake.dir=C:/Users/Brylle/AppData/Local/Android/Sdk/cmake/3.31.6` in `android/local.properties` (forward slashes; backslashes get eaten), and build from a short copy (`robocopy "<project>" C:\sw /MIR /XD "<project>\.git" "<project>\e2e-artifacts" "<project>\android\app\build" "<project>\android\build" "<project>\android\.gradle" .cxx /MT:16`). A `subst` drive does **not** help (Node resolves it back to the real path). (2) **Memory:** Skia's C++ needs GBs per compiler and `ninja` starts ~10 at once → `LLVM ERROR: out of memory` (this also killed the EAS free builds). Run `./gradlew --stop`, configure Skia (`./gradlew ":shopify_react-native-skia:configureCMakeDebug[arm64-v8a]" ":shopify_react-native-skia:configureCMakeDebug[x86_64]" -PreactNativeArchitectures=arm64-v8a,x86_64`), compile it with `<cmake 3.31.6>/bin/ninja.exe -C node_modules/@shopify/react-native-skia/android/.cxx/Debug/<hash>/<abi> -j3 rnskia` for each ABI, then `./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a,x86_64 -Dorg.gradle.workers.max=2`. (3) The dev launcher asks for "nearby devices" on first start; on the emulator answer **Allow** or it stays blank. The APK only holds native code: JS comes from Metro, so rebuild only after native changes.

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
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`. **Ask before adding such libraries**, and guard them so Expo Go keeps working (§2).
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
- Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present). It currently uses npm.
