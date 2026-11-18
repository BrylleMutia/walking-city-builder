import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { AvatarId } from '../../data/avatars';
import { DEFAULT_NAME, NAME_MAX, cleanDisplayName } from '../../state/gameLogic';
import { useGameStore } from '../../state/useGameStore';
import { cardShadow, colors, fonts } from '../../theme/tokens';
import { AppText } from '../ui/AppText';
import { Avatar } from '../ui/illustrations';
import { Card, PillButton } from '../ui/kit';
import { AvatarPicker } from './AvatarPicker';
import { SetupScreen } from './SetupScreen';

/**
 * "What should we call you?" plus a choice of five portraits. Used as an
 * onboarding step and, with mode="edit", from Profile. Shows a live preview of
 * the Home greeting so the player sees where both appear.
 */
export function NameStep({ mode, onDone }: { mode: 'onboarding' | 'edit'; onDone: () => void }) {
  const current = useGameStore((s) => s.displayName);
  const setDisplayName = useGameStore((s) => s.setDisplayName);
  const setAvatar = useGameStore((s) => s.setAvatar);
  const [avatar, setLocalAvatar] = useState<AvatarId>(() => useGameStore.getState().avatarId);
  // A fresh player starts with an empty field (the default name as the hint).
  const [text, setText] = useState(() => (mode === 'edit' || current !== DEFAULT_NAME ? current : ''));
  const [focused, setFocused] = useState(false);
  const name = cleanDisplayName(text);

  const focus = useSharedValue(0);
  useEffect(() => {
    focus.set(withTiming(focused ? 1 : 0, { duration: 160 }));
  }, [focused, focus]);
  const fieldStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.card, colors.primary.DEFAULT]),
  }));

  const save = () => {
    if (!name || !setDisplayName(name)) return;
    setAvatar(avatar);
    onDone();
  };

  return (
    <SetupScreen
      scene="name"
      title={mode === 'edit' ? 'Your name & look' : 'What should we call you?'}
      body={
        mode === 'edit'
          ? 'This is how the app greets you.'
          : 'Pick a look and a name. You can change both anytime in Profile.'
      }
      backIcon={mode === 'edit' ? 'x' : 'arrow-left'}
      testID="name-step"
      footer={<PillButton label={mode === 'edit' ? 'Save' : 'Continue'} onPress={save} disabled={!name} testID="name-continue" />}
    >
      <AvatarPicker value={avatar} onChange={setLocalAvatar} horizontalPadding={28} />

      <Animated.View
        className="flex-row items-center bg-card rounded-tile pl-4 pr-4 mt-5"
        style={[cardShadow, { height: 56, borderWidth: 2 }, fieldStyle]}
      >
        <Feather name="user" size={17} color={focused ? colors.primary.dark : colors.muted} />
        <TextInput
          testID="name-input"
          value={text}
          onChangeText={setText}
          placeholder={DEFAULT_NAME}
          placeholderTextColor={colors.muted}
          maxLength={NAME_MAX}
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="nickname"
          textContentType="nickname"
          returnKeyType="done"
          onSubmitEditing={save}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, marginLeft: 10, fontFamily: fonts.semi, fontSize: 16, color: colors.ink.DEFAULT }}
        />
        <AppText tone="muted" className="text-xs">
          {[...text].length}/{NAME_MAX}
        </AppText>
      </Animated.View>

      {/* Live preview of where the name shows up. */}
      <Card className="mt-4 p-4 flex-row items-center">
        <View className="rounded-full overflow-hidden">
          <Avatar size={44} variant={avatar} />
        </View>
        <View className="ml-3 flex-1">
          <AppText tone="muted" className="text-xs">
            Welcome back 👋
          </AppText>
          <AppText weight="heavy" className="text-lg" numberOfLines={1} testID="name-preview">
            {name ?? DEFAULT_NAME}
          </AppText>
        </View>
      </Card>
    </SetupScreen>
  );
}
