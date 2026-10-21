// Interactive 3D service-area map for the home page (#areas).
// Dot-matrix Puget Sound, glowing city pins, animated routes from the SeaTac hub,
// HTML labels projected from 3D every frame. Lazy-loaded by AreasMap.astro.
import * as THREE from 'three';
import { areas, hub } from '../data/site';

// `still` = the city was picked on the map itself: keep the camera put so the label stays under the pointer.
export type AreaMapHandle = { setActive(i: number | null, still?: boolean): void };

type LatLng = [number, number];

/* ------------------------------------------------------------------------
   Projection: equirectangular around the region centre, then a gentle radial
   compression so the Seattle/Eastside cluster breathes while Tacoma and
   Everett still fit in frame.
   ------------------------------------------------------------------------ */
const LAT0 = 47.62;
const LNG0 = -122.28;
const KZ = 22;
const KX = Math.cos((LAT0 * Math.PI) / 180) * KZ * 1.22;
const R0 = 4;
const GAMMA = 0.78;

export function project(lat: number, lng: number): [number, number] {
  let x = (lng - LNG0) * KX;
  let z = -(lat - LAT0) * KZ;
  const r = Math.hypot(x, z);
  if (r > 1e-6) {
    const k = (R0 * Math.pow(r / R0, GAMMA)) / r;
    x *= k;
    z *= k;
  }
  return [x, z];
}

function unproject(x: number, z: number): LatLng {
  const r = Math.hypot(x, z);
  if (r > 1e-6) {
    const k = (R0 * Math.pow(r / R0, 1 / GAMMA)) / r;
    x *= k;
    z *= k;
  }
  return [LAT0 - z / KZ, LNG0 + x / KX];
}

/* ------------------------------------------------------------------------
   Approximate water bodies (lat, lng). Abstracted, but geographically sane.
   ------------------------------------------------------------------------ */
const PUGET: LatLng[] = [
  [48.25, -122.3], [48.06, -122.28], [48.01, -122.225], [47.985, -122.225], [47.965, -122.255],
  [47.948, -122.305], [47.9, -122.33], [47.855, -122.35], [47.81, -122.385], [47.77, -122.385],
  [47.73, -122.375], [47.69, -122.405], [47.665, -122.415], [47.66, -122.435], [47.64, -122.415],
  [47.632, -122.385], [47.618, -122.358], [47.603, -122.343], [47.588, -122.352], [47.59, -122.385],
  [47.578, -122.418], [47.55, -122.4], [47.52, -122.396], [47.49, -122.37], [47.46, -122.355],
  [47.4, -122.33], [47.35, -122.33], [47.31, -122.385], [47.29, -122.415], [47.27, -122.41],
  [47.258, -122.428], [47.262, -122.445], [47.275, -122.475], [47.305, -122.52], [47.285, -122.55],
  [47.24, -122.56], [47.15, -122.62],
  // west shore (Kitsap / Bainbridge / Whidbey), south → north
  [47.15, -122.66], [47.27, -122.575], [47.33, -122.585], [47.4, -122.545], [47.47, -122.535],
  [47.51, -122.5], [47.555, -122.545], [47.585, -122.53], [47.6, -122.5], [47.64, -122.495],
  [47.68, -122.5], [47.71, -122.51], [47.75, -122.51], [47.8, -122.495], [47.86, -122.52],
  [47.91, -122.53], [47.92, -122.44], [47.905, -122.385], [47.95, -122.37], [48.0, -122.39],
  [48.04, -122.41], [48.1, -122.45], [48.25, -122.5],
];
const VASHON: LatLng[] = [
  [47.51, -122.465], [47.49, -122.44], [47.44, -122.435], [47.415, -122.43], [47.405, -122.385],
  [47.39, -122.375], [47.365, -122.4], [47.35, -122.43], [47.33, -122.48], [47.35, -122.515],
  [47.4, -122.52], [47.45, -122.515], [47.5, -122.5],
];
const LAKE_WA: LatLng[] = [
  [47.758, -122.258], [47.752, -122.275], [47.725, -122.282], [47.7, -122.275], [47.68, -122.258],
  [47.668, -122.27], [47.655, -122.285], [47.64, -122.28], [47.625, -122.282], [47.605, -122.288],
  [47.585, -122.282], [47.565, -122.27], [47.552, -122.258], [47.535, -122.265], [47.515, -122.25],
  [47.5, -122.225], [47.497, -122.205], [47.51, -122.198], [47.54, -122.203], [47.57, -122.198],
  [47.595, -122.205], [47.61, -122.208], [47.63, -122.218], [47.645, -122.212], [47.665, -122.212],
  [47.685, -122.215], [47.71, -122.228], [47.735, -122.245], [47.752, -122.25],
];
const MERCER: LatLng[] = [
  [47.592, -122.232], [47.585, -122.215], [47.56, -122.212], [47.53, -122.218], [47.522, -122.232],
  [47.54, -122.245], [47.57, -122.248], [47.588, -122.245],
];
const SAMMAMISH: LatLng[] = [
  [47.66, -122.108], [47.645, -122.093], [47.615, -122.083], [47.585, -122.07], [47.56, -122.058],
  [47.553, -122.07], [47.575, -122.09], [47.605, -122.1], [47.635, -122.112], [47.652, -122.118],
];

