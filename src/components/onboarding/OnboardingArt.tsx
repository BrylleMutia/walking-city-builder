import { Group, Image, useImage } from '@shopify/react-native-skia';
import React, { memo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { colors } from '../../theme/tokens';
import { ArtPanel } from './ArtPanel';

// Every onboarding and auth screen shows a final raster illustration, drawn
// with Skia inside the curved ArtPanel. To change a screen's picture, swap
// its file in ART: the screens only depend on <OnboardingArt scene width height />.

export type OnboardingScene =
  | 'walk'
  | 'collect'
  | 'build'
  | 'name'
  | 'steps'
  | 'goal'
  | 'save'
  // Email sign-up and sign-in:
  | 'email'
  | 'account'
  | 'code';

/** Intro slides: 3:4 portrait with the beaver. Setup/auth: ~1.25:1 landscape, objects only. */
const ART: Record<OnboardingScene, number> = {
  walk: require('../../../assets/onboarding-preview-1.png'),
  collect: require('../../../assets/onboarding-preview-2.png'),
  build: require('../../../assets/onboarding-preview-3.png'),
  steps: require('../../../assets/onboarding/onboarding-count-steps-objects.png'),
  goal: require('../../../assets/onboarding/onboarding-daily-goal-objects.png'),
  name: require('../../../assets/onboarding/onboarding-profile-objects.png'),
  save: require('../../../assets/onboarding/onboarding-save-city-objects.png'),
  email: require('../../../assets/onboarding/onboarding-save-email-objects.png'),
  // The code arrives by email, so this screen keeps the envelope from the step before.
  code: require('../../../assets/onboarding/onboarding-save-email-objects.png'),
  account: require('../../../assets/onboarding/onboarding-welcome-back-objects.png'),
};

/** Shown in the panel for the moment before its image decodes; close to each image's own sky. */
const BG: Record<OnboardingScene, string> = {
  walk: colors.mint.DEFAULT,
  collect: colors.butter.DEFAULT,
  build: colors.petal.DEFAULT,
  name: colors.petal.DEFAULT,
  steps: colors.mint.DEFAULT,
  goal: colors.butter.DEFAULT,
  save: colors.sky.soft,
  email: colors.mint.DEFAULT,
  account: colors.sky.soft,
  code: colors.mint.DEFAULT,
};

/** Parallax drift of the intro slides' art, as a share of the width per page. */
const PARALLAX = 0.04;

interface Props {
  scene: OnboardingScene;
  width: number;
  height: number;
  /**
   * Signed distance from this slide while paging (0 = centred, ±1 = one page
   * away). Only the intro slides pass it; their art drifts a little.
   */
  offset?: SharedValue<number>;
}

export const OnboardingArt = memo(function OnboardingArt({ scene, width, height, offset }: Props) {
  return (
    <ArtPanel width={width} height={height} color={BG[scene]}>
      <SceneImage
        source={ART[scene]}
        w={width}
        h={height}
        offset={offset}
        // The setup/auth objects sit low with plain sky above, so when a
        // short panel has to crop, anchor the bottom and trim the sky.
        alignY={offset ? 0.5 : 1}
      />
    </ArtPanel>
  );
});

/**
 * The illustration scaled to cover the panel. Paging slides draw it wider by
 * the parallax drift on each side, so sliding never uncovers an edge.
 */
function SceneImage({
  source,
  w,
  h,
  offset,
  alignY,
}: {
  source: number;
  w: number;
  h: number;
  offset?: SharedValue<number>;
  /** Where the crop sits vertically: 0 keeps the top, 0.5 the middle, 1 the bottom. */
  alignY: number;
}) {
  const image = useImage(source);
  const bleed = offset ? w * PARALLAX : 0;
  const drift = useDerivedValue(() => [{ translateX: (offset ? offset.value : 0) * -PARALLAX * w }]);
  if (!image) return null;

  const coverW = w + bleed * 2;
  const s = Math.max(coverW / image.width(), h / image.height());
  const dw = image.width() * s;
  const dh = image.height() * s;
  return (
    <Group transform={drift}>
      <Image image={image} x={(w - dw) / 2} y={(h - dh) * alignY} width={dw} height={dh} fit="fill" />
    </Group>
  );
}
