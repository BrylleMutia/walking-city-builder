import { Feather } from '@expo/vector-icons';
import React from 'react';
import { View, type ViewProps } from 'react-native';

import { cardShadow, colors } from '../../theme/tokens';
import { AnimatedCounter } from './AnimatedCounter';
import { AppText } from './AppText';
import { Tap } from './Tap';
import { WoodIcon } from './WoodIcon';

export type FeatherName = React.ComponentProps<typeof Feather>['name'];

/** White rounded surface with the soft green shadow from the reference. */
export function Card({ className = '', style, ...rest }: ViewProps & { className?: string }) {
  return <View {...rest} className={`bg-card rounded-card ${className}`} style={[cardShadow, style]} />;
}

/** White circular icon button (back, bell, search). */
export function IconButton({
  icon,
  onPress,
  dot,
  size = 44,
  accessibilityLabel,
  testID,
}: {
  icon: FeatherName;
  onPress?: () => void;
  /** Small orange notification dot. */
  dot?: boolean;
  size?: number;
  accessibilityLabel?: string;
  testID?: string;
}) {
  return (
    <Tap
      onPress={onPress}
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? icon}
      className="bg-card rounded-full items-center justify-center"
      surfaceStyle={[cardShadow, { width: size, height: size }]}
    >
      <Feather name={icon} size={size * 0.43} color={colors.ink.DEFAULT} />
      {dot && (
        <View
          className="absolute rounded-full bg-accent border-2 border-card"
          style={{ width: 10, height: 10, top: size * 0.24, right: size * 0.26 }}
        />
      )}
    </Tap>
  );
}

/**
 * The big call-to-action ("Book Now" in the reference). One `primary` per
 * screen; a second action next to it uses `outline` so the two never compete.
 */
export function PillButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  icon,
  price,
  style,
  testID,
}: {
  testID?: string;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'accent' | 'soft' | 'outline';
  icon?: FeatherName;
  /** Wood cost shown after the label ("Buy pack · 🪵 200"), so the price is visible at the tap. */
  price?: number;
  style?: ViewProps['style'];
}) {
  const bg = disabled
    ? 'bg-line'
    : variant === 'accent'
      ? 'bg-accent'
      : variant === 'soft'
        ? 'bg-primary-soft'
        : variant === 'outline'
          ? 'bg-card border-2 border-primary'
          : 'bg-primary';
  const light = variant === 'soft' || variant === 'outline';
  const tone = disabled ? 'muted' : light ? 'primary' : 'white';
  const iconColor = disabled ? colors.muted : light ? colors.primary.dark : '#FFFFFF';
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      haptics="medium"
      style={style}
      testID={testID}
      accessibilityLabel={price === undefined ? undefined : `${label}, ${formatNumber(price)} Wood`}
      className={`h-14 px-6 rounded-tile flex-row items-center justify-center ${bg}`}
    >
      {icon && <Feather name={icon} size={18} color={iconColor} style={{ marginRight: 8 }} />}
      <AppText weight="strong" tone={tone} className="text-base">
        {label}
      </AppText>
      {price !== undefined && (
        <>
          <AppText weight="strong" tone={tone} className="text-base mx-2">
            ·
          </AppText>
          <View className="w-6 h-6 rounded-full bg-accent-soft items-center justify-center mr-1.5">
            <WoodIcon size={20} />
          </View>
          <AppText weight="strong" tone={tone} className="text-base">
            {formatNumber(price)}
          </AppText>
        </>
      )}
    </Tap>
  );
}

/** A low-emphasis action under a screen's main button ("Skip for now"). Same height as PillButton. */
export function TextButton({ label, onPress, testID }: { label: string; onPress?: () => void; testID?: string }) {
  return (
    <Tap onPress={onPress} haptics="tick" testID={testID} className="h-14 items-center justify-center">
      <AppText weight="strong" tone="soft" className="text-base">
        {label}
      </AppText>
    </Tap>
  );
}

