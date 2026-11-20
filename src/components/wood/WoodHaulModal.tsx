import { Canvas, Group, RoundedRect } from '@shopify/react-native-skia';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useShallow } from 'zustand/react/shallow';

import { haptic } from '../../lib/haptics';
import { useGameStore } from '../../state/useGameStore';
import { colors } from '../../theme/tokens';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import { AppText } from '../ui/AppText';
import { Card, PillButton, formatNumber } from '../ui/kit';
import { WoodIcon } from '../ui/WoodIcon';

const BURST_W = 240;
const BURST_H = 150;
const ICON = 92;
const CHIPS = 16;
const CHIP_COLORS = [colors.wood.DEFAULT, colors.wood.light, colors.wood.grain, colors.wood.dark];

/** Fixed pseudo-random seeds, so the burst is a pure function of its progress. */
const SEEDS = Array.from({ length: CHIPS }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    angle: (i / CHIPS) * Math.PI * 2 + (r(1) - 0.5) * 0.5,
    dist: 52 + r(2) * 48,
    spin: (r(3) - 0.5) * 6,
    w: 7 + r(4) * 6,
    h: 4 + r(5) * 3,
    color: CHIP_COLORS[i % CHIP_COLORS.length],
  };
});

/** One wood chip flying out of the log: position, spin and fade all follow `t`. */
const Chip = memo(function Chip({ t, seed }: { t: SharedValue<number>; seed: (typeof SEEDS)[number] }) {
  const transform = useDerivedValue(() => {
    const p = t.value;
    // Ease out on the way out, then a little gravity pulls the chip down.
    const out = 1 - (1 - p) * (1 - p);
    const x = BURST_W / 2 + Math.cos(seed.angle) * seed.dist * out;
    const y = BURST_H / 2 + Math.sin(seed.angle) * seed.dist * out + 26 * p * p;
    return [{ translateX: x }, { translateY: y }, { rotate: seed.spin * p }];
  });
  const opacity = useDerivedValue(() => (t.value <= 0 ? 0 : 1 - Math.max(0, (t.value - 0.55) / 0.45)));
  return (
    <Group transform={transform} opacity={opacity}>
      <RoundedRect x={-seed.w / 2} y={-seed.h / 2} width={seed.w} height={seed.h} r={2} color={seed.color} />
    </Group>
  );
});

/**
 * "Your walk paid off": shown on an app open once the steps credited since it
 * last showed reach HAUL_MIN_STEPS. Wood is already in the wallet (the server
 * rolled it when the steps synced); this celebrates it, and closing it starts
 * a new haul.
 */
export function WoodHaulModal() {
  const { visible, dismissHaul } = useGameStore(useShallow((s) => ({ visible: s.showHaul, dismissHaul: s.dismissHaul })));
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={dismissHaul}>
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: colors.scrim }}>
        {/* Mounted per opening, so every popup starts its animation from scratch. */}
        {visible && <HaulCard onClose={dismissHaul} />}
      </View>
    </Modal>
  );
}

function HaulCard({ onClose }: { onClose: () => void }) {
  const balance = useGameStore((s) => s.balance);
  // Frozen when it opens: steps synced while it's up join the next haul, so the
  // numbers don't change under the player's eyes.
  const [shown] = useState(() => useGameStore.getState().haul);
  const [counted, setCounted] = useState(0);
  const closing = useRef(false);

  const card = useSharedValue(0);
  const icon = useSharedValue(0);
  const burst = useSharedValue(0);

  useEffect(() => {
    card.set(withSpring(1, { damping: 14, stiffness: 180 }));
    icon.set(withDelay(160, withSpring(1, { damping: 7, stiffness: 220 })));
    burst.set(withDelay(220, withTiming(1, { duration: 900, easing: Easing.linear })));
    haptic.success();
    // The odometer rolls up from 0 once the card has landed.
    const t = setTimeout(() => setCounted(shown.wood), 380);
    return () => clearTimeout(t);
  }, [card, icon, burst, shown]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    // Shrink away first, then let the store close the modal (and start a new haul).
    card.set(
      withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) scheduleOnRN(onClose);
      }),
    );
  };

  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, card.value * 1.5),
    transform: [{ scale: 0.85 + 0.15 * card.value }, { translateY: (1 - card.value) * 24 }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: icon.value }, { rotate: `${(1 - icon.value) * -40}deg` }],
  }));

  const chips = useMemo(() => SEEDS.map((s, i) => <Chip key={i} t={burst} seed={s} />), [burst]);

  return (
    <Animated.View style={[{ width: '100%', maxWidth: 360 }, cardStyle]}>
      <Card className="items-center px-6 pt-4 pb-6" testID="wood-haul">
        <View style={{ width: BURST_W, height: BURST_H }} className="items-center justify-center">
          <Canvas style={{ position: 'absolute', width: BURST_W, height: BURST_H }}>{chips}</Canvas>
          <Animated.View style={iconStyle}>
            <WoodIcon size={ICON} />
          </Animated.View>
        </View>

        <AppText weight="heavy" className="text-2xl text-center">
          Your walk paid off!
        </AppText>
        <AppText tone="soft" className="text-base text-center mt-2">
          You walked{' '}
          <AppText weight="strong" className="text-base">
            {formatNumber(shown.steps)} steps
          </AppText>{' '}
          and found
        </AppText>

        <View className="flex-row items-center mt-4 bg-accent-soft rounded-chip px-4 py-2">
          <WoodIcon size={28} />
          <View className="ml-2">
            <AnimatedCounter value={counted} size={30} tone="accent" duration={900} testID="wood-haul-amount" />
          </View>
          <AppText weight="heavy" tone="accent" className="text-lg ml-2">
            Wood
          </AppText>
        </View>

        <AppText tone="muted" className="text-sm mt-3">
          Balance: {formatNumber(balance)} Wood
        </AppText>

        <PillButton label="Nice!" onPress={close} testID="wood-haul-close" style={{ alignSelf: 'stretch', marginTop: 20 }} />
      </Card>
    </Animated.View>
  );
}
