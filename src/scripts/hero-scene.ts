// "Seattle after dark" — procedural Three.js hero scene.
// A low camera glides over a wet, reflective highway toward a lit skyline and the Space Needle,
// with long-exposure light trails, passing street lamps, rain and atmospheric haze.
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
// Bloom post-processing is desktop-only, so it is loaded on demand (see "Rendering pipeline") and
// never ships in the chunk phones download.
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

function loadBloom() {
  return Promise.all([
    import('three/examples/jsm/postprocessing/EffectComposer.js'),
    import('three/examples/jsm/postprocessing/RenderPass.js'),
    import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
    import('three/examples/jsm/postprocessing/OutputPass.js'),
  ]).then(([a, b, c, d]) => ({ EffectComposer: a.EffectComposer, RenderPass: b.RenderPass, UnrealBloomPass: c.UnrealBloomPass, OutputPass: d.OutputPass }));
}

export interface HeroSceneOptions {
  reducedMotion?: boolean;
  onFirstFrame?: () => void;
  onContextLost?: () => void;
}

export interface HeroScene {
  setScroll(p: number): void;
  setPointer(x: number, y: number): void;
  playIntro(): void;
  setActive(active: boolean): void;
  dispose(): void;
}

/* ---------- Deterministic randomness so the skyline is identical on every load ---------- */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- World layout (meters) ---------- */
const CAM_X = 2.6; // we ride in the inside right lane
const CAM_Y = 2.0;
const CAM_Z = 8;
const NEEDLE = { x: CAM_X + 9, z: -232, h: 80 };
const LAMP_SPACING = 30;
const LAMP_COUNT = 13;
const LAMP_ZMIN = -LAMP_SPACING * (LAMP_COUNT - 1) + 22;
const TRAIL_ZMIN = -430;
const TRAIL_ZMAX = 22;

/* ---------- Shared GLSL ---------- */
const COMMON = /* glsl */ `
uniform vec3 uFogA;
uniform vec3 uFogB;
uniform float uFogDensity;
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}
// Haze colour depends on view direction: warm city glow toward the skyline, cool blue elsewhere.
vec3 hazeColor(vec3 dir) {
  float h = max(dir.y, 0.0);
  float toward = clamp(-dir.z, 0.0, 1.0);
  float side = exp(-pow(dir.x * 1.6 - 0.18, 2.0) * 2.5);
  float glow = exp(-h * 10.0) * pow(toward, 4.0) * side;
  return mix(uFogA, uFogB, clamp(glow, 0.0, 1.0));
}
float fogAmount(float dist) {
  float d = uFogDensity * dist;
  return 1.0 - exp(-d * d);
}
vec3 applyFog(vec3 col, vec3 worldPos, float k) {
  vec3 d = worldPos - cameraPosition;
  float dist = length(d);
  return mix(col, hazeColor(d / dist), fogAmount(dist) * k);
}
`;

const OUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