function inPoly(lat: number, lng: number, poly: LatLng[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function isWater(lat: number, lng: number) {
  if (inPoly(lat, lng, PUGET) && !inPoly(lat, lng, VASHON)) return true;
  if (inPoly(lat, lng, LAKE_WA) && !inPoly(lat, lng, MERCER)) return true;
  return inPoly(lat, lng, SAMMAMISH);
}

// Subdivide polygon edges so the curved projection keeps shorelines smooth.
function projectRing(poly: LatLng[], sub = 5): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    for (let s = 0; s < sub; s++) {
      const t = s / sub;
      const [x, z] = project(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
      out.push(new THREE.Vector2(x, z));
    }
  }
  return out;
}

const rgb = (hex: number) => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
const GOLD = 0xc9a86a;
const GOLD_2 = 0xe8d3a2;
const IVORY = 0xf3eee4;

/* Per-city art direction: beam height staggers labels in the dense Eastside cluster. */
const BEAM: Record<string, number> = { Seattle: 1.05, Bellevue: 0.4, Kirkland: 1.65, Redmond: 0.95, Tacoma: 0.85, Everett: 0.9 };

/* Label placement candidates, relative to the beam-top anchor. Cost = overlap area + mode preference. */
type LabelMode = 'top' | 'tr' | 'tl' | 'right' | 'left' | 'top2' | 'top3';
const MODES: LabelMode[] = ['top', 'tr', 'tl', 'right', 'left', 'top2', 'top3'];
const MODE_COST: Record<LabelMode, number> = { top: 0, tr: 70, tl: 70, right: 110, left: 120, top2: 220, top3: 520 };
const LABEL_PREF: Record<string, LabelMode> = { Bellevue: 'right' };
const HYST = 90; // bonus for keeping the current spot, so labels never flicker between candidates
type Box = { l: number; t: number; r: number; b: number };
const overlap = (a: Box, b: Box, pad: number) =>
  Math.max(0, Math.min(a.r, b.r) + pad - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) + pad - Math.max(a.t, b.t));

export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,255,255,0.6)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.14)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ------------------------------------------------------------------------
   Static SVG fallback (no WebGL).
   ------------------------------------------------------------------------ */
export function renderFallback(stage: HTMLElement) {
  stage.classList.add('is-fallback');
  const narrow = stage.clientWidth < 600;
  const pts = areas.map((a) => project(a.lat, a.lng));
  const h = project(hub.lat, hub.lng);
  const all = [...pts, h];
  const minX = Math.min(...all.map((p) => p[0])) - 1.6;
  const maxX = Math.max(...all.map((p) => p[0])) + 1.6;
  const minZ = Math.min(...all.map((p) => p[1])) - 0.9;
  const maxZ = Math.max(...all.map((p) => p[1])) + 1.0;
  const halo = narrow ? 0.34 : 0.28;
  const lx = narrow ? 0.48 : 0.42;
  const ring = (poly: LatLng[]) => 'M' + projectRing(poly, 3).map((v) => `${v.x.toFixed(2)} ${v.y.toFixed(2)}`).join('L') + 'Z';
  const water = [PUGET, VASHON, LAKE_WA, MERCER, SAMMAMISH].map(ring).join(' ');
  const arcs = pts
    .map(([x, z]) => {
      const mx = (x + h[0]) / 2;
      const mz = (z + h[1]) / 2;
      const dx = z - h[1];
      const dz = -(x - h[0]);
      const len = Math.hypot(dx, dz) || 1;
      const bend = 0.18 * Math.hypot(x - h[0], z - h[1]);
      return `<path d="M${h[0]} ${h[1]} Q${mx + (dx / len) * bend} ${mz + (dz / len) * bend} ${x} ${z}" />`;
    })
    .join('');
  const cities = pts
    .map(([x, z], i) => {
      const left = areas[i].city === 'Kirkland' || areas[i].city === 'Seattle';
      return `<g class="am-fb__city" transform="translate(${x} ${z})"><circle r="${halo}" class="am-fb__halo"/><circle r="0.11"/><text x="${left ? -lx : lx}" y="0.16" text-anchor="${left ? 'end' : 'start'}">${areas[i].city}</text></g>`;
    })
    .join('');
  const svg = `<svg class="am-fb${narrow ? ' am-fb--narrow' : ''}" viewBox="${minX} ${minZ} ${maxX - minX} ${maxZ - minZ}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Service area map: SeaTac Airport connected to Seattle, Bellevue, Kirkland, Redmond, Tacoma and Everett">
    <defs><pattern id="am-dots" width="0.16" height="0.16" patternUnits="userSpaceOnUse"><circle cx="0.08" cy="0.08" r="0.022" fill="rgba(243,238,228,0.28)"/></pattern>
    <radialGradient id="am-fade"><stop offset="0.55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
    <mask id="am-mask"><rect x="${minX}" y="${minZ}" width="${maxX - minX}" height="${maxZ - minZ}" fill="url(#am-fade)"/></mask></defs>
    <g mask="url(#am-mask)"><rect x="${minX}" y="${minZ}" width="${maxX - minX}" height="${maxZ - minZ}" fill="url(#am-dots)"/>
    <path class="am-fb__water" fill-rule="evenodd" d="${water}"/></g>
    <g class="am-fb__arcs">${arcs}</g>${cities}
    <g transform="translate(${h[0]} ${h[1]})" class="am-fb__hub"><circle r="0.42" class="am-fb__halo"/><circle r="0.16"/><text x="0.55" y="0.14">SeaTac</text></g>
  </svg>`;
  const mount = stage.querySelector<HTMLElement>('[data-am-canvas]');
  if (mount) mount.innerHTML = svg;
}

/* ------------------------------------------------------------------------
   Shaders
   ------------------------------------------------------------------------ */
