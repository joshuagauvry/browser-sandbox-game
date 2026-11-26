import * as THREE from 'three';

const canvas = document.querySelector('#game');
const startScreen = document.querySelector('#start-screen');
const playButton = document.querySelector('#play-button');
const hotbar = document.querySelector('#hotbar');
const blockCount = document.querySelector('#block-count');
const message = document.querySelector('#message');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x79b7dd);
scene.fog = new THREE.Fog(0x79b7dd, 28, 55);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);

scene.add(new THREE.HemisphereLight(0xdff5ff, 0x607a46, 2.2));
const sun = new THREE.DirectionalLight(0xfff1c7, 2.5);
sun.position.set(-12, 25, 18);
sun.castShadow = true;
sun.shadow.camera.left = sun.shadow.camera.bottom = -30;
sun.shadow.camera.right = sun.shadow.camera.top = 30;
scene.add(sun);

const colors = [
  { name: 'Grass', color: 0x64a94b },
  { name: 'Dirt', color: 0x8b6041 },
  { name: 'Stone', color: 0x777a7d },
  { name: 'Brick', color: 0xc76b51 },
];
let selected = 0;

colors.forEach((item, i) => {
  const slot = document.createElement('div');
  slot.className = 'slot' + (i === 0 ? ' selected' : '');
  slot.innerHTML = `<span>${i + 1}</span><i style="background:#${item.color.toString(16).padStart(6, '0')}"></i><b>${item.name}</b>`;
  slot.addEventListener('click', () => selectBlock(i));
  hotbar.appendChild(slot);
});

const geometry = new THREE.BoxGeometry(1, 1, 1);
const materials = colors.map(item => new THREE.MeshLambertMaterial({ color: item.color }));
const world = new Map();
let placedCount = 0;

function key(x, y) { return `${x},${y}`; }

function addBlock(x, y, type = 0, placed = false) {
  const id = key(x, y);
  if (world.has(id)) return;
  const mesh = new THREE.Mesh(geometry, materials[type]);
  mesh.position.set(x, y, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.block = true;
  mesh.userData.type = type;
  mesh.userData.placed = placed;
  scene.add(mesh);
  world.set(id, mesh);
  if (placed) {
    placedCount++;
    blockCount.textContent = `Blocks: ${placedCount}`;
  }
}

function removeBlock(mesh) {
  if (!mesh?.userData.block) return;
  const p = mesh.position;
  if (mesh.userData.placed) {
    placedCount = Math.max(0, placedCount - 1);
    blockCount.textContent = `Blocks: ${placedCount}`;
  }
  world.delete(key(p.x, p.y));
  scene.remove(mesh);
}

function resetLevel() {
  [...world.values()].forEach(mesh => scene.remove(mesh));
  world.clear();
  placedCount = 0;

  for (let x = -12; x <= 12; x++) {
    if (x > -2 && x < 3) continue;
    addBlock(x, -3, x % 4 === 0 ? 2 : 0);
  }

  for (let x = 3; x <= 8; x++) addBlock(x, -1, 2);
  for (let x = 9; x <= 15; x++) addBlock(x, 1, 0);
  for (let x = 16; x <= 21; x++) addBlock(x, 3, 2);

  for (let y = -2; y <= 4; y++) {
    addBlock(-12, y, 2);
  }

  player.position.set(-9, 0, 0);
  playerVelocity.set(0, 0, 0);
  won = false;
  message.classList.remove('show');
  blockCount.textContent = 'Blocks: 0';
}

const player = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.38, 0.65, 4, 8),
  new THREE.MeshLambertMaterial({ color: 0xf4c542 })
);
body.castShadow = true;
player.add(body);

const eyeGeometry = new THREE.SphereGeometry(0.07);
const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x242424 });
const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
leftEye.position.set(-0.12, 0.35, 0.34);
rightEye.position.set(0.12, 0.35, 0.34);
player.add(leftEye, rightEye);
scene.add(player);

const portal = new THREE.Group();
const portalRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.75, 0.12, 12, 32),
  new THREE.MeshBasicMaterial({ color: 0x8df1ff })
);
portalRing.position.y = 0.8;
portal.add(portalRing);
const portalGlow = new THREE.PointLight(0x76efff, 2, 5);
portal.add(portalGlow);
portal.position.set(21, 4.6, 0);
scene.add(portal);

