"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { seatsUsed, type Fixture, type SeatingPlan, type SeatTable } from "@/lib/domain/planner";
import { chairSpots, tableSize } from "./venue-designer";

/**
 * The hall in 3D: walk around it, look from the entrance or from the
 * Poruwa, and see filled seats as little guests. Evening mode lights the
 * candles, chandeliers and fairy lights.
 */

export type CameraPreset = "entrance" | "poruwa" | "above" | "guest";

interface Props {
  plan: SeatingPlan;
  colors: string[];
  partySize: (id: string) => number;
  evening: boolean;
  preset: CameraPreset;
  presetKey: number;
  autoRotate: boolean;
  onPickTable?: (id: string) => void;
}

const GUEST_COLORS = ["#c98b8f", "#8fa58a", "#a8875a", "#7d8fb3", "#b58aa8", "#d8a27a", "#6f8f8a"];

function colorOr(c: string | undefined, fallback: string) {
  return c && /^#[0-9a-f]{6}$/i.test(c) ? c : fallback;
}

function labelSprite(text: string, color = "#3a2a2c") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(255,253,249,0.92)";
  const r = 40;
  ctx.beginPath();
  ctx.roundRect(8, 12, 240, 72, r);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = "600 38px Manrope, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.length > 12 ? `${text.slice(0, 11)}…` : text, 128, 50);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Same size on screen however far away, so labels never fill the view.
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, sizeAttenuation: false }));
  sprite.scale.set(0.085, 0.032, 1);
  return sprite;
}

function checkerTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    ctx.fillStyle = (x + y) % 2 ? "#2a2430" : "#f4efe6";
    ctx.fillRect(x * 16, y * 16, 16, 16);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function buildScene(plan: SeatingPlan, colors: string[], partySize: (id: string) => number, evening: boolean) {
  const scene = new THREE.Scene();
  const W = plan.width;
  const D = plan.depth;
  const O = plan.outdoorDepth ?? 0;
  const main = colorOr(colors[0], "#b9787f");
  const gold = colorOr(colors[3] ?? colors[1], "#c9a24a");
  const soft = colorOr(colors[1], "#dcc6a2");
  const tables: THREE.Object3D[] = [];
  const pos = (x: number, y: number) => new THREE.Vector3(x - W / 2, 0, y - D / 2);

  scene.background = new THREE.Color(evening ? "#1b1622" : "#f4ede4");
  scene.fog = new THREE.Fog(scene.background, 40, 110);

  // Light
  scene.add(new THREE.HemisphereLight(evening ? "#ffe2c0" : "#ffffff", evening ? "#3a2c34" : "#d9cbb8", evening ? 1.0 : 1.2));
  const sun = new THREE.DirectionalLight(evening ? "#ffcf9a" : "#fff6e8", evening ? 0.5 : 1.4);
  sun.position.set(-W * 0.4, 22, D * 0.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const span = Math.max(W, D + O) * 0.7;
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, far: 80 });
  scene.add(sun);

  const mat = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
  const add = (mesh: THREE.Mesh, parent: THREE.Object3D = scene) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Floor and walls
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat("#f6efe4", { roughness: 0.4, metalness: 0.02 })));
  floor.rotation.x = -Math.PI / 2;
  const wallMat = mat(evening ? "#3a2c34" : "#f7f0e6", { side: THREE.DoubleSide });
  const wallH = 4.2;
  const back = add(new THREE.Mesh(new THREE.PlaneGeometry(W, wallH), wallMat));
  back.position.set(0, wallH / 2, -D / 2);
  for (const sx of [-1, 1]) {
    const side = add(new THREE.Mesh(new THREE.PlaneGeometry(D, wallH), wallMat));
    side.rotation.y = (sx * Math.PI) / 2;
    side.position.set((-sx * W) / 2, wallH / 2, 0);
  }
  // Drapes along the back wall
  for (let x = -W / 2 + 1; x < W / 2; x += 2) {
    const drape = add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, wallH - 0.2, 12, 1, true, 0, Math.PI), mat(evening ? "#fff6ea" : "#ffffff", { side: THREE.DoubleSide, roughness: 0.9 })));
    drape.position.set(x, wallH / 2, -D / 2 + 0.3);
  }

  // Outdoor: lawn, then the lake
  if (O > 0) {
    const lawn = add(new THREE.Mesh(new THREE.PlaneGeometry(W + 6, O), mat(evening ? "#8fb27d" : "#a9c99a", { roughness: 1 })));
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(0, -0.01, D / 2 + O / 2);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(W * 4, 40), new THREE.MeshStandardMaterial({ color: evening ? "#1d2f45" : "#7fa6c4", roughness: 0.15, metalness: 0.4 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.05, D / 2 + O + 20);
    scene.add(water);
    // Fairy lights over the lawn
    const bulb = new THREE.MeshStandardMaterial({ color: "#fff3c4", emissive: "#ffd27a", emissiveIntensity: evening ? 2.2 : 0.3 });
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), bulb);
        b.position.set(-W / 2 + t * W, 3.2 - Math.sin(t * Math.PI) * 0.6, D / 2 + ((row + 1) * O) / 4);
        scene.add(b);
      }
    }
  } else {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(W * 4, D * 4), mat(evening ? "#241d28" : "#e9e0d2"));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    scene.add(ground);
  }

  // Chandeliers
  const glow = new THREE.MeshStandardMaterial({ color: "#fff6dc", emissive: "#ffd99a", emissiveIntensity: evening ? 1.8 : 0.4 });
  for (let x = -W / 2 + W / 6; x < W / 2; x += W / 3) {
    for (let z = -D / 2 + D / 4; z < D / 2; z += D / 2) {
      const ch = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), glow);
      ch.position.set(x, wallH - 0.3, z);
      scene.add(ch);
      if (evening) {
        const pl = new THREE.PointLight("#ffd5a0", 10, 16, 1.4);
        pl.position.copy(ch.position);
        scene.add(pl);
      }
    }
  }

  // Fixtures
  const dance = checkerTexture();
  for (const f of plan.fixtures) addFixture(f);

  function addFixture(f: Fixture) {
    const g = new THREE.Group();
    g.position.copy(pos(f.x, f.y));
    g.rotation.y = (-(f.rotation ?? 0) * Math.PI) / 180;
    scene.add(g);
    const box = (w: number, h: number, d: number, color: string | THREE.Material, y = h / 2) => {
      const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === "string" ? mat(color) : color), g);
      m.position.y = y;
      return m;
    };
    switch (f.kind) {
      case "poruwa": {
        box(f.w, 0.35, f.h, "#fffaf3");
        box(f.w * 0.92, 0.12, f.h * 0.92, mat("#f3e6cc", { roughness: 0.5 }), 0.41);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const p = add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.6, 12), mat("#fffaf0")), g);
          p.position.set((sx * f.w) / 2.3, 1.65, (sz * f.h) / 2.3);
          const flowers = add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), mat(soft)), g);
          flowers.position.set((sx * f.w) / 2.3, 2.9, (sz * f.h) / 2.3);
        }
        const roof = add(new THREE.Mesh(new THREE.ConeGeometry(Math.max(f.w, f.h) * 0.78, 1.1, 4), mat("#f4e6c8", { roughness: 0.5 })), g);
        roof.position.y = 3.5;
        roof.rotation.y = Math.PI / 4;
        const finial = add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), mat(gold, { metalness: 0.7, roughness: 0.3 })), g);
        finial.position.y = 4.1;
        // The couple
        const bride = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.0, 6, 12), mat("#fbf3e4")), g);
        bride.position.set(0.3, 1.2, 0);
        const groom = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 1.05, 6, 12), mat("#4a4450")), g);
        groom.position.set(-0.3, 1.22, 0);
        // Warm light over the couple (strong at night).
        const spot = new THREE.PointLight("#fff1d6", evening ? 14 : 4, 9, 1.3);
        spot.position.set(0, 3.1, 0);
        g.add(spot);
        break;
      }
      case "dance": {
        const m = box(f.w, 0.05, f.h, new THREE.MeshStandardMaterial({ map: dance, roughness: 0.25, metalness: 0.2 }));
        dance.repeat.set(f.w / 2, f.h / 2);
        m.receiveShadow = true;
        break;
      }
      case "band": box(f.w, 0.5, f.h, "#3a3340"); break;
      case "bar": {
        box(f.w, 1.1, f.h, "#2f2a33");
        box(f.w * 1.02, 0.06, f.h * 1.1, mat(gold, { metalness: 0.6, roughness: 0.3 }), 1.13);
        box(f.w * 0.96, 0.05, 0.05, new THREE.MeshStandardMaterial({ color: "#fff", emissive: soft, emissiveIntensity: evening ? 1.5 : 0.3 }), 0.95).position.z = f.h / 2 + 0.01;
        break;
      }
      case "buffet": case "head": case "gift": {
        box(f.w, 0.76, f.h, "#ffffff");
        box(f.w, 0.06, f.h * 0.3, mat(main), 0.79);
        break;
      }
      case "cake": {
        for (let i = 0; i < 3; i++) {
          const tier = add(new THREE.Mesh(new THREE.CylinderGeometry(0.35 - i * 0.09, 0.35 - i * 0.09, 0.22, 24), mat(i === 1 ? soft : "#fffaf3")), g);
          tier.position.y = 0.85 + i * 0.22;
        }
        box(f.w * 0.6, 0.75, f.h * 0.6, "#ffffff");
        break;
      }
      case "arch": {
        const arch = add(new THREE.Mesh(new THREE.TorusGeometry(f.w / 2, 0.12, 10, 30, Math.PI), mat(soft)), g);
        arch.position.y = 0.2;
        break;
      }
      case "flowers": {
        const stand = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.2, 10), mat(gold, { metalness: 0.6 })), g);
        stand.position.y = 0.6;
        const bunch = add(new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.3, f.w / 2), 14, 10), mat(soft)), g);
        bunch.position.y = 1.35;
        break;
      }
      case "lamp": {
        const pole = add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.22, 1.5, 12), mat(gold, { metalness: 0.75, roughness: 0.3 })), g);
        pole.position.y = 0.75;
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: "#ffd27a", emissive: "#ffb347", emissiveIntensity: 3 }));
        flame.position.y = 1.62;
        g.add(flame);
        if (evening) {
          const pl = new THREE.PointLight("#ffb860", 3, 6, 2);
          pl.position.y = 1.7;
          g.add(pl);
        }
        break;
      }
      case "lounge": box(f.w, 0.45, f.h, soft); box(f.w, 0.5, 0.25, soft, 0.6).position.z = -f.h / 2 + 0.12; break;
      case "kids": box(f.w, 0.05, f.h, "#e6f0f8"); box(0.5, 0.5, 0.5, "#f2c4ce", 0.3).position.x = -0.5; box(0.4, 0.4, 0.4, "#a9c7e8", 0.25).position.x = 0.5; break;
      case "screen": box(f.w, 2.4, Math.max(0.1, f.h), new THREE.MeshStandardMaterial({ color: "#111", emissive: "#4a6a9a", emissiveIntensity: evening ? 0.8 : 0.2 }), 1.6); break;
      case "pillar": add(new THREE.Mesh(new THREE.CylinderGeometry(f.w / 2, f.w / 2, wallH, 16), mat("#fbf6ee")), g).position.y = wallH / 2; break;
      case "entrance": {
        box(0.2, 2.6, 0.2, "#fffaf0").position.x = -f.w / 2;
        box(0.2, 2.6, 0.2, "#fffaf0").position.x = f.w / 2;
        const top = add(new THREE.Mesh(new THREE.TorusGeometry(f.w / 2, 0.1, 8, 24, Math.PI), mat(soft)), g);
        top.position.y = 2.6;
        break;
      }
      case "photo": box(f.w, 2.2, 0.15, soft, 1.1); break;
    }
    if (f.kind !== "pillar" && f.kind !== "flowers" && f.kind !== "lamp") {
      const s = labelSprite(f.label);
      s.position.y = f.kind === "poruwa" ? 4.7 : 2.4;
      g.add(s);
    }
  }

  // Tables, chairs and guests
  const cloth = mat("#ffffff", { roughness: 0.85 });
  const sash = mat(main, { roughness: 0.6 });
  const chairMat = mat("#fbf7f0", { roughness: 0.8 });
  const candle = new THREE.MeshStandardMaterial({ color: "#fff3d6", emissive: "#ffcf80", emissiveIntensity: evening ? 2.5 : 0.2 });
  let colorIndex = 0;
  for (const t of plan.tables) addTable(t);

  function addTable(t: SeatTable) {
    const g = new THREE.Group();
    g.position.copy(pos(t.x, t.y));
    g.rotation.y = (-(t.rotation ?? 0) * Math.PI) / 180;
    g.userData.tableId = t.id;
    scene.add(g);
    tables.push(g);
    const [w, h] = tableSize(t);
    if (t.shape === "round") {
      add(new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2 + 0.08, 0.76, 32), cloth), g).position.y = 0.38;
    } else {
      add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.76, h), cloth), g).position.y = 0.38;
    }
    // Centrepiece
    const vase = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.35, 12), mat(gold, { metalness: 0.6, roughness: 0.3 })), g);
    vase.position.y = 0.94;
    const bloom = add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), mat(soft)), g);
    bloom.position.y = 1.2;
    for (const dx of [-0.25, 0.25]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), candle);
      c.position.set(dx, 0.83, 0.1);
      g.add(c);
    }
    // Chairs, with a little guest in each taken seat
    const used = seatsUsed(t, partySize);
    chairSpots(t).forEach((c, i) => {
      const chair = new THREE.Group();
      chair.position.set(c.x, 0, c.y);
      chair.rotation.y = Math.atan2(c.x, c.y) + Math.PI;
      g.add(chair);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), chairMat), chair).position.y = 0.46;
      const backRest = add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.06), chairMat), chair);
      backRest.position.set(0, 0.76, 0.19);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.07), sash), chair).position.set(0, 0.72, 0.21);
      if (i < used) {
        const person = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.42, 4, 10), mat(GUEST_COLORS[colorIndex++ % GUEST_COLORS.length])), chair);
        person.position.set(0, 0.85, 0.05);
        const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat("#c99a6e")), chair);
        head.position.set(0, 1.25, 0.05);
      }
    });
    const label = labelSprite(`${t.label} · ${used}/${t.seats}`, used > t.seats ? "#a0262e" : "#3a2a2c");
    label.position.y = 1.9;
    g.add(label);
  }

  const at = (kind: Fixture["kind"]) => {
    const f = plan.fixtures.find((x) => x.kind === kind);
    return f ? pos(f.x, f.y) : null;
  };
  const firstTable = plan.tables[0] ? pos(plan.tables[0].x, plan.tables[0].y) : null;
  return { scene, tables, W, D, O, poruwa: at("poruwa"), entrance: at("entrance"), seat: firstTable };
}

