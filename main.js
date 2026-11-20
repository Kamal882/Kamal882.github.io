import * as THREE from "three";

document.getElementById("year").textContent = new Date().getFullYear();

const canvas = document.getElementById("bg");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
  canvas.style.display = "none"; // page still works without WebGL
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x07070d, 0.012);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 9, 13);

/*
  Full-screen background: a rippling field of glowing points (like a digital ocean)
  that fills the whole view, with a few faint wireframe shapes drifting above it.
  The mouse creates ripples; scrolling moves the waves.
*/
const COLS = 150, ROWS = 100;
const SIZE_X = 110, SIZE_Z = 90;
const count = COLS * ROWS;
const basePos = new Float32Array(count * 2); // x, z
const positions = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);
for (let i = 0; i < ROWS; i++) {
  for (let j = 0; j < COLS; j++) {
    const k = i * COLS + j;
    const x = (j / (COLS - 1) - 0.5) * SIZE_X;
    const z = (i / (ROWS - 1) - 0.5) * SIZE_Z - 8;
    basePos[k * 2] = x; basePos[k * 2 + 1] = z;
    positions[k * 3] = x; positions[k * 3 + 2] = z;
  }
}
const geo = new THREE.BufferGeometry();
geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
// Round soft dot texture
const dot = document.createElement("canvas");
dot.width = dot.height = 64;
const dctx = dot.getContext("2d");
const grad = dctx.createRadialGradient(32, 32, 0, 32, 32, 32);
grad.addColorStop(0, "rgba(255,255,255,1)");
grad.addColorStop(0.4, "rgba(255,255,255,0.8)");
grad.addColorStop(1, "rgba(255,255,255,0)");
dctx.fillStyle = grad; dctx.fillRect(0, 0, 64, 64);
const field = new THREE.Points(
  geo,
  new THREE.PointsMaterial({ size: 0.17, map: new THREE.CanvasTexture(dot), vertexColors: true, transparent: true, opacity: 1, depthWrite: false })
);
scene.add(field);

const cLow = new THREE.Color(0x4b2fd1);   // deep violet
const cHigh = new THREE.Color(0x22d3ee);  // cyan
const tmp = new THREE.Color();

// Faint wireframe shapes drifting above the field
const shapes = [];
const shapeGeos = [
  new THREE.IcosahedronGeometry(2.2, 0),
  new THREE.OctahedronGeometry(2, 0),
  new THREE.TorusGeometry(1.8, 0.4, 12, 40),
  new THREE.TetrahedronGeometry(2.2, 0),
  new THREE.IcosahedronGeometry(1.6, 1),
  new THREE.BoxGeometry(2.4, 2.4, 2.4),
];
shapeGeos.forEach((g, i) => {
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: i % 2 ? 0x22d3ee : 0x7c5cff, wireframe: true, transparent: true, opacity: 0.22 }));
  m.position.set((i / (shapeGeos.length - 1) - 0.5) * 34 + (Math.random() - 0.5) * 4, 2.5 + Math.random() * 3, -4 - Math.random() * 12);
  m.userData = { speed: 0.1 + Math.random() * 0.25, bob: Math.random() * 6, baseY: m.position.y };
  scene.add(m);
  shapes.push(m);
});

// Input
const mouse = { x: 0, y: 0 };
const ripple = new THREE.Vector2(999, 999); // mouse position projected onto the field
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();
window.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  if (raycaster.ray.intersectPlane(groundPlane, hit)) ripple.set(hit.x, hit.z);
});

let scrollProgress = 0;
function updateScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress = max > 0 ? window.scrollY / max : 0;
}
window.addEventListener("scroll", updateScroll, { passive: true });
updateScroll();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function tick() {
  const t = reduceMotion ? 0 : clock.getElapsedTime();
  const phase = t * 0.7 + scrollProgress * 12;

  for (let k = 0; k < count; k++) {
    const x = basePos[k * 2], z = basePos[k * 2 + 1];
    let y =
      Math.sin(x * 0.22 + phase) * 1.5 +
      Math.sin(z * 0.28 + phase * 0.8) * 1.3 +
      Math.sin((x + z) * 0.12 + phase * 0.5) * 0.7;

    const dx = x - ripple.x, dz = z - ripple.y;
    const d = Math.sqrt(dx * dx + dz * dz);
    y += Math.sin(d * 1.4 - t * 4) * Math.exp(-d * 0.35) * 1.6;

    positions[k * 3 + 1] = y;
    tmp.copy(cLow).lerp(cHigh, THREE.MathUtils.clamp((y + 2.5) / 5.5, 0, 1));
    colors[k * 3] = tmp.r; colors[k * 3 + 1] = tmp.g; colors[k * 3 + 2] = tmp.b;
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.color.needsUpdate = true;

  shapes.forEach((s) => {
    s.rotation.x = t * s.userData.speed;
    s.rotation.y = t * s.userData.speed * 1.3;
    s.position.y = s.userData.baseY + Math.sin(t * 0.6 + s.userData.bob) * 0.6;
  });

  camera.position.x += (mouse.x * 2 - camera.position.x) * 0.04;
  camera.position.y += (9 + mouse.y * 1.2 - camera.position.y) * 0.04;
  camera.lookAt(0, -2, -3);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
