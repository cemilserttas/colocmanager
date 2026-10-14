export const PRODUCT_ICONS = {
  toilet_paper: '🧻',
  sponge: '🧽',
  soap: '🧴',
  broom: '🧹',
  hand_soap: '🧼',
  bucket: '🪣',
  spray: '🧴',
  trash_bag: '🗑️',
  detergent: '🫧',
  towel: '🧻',
} as const;

export const CLEANING_ICONS = {
  bathroom: '🚿',
  kitchen: '🍳',
  living_room: '🛋️',
  bedroom: '🛏️',
  hallway: '🚪',
  trash: '🗑️',
  laundry: '👕',
  windows: '🪟',
  floors: '🧹',
  general: '🏠',
} as const;

export type ProductIconKey = keyof typeof PRODUCT_ICONS;
export type CleaningIconKey = keyof typeof CLEANING_ICONS;
export type IconCategory = 'product' | 'cleaning';

/**
 * Returns the emoji icon for a specified category and icon identifier.
 * Provides fallback emojis when an icon name is not found.
 *
 * @param category - Category of icon ('product' | 'cleaning')
 * @param name - The icon key/name identifier
 * @returns The matching emoji string
 */
export function getIcon(category: IconCategory | string, name: string): string {
  if (category === 'product') {
    return (PRODUCT_ICONS as Record<string, string>)[name] ?? '📦';
  }
  if (category === 'cleaning') {
    return (CLEANING_ICONS as Record<string, string>)[name] ?? '🧹';
  }
  return '🏠';
}
