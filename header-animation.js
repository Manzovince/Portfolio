// ----- Get CSS Variables -----
function getRootCSSVariable(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName);
  }
  
  const textColor = getRootCSSVariable('--text-color');
  const bgColor = getRootCSSVariable('--bg-color');
  const textRGB = getRootCSSVariable('--rgb-text');
  const bgRGB = getRootCSSVariable('--rgb-bg');
  
  // ----- Configuration -----
  const config = {
    cellSize: 16,               // pixels
    damping: 0.99,              // wave decay factor
    // densityScale: " ..--~~≈≈%%##@@",
    // densityScale: " .0123456789",
    densityScale: "..-+01",
    rippleSpeed: 600,           // pixels per second
    rippleWidth: 4,             // ripple ring width
    rippleIntensity: 6,         // impulse strength from a ripple
    cellDecayFactor: 0.99       // overall decay factor per update
  };
  const maxIntensity = config.densityScale.length;
  
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
  
  // ----- Initialization -----
  function init() {
    canvas = document.createElement("canvas");
    canvas.id = "canvas";
    ctx = canvas.getContext("2d");
    document.body.appendChild(canvas);
  
    // Set up text rendering properties.
    ctx.font = `${config.cellSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
  
    // Position the canvas.
    canvas.style.position = "absolute";
    canvas.style.top = 0;
    canvas.style.left = 0;
  
    // Set the canvas size and create our simulation grids.
    resizeCanvas();
    createGrid();
  
    // Register event listeners.
    window.addEventListener("resize", onWindowResize);
    canvas.addEventListener("mousemove", onPointerMove);
    canvas.addEventListener("click", onPointerClick);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  
    // Start the animation loop.
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
      for (let i = 1; i < cols - 1; i++) {
        nextGrid[j][i] =
          (
            grid[j][i - 1] +
            grid[j][i + 1] +
            grid[j - 1][i] +
            grid[j + 1][i]
          ) / 2 - prevGrid[j][i];
        nextGrid[j][i] *= config.damping;
      }
    }
    // Swap buffers
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
      const minI = Math.max(
        0,
        Math.floor((ripple.x - ripple.radius - ripple.width) / config.cellSize)
      );
      const maxI = Math.min(
        cols - 1,
        Math.ceil((ripple.x + ripple.radius + ripple.width) / config.cellSize)
      );
      const minJ = Math.max(
        0,
        Math.floor((ripple.y - ripple.radius - ripple.width) / config.cellSize)
      );
      const maxJ = Math.min(
        rows - 1,
        Math.ceil((ripple.y + ripple.radius + ripple.width) / config.cellSize)
      );
  
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
      if (ripple.radius - ripple.width > Math.max(canvas.width, canvas.height)) {
        ripples.splice(k, 1);
      }
    }
  }
  
  function applyCellDecay() {
    // Gradually decay all cell intensities.
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        grid[j][i] *= config.cellDecayFactor;
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
    // On average, spawn a ripple every few seconds.
    if (Math.random() < dt * 0.1) {
      // Calculate canvas center
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Choose a random position that is biased towards the center.
      // For example, allow ripple positions to vary within ±25% of the canvas dimensions around the center.
      const offsetX = (Math.random() - 0.5) * canvas.width * 0.5;  // ±25% of canvas width
      const offsetY = (Math.random() - 0.5) * canvas.height * 0.5; // ±25% of canvas height
  
      ripples.push({
        x: centerX + offsetX,
        y: centerY + offsetY,
        radius: 0,
        width: config.rippleWidth,
        intensity: config.rippleIntensity / 2, // subtle ripple
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
        const intensity = Math.min(Math.abs(grid[j][i]), maxIntensity);
        const scaleIndex = Math.floor(
          (intensity / maxIntensity) * (config.densityScale.length - 1)
        );
        const char = config.densityScale[scaleIndex];
        const x = i * config.cellSize + halfCell;
        const y = j * config.cellSize + halfCell;
        const ratio = intensity / maxIntensity;
        const opacity = 0.1 + 0.9 * ratio;
  
        // Use RGBA dynamically by replacing the closing bracket with an opacity value.
        ctx.fillStyle = textColor.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
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
          grid[j][i] += impulseStrength * factor;
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
  
  function onTouchMove(e) {
    e.preventDefault(); // Prevent scrolling during touch.
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const now = performance.now();
    let speed = 0;
    if (lastMouse.time) {
      const dx = x - lastMouse.x;
      const dy = y - lastMouse.y;
      const dtTouch = now - lastMouse.time;
      speed = Math.hypot(dx, dy) / dtTouch;
    }
    lastMouse = { x, y, time: now };
    applyImpulse(x, y, speed);
  }
  
  function onTouchStart(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
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
  