type Spot = THREE.Vector3 | null;

/** Camera spots worked out from where things actually are in this hall. */
function presets(W: number, D: number, O: number, poruwa: Spot, entrance: Spot, seat: Spot): Record<CameraPreset, { pos: THREE.Vector3; target: THREE.Vector3 }> {
  const centre = new THREE.Vector3(0, 1, 0);
  const p = poruwa ?? new THREE.Vector3(0, 0, -D / 2 + 3);
  const e = entrance ?? new THREE.Vector3(0, 0, D / 2 - 1);
  // From the entrance, step back a little and look towards the Poruwa.
  const dirIn = p.clone().sub(e).setY(0).normalize();
  const fromPoruwa = centre.clone().sub(p).setY(0).normalize();
  const s = seat ?? new THREE.Vector3(-W / 4, 0, 0);
  return {
    entrance: { pos: e.clone().addScaledVector(dirIn, -1.5).setY(2.4), target: p.clone().setY(1.4) },
    poruwa: { pos: p.clone().addScaledVector(fromPoruwa, 2.2).setY(1.9), target: centre.clone().addScaledVector(fromPoruwa, 4) },
    above: { pos: new THREE.Vector3(0, Math.max(W, D + O) * 1.1, O / 2 + Math.max(W, D + O) * 0.25), target: new THREE.Vector3(0, 0, O / 2) },
    guest: { pos: s.clone().add(new THREE.Vector3(0, 1.25, 1.3)), target: p.clone().setY(1.3) },
  };
}

