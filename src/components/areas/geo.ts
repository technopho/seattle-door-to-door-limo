// Approximate Puget Sound water bodies (lat, lng) for the static city route maps.
// Same abstracted shorelines as the home-page 3D map (src/scripts/area-map.ts), copied here so the
// service-area pages never pull three.js into the build. Geographically sane, not survey-grade.
export type LatLng = [number, number];

export const PUGET: LatLng[] = [
  [48.25, -122.3], [48.06, -122.28], [48.01, -122.225], [47.985, -122.225], [47.965, -122.255],
  [47.948, -122.305], [47.9, -122.33], [47.855, -122.35], [47.81, -122.385], [47.77, -122.385],
  [47.73, -122.375], [47.69, -122.405], [47.665, -122.415], [47.66, -122.435], [47.64, -122.415],
  [47.632, -122.385], [47.618, -122.358], [47.603, -122.343], [47.588, -122.352], [47.59, -122.385],
  [47.578, -122.418], [47.55, -122.4], [47.52, -122.396], [47.49, -122.37], [47.46, -122.355],
  [47.4, -122.33], [47.35, -122.33], [47.31, -122.385], [47.29, -122.415], [47.27, -122.41],
  [47.258, -122.428], [47.262, -122.445], [47.275, -122.475], [47.305, -122.52], [47.285, -122.55],
  [47.24, -122.56], [47.15, -122.62],
  [47.15, -122.66], [47.27, -122.575], [47.33, -122.585], [47.4, -122.545], [47.47, -122.535],
  [47.51, -122.5], [47.555, -122.545], [47.585, -122.53], [47.6, -122.5], [47.64, -122.495],
  [47.68, -122.5], [47.71, -122.51], [47.75, -122.51], [47.8, -122.495], [47.86, -122.52],
  [47.91, -122.53], [47.92, -122.44], [47.905, -122.385], [47.95, -122.37], [48.0, -122.39],
  [48.04, -122.41], [48.1, -122.45], [48.25, -122.5],
];
export const VASHON: LatLng[] = [
  [47.51, -122.465], [47.49, -122.44], [47.44, -122.435], [47.415, -122.43], [47.405, -122.385],
  [47.39, -122.375], [47.365, -122.4], [47.35, -122.43], [47.33, -122.48], [47.35, -122.515],
  [47.4, -122.52], [47.45, -122.515], [47.5, -122.5],
];
export const LAKE_WA: LatLng[] = [
  [47.758, -122.258], [47.752, -122.275], [47.725, -122.282], [47.7, -122.275], [47.68, -122.258],
  [47.668, -122.27], [47.655, -122.285], [47.64, -122.28], [47.625, -122.282], [47.605, -122.288],
  [47.585, -122.282], [47.565, -122.27], [47.552, -122.258], [47.535, -122.265], [47.515, -122.25],
  [47.5, -122.225], [47.497, -122.205], [47.51, -122.198], [47.54, -122.203], [47.57, -122.198],
  [47.595, -122.205], [47.61, -122.208], [47.63, -122.218], [47.645, -122.212], [47.665, -122.212],
  [47.685, -122.215], [47.71, -122.228], [47.735, -122.245], [47.752, -122.25],
];
export const MERCER: LatLng[] = [
  [47.592, -122.232], [47.585, -122.215], [47.56, -122.212], [47.53, -122.218], [47.522, -122.232],
  [47.54, -122.245], [47.57, -122.248], [47.588, -122.245],
];
export const SAMMAMISH: LatLng[] = [
  [47.66, -122.108], [47.645, -122.093], [47.615, -122.083], [47.585, -122.07], [47.56, -122.058],
  [47.553, -122.07], [47.575, -122.09], [47.605, -122.1], [47.635, -122.112], [47.652, -122.118],
];

/**
 * Water-body labels, each with candidate anchors (all in open water) tried in order; the map uses
 * the first one that sits comfortably inside its frame and clear of the pins. `v` = vertical text,
 * following the long north-south axis of the Sound and the lake.
 */
export const WATER_LABELS: { name: string; v?: boolean; at: LatLng[] }[] = [
  { name: 'Puget Sound', v: true, at: [[47.75, -122.445], [47.56, -122.44], [47.45, -122.395], [47.4, -122.533]] },
  { name: 'Lake Washington', v: true, at: [[47.66, -122.25], [47.6, -122.27], [47.7, -122.255]] },
  { name: 'Commencement Bay', at: [[47.292, -122.455]] },
];

/** Water rings, drawn with fill-rule evenodd so the islands punch out of their water body. */
export const WATER: LatLng[][] = [PUGET, VASHON, LAKE_WA, MERCER, SAMMAMISH];

/** Flat km projection around the region (good enough at this scale). y grows southward. */
const KM = 111.2;
const COS = Math.cos((47.6 * Math.PI) / 180);
export const toKm = (lat: number, lng: number) => ({ x: lng * COS * KM, y: -lat * KM });
/** Kilometres per degree, for drawing a graticule in the same space. */
export const KM_PER_DEG = { lat: KM, lng: COS * KM };
