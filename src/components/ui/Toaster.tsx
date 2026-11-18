import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import {
  GestureDetector,
  useCompetingGestures,
  usePanGesture,
  useTapGesture,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { haptic } from "../../lib/haptics";
import { cardShadow, colors } from "../../theme/tokens";
import { AppText } from "./AppText";
import { Tap } from "./Tap";
import {
  removeToast,
  dismissToast,
  useToastStore,
  type ToastData,
  type ToastType,
} from "./toast";

// Design and behaviour translated from Rare UI's "Toast" (rareui.com, MIT +
// Commons Clause). Original React Native implementation: hover → tap to fan
// out the stack, plus swipe to dismiss.

const GAP = 8;
/** How far each older toast peeks out below the front one while stacked. */
const PEEK = 10;
const VISIBLE = 3;
const SPRING = { stiffness: 320, damping: 26, mass: 0.8 } as const;
const FLICK = 800;

/** Mount once, at the root, above the navigator. Shows toasts from `toast()`. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  const [expandedState, setExpanded] = useState(false);
  const [heights, setHeights] = useState<Record<string, number>>({});

  const live = toasts.filter((t) => !t.closing);
  // A single toast has nothing to fan out.
  const expanded = expandedState && live.length > 1;
  const frontHeight = live[0] ? (heights[live[0].id] ?? 0) : 0;

  // Where each live toast sits; a closing toast keeps the slot it had.
  const layout = new Map<string, { index: number; offset: number }>();
  let y = 0;
  live.forEach((t, index) => {
    layout.set(t.id, { index, offset: expanded ? y : index * PEEK });
    y += (heights[t.id] ?? 0) + GAP;
  });

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      // Android clips touches and accessibility to the parent's bounds, so the
      // box runs to the bottom of the screen; box-none lets touches through it.
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 16,
        right: 16,
        bottom: 0,
      }}
    >
      {toasts.map((t) => {
        const slot = layout.get(t.id);
        return (
          <ToastItem
            key={t.id}
            toast={t}
            index={slot?.index ?? 0}
            offset={slot?.offset ?? 0}
            expanded={expanded}
            frontHeight={frontHeight}
            onHeight={(h) =>
              setHeights((prev) => {
                if (prev[t.id] === h) return prev;
                // Drop heights of toasts that are gone while we're here.
                const next: Record<string, number> = { [t.id]: h };
                for (const other of useToastStore.getState().toasts) {
                  if (other.id !== t.id && prev[other.id] !== undefined)
                    next[other.id] = prev[other.id];
                }
                return next;
              })
            }
            onToggle={() => setExpanded((e) => !e)}
            onRemoved={() => removeToast(t.id, t.version)}
          />
        );
      })}
    </View>
  );
}

function ToastItem({
  toast,
  index,
  offset,
  expanded,
  frontHeight,
  onHeight,
  onToggle,
  onRemoved,
}: {
  toast: ToastData;
  index: number;
  offset: number;
  expanded: boolean;
  frontHeight: number;
  onHeight: (h: number) => void;
  onToggle: () => void;
  onRemoved: () => void;
}) {
  const { width } = useWindowDimensions();
  const [ownHeight, setOwnHeight] = useState(0);
  const behind = !expanded && index > 0;

  const enter = useSharedValue(0);
  const y = useSharedValue(offset);
  const scale = useSharedValue(1);
  const height = useSharedValue(0);
  const content = useSharedValue(1);
  const fade = useSharedValue(1);
  const swipe = useSharedValue(0);

  // Follow the slot the stack gives us.
  useEffect(() => {
    y.set(withSpring(offset, SPRING));
    scale.set(withSpring(behind ? 1 - index * 0.05 : 1, SPRING));
    content.set(withTiming(behind ? 0 : 1, { duration: 180 }));
    fade.set(withTiming(index >= VISIBLE ? 0 : 1, { duration: 180 }));
  }, [offset, index, behind, y, scale, content, fade]);

  // Stacked toasts take the front toast's height so the peeking edges line up.
  useEffect(() => {
    const target = behind && frontHeight > 0 ? frontHeight : ownHeight;
    if (target > 0)
      height.set(height.get() === 0 ? target : withSpring(target, SPRING));
  }, [behind, frontHeight, ownHeight, height]);

  // Enter on mount, exit when dismissed, and re-enter if re-shown mid-exit.
  useEffect(() => {
    if (!toast.closing) {
      swipe.set(withSpring(0, SPRING));
      enter.set(withSpring(1, SPRING));
      return;
    }
    enter.set(
      withTiming(
        0,
        { duration: 200, easing: Easing.in(Easing.quad) },
        (done) => {
          if (done) scheduleOnRN(onRemoved);
        },
      ),
    );
    // onRemoved is a fresh closure every render; the exit should only start once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.closing, enter, swipe]);

  // Feedback that matches the status, once per show/update.
  useEffect(() => {
    feedback(toast.type);
  }, [toast.type, toast.version]);

  // Auto-close. Fanned-out stacks pause, so you can read them.
  const remaining = useRef(toast.duration);
  const seenVersion = useRef(toast.version);
  useEffect(() => {
    if (seenVersion.current !== toast.version) {
      seenVersion.current = toast.version;
      remaining.current = toast.duration;
    }
    if (expanded || toast.closing || !Number.isFinite(remaining.current))
      return;
    const started = Date.now();
    const timer = setTimeout(
      () => dismissToast(toast.id),
      Math.max(0, remaining.current),
    );
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [expanded, toast.closing, toast.version, toast.duration, toast.id]);

  const pan = usePanGesture({
    activeOffsetX: [-12, 12],
    failOffsetY: [-14, 14],
    enabled: toast.dismissible && !toast.closing,
    onUpdate: (e) => {
      "worklet";
      swipe.set(e.translationX);
    },
    onDeactivate: (e) => {
      "worklet";
      const out =
        Math.abs(swipe.get()) > width * 0.35 || Math.abs(e.velocityX) > FLICK;
      if (!out) {
        swipe.set(withSpring(0, SPRING));
        return;
      }
      const dir = Math.sign(swipe.get() || e.velocityX);
      swipe.set(
        withTiming(dir * width, { duration: 180 }, (done) => {
          if (done) scheduleOnRN(onRemoved);
        }),
      );
    },
  });
  const tap = useTapGesture({
    onActivate: () => {
      "worklet";
      scheduleOnRN(onToggle);
    },
  });
  const gesture = useCompetingGestures(pan, tap);

  // The slot position lives on a wrapper *outside* the GestureDetector: its
  // native view stays where the child was laid out, and Android clips touches
  // and accessibility to it, so a toast translated out of it can't be swiped.
  const slot = useAnimatedStyle(() => ({
    opacity: enter.value * fade.value,
    transform: [{ translateY: y.value - (1 - enter.value) * (frontHeight + 24) }],
  }));
  const card = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, Math.abs(swipe.value) / (width * 0.6)),
    height: height.value > 0 ? height.value : undefined,
    transform: [
      { translateX: swipe.value },
      { scale: scale.value * (0.9 + 0.1 * enter.value) },
    ],
  }));
  const inner = useAnimatedStyle(() => ({ opacity: content.value }));

  return (
    <Animated.View
      className="absolute left-0 right-0 top-0"
      style={[{ zIndex: 100 - index }, slot]}
      pointerEvents="box-none"
    >
    <GestureDetector gesture={gesture}>
      <Animated.View
        testID="toast"
        className="bg-card rounded-tile overflow-hidden"
        style={[cardShadow, card]}
      >
        <Animated.View
          style={inner}
          onLayout={(e) => {
            const h = Math.round(e.nativeEvent.layout.height);
            setOwnHeight(h);
            onHeight(h);
          }}
        >
          <View className="flex-row items-center px-3.5 py-3">
            {toast.type !== "default" && (
              <StatusIcon key={toast.type} type={toast.type} />
            )}
            <View className="flex-1 mr-2">
              <AppText weight="strong" className="text-sm" numberOfLines={2}>
                {toast.title}
              </AppText>
              {toast.description ? (
                <AppText
                  tone="muted"
                  className="text-xs mt-0.5"
                  numberOfLines={3}
                >
                  {toast.description}
                </AppText>
              ) : null}
            </View>
            {toast.action && (
              <Tap
                testID="toast-action"
                haptics="tick"
                className="bg-primary rounded-full px-3 py-1.5"
                onPress={() => {
                  toast.action?.onPress();
                  dismissToast(toast.id);
                }}
              >
                <AppText weight="strong" tone="white" className="text-xs">
                  {toast.action.label}
                </AppText>
              </Tap>
            )}
            {toast.dismissible && (
              <Tap
                testID="toast-close"
                haptics="tick"
                hitSlop={10}
                accessibilityLabel="Dismiss"
                className="w-6 h-6 rounded-full bg-line items-center justify-center ml-2"
                onPress={() => dismissToast(toast.id)}
              >
                <Feather name="x" size={13} color={colors.ink.soft} />
              </Tap>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
    </Animated.View>
  );
}

const STATUS: Record<
  Exclude<ToastType, "default" | "loading">,
  { icon: React.ComponentProps<typeof Feather>["name"]; bg: string; fg: string }
> = {
  success: { icon: "check", bg: colors.primary.DEFAULT, fg: "#FFFFFF" },
  error: { icon: "x", bg: colors.danger.DEFAULT, fg: "#FFFFFF" },
  warning: { icon: "alert-triangle", bg: colors.sun, fg: colors.ink.DEFAULT },
  info: { icon: "info", bg: colors.sky.DEFAULT, fg: "#FFFFFF" },
};

/** Pops in with a spring; keyed by type, so a loading toast morphs into ✓/✕ in place. */
function StatusIcon({ type }: { type: ToastType }) {
  if (type === "loading") return <Spinner />;
  if (type === "default") return null;
  const s = STATUS[type];
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(12).stiffness(260)}
      className="w-7 h-7 rounded-full items-center justify-center mr-3"
      style={{ backgroundColor: s.bg }}
    >
      <Feather name={s.icon} size={15} color={s.fg} />
    </Animated.View>
  );
}

function Spinner() {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.set(
      withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1),
    );
    return () => cancelAnimation(turn);
  }, [turn]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 360}deg` }],
  }));
  return (
    <View className="w-7 h-7 rounded-full items-center justify-center mr-3 bg-primary-soft">
      <Animated.View style={style}>
        <Feather name="loader" size={15} color={colors.primary.dark} />
      </Animated.View>
    </View>
  );
}

function feedback(type: ToastType) {
  if (type === "success") haptic.success();
  else if (type === "error" || type === "warning") haptic.warning();
  else if (type !== "loading") haptic.light();
}
