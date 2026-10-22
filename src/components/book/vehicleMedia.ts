// Booking-only vehicle photography: how each fleet photo is framed on the step 2 cards and in the
// "Your journey" thumbnail. Shared by src/pages/book/index.astro (cards) and src/scripts/booking.ts
// (summary thumbnail) so both always show the same frame.
//
// PLACEHOLDER photography: several shared photos in src/data/site.ts don't show the vehicle named beside
// them (the stretch is a sedan, the party coach a plain daytime van). Replace them in site.ts when the
// client supplies real fleet photos; the overrides below only frame what we have.
import { fleet, images } from '../../data/site';

type Vehicle = (typeof fleet)[number];

export type VehicleMedia = {
  src: string;
  /** Intrinsic size of the source photo (sets the img width/height attributes). */
  width: number;
  height: number;
  alt: string;
  /**
   * Editorial crop: x = left edge of the window and w = its width (fractions of the source width);
   * b = how much of the source height is cut from the bottom (the window's bottom edge sits at 1 - b).
   * Used where object-position alone would leave something unwanted in frame.
   */
  crop?: { x: number; w: number; b?: number };
  /** object-position for ordinary cover crops. */
  position?: string;
  /** Daylight stock shot: graded down so it sits with the studio photography (same grade as /fleet/). */
  grade?: boolean;
  /** White-background studio shot, multiplied onto an ivory backdrop. */
  studio?: boolean;
};

const overrides: Partial<Record<string, Partial<VehicleMedia>>> = {
  // The S550 source is a wide 2000×990 frame of a chauffeur drinking from a bottle (he stands right of
  // x ≈ 39%, his raised arm above y ≈ 32%). The window is the left 38% of the photo, its bottom edge at 91%
  // of the height: the open front door and cream leather cabin, with no person in frame at any card
  // (16:9.5, 2:1) or thumbnail (3:2) aspect ratio.
  s550: {
    width: 2000,
    height: 990,
    crop: { x: 0, w: 0.38, b: 0.09 },
    grade: true,
    alt: 'Black Mercedes-Benz S550 with its front door open to a cream leather cabin',
  },
  escalade: { position: '50% 62%', alt: 'Black Cadillac Escalade luxury SUV' },
  electric: { position: '72% 55%', alt: 'Dark electric luxury sedan under low studio light' },
  stretch: { position: '50% 58%', alt: 'Black luxury car in silhouette under a single studio light' },
  'party-sprinter': { position: '40% 60%', grade: true, alt: 'White Mercedes-Benz Sprinter with its sliding door open, ready for guests' },
};

export function vehicleMedia(v: Vehicle): VehicleMedia {
  const o = overrides[v.id] ?? {};
  return {
    src: v.image,
    width: 640,
    height: 400,
    alt: `${v.name}, ${v.category.toLowerCase()}`,
    studio: v.image === images.sprinterStudio,
    ...o,
  };
}

/** Inline custom properties for a crop window (consumed by .bk-crop in the booking styles). */
export const cropStyle = (m: VehicleMedia) => (m.crop ? `--cx:${m.crop.x};--cw:${m.crop.w};--cb:${m.crop.b ?? 0}` : undefined);
