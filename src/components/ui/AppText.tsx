import React from 'react';
import { Text, type TextProps } from 'react-native';

const WEIGHT = {
  body: 'font-body',
  semi: 'font-semi',
  strong: 'font-strong',
  heavy: 'font-heavy',
} as const;

const TONE = {
  ink: 'text-ink',
  soft: 'text-ink-soft',
  muted: 'text-muted',
  white: 'text-white',
  primary: 'text-primary-dark',
  accent: 'text-accent',
} as const;

export interface AppTextProps extends TextProps {
  weight?: keyof typeof WEIGHT;
  tone?: keyof typeof TONE;
  /** Sizing, spacing and alignment classes. Weight and colour go through the props above. */
  className?: string;
}

/**
 * The only text component screens should use. Weight and colour are props
 * rather than classes because React Native needs a separate font family per
 * weight, and two colour classes on one element have no reliable winner.
 */
export function AppText({ weight = 'body', tone = 'ink', className = '', ...rest }: AppTextProps) {
  return <Text {...rest} className={`${WEIGHT[weight]} ${TONE[tone]} ${className}`} />;
}
