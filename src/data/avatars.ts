/**
 * The player portraits to choose from (onboarding name step, Profile → name).
 * Ids are stored, so never rename one; add new ids at the end. The drawings
 * live in `components/ui/illustrations.tsx` (`Avatar`).
 */
export const AVATARS = [
  { id: 'sprout', label: 'Short dark hair, green shirt' },
  { id: 'sunny', label: 'Long brown hair, orange shirt' },
  { id: 'curly', label: 'Curly black hair, blue shirt' },
  { id: 'bun', label: 'Red hair in a bun, pink shirt' },
  { id: 'cap', label: 'Orange cap, navy shirt' },
] as const;

export type AvatarId = (typeof AVATARS)[number]['id'];

/** The original portrait, so players from before the picker keep their look. */
export const DEFAULT_AVATAR: AvatarId = 'sprout';

export const isAvatarId = (v: unknown): v is AvatarId => AVATARS.some((a) => a.id === v);
