import type { CatalogProduct } from '@/types/catalog.types';

export type Mode = 'earrings' | 'necklace' | 'ring' | 'bracelet';

export const modes: readonly { id: Mode; title: string; guidance: string }[] = [
  { id: 'earrings', title: 'Earrings', guidance: 'Center your face and keep your ears visible' },
  { id: 'necklace', title: 'Chains & Necklaces', guidance: 'Show both shoulders and your neck' },
  { id: 'ring', title: 'Rings', guidance: 'Show the back of your hand and your ring finger' },
  { id: 'bracelet', title: 'Bracelets', guidance: 'Keep your wrist and knuckles in view as you turn your hand' },
];

// Matches the native PNG and calibration registry. Name and image checks keep
// the overlay tied to its exact product if a different database reuses the ID.
const overlays: Record<number, { mode: Mode; name: string; imageFile: string }> = {
  78: { mode: 'earrings', name: 'Diamond Earrings 01', imageFile: 'jewelry_PNG6823.png' },
  70: { mode: 'necklace', name: 'Necklace 05', imageFile: 'necklace_PNG45.png' },
  90: { mode: 'ring', name: 'Gold Ring 04', imageFile: 'jewelry_PNG6817.png' },
};

export function supportsTryOn(product: CatalogProduct, mode: Mode) {
  const overlay = overlays[product.id];
  return overlay?.mode === mode && overlay.name === product.name &&
    product.image_url.split(/[?#]/)[0].endsWith('/' + overlay.imageFile) &&
    product.is_active !== false;
}

// This standalone model has no ShopAPI product ID.
export const bracelet = {
  id: -1,
  name: 'Gold oval bracelet',
  thumbnail: require('../../assets/try-on/gold-oval-bracelet.png'),
};