export function createHeroScene(canvas: HTMLCanvasElement, opts: HeroSceneOptions = {}): HeroScene | null {
  const reduced = !!opts.reducedMotion;
  const isDesktop = window.matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const useBloom = isDesktop && cores >= 4;
  // Phones and tablets render at 30fps: the glide reads the same and the main thread gets half its time back.
  const minFrameMs = isDesktop ? 0 : 1000 / 30;
  const rand = mulberry32(20080);
  const rr = (a: number, b: number) => a + (b - a) * rand();

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !useBloom, alpha: false, powerPreference: 'high-performance', stencil: false });
  } catch {
    return null;
  }
  // Shader-error checks call getProgramInfoLog, which blocks until every program has linked; in production
  // that stall is pure cost (the shaders are fixed), so it only runs in dev.
  renderer.debug.checkShaderErrors = import.meta.env.DEV;
  renderer.setClearColor(0x050608, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1600);
  camera.layers.enable(1); // rain lives on layer 1 so it is not mirrored in the road
  camera.position.set(CAM_X, CAM_Y, CAM_Z);

  /* ---------- Shared uniforms ---------- */
  const U = {
    uTime: { value: 0 },
    uTravel: { value: 0 },
    uFogA: { value: new THREE.Color('#0d1420') },
    uFogB: { value: new THREE.Color('#6a4626') },
    uFogDensity: { value: 0.0024 },
    uPixel: { value: 0.001 },
    uPointScale: { value: 1000 },
    uHeadGain: { value: 1 },
  };
  const fogUniforms = { uFogA: U.uFogA, uFogB: U.uFogB, uFogDensity: U.uFogDensity };

  /* ---------- Sky ---------- */
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { ...fogUniforms, uTime: U.uTime, uTop: { value: new THREE.Color('#020306') }, uMid: { value: new THREE.Color('#0a1019') } },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 p = projectionMatrix * viewMatrix * wp;
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform float uTime;
      varying vec3 vWorld;
      void main() {
        vec3 d = normalize(vWorld - cameraPosition);
        float h = d.y;
        vec3 col = mix(uMid, uTop, smoothstep(0.0, 0.5, h));
        // Low cloud deck, lit from beneath by the city
        vec2 cp = d.xz / max(h + 0.08, 0.06) * 0.55 + vec2(uTime * 0.006, uTime * 0.002);
        float c = fbm(cp);
        float band = smoothstep(0.0, 0.18, h) * (1.0 - smoothstep(0.32, 0.75, h));
        float cloud = smoothstep(0.42, 0.82, c) * band;
        vec3 lit = mix(uFogB * 0.55, uFogA * 1.6, smoothstep(0.0, 0.35, h));
        col += cloud * lit * 0.55;
        // Horizon haze
        col = mix(col, hazeColor(d), exp(-max(h, 0.0) * 13.0));
        // Broad, faint light-pollution dome over downtown so the towers silhouette against it
        float toward = clamp(-d.z, 0.0, 1.0);
        float dome = exp(-max(h, 0.0) * 4.2) * pow(toward, 3.0) * exp(-pow(d.x * 1.3 - 0.1, 2.0) * 1.6);
        col += uFogB * 0.085 * dome;
        // Sparse, faint stars high up
        vec2 sp = floor(d.xz / max(h, 0.2) * 220.0);
        float star = step(0.9985, hash12(sp)) * smoothstep(0.35, 0.7, h) * (1.0 - cloud);
        col += star * vec3(0.5, 0.55, 0.65);
        col += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
        gl_FragColor = vec4(col, 1.0);
        ${OUT}
      }`,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 48, 24), skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);

  /* ---------- Generic solid (fog-aware, instancing-aware) material ---------- */
  function solidMaterial(color: string, opts2: { move?: boolean; topLight?: number; nearDim?: boolean } = {}) {
    const defines: Record<string, string> = {};
    if (opts2.move) defines.MOVE = '';
    if (opts2.nearDim) defines.NEAR_DIM = '';
    return new THREE.ShaderMaterial({
      defines,
      uniforms: { ...fogUniforms, uTravel: U.uTravel, uColor: { value: new THREE.Color(color) }, uTop: { value: opts2.topLight ?? 0 } },
      vertexShader: /* glsl */ `
        uniform float uTravel;
        varying vec3 vWorld;
        varying vec3 vLocal;
        void main() {
          vec4 wp = vec4(position, 1.0);
          #ifdef USE_INSTANCING
            wp = instanceMatrix * wp;
          #endif
          wp = modelMatrix * wp;
          #ifdef MOVE
            float span = ${(LAMP_SPACING * LAMP_COUNT).toFixed(1)};
            float zmin = ${LAMP_ZMIN.toFixed(1)};
            #ifdef USE_INSTANCING
              float bz = instanceMatrix[3].z;
            #else
              float bz = 0.0;
            #endif
            float nz = zmin + mod(bz - zmin + uTravel, span);
            wp.z += nz - bz;
          #endif
          vWorld = wp.xyz;
          vLocal = position;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform vec3 uColor;
        uniform float uTop;
        varying vec3 vWorld;
        varying vec3 vLocal;
        void main() {
          vec3 col = uColor;
          col += uFogB * uTop * smoothstep(0.2, 0.5, vLocal.y);
          #ifdef NEAR_DIM
            // lamp heads go dark as they pass overhead, in step with their glow sprites
            col = mix(vec3(0.02, 0.019, 0.018), col, smoothstep(8.0, 26.0, length(vWorld - cameraPosition)));
          #endif
          col = applyFog(col, vWorld, 1.0);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }`,
    });
  }

  /* ---------- Buildings (procedural lit windows) ---------- */
  type B = { x: number; z: number; w: number; d: number; h: number; lit: number; y?: number; rot?: number; capped?: boolean };
  const blds: B[] = [];
  const clearOfRoad = (x: number, z: number, w: number) => !(z > -340 && Math.abs(x) - w / 2 < 16);
  const clearOfNeedle = (x: number, z: number, w: number) => !(Math.abs(x - NEEDLE.x) < 16 + w / 2 && z < -210 && z > -330);
  // Downtown core, framed just left of the Needle so it reads between headline and quote card
  for (let i = 0; i < 110; i++) {
    const x = CAM_X + rr(-120, 75);
    const z = rr(-292, -400);
    const w = rr(10, 22);
    if (z > -350 && Math.abs(x) - w / 2 < 18) continue; // keep the road corridor open
    if (Math.abs(x - NEEDLE.x) < 9 + w / 2 && z > -335) continue; // clean sky behind the Needle
    const k = Math.exp(-Math.pow(x - (CAM_X - 32), 2) / (2 * 38 * 38));
    blds.push({ x, z, w, d: rr(10, 22), h: rr(14, 24) + k * rr(18, 64), lit: rr(0.12, 0.34) });
  }
  // Secondary cluster to the right (glows through the glass quote card)
  for (let i = 0; i < 50; i++) {
    const x = CAM_X + rr(60, 240);
    const z = rr(-290, -380);
    const k = Math.exp(-Math.pow(x - (CAM_X + 140), 2) / (2 * 45 * 45));
    const w = rr(10, 18);
    blds.push({ x, z, w, d: rr(10, 18), h: rr(10, 20) + k * rr(10, 40), lit: rr(0.1, 0.28) });
  }
  // Low-rise city belt
  for (let i = 0; i < 260; i++) {
    const x = rr(-560, 560);
    const z = rr(-200, -480);
    const w = rr(8, 26);
    if (!clearOfRoad(x, z, w) || !clearOfNeedle(x, z, w)) continue;
    blds.push({ x, z, w, d: rr(8, 22), h: rr(4, 15), lit: rr(0.06, 0.22) });
  }
  // Low buildings right in front of the Needle so its base sinks into the city
  for (let i = 0; i < 10; i++) {
    const x = NEEDLE.x + rr(-22, 22);
    const z = rr(-200, -222);
    blds.push({ x, z, w: rr(8, 16), d: rr(8, 14), h: rr(5, 11), lit: rr(0.08, 0.2) });
  }
  // Roadside warehouses / mid-rises closer to camera
  for (let i = 0; i < 46; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    const x = side * rr(26, 90);
    const z = rr(-95, -215);
    blds.push({ x, z, w: rr(10, 28), d: rr(10, 26), h: rr(4, 13) + (rand() < 0.15 ? rr(8, 18) : 0), lit: rr(0.03, 0.12) });
  }
  // Setbacks and crowns: about a third of the towers get a narrower stacked volume, so the skyline
  // stops reading as identical flat-topped boxes.
  const towerCount = blds.length;
  for (let i = 0; i < towerCount; i++) {
    const b = blds[i];
    if (b.h < 28 || rand() > 0.34) continue;
    b.rot = rr(-0.12, 0.12);
    b.capped = true;
    const s = rr(0.52, 0.76);
    const top = { x: b.x, z: b.z, w: b.w * s, d: b.d * s, h: rr(5, 10) + b.h * rr(0.12, 0.3), lit: b.lit * 1.15, y: b.h, rot: b.rot } as B;
    blds.push(top);
    // a slim lit crown on the very tallest
    if (b.h > 52 && rand() < 0.5) {
      blds.push({ x: b.x, z: b.z, w: top.w * 0.5, d: top.d * 0.5, h: rr(3, 6), lit: 0.6, y: b.h + top.h, rot: b.rot });
      top.capped = true;
    }
  }

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  const bldMat = new THREE.ShaderMaterial({
    uniforms: { ...fogUniforms, uFacade: { value: new THREE.Color('#07080c') }, uWin: { value: 1.7 } },
    vertexShader: /* glsl */ `
      attribute vec2 aSeed;
      varying vec2 vFacade;
      varying vec3 vWorld;
      varying vec3 vN;
      varying vec2 vSeed;
      varying float vH;
      void main() {
        mat4 im = instanceMatrix;
        vec3 s = vec3(length(im[0].xyz), length(im[1].xyz), length(im[2].xyz));
        vec4 wp = modelMatrix * im * vec4(position, 1.0);
        vec3 lp = position * s;
        vFacade = abs(normal.x) > 0.5 ? vec2(lp.z, lp.y) : vec2(lp.x, lp.y);
        vN = normalize(mat3(im) * normal);
        vWorld = wp.xyz;
        vSeed = aSeed;
        vH = s.y;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uFacade;
      uniform float uWin;
      varying vec2 vFacade;
      varying vec3 vWorld;
      varying vec3 vN;
      varying vec2 vSeed;
      varying float vH;
      void main() {
        float seed = vSeed.x;
        float ratio = vSeed.y;
        vec3 col = uFacade * (0.7 + 0.6 * hash12(vec2(seed, 1.3)));
        // faint street-level uplight on the facades
        col += uFogB * 0.05 * exp(-vWorld.y * 0.12);
        if (vN.y < 0.5) {
          vec2 cell = vec2(1.6 + hash12(vec2(seed, 2.0)) * 0.7, 3.1);
          vec2 g = (vFacade + vec2(seed * 13.7, 0.0)) / cell;
          vec2 id = floor(g);
          vec2 f = fract(g);
          float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.22, f.y) * step(f.y, 0.8);
          float face = floor(vN.x * 2.0 + vN.z * 3.0 + 5.0);
          float r = hash12(id + vec2(seed * 31.7 + face * 5.1, face));
          float floorOn = step(0.25, hash12(vec2(id.y + face, seed * 3.1)));
          float camD = length(vWorld - cameraPosition);
          float lit = step(1.0 - ratio * smoothstep(110.0, 230.0, camD), r) * floorOn;
          vec3 warm = mix(vec3(1.0, 0.58, 0.26), vec3(1.0, 0.8, 0.52), hash12(id + 2.3));
          vec3 cool = vec3(0.5, 0.62, 0.85);
          vec3 wc = mix(warm, cool, step(0.9, hash12(id + 9.1)) * smoothstep(200.0, 260.0, camD));
          float camDist = length(vWorld - cameraPosition);
          float bright = uWin * (0.45 + 0.7 * hash12(id + 4.4)) * mix(0.22, 1.0, smoothstep(110.0, 260.0, camDist));
          // unlit panes sit almost flush with the facade so only lit windows read
          vec3 sharp = win * (lit * wc * bright + (1.0 - lit) * uFacade * 0.45);
          // Anti-alias: fade to average luminance when windows get smaller than a pixel
          vec2 fw = fwidth(g);
          float aa = clamp(max(fw.x, fw.y) * 2.6 - 0.45, 0.0, 1.0);
          // faces seen edge-on would collapse into bright slivers, so they fade out
          float facing = abs(dot(normalize(vN), normalize(cameraPosition - vWorld)));
          vec3 avg = 0.36 * ratio * 0.75 * vec3(1.0, 0.68, 0.38) * uWin * 0.8 * smoothstep(0.06, 0.4, facing);
          col += mix(sharp, avg, aa) * smoothstep(0.02, 0.12, facing);
          // occasional lit crown
          float crown = smoothstep(vH - 1.4, vH - 0.2, vFacade.y) * step(0.82, hash12(vec2(seed, 3.3))) * step(28.0, vH) * smoothstep(200.0, 260.0, camD);
          col += crown * vec3(1.0, 0.78, 0.5) * 0.9;
        } else {
          col *= 0.6;
        }
        col = applyFog(col, vWorld, 1.0);
        gl_FragColor = vec4(col, 1.0);
        ${OUT}
      }`,
  });
  const bldMesh = new THREE.InstancedMesh(boxGeo, bldMat, blds.length);
  const seeds = new Float32Array(blds.length * 2);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  blds.forEach((b, i) => {
    q.setFromAxisAngle(up, b.rot ?? rr(-0.12, 0.12));
    m4.compose(new THREE.Vector3(b.x, b.y ?? 0, b.z), q, new THREE.Vector3(b.w, b.h, b.d));
    bldMesh.setMatrixAt(i, m4);
    seeds[i * 2] = rr(0, 100);
    seeds[i * 2 + 1] = b.lit;
  });
  boxGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 2));
  bldMesh.frustumCulled = false;
  scene.add(bldMesh);

  /* ---------- Space Needle ---------- */
  const needle = new THREE.Group();
  const needleMat = new THREE.ShaderMaterial({
    uniforms: { ...fogUniforms, uBase: { value: new THREE.Color('#0b0b0f') }, uRim: { value: new THREE.Color('#e3c48a') }, uH: { value: NEEDLE.h }, uRimK: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vWorld;
      varying float vY;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vY = position.y;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 uBase;
      uniform vec3 uRim;
      uniform float uH;
      uniform float uRimK;
      varying vec3 vN;
      varying vec3 vWorld;
      varying float vY;
      void main() {
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 N = normalize(vN);
        float ndv = abs(dot(N, V));
        float rim = pow(1.0 - ndv, 2.4);
        vec3 L = normalize(vec3(0.6, 0.25, -0.75));
        float key = pow(max(dot(N, L), 0.0), 3.0);
        float hgt = clamp(vY / uH, 0.0, 1.0);
        // downward-facing surfaces (the saucer underside) stay dark so the silhouette reads
        float facingUp = smoothstep(-0.62, -0.2, N.y);
        vec3 col = uBase;
        col += uRim * rim * (0.75 + 0.5 * hgt) * mix(0.08, 1.0, facingUp) * uRimK;
        col += uRim * key * 0.3 * facingUp * uRimK;
        // floodlit base
        col += uRim * 0.16 * (1.0 - smoothstep(0.0, 0.3, hgt)) * uRimK;
        col = applyFog(col, vWorld, 0.55);
        gl_FragColor = vec4(col, 1.0);
        ${OUT}
      }`,
    side: THREE.DoubleSide,
  });
  const H = NEEDLE.h;
  // Three pairs of legs: splayed wide at the base, pinched hard at the waist, flaring out to the top house
  const legProfile: [number, number][] = [[8.8, 0], [5.6, 0.14], [2.6, 0.27], [1.55, 0.35], [2.0, 0.47], [3.3, 0.64], [4.5, 0.79]];
  for (let k = 0; k < 3; k++) {
    for (const s of [-1, 1]) {
      const base = k * ((Math.PI * 2) / 3) + Math.PI / 6;
      const pts = legProfile.map(([r, h]) => {
        const a = base + s * (0.16 + 0.05 * (1 - h));
        return new THREE.Vector3(Math.cos(a) * r, h * H, Math.sin(a) * r);
      });
      needle.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 56, 0.75, 8), needleMat));
    }
  }
  // Elevator core: slim and unlit, a dark spine between the gold legs
  const coreMat = needleMat.clone();
  coreMat.uniforms.uRimK.value = 0;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.8 * H, 12), coreMat);
  core.position.y = 0.4 * H;
  needle.add(core);
  const waist = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.34, 8, 40), needleMat);
  waist.rotation.x = Math.PI / 2;
  waist.position.y = 0.35 * H;
  needle.add(waist);
  const housePts = [
    [0, 0.79], [2.2, 0.793], [4.6, 0.804], [7.4, 0.82], [9.4, 0.834], [9.95, 0.841], [9.7, 0.848], [7.6, 0.855],
    [6.9, 0.864], [7.05, 0.876], [6.2, 0.885], [4.6, 0.897], [2.6, 0.909], [1.0, 0.917], [0, 0.92],
  ].map(([r, h]) => new THREE.Vector2(r, h * H));
  needle.add(new THREE.Mesh(new THREE.LatheGeometry(housePts, 72), needleMat));
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.55, 0.085 * H, 10), needleMat);
  spire.position.y = 0.92 * H + 0.0425 * H;
  needle.add(spire);

  // Emissive halo ring and restaurant window band
  const glowMat = (c: string, i: number, bars = 0) =>
    new THREE.ShaderMaterial({
      uniforms: { ...fogUniforms, uColor: { value: new THREE.Color(c) }, uI: { value: i }, uBars: { value: bars } },
      vertexShader: /* glsl */ `
        varying vec3 vWorld; varying vec2 vUv;
        void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: /* glsl */ `
        ${COMMON}
        uniform vec3 uColor; uniform float uI; uniform float uBars;
        varying vec3 vWorld; varying vec2 vUv;
        void main() {
          float b = uBars > 0.0 ? 0.55 + 0.45 * step(0.3, fract(vUv.x * uBars)) : 1.0;
          vec3 col = uColor * uI * b;
          col = applyFog(col, vWorld, 0.5);
          gl_FragColor = vec4(col, 1.0);
          ${OUT}
        }`,
      side: THREE.DoubleSide,
    });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(9.95, 0.24, 8, 120), glowMat('#ffd9a0', 1.1));
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.841 * H;
  needle.add(halo);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(7.0, 7.0, 0.85, 72, 1, true), glowMat('#ffbf73', 1.05, 96));
  band.position.y = 0.87 * H;
  needle.add(band);
  needle.position.set(NEEDLE.x, 0, NEEDLE.z);
  needle.rotation.y = 0.3;
  scene.add(needle);

  /* ---------- Glow points: street lamps, beacons, aviation lights, distant city ---------- */
  const glowPos: number[] = [];
  const glowCol: number[] = [];
  const glowData: number[] = []; // size, intensity, move, blink
  const addGlow = (x: number, y: number, z: number, size: number, color: THREE.Color, intensity: number, move = 0, blink = 0) => {
    glowPos.push(x, y, z);
    glowCol.push(color.r, color.g, color.b);
    glowData.push(size, intensity, move, blink);
  };
  const lampColor = new THREE.Color('#ffb36b');
  for (let i = 0; i < LAMP_COUNT; i++) {
    const z = LAMP_ZMIN + i * LAMP_SPACING;
    // glow hangs just under the lamp head at the arm tip, clear of the dark arm
    addGlow(-8.2, 8.38, z, 2.2, lampColor, 1.5, 1);
    addGlow(8.2, 8.38, z + LAMP_SPACING / 2, 2.2, lampColor, 1.5, 1);
  }
  addGlow(NEEDLE.x, H * 1.005 + 0.4, NEEDLE.z, 3.5, new THREE.Color('#fff1d6'), 1.8, 0, 0);
  // Aviation lights on the tallest towers
  const red = new THREE.Color('#ff2a12');
  blds
    .filter((b) => !b.capped && (b.y ?? 0) + b.h > 48)
    .forEach((b, i) => addGlow(b.x, (b.y ?? 0) + b.h + 0.8, b.z, 3.2, red, 2.0, 0, 0.6 + (i % 3) * 0.17));
  // Distant city: street lights, hillside homes, harbor
  const warmA = new THREE.Color('#ffb066');
  const warmB = new THREE.Color('#ffd9a8');
  const coolA = new THREE.Color('#b9d2ff');
  for (let i = 0; i < 1700; i++) {
    const x = rr(-650, 650);
    const z = rr(-150, -520);
    if (z > -340 && Math.abs(x) < 15) continue;
    const r = rand();
    const c = r < 0.62 ? warmA : r < 0.9 ? warmB : coolA;
    const y = rand() < 0.8 ? rr(0.4, 6) : rr(6, 24);
    addGlow(x, y, z, rr(1.0, 2.4), c, rr(0.5, 1.4));
  }
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3));
  glowGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(glowCol, 3));
  glowGeo.setAttribute('aData', new THREE.Float32BufferAttribute(glowData, 4));
  const glowMatPts = new THREE.ShaderMaterial({
    uniforms: { ...fogUniforms, uTime: U.uTime, uTravel: U.uTravel, uScale: U.uPointScale },
    vertexShader: /* glsl */ `
      ${COMMON}
      attribute vec3 aColor;
      attribute vec4 aData;
      uniform float uTime;
      uniform float uTravel;
      uniform float uScale;
      varying vec3 vColor;
      varying float vI;
      void main() {
        vec3 p = position;
        if (aData.z > 0.5) {
          float span = ${(LAMP_SPACING * LAMP_COUNT).toFixed(1)};
          float zmin = ${LAMP_ZMIN.toFixed(1)};
          p.z = zmin + mod(p.z - zmin + uTravel, span);
        }
        vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        float px = aData.x * uScale / max(dist, 0.1);
        float minPx = 2.5;
        float energy = px < minPx ? (px * px) / (minPx * minPx) : 1.0;
        gl_PointSize = clamp(max(px, minPx), 1.0, 512.0);
        float blink = aData.w > 0.0 ? 0.25 + 0.75 * step(0.55, fract(uTime * aData.w + aData.w * 7.0)) : 1.0;
        // passing street lamps fade before they get close enough to bloom into the header
        float nearFade = aData.z > 0.5 ? smoothstep(8.0, 26.0, dist) : smoothstep(2.0, 9.0, dist);
        vI = aData.y * energy * blink * nearFade * (1.0 - fogAmount(dist) * 0.9);
        vColor = aColor;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vI;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c) * 2.0;
        float core = exp(-d * d * 22.0);
        float halo = exp(-d * d * 3.5) * 0.28;
        float a = (core * 1.5 + halo) * (1.0 - smoothstep(0.8, 1.0, d));
        gl_FragColor = vec4(vColor * a * vI, 1.0);
        ${OUT}
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glowPoints = new THREE.Points(glowGeo, glowMatPts);
  glowPoints.frustumCulled = false;
  scene.add(glowPoints);

  /* ---------- Lamp poles (move with the glide) ---------- */
  const poleGeo = new THREE.BoxGeometry(0.22, 8.7, 0.22);
  poleGeo.translate(0, 4.35, 0);
  const armGeo = new THREE.BoxGeometry(1.6, 0.08, 0.08);
  const headGeo = new THREE.BoxGeometry(0.56, 0.07, 0.26);
  const poleMat = solidMaterial('#0a0b0e', { move: true, topLight: 0.05 });
  const armMat = solidMaterial('#08090b', { move: true, topLight: 0 });
  const headMat = solidMaterial('#d9ab72', { move: true, topLight: 0, nearDim: true });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, LAMP_COUNT * 2);
  const arms = new THREE.InstancedMesh(armGeo, armMat, LAMP_COUNT * 2);
  const heads = new THREE.InstancedMesh(headGeo, headMat, LAMP_COUNT * 2);
  for (let i = 0; i < LAMP_COUNT; i++) {
    const z = LAMP_ZMIN + i * LAMP_SPACING;
    poles.setMatrixAt(i * 2, m4.makeTranslation(-9.4, 0, z));
    poles.setMatrixAt(i * 2 + 1, m4.makeTranslation(9.4, 0, z + LAMP_SPACING / 2));
    arms.setMatrixAt(i * 2, m4.makeTranslation(-8.8, 8.7, z));
    arms.setMatrixAt(i * 2 + 1, m4.makeTranslation(8.8, 8.7, z + LAMP_SPACING / 2));
    heads.setMatrixAt(i * 2, m4.makeTranslation(-8.3, 8.6, z));
    heads.setMatrixAt(i * 2 + 1, m4.makeTranslation(8.3, 8.6, z + LAMP_SPACING / 2));
  }
  poles.frustumCulled = arms.frustumCulled = heads.frustumCulled = false;
  scene.add(poles, arms, heads);

  // Median barrier
  const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 480), solidMaterial('#0c0d10', { topLight: 0.12 }));
  barrier.position.set(0, 0.425, -220);
  scene.add(barrier);

  /* ---------- Light trails (long-exposure streaks) ---------- */
  type T = { x: number; y: number; z: number; speed: number; len: number; w: number; i: number; c: THREE.Color };
  const trails: T[] = [];
  const head = [new THREE.Color('#fff0d8'), new THREE.Color('#ffe2b8'), new THREE.Color('#e6efff')];
  // Deep amber-reds rather than saturated brake-light red: warm, calm, never louder than the gold
  const tail = [new THREE.Color('#c8321c'), new THREE.Color('#d9502a'), new THREE.Color('#ff8a3a')];
  const addCar = (lane: number, dirSign: number) => {
    const z = rr(TRAIL_ZMIN, TRAIL_ZMAX);
    const speed = dirSign > 0 ? rr(24, 46) : -rr(9, 24);
    const len = dirSign > 0 ? rr(9, 26) : rr(7, 20);
    const pal = dirSign > 0 ? head : tail;
    const c = pal[rand() < 0.82 ? (rand() < 0.5 ? 0 : 1) : 2];
    const y = dirSign > 0 ? 0.68 : 0.86;
    const inten = dirSign > 0 ? rr(1.1, 2.0) : rr(0.9, 1.6);
    for (const s of [-1, 1]) trails.push({ x: lane + s * 0.78, y, z, speed, len, w: 0.11, i: inten, c });
  };
  for (let i = 0; i < 70; i++) addCar(rand() < 0.5 ? -2.6 : -6.2, 1);
  for (let i = 0; i < 62; i++) addCar(rand() < 0.55 ? 6.2 : 2.6, -1);

  const trailGeo = new THREE.InstancedBufferGeometry();
  const plane = new THREE.PlaneGeometry(1, 1);
  plane.translate(0.5, 0.5, 0); // uv == position.xy in [0,1]
  trailGeo.index = plane.index;
  trailGeo.setAttribute('position', plane.getAttribute('position'));
  trailGeo.setAttribute('uv', plane.getAttribute('uv'));
  const tOff = new Float32Array(trails.length * 3);
  const tPar = new Float32Array(trails.length * 4);
  const tCol = new Float32Array(trails.length * 3);
  trails.forEach((t, i) => {
    tOff.set([t.x, t.y, t.z], i * 3);
    tPar.set([t.speed, t.len, t.w, t.i], i * 4);
    tCol.set([t.c.r, t.c.g, t.c.b], i * 3);
  });
  trailGeo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(tOff, 3));
  trailGeo.setAttribute('aParams', new THREE.InstancedBufferAttribute(tPar, 4));
  trailGeo.setAttribute('aColor', new THREE.InstancedBufferAttribute(tCol, 3));
  trailGeo.instanceCount = trails.length;
  const trailMat = new THREE.ShaderMaterial({
    uniforms: { ...fogUniforms, uTime: U.uTime, uPixel: U.uPixel, uHeadGain: U.uHeadGain },
    vertexShader: /* glsl */ `
      ${COMMON}
      attribute vec3 aOffset;
      attribute vec4 aParams;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uPixel;
      uniform float uHeadGain;
      varying vec2 vUv;
      varying vec3 vColor;
      varying float vI;
      void main() {
        float speed = aParams.x;
        float len = aParams.y;
        float zmin = ${TRAIL_ZMIN.toFixed(1)};
        float span = ${(TRAIL_ZMAX - TRAIL_ZMIN).toFixed(1)};
        float z = zmin + mod(aOffset.z - zmin + speed * uTime, span);
        vec3 dir = vec3(0.0, 0.0, sign(speed));
        vec3 p = vec3(aOffset.x, aOffset.y, z) + dir * (uv.y - 1.0) * len;
        vec3 toCam = cameraPosition - p;
        float dist = length(toCam);
        vec3 side = normalize(cross(dir, toCam));
        float w = aParams.z;
        float ww = max(w, dist * uPixel * 1.4);
        p += side * (uv.x - 0.5) * ww * 4.0;
        float ends = smoothstep(zmin, zmin + 60.0, z) * (1.0 - smoothstep(zmin + span - 14.0, zmin + span, z));
        vI = aParams.w * (w / ww) * ends * (speed > 0.0 ? smoothstep(15.0, 70.0, dist) * uHeadGain : smoothstep(5.0, 18.0, dist)) * (1.0 - fogAmount(dist) * 0.8);
        vUv = uv;
        vColor = aColor;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vColor;
      varying float vI;
      void main() {
        float x = (vUv.x - 0.5) * 4.0;
        float core = exp(-x * x * 3.2);
        float halo = exp(-x * x * 0.45) * 0.22;
        float along = smoothstep(0.0, 0.9, vUv.y) * (1.0 - smoothstep(0.965, 1.0, vUv.y));
        float i = (core + halo) * along * vI;
        gl_FragColor = vec4(vColor * i, 1.0);
        ${OUT}
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const trailMesh = new THREE.Mesh(trailGeo, trailMat);
  trailMesh.frustumCulled = false;
  scene.add(trailMesh);

  /* ---------- Rain ---------- */
  const RAIN = reduced ? 0 : isDesktop ? 2200 : 1100;
  const rainPos = new Float32Array(RAIN * 2 * 3);
  const rainEnd = new Float32Array(RAIN * 2);
  for (let i = 0; i < RAIN; i++) {
    const x = rr(-28, 28);
    const y = rr(0, 24);
    const z = rr(-60, 8);
    rainPos.set([x, y, z, x, y, z], i * 6);
    rainEnd[i * 2] = 0;
    rainEnd[i * 2 + 1] = 1;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  rainGeo.setAttribute('aEnd', new THREE.BufferAttribute(rainEnd, 1));
  const rainMat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uTravel: U.uTravel, uCam: { value: new THREE.Vector3() } },
    vertexShader: /* glsl */ `
      attribute float aEnd;
      uniform float uTime;
      uniform float uTravel;
      uniform vec3 uCam;
      varying float vA;
      void main() {
        vec3 p = position;
        p.y = mod(p.y - uTime * 17.0, 24.0) - 1.0;
        p.z = -60.0 + mod(p.z + 60.0 + uTravel * 0.6, 68.0) + uCam.z - 8.0;
        p.x += uCam.x;
        p += aEnd * vec3(-0.04, 0.62, 0.22);
        vec4 mv = viewMatrix * vec4(p, 1.0);
        float dist = -mv.z;
        vA = smoothstep(1.0, 5.0, dist) * (1.0 - smoothstep(20.0, 60.0, dist)) * mix(1.0, 0.25, aEnd);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        gl_FragColor = vec4(vec3(0.62, 0.68, 0.8) * 0.15 * vA, 1.0);
        ${OUT}
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false;
  rain.layers.set(1);
  if (RAIN) scene.add(rain);

  /* ---------- Wet road: real planar reflection, blurred and streaked ---------- */
  const roadShader = {
    name: 'WetRoad',
    uniforms: {
      color: { value: null },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      ...fogUniforms,
      uTravel: U.uTravel,
      uTime: U.uTime,
      uBlur: { value: 0.022 },
    },
    vertexShader: /* glsl */ `
      uniform mat4 textureMatrix;
      varying vec4 vUvR;
      varying vec3 vWorld;
      void main() {
        vUvR = textureMatrix * vec4(position, 1.0);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      ${COMMON}
      uniform vec3 color;
      uniform sampler2D tDiffuse;
      uniform float uTravel;
      uniform float uTime;
      uniform float uBlur;
      varying vec4 vUvR;
      varying vec3 vWorld;
      float lineAA(float d, float w) {
        float fw = fwidth(d) * 1.2;
        return 1.0 - smoothstep(w - fw, w + fw, abs(d));
      }
      void main() {
        vec3 w = vWorld;
        float ax = abs(w.x);
        float road = 1.0 - smoothstep(9.0, 11.5, ax);
        // asphalt grain + puddles
        float grain = vnoise(w.xz * vec2(3.0, 1.2)) * 0.6 + vnoise(w.xz * 0.35) * 0.4;
        float puddle = smoothstep(0.48, 0.72, fbm(w.xz * vec2(0.09, 0.05) + 3.0));
        vec3 base = mix(vec3(0.006, 0.0065, 0.008), vec3(0.012, 0.0125, 0.015), grain);
        base = mix(vec3(0.004, 0.0045, 0.005), base, road);

        // Lane markings (dim, wet paint), scrolling with the glide
        float zz = w.z - uTravel;
        float dash = step(fract(zz / 12.0), 0.36);
        float mk = 0.0;
        mk += lineAA(ax - 4.4, 0.07) * dash;
        mk += lineAA(ax - 8.5, 0.08);
        vec3 paint = vec3(0.32, 0.31, 0.29) * mk;
        float yel = lineAA(ax - 0.75, 0.06);
        paint += vec3(0.36, 0.25, 0.06) * yel;
        base += paint * 0.22 * road * (1.0 - puddle * 0.7);

        // Warm pools of light beneath the passing lamps
        float zl = mod(w.z - ${LAMP_ZMIN.toFixed(1)} - uTravel, ${LAMP_SPACING.toFixed(1)});
        float zr = mod(w.z - ${LAMP_ZMIN.toFixed(1)} - ${(LAMP_SPACING / 2).toFixed(1)} - uTravel, ${LAMP_SPACING.toFixed(1)});
        zl = min(zl, ${LAMP_SPACING.toFixed(1)} - zl);
        zr = min(zr, ${LAMP_SPACING.toFixed(1)} - zr);
        float poolL = exp(-zl * zl / 38.0) * exp(-pow(w.x + 7.6, 2.0) / 10.0);
        float poolR = exp(-zr * zr / 38.0) * exp(-pow(w.x - 7.6, 2.0) / 10.0);
        base += vec3(1.0, 0.62, 0.3) * (poolL + poolR) * 0.035 * (0.6 + grain);

        // Reflection: distorted, streaked vertically like light on wet asphalt
        vec2 uv = vUvR.xy / vUvR.w;
        float n = vnoise(w.xz * vec2(1.6, 0.22) + vec2(0.0, uTime * 0.15)) - 0.5;
        float rough = mix(1.0, 0.25, puddle);
        uv.x += n * 0.006 * rough;
        vec3 refl = vec3(0.0);
        float tot = 0.0;
        for (int i = 0; i < 7; i++) {
          float t = float(i) / 6.0 - 0.5;
          float wt = 1.0 - abs(t) * 1.3;
          refl += texture2D(tDiffuse, uv + vec2(0.0, t * uBlur * rough)).rgb * wt;
          tot += wt;
        }
        refl /= tot;
        // Tame saturated reds in the wet reflections: pull red toward the warm luminance
        float lum = dot(refl, vec3(0.3, 0.55, 0.15));
        refl = mix(refl, vec3(lum * 1.15, lum, lum * 0.82), 0.35) * vec3(0.82, 1.0, 1.0);
        vec3 V = normalize(cameraPosition - w);
        float fres = mix(0.32, 1.0, pow(1.0 - clamp(V.y, 0.0, 1.0), 4.0));
        float wet = mix(0.55, 1.0, puddle) * mix(0.35, 1.0, road);
        vec3 col = base + refl * fres * wet * 0.62;
        col = applyFog(col, w, 1.0);
        col += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
        gl_FragColor = vec4(col, 1.0);
        ${OUT}
      }`,
  };
  const reflector = new Reflector(new THREE.PlaneGeometry(900, 520), {
    clipBias: 0.003,
    textureWidth: 512,
    textureHeight: 512,
    color: 0xffffff,
    multisample: 0,
    shader: roadShader,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.set(0, 0, -240);
  const rm = reflector.material as THREE.ShaderMaterial;
  // Re-link shared uniforms (the Reflector clones its shader uniforms)
  rm.uniforms.uFogA = U.uFogA;
  rm.uniforms.uFogB = U.uFogB;
  rm.uniforms.uFogDensity = U.uFogDensity;
  rm.uniforms.uTravel = U.uTravel;
  rm.uniforms.uTime = U.uTime;
  reflector.getReflectionCamera(camera).layers.disable(1); // no mirrored rain
  scene.add(reflector);

  /* ---------- Rendering pipeline ---------- */
  // Fill rate is the budget on laptop Retina screens, so with bloom on the canvas renders at 1x
  // (bloom hides the aliasing), the bloom chain runs at half its usual resolution and an adaptive
  // step-down (see frame()) kicks in if the GPU still cannot hold ~55fps.
  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  let bloomOn = useBloom;
  let dprCap = Math.min(window.devicePixelRatio || 1, useBloom ? 1.0 : 1.75);
  const bloomReady: Promise<void> = useBloom
    ? loadBloom()
        .then((P) => {
          const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 });
          composer = new P.EffectComposer(renderer, rt);
          composer.addPass(new P.RenderPass(scene, camera));
          bloom = new P.UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.38, 0.74);
          const bloomSetSize = bloom.setSize.bind(bloom);
          bloom.setSize = (bw: number, bh: number) => bloomSetSize(Math.max(4, Math.round(bw * 0.5)), Math.max(4, Math.round(bh * 0.5)));
          composer.addPass(bloom);
          composer.addPass(new P.OutputPass());
        })
        .catch(() => {
          bloomOn = false;
        })
    : Promise.resolve();

  /* ---------- Camera state ---------- */
  const state = {
    scrollT: 0,
    scroll: 0,
    px: 0,
    py: 0,
    tpx: 0,
    tpy: 0,
    intro: reduced ? 1 : 0,
    introPlaying: reduced,
    shiftX: 0,
    shiftY: 0,
  };
  const look = new THREE.Vector3();

  function applyShift() {
    camera.projectionMatrix.elements[8] = state.shiftX;
    camera.projectionMatrix.elements[9] = state.shiftY;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  function updateCamera() {
    const e = 1 - Math.pow(1 - state.intro, 4);
    const back = 1 - e;
    const p = state.scroll;
    camera.position.set(
      CAM_X + state.px * 1.5,
      CAM_Y + state.py * 0.5 + p * 3.4 + back * 3.2,
      CAM_Z - p * 30 + back * 26,
    );
    look.set(CAM_X + state.px * 0.5, camera.position.y + 0.15 - p * 1.6 - back * 1.2, camera.position.z - 140);
    camera.lookAt(look);
    sky.position.copy(camera.position);
    (rainMat.uniforms.uCam.value as THREE.Vector3).copy(camera.position);
  }

  function render() {
    if (composer && bloomOn) composer.render();
    else renderer.render(scene, camera);
  }

  let firstFrameSent = false;
  function afterFrame() {
    if (firstFrameSent) return;
    firstFrameSent = true;
    requestAnimationFrame(() => opts.onFirstFrame?.());
  }

  function step(dt: number) {
    U.uTime.value += dt;
    U.uTravel.value += dt * (15 + state.scroll * 10);
    const k = 1 - Math.exp(-dt * 2.4);
    state.px += (state.tpx - state.px) * k;
    state.py += (state.tpy - state.py) * k;
    state.scroll += (state.scrollT - state.scroll) * (1 - Math.exp(-dt * 5));
    if (state.introPlaying && state.intro < 1) state.intro = Math.min(1, state.intro + dt / 4.2);
    updateCamera();
  }

  /* ---------- Size ---------- */
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = dprCap;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    // Phones: a wider lens keeps the Needle's spire clear of the header band
    camera.fov = aspect < 0.7 ? 66 : aspect < 1.15 ? 52 : 42;
    camera.updateProjectionMatrix();
    // Oncoming headlights converge where the mobile eyebrow sits, so they are calmer on tall screens
    U.uHeadGain.value = aspect < 0.7 ? 0.5 : 1;
    // Lens shift: horizon sits low-centre on desktop, high on phones (headline sits below it).
    // On squarer landscape screens (4:3 tablets, small laptops) the Needle would slide behind the
    // quote card, so the frame eases left as the aspect narrows; 16:10 and wider are unchanged.
    const wide = THREE.MathUtils.clamp((aspect - 1.25) / (1.6 - 1.25), 0, 1);
    state.shiftX = aspect < 1.15 ? 0 : THREE.MathUtils.lerp(0.06, -0.12, wide);
    state.shiftY = aspect < 0.7 ? -0.3 : aspect < 1.15 ? -0.12 : 0.16;
    applyShift();
    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    U.uPointScale.value = (h * dpr) / (2 * Math.tan(fovRad / 2));
    U.uPixel.value = (2 * Math.tan(fovRad / 2)) / (h * dpr);
    reflector.getRenderTarget().setSize(Math.max(2, Math.round(w * dpr * 0.35)), Math.max(2, Math.round(h * dpr * 0.35)));
    if (composer && bloomOn) {
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
    }
    canvas.dataset.quality = `${dpr.toFixed(2)}${bloomOn ? '+bloom' : ''}${minFrameMs ? '@30' : ''}`;
    // Nothing is drawn until the shaders have compiled off the main thread (see "Start" below)
    if (compiled && (reduced || !running)) {
      updateCamera();
      render();
      afterFrame();
    }
  }

  /* ---------- Loop ---------- */
  let raf = 0;
  let last = 0;
  let running = false;
  let active = true;
  let compiled = false;
  let disposed = false;

  /* Adaptive quality: once the intro is under way, sample ~90 frames; if the trimmed mean frame
     time is over budget, step down (DPR first, then bloom) and measure again. */
  let perfSamples: number[] = [];
  let perfWarm = 0;
  let perfDone = reduced;
  function degrade(): boolean {
    if (composer && bloomOn && composer.renderTarget1.samples > 0) {
      for (const t of [composer.renderTarget1, composer.renderTarget2]) {
        t.samples = 0;
        t.dispose();
      }
      canvas.dataset.quality = `${dprCap.toFixed(2)}+bloom-noaa`;
      return true;
    }
    if (bloomOn && dprCap > 0.85) dprCap = Math.max(0.75, +(dprCap * 0.8).toFixed(2));
    else if (bloomOn) bloomOn = false;
    else if (dprCap > 0.8) dprCap = Math.max(0.75, +(dprCap * 0.75).toFixed(2));
    else return false;
    resize();
    return true;
  }
  function sampleFrame(ms: number) {
    if (perfDone || !state.introPlaying) return;
    if (perfWarm < 40) {
      perfWarm++;
      return;
    }
    perfSamples.push(ms);
    if (perfSamples.length < 90) return;
    const s = perfSamples.sort((a, b) => a - b).slice(9, 81);
    const mean = s.reduce((a, b) => a + b, 0) / s.length;
    perfSamples = [];
    perfWarm = 20;
    // budget: ~55fps, or the 30fps cap plus a little slack on phones
    if (mean <= (minFrameMs ? minFrameMs + 3.5 : 18.5) || !degrade()) perfDone = true;
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    // frame cap (phones): skip display refreshes until the next 30fps slot is due
    if (minFrameMs && now - last < minFrameMs - 2) return;
    const ms = now - last;
    const dt = Math.min(0.05, Math.max(0, ms / 1000));
    last = now;
    step(dt);
    render();
    afterFrame();
    sampleFrame(ms);
  }
  function sync() {
    const should = compiled && active && !document.hidden && !reduced && !lost && !disposed;
    if (should && !running) {
      running = true;
      last = performance.now();
      perfSamples = [];
      perfWarm = 0;
      raf = requestAnimationFrame(frame);
    } else if (!should && running) {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  let lost = false;
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    sync();
    opts.onContextLost?.();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  const onVis = () => sync();
  document.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);

  // Warm up: advance a little so trails are spread out and size the canvas (nothing is drawn yet).
  U.uTime.value = 6;
  U.uTravel.value = 40;
  updateCamera();
  resize();

  /* ---------- Start ----------
     Compile every scene shader in parallel (KHR_parallel_shader_compile) before the first draw, so the
     first frame never blocks the main thread on a synchronous program link. Programs differ by target:
     drawing into a render target (the road reflection, and the bloom composer's scene pass) uses the
     linear, un-tonemapped variant; drawing straight to the canvas (no bloom) uses the tonemapped sRGB one. */
  const compiling: Promise<unknown>[] = [bloomReady];
  renderer.setRenderTarget(reflector.getRenderTarget());
  compiling.push(renderer.compileAsync(scene, camera));
  renderer.setRenderTarget(null);
  if (!useBloom) compiling.push(renderer.compileAsync(scene, camera));
  Promise.all(compiling)
    .then(() => {
      if (disposed || lost) return;
      compiled = true;
      resize(); // draws the first frame
      sync();
      // Desktop: also warm the direct-to-canvas variant in the background, so if the adaptive quality
      // step ever turns bloom off (see degrade()) the switch does not stall on a synchronous compile.
      if (useBloom) {
        window.setTimeout(() => {
          if (!disposed && !lost) renderer.compileAsync(scene, camera).catch(() => {});
        }, 1200);
      }
    })
    .catch(() => {
      if (!disposed) opts.onContextLost?.();
    });

  return {
    setScroll(p: number) {
      state.scrollT = Math.min(1, Math.max(0, p));
    },
    setPointer(x: number, y: number) {
      state.tpx = x;
      state.tpy = y;
    },
    playIntro() {
      state.introPlaying = true;
    },
    setActive(on: boolean) {
      active = on;
      sync();
    },
    dispose() {
      active = false;
      disposed = true;
      sync();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', onLost);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
      reflector.getRenderTarget().dispose();
      composer?.dispose();
      renderer.dispose();
    },
  };
}
