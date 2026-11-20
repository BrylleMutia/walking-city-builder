# End-to-end tests (Android emulator + Expo Go + Maestro)

Scripted flows drive the real app on the Android Studio emulator: tapping tabs, buying a pack, tearing it open with a swipe, placing a building, and restarting the app. Every run saves screenshots, a JUnit report and the JS/crash log.

## One-time setup

- **Android Studio** with an emulator. The default is `Pixel_10_Pro`; any AVD works with `-Avd <name>`.
- **Expo Go on the emulator.** Run `npx expo start --android` once and it installs the version that matches the SDK.
- **Maestro** from the official releases (https://github.com/mobile-dev-inc/maestro/releases). Unzip `maestro.zip` to `%USERPROFILE%\.maestro` and add `%USERPROFILE%\.maestro\bin` to your PATH. The scripts also find it there if it isn't on PATH.

## Running

```bash
npm run e2e                                  # whole suite (~5 min)
npm run e2e -- -Flow 01-tabs.yaml            # one flow
npm run e2e -- -Headless                     # no emulator window
npm run e2e -- -Avd loro-verification-api35  # another emulator
npm run e2e:emulator                         # just boot the emulator
npm run e2e:shot -- -Name home               # screenshot of whatever is on screen
```

`npm run e2e` boots the emulator if needed and starts its own Metro server on port 8082 (local, never tunnel) if it isn't already running, so it doesn't clash with the 8081 server you use for your phone. It then runs the flows and writes everything to `e2e-artifacts/<timestamp>/`. The exit code is non-zero when any flow fails.

**Don't touch the emulator while a run is in progress.** The flows tap exact screen positions, and a stray tap breaks them.

## The flows (`e2e/flows/`)

The flows run in the order set in `config.yaml` and build on each other's state.

| Flow | Checks |
|---|---|
| `00-reset` | Cold-starts Expo Go, loads the project, resets all data via Profile → Testing |
| `01-tabs` | All four tabs render |
| `02-steps` | "Walk +500" raises today's steps and the wallet |
| `03-buy-and-open` | Buy a pack, tear it open, reseal it, tear it again, take the cards out, flick through all 5, summary |
| `04-city-place` | Place a building, select it, return it to the inventory, place it again, zoom |
| `05-persistence` | Kill and relaunch: steps, balance and city survive |
| `06-components` | UI gallery (Profile → Testing): counter, toast stack, bell, delete, password |
| `07-onboarding` | Replay onboarding (Profile → Testing): swipe 3 slides → Get started → name "Bry" (Home greets Bry) → count steps (unavailable on the emulator → test walk) → pick 10k → Skip for now → goal is 10,000 → rename back to Walker from Profile |
| `09-all-packs` | Shop lists "3 sets"; +2×5,000 test steps for Wood; buys and opens a Neon Harbor and a Blossom Gardens pack (`shared/buy-and-open-pack.yaml`, `SET` env); each set's Profile collection shows 1–5 of 13 |

`shared/` holds sub-flows for opening the app, finishing onboarding, resetting it and buying + opening one pack of any set (`runFlow` with `env: { SET: <set id> }`). `open-app` runs `finish-onboarding` by itself when a fresh install (wiped Expo Go data) starts on the intro slides.

## Writing flows

- Target controls by `testID`. On Android it becomes the view id, so `tapOn: { id: buy-pack }`. Add a `testID` to the control first (`Tap`, `PillButton`, `IconButton` and the others accept one).
- Add `retryTapIfNoChange: false` to any tap that changes game state. Otherwise Maestro may tap again when it thinks nothing happened, and you buy two packs.
- Gestures use percentages of the screen. On the Pixel 10 Pro layout, the sealed pack's tear strip is at about 26–36% of the height; once open, the pack has slid down and the strip is at about 36–47%.
- Flows set `MAESTRO_CLI_NO_ANALYTICS` through the scripts, so Maestro sends no usage analytics.
