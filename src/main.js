import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

const canvas = document.querySelector('#game');
const startScreen = document.querySelector('#start-screen');
const playButton = document.querySelector('#play-button');
const hotbar = document.querySelector('#hotbar');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87c7ee);
scene.fog = new THREE.Fog(0x87c7ee, 30, 75);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 150);
camera.position.set(16, 12, 16);

const controls = new PointerLockControls(camera, document.body);
playButton.addEventListener('click', () => controls.lock());
controls.addEventListener('lock', () => startScreen.classList.add('hidden'));
controls.addEventListener('unlock', () => startScreen.classList.remove('hidden'));

scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x7b9a52, 2));
const sun = new THREE.DirectionalLight(0xfff4d6, 2.2);
sun.position.set(25, 45, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -35;
sun.shadow.camera.right = sun.shadow.camera.top = 35;
scene.add(sun);

const colors = [
  { name: 'Grass', color: 0x64a94b },
  { name: 'Dirt', color: 0x8b6041 },
  { name: 'Stone', color: 0x777a7d },
  { name: 'Wood', color: 0x9c7044 },
  { name: 'Sand', color: 0xe0c778 },
];
let selected = 0;

colors.forEach((item, i) => {
  const slot = document.createElement('div');
  slot.className = 'slot' + (i === 0 ? ' selected' : '');
  slot.innerHTML = `<span>${i + 1}</span><i style="background:#${item.color.toString(16).padStart(6, '0')}"></i><b>${item.name}</b>`;
  hotbar.appendChild(slot);
});

const geometry = new THREE.BoxGeometry(1, 1, 1);
const materials = colors.map(item => new THREE.MeshLambertMaterial({ color: item.color }));
const world = new Map();

function key(x, y, z) { return `${x},${y},${z}`; }

function noise(x, z) {
  return Math.floor(4 + Math.sin(x * 0.32) * 2 + Math.cos(z * 0.28) * 2 + Math.sin((x + z) * 0.16));
}

function addBlock(x, y, z, type = 0) {
  const id = key(x, y, z);
  if (world.has(id)) return;
  const mesh = new THREE.Mesh(geometry, materials[type]);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.block = true;
  mesh.userData.type = type;
  scene.add(mesh);
  world.set(id, mesh);
}

function removeBlock(mesh) {
  if (!mesh?.userData.block) return;
  const p = mesh.position;
  world.delete(key(p.x, p.y, p.z));
  scene.remove(mesh);
}

for (let x = -24; x <= 24; x++) {
  for (let z = -24; z <= 24; z++) {
    const height = noise(x, z);
    for (let y = -2; y <= height; y++) {
      const type = y === height ? 0 : y > height - 3 ? 1 : 2;
      addBlock(x, y, z, type);
    }
    if ((x * 17 + z * 31) % 29 === 0 && height > 4) {
      for (let y = height + 1; y < height + 5; y++) addBlock(x, y, z, 3);
    }
  }
}

const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);

canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('mousedown', event => {
  if (!controls.isLocked) return;
  raycaster.setFromCamera(center, camera);
  raycaster.far = 7;
  const hits = raycaster.intersectObjects([...world.values()], false);
  if (!hits.length) return;

  const hit = hits[0];
  if (event.button === 0) {
    removeBlock(hit.object);
  } else if (event.button === 2) {
    const p = hit.object.position.clone().add(hit.face.normal);
    if (p.distanceTo(camera.position) < 1.7) return;
    addBlock(Math.round(p.x), Math.round(p.y), Math.round(p.z), selected);
  }
});

const keys = {};
addEventListener('keydown', event => {
  keys[event.code] = true;
  if (/^Digit[1-5]$/.test(event.code)) selectBlock(Number(event.code.slice(-1)) - 1);
  if (event.code === 'KeyQ') flying = !flying;
});
addEventListener('keyup', event => { keys[event.code] = false; });

let selectedSlot = 0;
function selectBlock(index) {
  selected = selectedSlot = index;
  [...hotbar.children].forEach((slot, i) => slot.classList.toggle('selected', i === index));
}

addEventListener('wheel', event => {
  selectBlock((selected + (event.deltaY > 0 ? 1 : -1) + colors.length) % colors.length);
});

let flying = false;
const velocity = new THREE.Vector3();
let last = performance.now();

function isSolid(pos) {
  return world.has(key(Math.round(pos.x), Math.round(pos.y), Math.round(pos.z)));
}

function grounded() {
  const p = camera.position;
  return isSolid(new THREE.Vector3(p.x, p.y - 1.7, p.z));
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (controls.isLocked) {
    const speed = (keys.ShiftLeft ? 9 : 5.5) * dt;
    const forward = Number(keys.KeyW) - Number(keys.KeyS);
    const right = Number(keys.KeyD) - Number(keys.KeyA);

    controls.moveForward(forward * speed);
    controls.moveRight(right * speed);

    if (flying) {
      velocity.y = (Number(keys.Space) - Number(keys.ShiftLeft)) * 7;
      camera.position.y += velocity.y * dt;
    } else {
      velocity.y -= 18 * dt;
      if (keys.Space && grounded()) velocity.y = 7;
      camera.position.y += velocity.y * dt;
      if (camera.position.y < 11) camera.position.y = 11;
    }

    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -23.5, 23.5);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -23.5, 23.5);
  }

  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