/** Square companion button next to a PillButton (the bookmark in the reference). */
export function SquareButton({
  icon,
  onPress,
  active,
  accessibilityLabel,
  testID,
}: {
  icon: FeatherName;
  onPress?: () => void;
  active?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}) {
  return (
    <Tap
      onPress={onPress}
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? icon}
      className={`w-14 h-14 rounded-tile items-center justify-center ${active ? 'bg-primary-dark' : 'bg-primary'}`}
    >
      <Feather name={icon} size={20} color="#FFFFFF" />
    </Tap>
  );
}

/** Small orange round arrow button. */
export function ArrowButton({
  onPress,
  icon = 'arrow-right',
  testID,
}: {
  onPress?: () => void;
  icon?: FeatherName;
  testID?: string;
}) {
  return (
    <Tap
      onPress={onPress}
      testID={testID}
      accessibilityLabel="Open"
      className="w-11 h-11 rounded-full bg-accent items-center justify-center"
      surfaceStyle={{
        shadowColor: colors.accent.DEFAULT,
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      <Feather name={icon} size={20} color="#FFFFFF" />
    </Tap>
  );
}

/** "Popular Now ····· View All" */
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between mb-4">
      <AppText weight="heavy" className="text-xl">
        {title}
      </AppText>
      {action && (
        <Tap onPress={onAction} haptics="tick" hitSlop={10}>
          <AppText weight="semi" tone="muted" className="text-sm">
            {action}
          </AppText>
        </Tap>
      )}
    </View>
  );
}

/** The orange price badge that overlaps card corners. */
export function PriceTag({ label, sub, wood }: { label: string; sub?: string; wood?: boolean }) {
  return (
    <View className="items-center">
      <View
        className="bg-accent rounded-chip px-3 py-2 border-[3px] border-card"
        style={{
          shadowColor: colors.accent.DEFAULT,
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }}
      >
        <AppText weight="heavy" tone="white" className="text-base">
          {label}
        </AppText>
      </View>
      {sub && (
        <View className="flex-row items-center mt-1">
          {/* `wood` marks the price as Wood, the same coin as the balance pill. */}
          {wood && <WoodIcon size={14} style={{ marginRight: 3 }} />}
          <AppText tone="muted" className="text-xs">
            {sub}
          </AppText>
        </View>
      )}
    </View>
  );
}

/** Location-pin + rating style meta row ("📍 Greenland ☆ 4,8"). */
export function Meta({ icon, label, color }: { icon: FeatherName; label: string; color?: string }) {
  return (
    <View className="flex-row items-center">
      <Feather name={icon} size={13} color={color ?? colors.accent.DEFAULT} />
      <AppText tone="muted" className="text-xs ml-1">
        {label}
      </AppText>
    </View>
  );
}

/** Spendable Wood balance. */
export function WoodPill({ balance, compact }: { balance: number; compact?: boolean }) {
  return (
    <View
      className={`flex-row items-center bg-card rounded-full ${compact ? 'px-3 py-1.5' : 'px-4 py-2'}`}
      style={cardShadow}
    >
      <View className="w-6 h-6 rounded-full bg-accent-soft items-center justify-center mr-1.5">
        <WoodIcon size={20} />
      </View>
      {/* Rolls on every change, so spending and earning Wood are felt, not just shown. */}
      <AnimatedCounter value={balance} size={compact ? 14 : 16} testID="wood-balance" />
    </View>
  );
}

export function StatTile({
  icon,
  value,
  label,
  tint,
}: {
  icon: FeatherName;
  value: string;
  label: string;
  tint: 'primary' | 'accent' | 'sky';
}) {
  const bg = tint === 'primary' ? 'bg-primary-soft' : tint === 'accent' ? 'bg-accent-soft' : 'bg-sky-soft';
  const color =
    tint === 'primary' ? colors.primary.dark : tint === 'accent' ? colors.accent.DEFAULT : '#2F8FCF';
  return (
    <Card className="flex-1 p-3.5 rounded-tile">
      <View className={`w-9 h-9 rounded-full items-center justify-center ${bg}`}>
        <Feather name={icon} size={17} color={color} />
      </View>
      <AppText weight="heavy" className="text-lg mt-2.5">
        {value}
      </AppText>
      <AppText tone="muted" className="text-xs">
        {label}
      </AppText>
    </Card>
  );
}

export const formatNumber = (n: number) => Math.round(n).toLocaleString('en-US');
