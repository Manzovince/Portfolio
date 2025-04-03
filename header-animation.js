// Get CSS Variables
function getRootCSSVariable(variableName) {
  return getComputedStyle(document.documentElement).getPropertyValue(variableName)?.trim() || "";
}

// ----- Configuration -----
const config = {
  cellSize: 16,               // pixels
  damping: 0.99,              // wave decay factor
  densityScale: "···-~++0011", // characters from lightest to heaviest intensity
  rippleSpeed: 600,           // pixels per second
  rippleWidth: 4,             // ripple ring width
  rippleIntensity: 6,         // impulse strength from a ripple
  cellDecayFactor: 0.99       // overall decay factor per update
};

const maxIntensity = config.densityScale.length;
const MOBILE_WIDTH_THRESHOLD = 768;

// ----- Globals -----
let canvas, ctx;
let cols, rows;
let grid, prevGrid, nextGrid; // our three simulation buffers
let borderAccumulator = 0;    // timer for border reset
let lastMouse = { x: 0, y: 0, time: 0 };
const ripples = [];         // array of active ripple objects
let lastTimestamp = null;
let lastRenderTime = null;
const renderInterval = 30;  // render throttling (ms)

// These will be set after the DOM is loaded.
let textColor, bgColor, textRGB, bgRGB;

