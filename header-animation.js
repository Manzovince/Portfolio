// ----- Configuration -----
const config = {
  cellSize: 16,
  damping: 0.99,
  densityScale: "···--++0011",
  rippleSpeed: 600,
  rippleWidth: 4,
  rippleIntensity: 6,
  cellDecayFactor: 0.99
};

const maxIntensity = config.densityScale.length;
const MOBILE_WIDTH_THRESHOLD = 768;
const STEP = 1 / 60;          // the wave equation is tuned for 60 steps per second
const MAX_STEPS = 4;          // after a long frame, catch up this much at most
const renderInterval = 30;    // render throttling (ms)
const OPACITY_LEVELS = 32;    // fill colours are cached per quantised opacity

// ----- Globals -----
let canvas, ctx;
let cols, rows;
let grid, prevGrid, nextGrid; // our three simulation buffers
let borderAccumulator = 0;    // timer for border reset
let stepAccumulator = 0;      // time not yet simulated
let lastMouse = { x: 0, y: 0, time: 0 };
const ripples = [];           // array of active ripple objects
let lastTimestamp = null;
let lastRenderTime = null;
let lastWidth = 0;
let visible = true;           // header on screen
let frameId = null;
let fillStyles = [];          // fillStyles[k] = text colour at opacity k / OPACITY_LEVELS

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const coarsePointer = window.matchMedia("(pointer: coarse)");