export default function Venue3D({ plan, colors, partySize, evening, preset, presetKey, autoRotate, onPickTable }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ goto: (p: CameraPreset, instant?: boolean) => void; controls: OrbitControls } | null>(null);
  const [failed, setFailed] = useState(false);
  const pick = useRef(onPickTable);
  useEffect(() => {
    pick.current = onPickTable;
  }, [onPickTable]);

  // Rebuild the scene when the plan changes (cheap: a few hundred meshes).
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch {
      setTimeout(() => setFailed(true), 0);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const { scene, tables, W, D, O, poruwa, entrance, seat } = buildScene(plan, colors, partySize, evening);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 1.5;
    controls.maxDistance = Math.max(W, D + O) * 2;
    const spots = presets(W, D, O, poruwa, entrance, seat);
    let tween: { from: THREE.Vector3; to: THREE.Vector3; tFrom: THREE.Vector3; tTo: THREE.Vector3; start: number } | null = null;
    const goto = (p: CameraPreset, instant = false) => {
      const to = spots[p].pos.clone();
      const tTo = spots[p].target.clone();
      if (instant) {
        camera.position.copy(to);
        controls.target.copy(tTo);
        controls.update();
      } else tween = { from: camera.position.clone(), to, tFrom: controls.target.clone(), tTo, start: performance.now() };
    };
    goto(preset, true);
    api.current = { goto, controls };

    const size = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);

    // Tap a table to select it.
    const ray = new THREE.Raycaster();
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const hit = ray.intersectObjects(tables, true)[0];
      let o: THREE.Object3D | null = hit?.object ?? null;
      while (o && !o.userData.tableId) o = o.parent;
      if (o) pick.current?.(o.userData.tableId as string);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    let raf = 0;
    const loop = (now: number) => {
      if (tween) {
        const k = Math.min(1, (now - tween.start) / 1200);
        const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
        camera.position.lerpVectors(tween.from, tween.to, e);
        controls.target.lerpVectors(tween.tFrom, tween.tTo, e);
        if (k >= 1) tween = null;
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
          o.geometry.dispose();
          const m = o.material as THREE.Material & { map?: THREE.Texture | null };
          m.map?.dispose();
          m.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
    // Camera presets are applied separately so editing doesn't reset the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, colors, evening, partySize]);

  useEffect(() => {
    api.current?.goto(preset);
  }, [preset, presetKey]);

  useEffect(() => {
    if (!api.current) return;
    api.current.controls.autoRotate = autoRotate;
    api.current.controls.autoRotateSpeed = 0.6;
  }, [autoRotate, plan, evening]);

  if (failed) {
    return <div className="venue-3d grid place-items-center p-6 text-center text-ink-muted">3D needs WebGL, which this browser has turned off. The floor plan still works.</div>;
  }
  return <div ref={host} className="venue-3d" role="img" aria-label="3D view of the hall. Drag to look around, scroll or pinch to zoom." />;
}
