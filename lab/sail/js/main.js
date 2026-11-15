const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");

let width, height;
function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener("resize", resize);
resize();

const WORLD_SEED = 1337;
const world = new World(WORLD_SEED);
const boat = new Boat(0, 0);

const camera = { x: boat.x, y: boat.y };

const input = { turn: 0, throttle: 0 };
const keyMap = {
  ArrowUp: "forward",
  KeyW: "forward",
  ArrowDown: "backward",
  KeyS: "backward",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};
const activeKeys = new Set();

function updateInputFromKeys() {
  input.throttle = 0;
  input.turn = 0;
  if (activeKeys.has("forward")) input.throttle += 1;
  if (activeKeys.has("backward")) input.throttle -= 0.6;
  if (activeKeys.has("left")) input.turn -= 1;
  if (activeKeys.has("right")) input.turn += 1;
}

window.addEventListener("keydown", (e) => {
  const action = keyMap[e.code];
  if (action) {
    activeKeys.add(action);
    updateInputFromKeys();
  }
});
window.addEventListener("keyup", (e) => {
  const action = keyMap[e.code];
  if (action) {
    activeKeys.delete(action);
    updateInputFromKeys();
  }
});

canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const worldX = sx - width / 2 + camera.x;
  const worldY = sy - height / 2 + camera.y;
  boat.setTarget(worldX, worldY);
});

const ripples = [];
let rippleTimer = 0;

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  const time = now / 1000;

  boat.update(dt, input);

  camera.x += (boat.x - camera.x) * Math.min(dt * 3, 1);
  camera.y += (boat.y - camera.y) * Math.min(dt * 3, 1);

  if (boat.speed > 20) {
    rippleTimer -= dt;
    if (rippleTimer <= 0) {
      rippleTimer = 0.18;
      const backX = boat.x - Math.cos(boat.heading) * 14;
      const backY = boat.y - Math.sin(boat.heading) * 14;
      ripples.push({ x: backX, y: backY, radius: 2, alpha: 0.35 });
    }
  }
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.radius += dt * 14;
    r.alpha -= dt * 0.5;
    if (r.alpha <= 0) ripples.splice(i, 1);
  }

  drawOcean(ctx, width, height, camera, time);

  const viewMinX = camera.x - width / 2;
  const viewMinY = camera.y - height / 2;
  const viewMaxX = camera.x + width / 2;
  const viewMaxY = camera.y + height / 2;
  const islands = world.getVisibleIslands(viewMinX, viewMinY, viewMaxX, viewMaxY);
  for (const island of islands) {
    drawIsland(ctx, island, camera, width, height);
  }

  for (const r of ripples) {
    drawWake(ctx, r, camera, width, height);
  }

  drawBoat(ctx, boat, camera, width, height, time);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