const groundVert = /* glsl */ `
  attribute float aWater;
  attribute float aRand;
  uniform float uTime;
  uniform float uReveal;
  uniform float uPR;
  uniform float uDot;
  uniform float uScale;
  uniform vec2 uHub;
  uniform vec2 uCenter;
  uniform vec2 uVig;
  varying float vAlpha;
  varying float vWater;
  varying float vPulse;
  void main() {
    vec3 p = position;
    float dh = length(p.xz - uHub);
    float dc = length(p.xz - uCenter);
    float front = uReveal * 17.0;
    float rev = 1.0 - smoothstep(front - 2.2, front, dh);
    float cycle = fract(uTime * 0.075);
    float wave = cycle * 15.0;
    float pulse = exp(-pow((dh - wave) * 1.4, 2.0)) * (1.0 - cycle) * (1.0 - aWater * 0.6) * 0.75;
    float twinkle = 0.75 + 0.25 * sin(uTime * 1.3 + aRand * 40.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // True perspective size in device px (dot size tracks lattice spacing at any viewport / DPR).
    float px = uDot * uScale * mix(1.0, 0.82, aWater) * (1.0 + pulse * 0.8) / -mv.z;
    gl_PointSize = max(px, 1.0);
    // Fade dots that shrink below ~1 CSS px instead of flooring them: kills horizon streaks / moire at 1x.
    float fade = smoothstep(0.55, 1.25, px / uPR);
    float vig = 1.0 - smoothstep(uVig.x, uVig.y, dc);
    vAlpha = rev * vig * fade * mix(1.0, twinkle, aWater);
    vWater = aWater;
    vPulse = pulse;
  }
`;
const groundFrag = /* glsl */ `
  uniform vec3 uLand;
  uniform vec3 uWaterCol;
  uniform vec3 uGold;
  varying float vAlpha;
  varying float vWater;
  varying float vPulse;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.18, d);
    vec3 col = mix(uLand, uWaterCol, vWater);
    col = mix(col, uGold, clamp(vPulse * 0.85, 0.0, 1.0));
    float base = mix(0.5, 0.3, vWater) + vPulse * 0.5;
    gl_FragColor = vec4(col, a * base * vAlpha);
  }
`;
const flatVert = /* glsl */ `
  uniform vec2 uHub;
  uniform vec2 uCenter;
  uniform vec2 uVig;
  uniform float uReveal;
  varying float vAlpha;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    float dh = length(wp.xz - uHub);
    float dc = length(wp.xz - uCenter);
    float front = uReveal * 17.0;
    vAlpha = (1.0 - smoothstep(front - 2.2, front, dh)) * (1.0 - smoothstep(uVig.x, uVig.y, dc));
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const flatFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() { gl_FragColor = vec4(uColor, uOpacity * vAlpha); }
`;
const arcVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const arcFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uHot;
  uniform float uDraw;
  uniform float uHead;
  uniform float uTrail;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float x = vUv.x;
    if (x > uDraw) discard;
    float d = uHead - x;
    float trail = (d >= 0.0 && d < uTrail) ? pow(1.0 - d / uTrail, 2.2) : 0.0;
    float tip = (1.0 - smoothstep(0.0, 0.05, abs(uDraw - x))) * (1.0 - step(0.999, uDraw));
    float ends = smoothstep(0.0, 0.04, x);
    float hot = clamp(trail + tip, 0.0, 1.0);
    vec3 col = mix(uColor, uHot, hot);
    float a = (0.5 + hot * 1.1) * uOpacity * ends;
    gl_FragColor = vec4(col, a);
  }