// ----- Initialization -----
function init() {
  canvas = document.getElementById("header-canvas");
  if (!canvas) return;
  ctx = canvas.getContext("2d");

  // Position the canvas
  canvas.style.position = "absolute";
  canvas.style.top = 0;
  canvas.style.left = 0;

  readColors();
  resizeCanvas();
  createGrid();

  // Register event listeners
  window.addEventListener("resize", onWindowResize);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("click", onPointerClick);

  // The theme toggle rewrites --rgb-text on <html>: follow it
  new MutationObserver(() => { readColors(); render(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-theme"] });

  // Only animate while the header is on screen and the tab is in front
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncLoop();
  }).observe(canvas);
  document.addEventListener("visibilitychange", syncLoop);
  reduceMotion.addEventListener?.("change", syncLoop);

  // Show that the water is alive: one ripple on the right as the page opens
  if (!reduceMotion.matches) {
    addRipple(cols * config.cellSize * 0.72, rows * config.cellSize * 0.55, 1, 0.8);
  }

  render();
  syncLoop();
}

// Start or stop the animation loop to match visibility and motion preferences
function syncLoop() {
  const run = visible && !document.hidden && !reduceMotion.matches;
  if (run && frameId === null) {
    lastTimestamp = null;
    frameId = requestAnimationFrame(loop);
  } else if (!run && frameId !== null) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
}

function readColors() {
  const rgb = getComputedStyle(document.documentElement).getPropertyValue("--rgb-text").trim() || "231, 215, 192";
  fillStyles = [];
  for (let k = 0; k <= OPACITY_LEVELS; k++) {
    fillStyles.push(`rgba(${rgb}, ${(k / OPACITY_LEVELS).toFixed(3)})`);
  }
}

// ----- Canvas Resize and Grid Setup -----
function onWindowResize() {
  // On phones the address bar changes the height while scrolling: keep the
  // current water instead of wiping it, unless the width really changed.
  if (coarsePointer.matches && window.innerWidth === lastWidth) return;
  resizeCanvas();
  createGrid();
  render();
}

function resizeCanvas() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  lastWidth = width;

  // Draw at the screen's pixel density so the glyphs stay sharp on Retina
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Resizing the canvas resets its text settings
  ctx.font = `${config.cellSize / 2}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  cols = Math.floor(width / config.cellSize);
  rows = Math.floor(height / config.cellSize);
}

function createGrid() {
  grid = new Array(rows);
  prevGrid = new Array(rows);
  nextGrid = new Array(rows);
  for (let j = 0; j < rows; j++) {
    grid[j] = new Float32Array(cols);
    prevGrid[j] = new Float32Array(cols);
    nextGrid[j] = new Float32Array(cols);
  }
}

// ----- Main Animation Loop -----
function loop(timestamp) {
  if (lastTimestamp === null) {
    lastTimestamp = timestamp;
    lastRenderTime = timestamp;
  }
  const dt = Math.min((timestamp - lastTimestamp) / 1000, MAX_STEPS * STEP);
  lastTimestamp = timestamp;

  // Fixed steps: the waves travel at the same speed on 60 Hz and 120 Hz screens
  stepAccumulator += dt;
  while (stepAccumulator >= STEP) {
    update(STEP);
    stepAccumulator -= STEP;
  }

  if (timestamp - lastRenderTime >= renderInterval) {
    render();
    lastRenderTime = timestamp;
  }

  frameId = requestAnimationFrame(loop);
}

// ----- Simulation Update Functions -----
function update(dt) {
  updateWaterWaves();
  updateRipples(dt);
  applyCellDecay();
  spawnRandomRipple(dt);

  borderAccumulator += dt;
  if (borderAccumulator >= 0.1) {
    resetBorderCells();
    borderAccumulator = 0;
  }
}

function updateWaterWaves() {
  // Classic wave simulation (skip the boundary cells)
  for (let j = 1; j < rows - 1; j++) {
    const row = grid[j], up = grid[j - 1], down = grid[j + 1], prev = prevGrid[j], next = nextGrid[j];
    for (let i = 1; i < cols - 1; i++) {
      next[i] = ((row[i - 1] + row[i + 1] + up[i] + down[i]) / 2 - prev[i]) * config.damping;
    }
  }
  // Swap buffers.
  const temp = prevGrid;
  prevGrid = grid;
  grid = nextGrid;
  nextGrid = temp;
}

function updateRipples(dt) {
  const extent = Math.max(cols, rows) * config.cellSize;
  for (let k = ripples.length - 1; k >= 0; k--) {
    const ripple = ripples[k];
    ripple.radius += config.rippleSpeed * dt; // expand the ripple

    // Calculate affected grid cell boundaries.
    const minI = Math.max(0, Math.floor((ripple.x - ripple.radius - ripple.width) / config.cellSize));
    const maxI = Math.min(cols - 1, Math.ceil((ripple.x + ripple.radius + ripple.width) / config.cellSize));
    const minJ = Math.max(0, Math.floor((ripple.y - ripple.radius - ripple.width) / config.cellSize));
    const maxJ = Math.min(rows - 1, Math.ceil((ripple.y + ripple.radius + ripple.width) / config.cellSize));

    // Apply the ripple impulse to nearby cells.
    for (let j = minJ; j <= maxJ; j++) {
      for (let i = minI; i <= maxI; i++) {
        const cx = i * config.cellSize + config.cellSize / 2;
        const cy = j * config.cellSize + config.cellSize / 2;
        const distance = Math.hypot(cx - ripple.x, cy - ripple.y);
        if (distance > ripple.radius - ripple.width && distance < ripple.radius + ripple.width) {
          const factor = 1 - Math.abs(distance - ripple.radius) / ripple.width;
          grid[j][i] += ripple.intensity * factor;
        }
      }
    }

    // Remove the ripple if it has expanded beyond the canvas.
    if (ripple.radius - ripple.width > extent) {
      ripples.splice(k, 1);
    }
  }
}

function applyCellDecay() {
  // Gradually decay all cell intensities.
  for (let j = 0; j < rows; j++) {
    const row = grid[j];
    for (let i = 0; i < cols; i++) row[i] *= config.cellDecayFactor;
  }
}

function resetBorderCells() {
  // Reset top and bottom rows.
  grid[0].fill(0);
  grid[rows - 1].fill(0);
  // Reset left and right columns.
  for (let j = 0; j < rows; j++) {
    grid[j][0] = 0;
    grid[j][cols - 1] = 0;
  }
}

function addRipple(x, y, widthScale = 1, intensityScale = 1) {
  ripples.push({
    x,
    y,
    radius: 0,
    width: config.rippleWidth * widthScale,
    intensity: config.rippleIntensity * intensityScale,
  });
}

function spawnRandomRipple(dt) {
  // Randomness parameters — tweak these to adjust behavior.
  // Phones have no pointer stirring the water, so they get more ripples;
  // desktops get an occasional one so the header never looks frozen.
  const SPAWN_RATE = lastWidth < MOBILE_WIDTH_THRESHOLD ? 0.2 : 0.08; // ripples per second
  const WIDTH_MIN = 0.5, WIDTH_MAX = 1.5;           // Ripple width multiplier range.
  const INTENSITY_MIN = 0.3, INTENSITY_MAX = 1.3;   // Ripple intensity multiplier range.

  if (Math.random() < dt * SPAWN_RATE) {
    addRipple(
      Math.random() * cols * config.cellSize,         // Spawn anywhere on the canvas.
      Math.random() * rows * config.cellSize,
      WIDTH_MIN + (WIDTH_MAX - WIDTH_MIN) * Math.random(),
      INTENSITY_MIN + (INTENSITY_MAX - INTENSITY_MIN) * Math.random()
    );
  }
}

// ----- Rendering -----
const halfCell = config.cellSize / 2;
const lastScaleIndex = config.densityScale.length - 1;

function render() {
  if (!grid) return;
  ctx.clearRect(0, 0, cols * config.cellSize + config.cellSize, rows * config.cellSize + config.cellSize);

  // Draw each cell as an ASCII character based on its intensity.
  for (let j = 0; j < rows; j++) {
    const row = grid[j];
    const y = j * config.cellSize + halfCell;
    for (let i = 0; i < cols; i++) {
      const value = row[i];
      const intensity = isFinite(value) ? Math.min(Math.abs(value), maxIntensity) : 0;
      const ratio = intensity / maxIntensity;
      const char = config.densityScale[Math.floor(ratio * lastScaleIndex)];

      ctx.fillStyle = fillStyles[Math.round((0.2 + 0.8 * ratio) * OPACITY_LEVELS)];
      ctx.fillText(char, i * config.cellSize + halfCell, y);
    }
  }
}

// ----- Interactive Controls -----
// A helper routine used by both mouse and touch impulses.
function applyImpulse(x, y, speed) {
  const influenceRadius = 35;
  const impulseStrength = speed * 5;
  const minI = Math.max(0, Math.floor((x - influenceRadius) / config.cellSize));
  const maxI = Math.min(cols - 1, Math.ceil((x + influenceRadius) / config.cellSize));
  const minJ = Math.max(0, Math.floor((y - influenceRadius) / config.cellSize));
  const maxJ = Math.min(rows - 1, Math.ceil((y + influenceRadius) / config.cellSize));

  for (let j = minJ; j <= maxJ; j++) {
    for (let i = minI; i <= maxI; i++) {
      const cx = i * config.cellSize + config.cellSize / 2;
      const cy = j * config.cellSize + config.cellSize / 2;
      const dist = Math.hypot(cx - x, cy - y);
      if (dist < influenceRadius) {
        const factor = 1 - dist / influenceRadius;
        grid[j][i] += impulseStrength * factor;
      }
    }
  }
}

// Pointer events cover both the mouse and a finger dragging across the header
function onPointerMove(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const now = performance.now();
  let speed = 0;
  // A new stroke (a fresh touch, or the mouse coming back) starts with no speed
  if (lastMouse.time && now - lastMouse.time < 100) {
    const dx = x - lastMouse.x;
    const dy = y - lastMouse.y;
    speed = Math.hypot(dx, dy) / (now - lastMouse.time);
  }
  lastMouse = { x, y, time: now };
  applyImpulse(x, y, speed);
}

function onPointerClick(e) {
  const rect = canvas.getBoundingClientRect();
  addRipple(e.clientX - rect.left, e.clientY - rect.top);
}

// ----- Start the Simulation -----
window.addEventListener("DOMContentLoaded", init);
