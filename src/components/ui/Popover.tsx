import React, { useEffect } from 'react';
import { BackHandler, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeOut, Keyframe, ReduceMotion } from 'react-native-reanimated';

import { cardShadow } from '../../theme/tokens';

const CARET = 14;

// A small lift and fade from the trigger's side: calm, no overshoot.
const POP_IN = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 6 }, { scale: 0.96 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: Easing.out(Easing.cubic) },
})
  .duration(180)
  .reduceMotion(ReduceMotion.System);
const POP_OUT = FadeOut.duration(110);

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /**
   * Where the panel sits, in the parent's coordinates (the parent should be the
   * screen's root view, so the panel and its backdrop are inside its bounds:
   * Android doesn't deliver touches to children drawn outside their parent).
   */
  style: ViewStyle;
  /** Distance from the panel's left edge to the caret's centre: the trigger's centre. */
  caretX: number;
  children: React.ReactNode;
  testID?: string;
}

/**
 * A white tooltip panel above its trigger, with a caret pointing down at it.
 * Any touch outside (or Android back) closes it; the content is for reading,
 * so the panel itself has no controls.
 */
export function Popover({ open, onClose, style, caretX, children, testID }: PopoverProps) {
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      {/* Catches the first touch anywhere else on screen and closes the popover. */}
      <View style={StyleSheet.absoluteFill} onTouchStart={onClose} testID={testID ? `${testID}-backdrop` : undefined} />
      <Animated.View
        entering={POP_IN}
        exiting={POP_OUT}
        testID={testID}
        style={[{ position: 'absolute', transformOrigin: `${caretX}px 100%` }, style]}
        onTouchStart={onClose}
      >
        <View className="bg-card rounded-tile p-4" style={cardShadow}>
          {children}
        </View>
        {/* Caret: a turned square tucked under the panel's bottom edge. */}
        <View
          className="bg-card"
          style={{
            position: 'absolute',
            bottom: -CARET / 2 + 1,
            left: caretX - CARET / 2,
            width: CARET,
            height: CARET,
            borderBottomRightRadius: 3,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </Animated.View>
    </>
  );
}