`;
const beamVert = /* glsl */ `
  varying float vY;
  void main() { vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const beamFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vY;
  void main() { float a = pow(1.0 - vY, 1.6) * uOpacity; gl_FragColor = vec4(uColor, a); }
`;

/* ------------------------------------------------------------------------
   Scene
   ------------------------------------------------------------------------ */
export function createAreaMap(stage: HTMLElement): AreaMapHandle | null {
  const mount = stage.querySelector<HTMLElement>('[data-am-canvas]');
  if (!mount) return null;
  if (!hasWebGL()) {
    renderFallback(stage);
    return null;
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reduced || !fine) stage.classList.add('no-drag');

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    renderFallback(stage);
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  mount.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

  const hubXZ = project(hub.lat, hub.lng);
  const cityXZ = areas.map((a) => project(a.lat, a.lng));
  const allXZ = [...cityXZ, hubXZ];
  const center = new THREE.Vector2(
    (Math.min(...allXZ.map((p) => p[0])) + Math.max(...allXZ.map((p) => p[0]))) / 2,
    (Math.min(...allXZ.map((p) => p[1])) + Math.max(...allXZ.map((p) => p[1]))) / 2,
  );

  const shared = {
    uTime: { value: 0 },
    uReveal: { value: reduced ? 1 : 0 },
    uHub: { value: new THREE.Vector2(hubXZ[0], hubXZ[1]) },
    uCenter: { value: center },
    uVig: { value: new THREE.Vector2(5.6, 10.6) },
  };

  /* ---- Ground dot matrix ----
     Built lazily in resize(): the lattice step is chosen so dots land ~5px apart on screen
     (coarser on phones / 1x screens), and every dot is jittered to break up moire. */
  const groundMat = new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uPR: { value: renderer.getPixelRatio() },
      uDot: { value: 0.045 },
      uScale: { value: 1000 },
      uLand: { value: rgb(0xd2cab9) },
      uWaterCol: { value: rgb(0x5f8aa6) },
      uGold: { value: rgb(GOLD_2) },
    },
    vertexShader: groundVert,
    fragmentShader: groundFrag,
    transparent: true,
    depthWrite: false,
  });
  const ground = new THREE.Points(new THREE.BufferGeometry(), groundMat);
  ground.renderOrder = 1;
  ground.frustumCulled = false;
  scene.add(ground);
  let groundStep = 0;
  function buildGround(step: number) {
    groundStep = step;
    const SPAN = 24;
    const n = Math.floor(SPAN / step);
    const jit = step * 0.42;
    const pos: number[] = [];
    const wat: number[] = [];
    const rnd: number[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = center.x - SPAN / 2 + i * step + (Math.random() - 0.5) * jit;
        const z = center.y - SPAN / 2 + j * step + (Math.random() - 0.5) * jit;
        if (Math.hypot(x - center.x, z - center.y) > shared.uVig.value.y) continue;
        const [lat, lng] = unproject(x, z);
        pos.push(x, 0, z);
        wat.push(isWater(lat, lng) ? 1 : 0);
        rnd.push(Math.random());
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aWater', new THREE.Float32BufferAttribute(wat, 1));
    g.setAttribute('aRand', new THREE.Float32BufferAttribute(rnd, 1));
    ground.geometry.dispose();
    ground.geometry = g;
    groundMat.uniforms.uDot.value = step * 0.37;
  }

  /* ---- Water fill + shorelines ---- */
  const flatMat = (color: number, opacity: number, blending: THREE.Blending = THREE.NormalBlending) =>
    new THREE.ShaderMaterial({
      uniforms: { ...shared, uColor: { value: rgb(color) }, uOpacity: { value: opacity } },
      vertexShader: flatVert,
      fragmentShader: flatFrag,
      transparent: true,
      depthWrite: false,
      blending,
    });
  {
    const toShape = (poly: LatLng[], holes: LatLng[][] = []) => {
      const s = new THREE.Shape(projectRing(poly).map((v) => new THREE.Vector2(v.x, -v.y)));
      holes.forEach((h) => s.holes.push(new THREE.Path(projectRing(h).map((v) => new THREE.Vector2(v.x, -v.y)))));
      return s;
    };
    const shapes = [toShape(PUGET, [VASHON]), toShape(LAKE_WA, [MERCER]), toShape(SAMMAMISH)];
    const fillGeo = new THREE.ShapeGeometry(shapes, 6);
    fillGeo.rotateX(-Math.PI / 2);
    const fill = new THREE.Mesh(fillGeo, flatMat(0x17252f, 0.5));
    fill.position.y = -0.01;
    fill.renderOrder = 0;
    scene.add(fill);

    const lineMat = flatMat(GOLD, 0.32, THREE.AdditiveBlending);
    [PUGET, VASHON, LAKE_WA, MERCER, SAMMAMISH].forEach((poly) => {
      const ring = projectRing(poly, 6);
      const g = new THREE.BufferGeometry().setFromPoints(ring.map((v) => new THREE.Vector3(v.x, 0.004, v.y)));
      const line = new THREE.LineLoop(g, lineMat);
      line.renderOrder = 2;
      scene.add(line);
    });
  }

  /* ---- Pins, routes, cars ---- */
  const glowTex = glowTexture();
  const hubPos = new THREE.Vector3(hubXZ[0], 0, hubXZ[1]);

  type Pin = {
    group: THREE.Group;
    core: THREE.MeshBasicMaterial;
    coreMesh: THREE.Mesh;
    glow: THREE.Sprite;
    beam: THREE.ShaderMaterial;
    beamMesh: THREE.Mesh;
    halo: THREE.ShaderMaterial;
    haloMesh: THREE.Mesh;
    rings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[];
    r: number;
    glowBase: number;
    glowK: number;
    beamH: number;
    drop: number;
    dim: number;
    target: number;
    isHub: boolean;
    // screen space (updated every frame): pin core + beam-top anchor
    sx: number;
    sy: number;
    ax: number;
    ay: number;
  };
  type Route = { curve: THREE.QuadraticBezierCurve3; tube: THREE.Mesh; mat: THREE.ShaderMaterial; car: THREE.Sprite; len: number; offset: number; draw: number };

  const TUBE_R = 0.016;
  const ringGeo = new THREE.RingGeometry(0.9, 1, 64);
  ringGeo.rotateX(-Math.PI / 2);
  const coreGeo = new THREE.SphereGeometry(1, 24, 16);
  const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);
  beamGeo.translate(0, 0.5, 0);

  function makePin(x: number, z: number, beamH: number, isHub: boolean): Pin {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const color = isHub ? IVORY : GOLD_2;
    const core = new THREE.MeshBasicMaterial({ color, transparent: true });
    const coreMesh = new THREE.Mesh(coreGeo, core);
    const r = isHub ? 0.1 : 0.068;
    coreMesh.scale.setScalar(r);
    coreMesh.position.y = r * 0.9;
    group.add(coreMesh);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: GOLD, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    glow.scale.setScalar(isHub ? 1.3 : 0.85);
    glow.position.y = r;
    group.add(glow);

    const beamMat = (opacity: number) =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: rgb(GOLD_2) }, uOpacity: { value: opacity } },
        vertexShader: beamVert,
        fragmentShader: beamFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    const beam = beamMat(0.9);
    const beamMesh = new THREE.Mesh(beamGeo, beam);
    beamMesh.scale.set(0.011, beamH, 0.011);
    group.add(beamMesh);
    const halo = beamMat(0.16);
    const haloMesh = new THREE.Mesh(beamGeo, halo);
    haloMesh.scale.set(0.05, beamH * 0.85, 0.05);
    group.add(haloMesh);

    const rings = [0, 1].map(() => {
      const mat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.position.y = 0.006;
      group.add(mesh);
      return { mesh, mat };
    });

    if (isHub) {
      const ringMat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
      const fixed = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.36, 64).rotateX(-Math.PI / 2), ringMat);
      fixed.position.y = 0.006;
      group.add(fixed);
    }

    scene.add(group);
    return {
      group, core, coreMesh, glow, beam, beamMesh, halo, haloMesh, rings, r, glowBase: isHub ? 1.3 : 0.85, glowK: 1,
      beamH, drop: reduced ? 1 : 0, dim: 1, target: 1, isHub, sx: 0, sy: 0, ax: 0, ay: 0,
    };
  }

  const hubPin = makePin(hubXZ[0], hubXZ[1], 1.5, true);
  const pins = cityXZ.map(([x, z], i) => makePin(x, z, BEAM[areas[i].city] ?? 0.9, false));

  const routes: Route[] = cityXZ.map(([x, z], i) => {
    const end = new THREE.Vector3(x, 0.02, z);
    const start = hubPos.clone().setY(0.02);
    const dist = start.distanceTo(end);
    const mid = start.clone().lerp(end, 0.5);
    mid.y = 0.45 + dist * 0.24;
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const geo = new THREE.TubeGeometry(curve, 96, TUBE_R, 8, false);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: rgb(GOLD) },
        uHot: { value: rgb(0xfff4dc) },
        uDraw: { value: reduced ? 1 : 0 },
        uHead: { value: -1 },
        uTrail: { value: 0.22 },
        uOpacity: { value: 1 },
      },
      vertexShader: arcVert,
      fragmentShader: arcFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const tube = new THREE.Mesh(geo, mat);
    tube.renderOrder = 3;
    scene.add(tube);
    const car = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfff1d0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    car.scale.setScalar(0.42);
    car.renderOrder = 4;
    scene.add(car);
    return { curve, tube, mat, car, len: curve.getLength(), offset: i * 0.9, draw: reduced ? 1 : 0 };
  });

  /* ---- Visual weight: on narrow stages the map renders smaller, so pins/arcs/cars get heavier ---- */
  let narrow: boolean | null = null;
  function applyWeight(isNarrow: boolean) {
    if (narrow === isNarrow) return;
    narrow = isNarrow;
    const kc = isNarrow ? 1.5 : 1;
    const kb = isNarrow ? 1.5 : 1;
    [hubPin, ...pins].forEach((p) => {
      const r = p.r * kc;
      p.coreMesh.scale.setScalar(r);
      p.coreMesh.position.y = r * 0.9;
      p.glow.position.y = r;
      p.glowK = isNarrow ? 1.4 : 1;
      p.beamMesh.scale.set(0.011 * kb, p.beamH, 0.011 * kb);
      p.haloMesh.scale.set(0.05 * kb, p.beamH * 0.85, 0.05 * kb);
    });
    routes.forEach((rt) => {
      rt.tube.geometry.dispose();
      rt.tube.geometry = new THREE.TubeGeometry(rt.curve, 96, isNarrow ? 0.028 : TUBE_R, 8, false);
      rt.car.scale.setScalar(isNarrow ? 0.6 : 0.42);
    });
  }

  /* ---- Light pool under the metro core ---- */
  {
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: glowTex, color: GOLD, transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    pool.scale.set(15, 1, 15);
    pool.position.set(center.x, -0.02, center.y);
    scene.add(pool);
  }

  /* ---- HTML labels ---- */
  type Label = {
    el: HTMLElement;
    inner: HTMLElement;
    stem: HTMLElement | null;
    pin: Pin;
    idx: number; // -1 = hub
    pref: LabelMode | null;
    mode: LabelMode;
    w: number;
    h: number;
    ox: number;
    oy: number;
    sox: number;
    soy: number;
    init: boolean;
  };
  const labelEls = Array.from(stage.querySelectorAll<HTMLElement>('[data-am-label]'));
  const labelFor = (key: string) => labelEls.find((el) => el.dataset.amLabel === key);
  const labels: Label[] = [
    { el: labelFor('hub'), pin: hubPin, idx: -1 },
    ...pins.map((pin, i) => ({ el: labelFor(String(i)), pin, idx: i })),
  ]
    .filter((l): l is { el: HTMLElement; pin: Pin; idx: number } => !!l.el)
    .map(({ el, pin, idx }) => {
      const pref = idx >= 0 ? LABEL_PREF[areas[idx].city] ?? null : null;
      return {
        el,
        pin,
        idx,
        pref,
        mode: pref ?? 'top',
        inner: el.querySelector<HTMLElement>('.am-label__inner') ?? el,
        stem: el.querySelector<HTMLElement>('.am-label__stem'),
        w: 0, h: 0, ox: 0, oy: 0, sox: 0, soy: 0, init: false,
      };
    });
  const labelState = { show: reduced ? 1 : 0 };
  // Intro clock (seconds since the map entered view); driven by the render loop itself.
  let introT = reduced ? 99 : -1;
  let introStart = 0;
  const seg = (t: number, delay: number, dur: number) => Math.min(1, Math.max(0, (t - delay) / dur));
  const expoOut = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const quadOut = (x: number) => 1 - (1 - x) * (1 - x);
  const cubicInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  function stepIntro() {
    if (introT < 0) return;
    // Wall-clock based so the reveal always completes on time, even on slow GPUs.
    if (!reduced && introT < 20) introT = (performance.now() - introStart) / 1000;
    const t = introT;
    shared.uReveal.value = quadOut(seg(t, 0, 2.6));
    hubPin.drop = expoOut(seg(t, 0.15, 1.3));
    pins.forEach((p, i) => (p.drop = expoOut(seg(t, 0.45 + i * 0.09, 1.4))));
    routes.forEach((rt, i) => (rt.draw = cubicInOut(seg(t, 0.9 + i * 0.11, 1.7))));
    labelState.show = quadOut(seg(t, 1.0, 1.2));
  }
  const compass = stage.querySelector<HTMLElement>('[data-am-compass]');
  const compassN = stage.querySelector<HTMLElement>('[data-am-compass-n]');
  const GAP = 8;
  const SIDE = 12;
  function measureLabels() {
    labels.forEach((l) => {
      l.w = l.inner.offsetWidth;
      l.h = l.inner.offsetHeight;
    });
  }
  // Fixed HUD furniture (chips, compass, mobile route chip) that labels should keep clear of.
  let hudBoxes: Box[] = [];
  function measureHud() {
    const mr = mount!.getBoundingClientRect();
    hudBoxes = Array.from(stage.querySelectorAll<HTMLElement>('[data-am-obstacle]'))
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({ l: r.left - mr.left, t: r.top - mr.top, r: r.right - mr.left, b: r.bottom - mr.top }));
  }

  /* ---- Camera & interaction ---- */
  const camState = { radius: 26, baseRadius: 26, theta: 0.5, phi: 0.9 };
  const target = new THREE.Vector3(center.x, 0, center.y);
  const targetGoal = target.clone();
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  const drag = { theta: 0, phi: 0, active: false, lx: 0, ly: 0 };
  let width = 1;
  let height = 1;
  let active: number | null = null;
  let zoomGoal = 1;
  const v = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const north = new THREE.Vector3();

  function placeCamera(theta: number, phi: number, r: number, t: THREE.Vector3) {
    camera.position.set(t.x + r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi), t.z + r * Math.sin(phi) * Math.cos(theta));
    camera.lookAt(t);
    camera.updateMatrixWorld();
  }

  // Fit the camera distance so every pin + label anchor sits inside the stage with breathing room.
  const fitPoints = [hubPin, ...pins].flatMap((p) => [
    new THREE.Vector3(p.group.position.x, 0, p.group.position.z),
    new THREE.Vector3(p.group.position.x, p.beamH + 0.35, p.group.position.z),
  ]);
  const fitCenter = new THREE.Vector3(center.x, 0, center.y);
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  function fitRadius() {
    const aspect = width / height;
    const k = THREE.MathUtils.clamp((aspect - 0.8) / 0.38, 0, 1);
    // Portrait stages: a lower, more oblique camera turned NE so the six routes fan out across
    // the width (instead of stacking vertically) and the region fills the frame.
    camState.theta = THREE.MathUtils.lerp(0.2, 0.46, k);
    camState.phi = THREE.MathUtils.lerp(0.92, 0.9, k);
    const compact = window.matchMedia('(max-width: 960px)').matches; // bottom HUD swapped for the route chip
    const mx = compact ? Math.min(48, width * 0.08) : Math.min(80, width * 0.15);
    const top = compact ? 80 : 100;
    const bottom = compact ? 78 : 118;
    const c = new THREE.Vector3(center.x, 0, center.y);
    const right = new THREE.Vector3(Math.cos(camState.theta), 0, -Math.sin(camState.theta));
    const fwd = new THREE.Vector3(-Math.sin(camState.theta), 0, -Math.cos(camState.theta));
    const fits = (r: number) => {
      placeCamera(camState.theta, camState.phi, r, c);
      return fitPoints.every((p) => {
        v.copy(p).project(camera);
        const x = (v.x * 0.5 + 0.5) * width;
        const y = (-v.y * 0.5 + 0.5) * height;
        return x > mx && x < width - mx && y > top && y < height - bottom;
      });
    };
    let r = 30;
    for (let pass = 0; pass < 4; pass++) {
      let lo = 6;
      let hi = 120;
      for (let it = 0; it < 22; it++) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) hi = mid;
        else lo = mid;
      }
      r = hi;
      // Re-centre: shift the look-at target so the projected content sits mid-frame.
      placeCamera(camState.theta, camState.phi, r, c);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      fitPoints.forEach((p) => {
        v.copy(p).project(camera);
        const x = (v.x * 0.5 + 0.5) * width;
        const y = (-v.y * 0.5 + 0.5) * height;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      });
      const ox = (minX + maxX) / 2 - width / 2;
      const oy = (minY + maxY) / 2 - (top + height - bottom) / 2;
      const wpp = (2 * r * tanHalf) / height;
      c.addScaledVector(right, ox * wpp);
      c.addScaledVector(fwd, (-oy * wpp) / Math.max(0.3, Math.cos(camState.phi)));
    }
    fitCenter.copy(c);
    return r * 1.07;
  }

  function resize() {
    width = Math.max(1, mount!.clientWidth);
    height = Math.max(1, mount!.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    camState.baseRadius = fitRadius();
    if (!running) {
      camState.radius = camState.baseRadius;
      target.copy(fitCenter);
    }
    if (active === null) targetGoal.copy(fitCenter);
    // Dot lattice: aim for ~5 CSS px between dots at the map centre (a touch coarser on 1x screens).
    const pr = renderer.getPixelRatio();
    const pxPerUnit = height / (2 * tanHalf * camState.baseRadius);
    const want = THREE.MathUtils.clamp((pr < 1.5 ? 5.6 : 4.8) / pxPerUnit, 0.12, 0.24);
    const step = Math.round(want * 100) / 100;
    if (!groundStep || Math.abs(step - groundStep) / groundStep > 0.12) buildGround(step);
    groundMat.uniforms.uScale.value = (height * pr) / (2 * tanHalf);
    applyWeight(width < 800);
    measureLabels();
    measureHud();
    requestRender();
  }

  if (fine && !reduced) {
    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (drag.active) {
        drag.theta = THREE.MathUtils.clamp(drag.theta - (e.clientX - drag.lx) * 0.0035, -0.35, 0.35);
        drag.phi = THREE.MathUtils.clamp(drag.phi - (e.clientY - drag.ly) * 0.0025, -0.1, 0.08);
        drag.lx = e.clientX;
        drag.ly = e.clientY;
      }
    });
    stage.addEventListener('pointerleave', () => { mouse.x = 0; mouse.y = 0; });
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      drag.active = true;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      stage.classList.add('is-dragging');
    });
    const end = (e: PointerEvent) => {
      if (!drag.active) return;
      drag.active = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      stage.classList.remove('is-dragging');
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  function setActive(i: number | null, still = false) {
    active = i;
    pins.forEach((p, k) => (p.target = i === null ? 1 : k === i ? 1.35 : 0.2));
    if (i === null) {
      targetGoal.copy(fitCenter);
      zoomGoal = 1;
    } else if (!still) {
      // Gentle lean toward the city; picked-on-map cities keep the camera still.
      targetGoal.set(fitCenter.x + (cityXZ[i][0] - fitCenter.x) * 0.06, 0, fitCenter.z + (cityXZ[i][1] - fitCenter.z) * 0.06);
      zoomGoal = 0.985;
    }
    requestRender();
  }

  /* ---- Frame ---- */
  let time = 0;
  let swayT = 0;
  let last = performance.now();

  const obs: { box: Box; owner: Pin | null; k: number }[] = [];
  const placedBoxes: Box[] = [];
  // Sample points along each arc: labels treat the routes as soft obstacles.
  const arcSamples = routes.map((rt) => Array.from({ length: 14 }, (_, j) => rt.curve.getPointAt(0.1 + (j / 13) * 0.8)));
  function offsetFor(m: LabelMode, w: number, h: number): [number, number] {
    switch (m) {
      case 'tr': return [-14, -GAP - h];
      case 'tl': return [14 - w, -GAP - h];
      case 'right': return [SIDE, -h / 2];
      case 'left': return [-SIDE - w, -h / 2];
      case 'top2': return [-w / 2, -GAP - 2 * h - 6];
      case 'top3': return [-w / 2, -GAP - 3 * h - 12];
      default: return [-w / 2, -GAP - h];
    }
  }

  function layoutLabels(ease: number) {
    const show = labelState.show;
    const all = [hubPin, ...pins];
    all.forEach((p) => {
      const gx = p.group.position.x;
      const gy = p.group.position.y;
      const gz = p.group.position.z;
      v.set(gx, gy + p.coreMesh.position.y, gz).project(camera);
      p.sx = (v.x * 0.5 + 0.5) * width;
      p.sy = (-v.y * 0.5 + 0.5) * height;
      v.set(gx, gy + p.beamH + 0.06, gz).project(camera);
      p.ax = (v.x * 0.5 + 0.5) * width;
      p.ay = (-v.y * 0.5 + 0.5) * height;
    });

    // Obstacles: HUD, every pin (+ pulse) and every beam. Labels choose the cheapest free spot.
    obs.length = 0;
    hudBoxes.forEach((b) => obs.push({ box: b, owner: null, k: 2 }));
    const half = narrow ? 15 : 13;
    all.forEach((p) => {
      const hs = p.isHub ? half * 1.3 : half;
      obs.push({ box: { l: p.sx - hs, r: p.sx + hs, t: p.sy - hs, b: p.sy + hs }, owner: p, k: 2.5 });
      obs.push({ box: { l: Math.min(p.sx, p.ax) - 3, r: Math.max(p.sx, p.ax) + 3, t: Math.min(p.sy, p.ay), b: Math.max(p.sy, p.ay) }, owner: p, k: 0.8 });
    });
    routes.forEach((rt, i) => {
      if (rt.draw < 0.5) return;
      arcSamples[i].forEach((pt) => {
        v.copy(pt).project(camera);
        const x = (v.x * 0.5 + 0.5) * width;
        const y = (-v.y * 0.5 + 0.5) * height;
        obs.push({ box: { l: x - 5, r: x + 5, t: y - 5, b: y + 5 }, owner: pins[i], k: 0.45 });
      });
    });

    // Active label first (it must not move from under the pointer), then nearest (lowest on screen).
    const order = [...labels].sort((a, b) => {
      if (active !== null) {
        if (a.idx === active) return -1;
        if (b.idx === active) return 1;
      }
      return b.pin.ay - a.pin.ay;
    });
    placedBoxes.length = 0;
    order.forEach((l) => {
      const x = l.pin.ax;
      const y = l.pin.ay;
      let best = l.mode;
      let bestCost = Infinity;
      let bx = 0;
      let by = 0;
      for (const m of MODES) {
        let [ox, oy] = offsetFor(m, l.w, l.h);
        ox = THREE.MathUtils.clamp(x + ox, 8, Math.max(8, width - 8 - l.w)) - x;
        oy = THREE.MathUtils.clamp(y + oy, 8, Math.max(8, height - 8 - l.h)) - y;
        const box: Box = { l: x + ox, t: y + oy, r: x + ox + l.w, b: y + oy + l.h };
        let cost = l.pref ? (m === l.pref ? 0 : MODE_COST[m] + 60) : MODE_COST[m];
        if (m === l.mode) cost -= HYST;
        for (const pb of placedBoxes) cost += overlap(box, pb, 5) * 3;
        for (const o of obs) if (o.owner !== l.pin) cost += overlap(box, o.box, 2) * o.k;
        if (cost < bestCost) {
          bestCost = cost;
          best = m;
          bx = ox;
          by = oy;
        }
      }
      l.mode = best;
      l.ox = bx;
      l.oy = by;
      placedBoxes.push({ l: x + bx, t: y + by, r: x + bx + l.w, b: y + by + l.h });
    });

    labels.forEach((l) => {
      if (!l.init || ease >= 1) {
        l.sox = l.ox;
        l.soy = l.oy;
        l.init = true;
      } else {
        l.sox += (l.ox - l.sox) * ease;
        l.soy += (l.oy - l.soy) * ease;
      }
      l.el.style.transform = `translate3d(${Math.round(l.pin.ax)}px, ${Math.round(l.pin.ay)}px, 0)`;
      l.inner.style.transform = `translate3d(${Math.round(l.sox)}px, ${Math.round(l.soy)}px, 0)`;
      if (l.stem) {
        // Leader line from the beam top to the nearest point of the pill.
        const nx = THREE.MathUtils.clamp(0, l.sox, l.sox + l.w);
        const ny = THREE.MathUtils.clamp(0, l.soy, l.soy + l.h);
        const len = Math.hypot(nx, ny);
        l.stem.style.transform = len < 1 ? 'scaleX(0)' : `rotate(${Math.atan2(ny, nx).toFixed(3)}rad) scaleX(${len.toFixed(1)})`;
      }
      l.el.style.opacity = String(Math.min(1, Math.max(0, show * 1.4 - (1 - l.pin.drop))));
    });
  }

  function update(dt: number) {
    if (!reduced) {
      time += dt;
      // The map settles while a city is in focus: no sway, no parallax, so its label stays put.
      if (active === null) swayT += dt;
    }
    stepIntro();
    shared.uTime.value = time;
    const ease = reduced ? 1 : 1 - Math.pow(0.0015, dt);

    // Camera
    if (active === null) {
      mouse.sx += (mouse.x - mouse.sx) * ease * 0.6;
      mouse.sy += (mouse.y - mouse.sy) * ease * 0.6;
    }
    if (!drag.active) {
      // Spring back to the composed framing after a drag.
      const k = Math.pow(0.06, dt);
      drag.theta *= k;
      drag.phi *= k;
    }
    target.lerp(targetGoal, ease * 0.5);
    const radiusGoal = camState.baseRadius * zoomGoal;
    camState.radius += (radiusGoal - camState.radius) * ease * 0.5;
    const sway = reduced ? 0 : Math.sin(swayT * 0.11) * 0.08;
    const theta = camState.theta + sway + mouse.sx * 0.05 + drag.theta;
    const phi = THREE.MathUtils.clamp(camState.phi + mouse.sy * 0.02 + drag.phi + (reduced ? 0 : Math.sin(swayT * 0.07) * 0.02), 0.6, 1.12);
    placeCamera(theta, phi, camState.radius, target);

    // Pins
    [hubPin, ...pins].forEach((p, k) => {
      p.dim += (p.target - p.dim) * ease;
      const d = p.drop;
      const lift = (1 - d) * 2.4;
      p.group.position.y = lift;
      const vis = Math.min(1, d * 1.6);
      const bright = Math.min(1, p.dim);
      p.core.opacity = vis * (0.35 + 0.65 * bright);
      (p.glow.material as THREE.SpriteMaterial).opacity = vis * (0.25 + 0.75 * bright) * (p.isHub ? 0.95 : 0.85);
      p.glow.scale.setScalar(p.glowBase * p.glowK * (0.8 + 0.35 * p.dim) * (1 + Math.sin(time * 2 + k) * 0.05));
      p.beam.uniforms.uOpacity.value = vis * 0.95 * bright;
      p.halo.uniforms.uOpacity.value = vis * 0.18 * p.dim;
      p.rings.forEach((ring, j) => {
        const phase = reduced ? 0.35 + j * 0.25 : (time * 0.42 + k * 0.17 + j * 0.5) % 1;
        const s = (p.isHub ? 0.25 : 0.12) + phase * (p.isHub ? 1.05 : 0.7) * (0.7 + 0.3 * p.dim);
        ring.mesh.scale.setScalar(s);
        ring.mat.opacity = Math.pow(1 - phase, 1.6) * 0.75 * vis * bright;
      });
    });

    // Routes
    routes.forEach((rt, i) => {
      const dim = pins[i].dim;
      rt.mat.uniforms.uDraw.value = rt.draw;
      rt.mat.uniforms.uOpacity.value = Math.min(1.4, dim);
      const travel = rt.len / 1.7; // seconds on the arc
      const cycle = travel + 1.1;
      const local = ((time + rt.offset) % cycle) / travel;
      const moving = rt.draw >= 1 && !reduced;
      const head = moving ? local : -1;
      rt.mat.uniforms.uHead.value = head;
      const carMat = rt.car.material as THREE.SpriteMaterial;
      if (moving && head <= 1) {
        rt.curve.getPointAt(Math.min(1, Math.max(0, head)), rt.car.position);
        carMat.opacity = Math.sin(Math.PI * Math.min(1, head)) * Math.min(1, dim) * 0.95;
      } else {
        carMat.opacity = 0;
      }
    });

    layoutLabels(reduced ? 1 : Math.min(1, ease * 1.2));

    // Compass: screen direction of world north. The needle turns; the "N" stays upright.
    if (compass) {
      v.copy(target).project(camera);
      v2.copy(target).add(north.set(0, 0, -1)).project(camera);
      const deg = (Math.atan2((v2.x - v.x) * width, (v2.y - v.y) * height) * 180) / Math.PI;
      compass.style.transform = `rotate(${deg.toFixed(2)}deg)`;
      if (compassN) compassN.style.transform = `rotate(${(-deg).toFixed(2)}deg)`;
    }
  }

  let raf = 0;
  let running = false;
  let inView = false;
  function loop(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    renderer.render(scene, camera);
    raf = running ? requestAnimationFrame(loop) : 0;
  }
  function syncRunning() {
    const should = inView && document.visibilityState === 'visible' && !reduced;
    if (should && !running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    } else if (!should && running) {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }
  let pending = false;
  function requestRender() {
    if (running || pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      last = performance.now();
      update(0.016);
      renderer.render(scene, camera);
    });
  }

  const viewIO = new IntersectionObserver(
    (entries) => {
      inView = entries.some((e) => e.isIntersecting);
      syncRunning();
    },
    { rootMargin: '120px 0px' },
  );
  viewIO.observe(stage);
  document.addEventListener('visibilitychange', syncRunning);
  new ResizeObserver(resize).observe(mount);
  resize();
  document.fonts?.ready.then(() => { measureLabels(); measureHud(); requestRender(); });

  /* ---- Intro ---- */
  function playIntro() {
    stage.classList.add('is-live');
    if (introT < 0) {
      introT = 0;
      introStart = performance.now();
    }
    requestRender();
  }
  if (reduced) {
    playIntro();
  } else {
    const introIO = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          introIO.disconnect();
          playIntro();
        }
      },
      { threshold: 0.3 },
    );
    introIO.observe(stage);
  }

  return { setActive };
}
