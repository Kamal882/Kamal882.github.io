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
scene.fog = new THREE.FogExp2(0x07070d, 0.028);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 15);

/*
  Scene: a microservice architecture.
  - Center: an API gateway (GraphQL) node.
  - Ring/shell: service nodes (auth, bookings, payments, ...) linked to the gateway
    and to nearby services.
  - Glowing packets travel along the links (requests flowing between services).
  - Labels name the tech: React, Next.js, Node.js, GraphQL, Java, AWS, Docker, LangChain.
*/
const world = new THREE.Group();
scene.add(world);
const isNarrow = () => window.innerWidth < 800;
world.position.x = isNarrow() ? 0 : 4.5;

const COLORS = { gateway: 0x7c5cff, service: 0x22d3ee, link: 0x4a5bd8, packet: 0xffffff };

// Gateway
const gateway = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.9, 1),
  new THREE.MeshBasicMaterial({ color: COLORS.gateway, wireframe: true })
);
world.add(gateway);
const halo = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 24, 16),
  new THREE.MeshBasicMaterial({ color: COLORS.gateway, wireframe: true, transparent: true, opacity: 0.12 })
);
world.add(halo);

// Service nodes on a fibonacci sphere shell
const NODES = 22;
const RADIUS = 4.6;
const nodes = [];
const nodeGeo = new THREE.SphereGeometry(0.16, 12, 12);
for (let i = 0; i < NODES; i++) {
  const y = 1 - (i / (NODES - 1)) * 2;
  const r = Math.sqrt(1 - y * y);
  const theta = Math.PI * (3 - Math.sqrt(5)) * i;
  const pos = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(RADIUS);
  const mesh = new THREE.Mesh(nodeGeo, new THREE.MeshBasicMaterial({ color: COLORS.service }));
  mesh.position.copy(pos);
  world.add(mesh);
  nodes.push(mesh);
}

// Links: gateway -> every service, plus service -> 2 nearest neighbours
const edges = [];
const linkVerts = [];
function addEdge(a, b) {
  edges.push([a, b]);
  linkVerts.push(a.x, a.y, a.z, b.x, b.y, b.z);
}
const origin = new THREE.Vector3();
nodes.forEach((n) => addEdge(origin, n.position));
nodes.forEach((n, i) => {
  nodes
    .map((m, j) => ({ j, d: n.position.distanceTo(m.position) }))
    .filter((o) => o.j !== i)
    .sort((a, b) => a.d - b.d)
    .slice(0, 2)
    .forEach((o) => { if (o.j > i) addEdge(n.position, nodes[o.j].position); });
});
const linkGeo = new THREE.BufferGeometry();
linkGeo.setAttribute("position", new THREE.Float32BufferAttribute(linkVerts, 3));
world.add(new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ color: COLORS.link, transparent: true, opacity: 0.35 })));

// Packets travelling along random edges
const PACKETS = 40;
const packets = [];
const packetGeo = new THREE.SphereGeometry(0.07, 8, 8);
for (let i = 0; i < PACKETS; i++) {
  const mesh = new THREE.Mesh(packetGeo, new THREE.MeshBasicMaterial({ color: COLORS.packet }));
  world.add(mesh);
  packets.push({ mesh, edge: edges[Math.floor(Math.random() * edges.length)], t: Math.random(), speed: 0.15 + Math.random() * 0.35, dir: Math.random() < 0.5 ? 1 : -1 });
}

// Tech labels as sprites
function makeLabel(text, color) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 80;
  const ctx = c.getContext("2d");
  ctx.font = "bold 40px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(10,10,20,0.75)";
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 64, 20);
  ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fillText(text, 128, 42);
  const tex = new THREE.CanvasTexture(c);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(2.2, 0.69, 1);
  return sprite;
}
const labels = ["React", "Next.js", "Node.js", "GraphQL", "Java", "AWS", "Docker", "LangChain"];
labels.forEach((text, i) => {
  const n = nodes[Math.floor((i + 0.5) * (NODES / labels.length))];
  const s = makeLabel(text, "#7c5cff");
  s.position.copy(n.position).multiplyScalar(1.22);
  world.add(s);
});

// Distant star dust
const COUNT = 1200;
const pts = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT * 3; i++) pts[i] = (Math.random() - 0.5) * 70;
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xaab4ff, size: 0.05, transparent: true, opacity: 0.7 }));
scene.add(stars);

// Input
const mouse = { x: 0, y: 0 };
window.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
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
  world.position.x = isNarrow() ? 0 : 4.5;
});

const clock = new THREE.Clock();
let last = 0;
function tick() {
  const t = clock.getElapsedTime();
  const dt = t - last; last = t;

  if (!reduceMotion) {
    world.rotation.y = t * 0.12 + scrollProgress * Math.PI * 2;
    gateway.rotation.x = t * 0.5;
    gateway.rotation.y = t * 0.7;
    halo.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
    stars.rotation.y = t * 0.01;

    packets.forEach((p) => {
      p.t += p.speed * dt * p.dir;
      if (p.t > 1 || p.t < 0) {
        p.edge = edges[Math.floor(Math.random() * edges.length)];
        p.dir = Math.random() < 0.5 ? 1 : -1;
        p.t = p.dir === 1 ? 0 : 1;
      }
      p.mesh.position.lerpVectors(p.edge[0], p.edge[1], p.t);
    });
  }

  world.rotation.x = scrollProgress * 0.6;
  camera.position.x += (mouse.x * 1.2 - camera.position.x) * 0.05;
  camera.position.y += (-mouse.y * 0.8 - camera.position.y) * 0.05;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