// ----- Initialization -----
function init() {
  // Get CSS variable values now – after the DOM and styles are loaded.
  textColor = getRootCSSVariable('--text-color');
  bgColor = getRootCSSVariable('--bg-color');
  textRGB = getRootCSSVariable('--rgb-text');
  bgRGB = getRootCSSVariable('--rgb-bg');
  // document.body.style.backgroundColor = bgColor;

  canvas = document.createElement("canvas");
  canvas.id = "canvas";
  ctx = canvas.getContext("2d");
  document.body.appendChild(canvas);

  // Set up text rendering properties
  ctx.font = `${config.cellSize}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Position the canvas
  canvas.style.position = "absolute";
  canvas.style.top = 0;
  canvas.style.left = 0;

  // Set the canvas size and create our simulation grids
  resizeCanvas();
  createGrid();

  // Register event listeners
  window.addEventListener("resize", onWindowResize);
  canvas.addEventListener("mousemove", onPointerMove);
  canvas.addEventListener("click", onPointerClick);

  // Start the animation loop
  requestAnimationFrame(loop);
}

// ----- Canvas Resize and Grid Setup -----
function onWindowResize() {
  resizeCanvas();
  createGrid();
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  cols = Math.floor(canvas.width / config.cellSize);
  rows = Math.floor(canvas.height / config.cellSize);
}

function createGrid() {
  grid = new Array(rows);
  prevGrid = new Array(rows);
  nextGrid = new Array(rows);
  for (let j = 0; j < rows; j++) {
    grid[j] = new Array(cols).fill(0);
    prevGrid[j] = new Array(cols).fill(0);
    nextGrid[j] = new Array(cols).fill(0);
  }
}

// ----- Main Animation Loop -----
function loop(timestamp) {
  if (lastTimestamp === null) {
    lastTimestamp = timestamp;
    lastRenderTime = timestamp;
  }
  const dt = (timestamp - lastTimestamp) / 1000; // delta time in seconds

  update(dt);

  if (timestamp - lastRenderTime >= renderInterval) {
    render();
    lastRenderTime = timestamp;
  }

  lastTimestamp = timestamp;
  requestAnimationFrame(loop);
}

// ----- Simulation Update Functions -----
function update(dt) {
  updateWaterWaves();
  updateRipples(dt);
  applyCellDecay();

  if (canvas.width < MOBILE_WIDTH_THRESHOLD) {
    spawnRandomRipple(dt);
  }

  borderAccumulator += dt;
  if (borderAccumulator >= 0.1) {
    resetBorderCells();
    borderAccumulator = 0;
  }
}

function updateWaterWaves() {
  // Classic wave simulation (skip the boundary cells)
  for (let j = 1; j < rows - 1; j++) {
    for (let i = 1; i < cols - 1; i++) {
      // Coerce all neighboring cell values to numbers, defaulting to 0.
      const left = Number(grid[j][i - 1]) || 0;
      const right = Number(grid[j][i + 1]) || 0;
      const top = Number(grid[j - 1][i]) || 0;
      const bottom = Number(grid[j + 1][i]) || 0;
      const centerPrev = Number(prevGrid[j][i]) || 0;

      nextGrid[j][i] = ((left + right + top + bottom) / 2) - centerPrev;
      nextGrid[j][i] *= config.damping;
    }
  }
  // Swap buffers.
  const temp = prevGrid;
  prevGrid = grid;
  grid = nextGrid;
  nextGrid = temp;
}

function updateRipples(dt) {
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
          // Ensure grid[j][i] is a number.
          grid[j][i] = (Number(grid[j][i]) || 0) + ripple.intensity * factor;
        }
      }
    }

    // Remove the ripple if it has expanded beyond the canvas.
    if (ripple.radius - ripple.width > Math.max(canvas.width, canvas.height)) {
      ripples.splice(k, 1);
    }
  }
}

function applyCellDecay() {
  // Gradually decay all cell intensities.
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      grid[j][i] = (Number(grid[j][i]) || 0) * config.cellDecayFactor;
    }
  }
}

function resetBorderCells() {
  // Reset top and bottom rows.
  for (let i = 0; i < cols; i++) {
    grid[0][i] = 0;
    grid[rows - 1][i] = 0;
  }
  // Reset left and right columns.
  for (let j = 0; j < rows; j++) {
    grid[j][0] = 0;
    grid[j][cols - 1] = 0;
  }
}

function spawnRandomRipple(dt) {
  // Randomness parameters — tweak these to adjust behavior.
  const SPAWN_RATE = 0.2;            // Higher means more ripples per second.
  const WIDTH_MIN = 0.5, WIDTH_MAX = 1.5;         // Ripple width multiplier range.
  const INTENSITY_MIN = 0.3, INTENSITY_MAX = 1.3;   // Ripple intensity multiplier range.

  if (Math.random() < dt * SPAWN_RATE) {
    ripples.push({
      x: Math.random() * canvas.width,         // Spawn anywhere on the canvas.
      y: Math.random() * canvas.height,
      radius: 0,
      width: config.rippleWidth * (WIDTH_MIN + (WIDTH_MAX - WIDTH_MIN) * Math.random()),
      intensity: config.rippleIntensity * (INTENSITY_MIN + (INTENSITY_MAX - INTENSITY_MIN) * Math.random()),
    });
  }
}

// ----- Rendering -----
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const halfCell = config.cellSize / 2;

  // Draw each cell as an ASCII character based on its intensity.
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      // Safely convert the cell’s value.
      const cellValue = Number(grid[j][i]);
      const safeValue = isFinite(cellValue) ? cellValue : 0;
      // Compute intensity and clamp it.
      const intensity = Math.min(Math.abs(safeValue), maxIntensity);
      let scaleIndex = Math.floor((intensity / maxIntensity) * (config.densityScale.length - 1));
      scaleIndex = Math.max(0, Math.min(config.densityScale.length - 1, scaleIndex));
      const char = config.densityScale[scaleIndex] || "0";

      const x = i * config.cellSize + halfCell;
      const y = j * config.cellSize + halfCell;
      const ratio = intensity / maxIntensity;
      const opacity = 0.2 + 0.8 * ratio;

      // Ensure our fillStyle is built from a well-formed rgba string.
      const rgbaColor = textColor.replace("rgb(", "rgba(").replace(")", `, ${opacity})`);
      ctx.fillStyle = rgbaColor;
      ctx.font = `${config.cellSize / 2}px monospace`;
      ctx.fillText(char, x, y);
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
        grid[j][i] = (Number(grid[j][i]) || 0) + impulseStrength * factor;
      }
    }
  }
}

function onPointerMove(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const now = performance.now();
  let speed = 0;
  if (lastMouse.time) {
    const dx = x - lastMouse.x;
    const dy = y - lastMouse.y;
    const dtMove = now - lastMouse.time;
    speed = Math.hypot(dx, dy) / dtMove;
  }
  lastMouse = { x, y, time: now };
  applyImpulse(x, y, speed);
}

function onPointerClick(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  ripples.push({
    x: x,
    y: y,
    radius: 0,
    width: config.rippleWidth,
    intensity: config.rippleIntensity,
  });
}

// ----- Start the Simulation -----
window.addEventListener("DOMContentLoaded", init);