const backgroundBlocks = new THREE.Group();
for (let x = -18; x <= 28; x += 3) {
  for (let y = -5; y <= 9; y += 3) {
    if ((x + y) % 6 === 0) {
      const block = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0x82bca8 }));
      block.position.set(x, y, -5);
      block.scale.setScalar(0.8);
      backgroundBlocks.add(block);
    }
  }
}
scene.add(backgroundBlocks);

let won = false;
const playerVelocity = new THREE.Vector3();
const keys = {};

function selectBlock(index) {
  selected = index;
  [...hotbar.children].forEach((slot, i) => slot.classList.toggle('selected', i === index));
}

playButton.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  canvas.focus();
});

addEventListener('keydown', event => {
  keys[event.code] = true;
  if (/^Digit[1-4]$/.test(event.code)) selectBlock(Number(event.code.slice(-1)) - 1);
  if (event.code === 'KeyR') resetLevel();
});
addEventListener('keyup', event => { keys[event.code] = false; });
addEventListener('wheel', event => selectBlock((selected + (event.deltaY > 0 ? 1 : -1) + colors.length) % colors.length));

canvas.addEventListener('contextmenu', event => event.preventEvent?.());
canvas.addEventListener('mousedown', event => {
  event.preventDefault();
  if (startScreen.classList.contains('hidden') === false) return;

  const rect = canvas.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  raycaster.far = 30;
  const hits = raycaster.intersectObjects([...world.values()], false);
  if (!hits.length) {
    if (event.button === 2) {
      const point = raycaster.ray.at(10, new THREE.Vector3());
      addBlock(Math.round(point.x), Math.round(point.y), selected, true);
    }
    return;
  }

  const hit = hits[0];
  if (event.button === 0) {
    removeBlock(hit.object);
  } else if (event.button === 2) {
    const point = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.5));
    addBlock(Math.round(point.x), Math.round(point.y), selected, true);
  }
});

resetLevel();

function isSolid(x, y) {
  return world.has(key(Math.round(x), Math.round(y)));
}

let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (!startScreen.classList.contains('hidden') === false && !won) {
    const left = keys.KeyA || keys.ArrowLeft;
    const right = keys.KeyD || keys.ArrowRight;
    const move = Number(right) - Number(left);
    playerVelocity.x = THREE.MathUtils.damp(playerVelocity.x, move * 6, 12, dt);

    const grounded = isSolid(player.position.x, player.position.y - 1.05);
    if ((keys.Space || keys.KeyW || keys.ArrowUp) && grounded) {
      playerVelocity.y = 8.2;
    }

    playerVelocity.y -= 20 * dt;
    player.position.x += playerVelocity.x * dt;
    if (isSolid(player.position.x + (playerVelocity.x > 0 ? 0.42 : -0.42), player.position.y)) {
      player.position.x -= playerVelocity.x * dt;
      playerVelocity.x = 0;
    }

    player.position.y += playerVelocity.y * dt;
    if (playerVelocity.y < 0 && isSolid(player.position.x, player.position.y - 0.95)) {
      player.position.y = Math.round(player.position.y - 0.95) + 0.95;
      playerVelocity.y = 0;
    }
    if (playerVelocity.y > 0 && isSolid(player.position.x, player.position.y + 0.95)) {
      player.position.y = Math.round(player.position.y + 0.95) - 0.95;
      playerVelocity.y = 0;
    }

    if (player.position.x < -17) player.position.x = -17;
    if (player.position.y < -8) {
      player.position.set(-9, 0, 0);
      playerVelocity.set(0, 0, 0);
    }

    if (player.position.distanceTo(portal.position) < 1.35) {
      won = true;
      message.textContent = 'Portal reached! You win — keep building.';
      message.classList.add('show');
    }

    portal.rotation.z += dt * 0.8;
  }

  const cameraTarget = new THREE.Vector3(player.position.x, player.position.y + 1.5, 12);
  camera.position.lerp(cameraTarget, 1 - Math.pow(0.001, dt));
  camera.lookAt(player.position.x, player.position.y + 1, 0);

  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
