const PALETTE = {
  oceanDeep: "#0e3a52",
  oceanMid: "#12496a",
  waveLight: "rgba(255, 255, 255, 0.10)",
  waveLight2: "rgba(255, 255, 255, 0.06)",
  sand: "#e8d3a0",
  sandShadow: "#d3ba81",
  islandGreen: "#4f8f5c",
  islandGreenDark: "#3d7449",
  treeGreen: "#2f6b42",
  rock: "#8b8f94",
  hull: "#7a4a2b",
  hullDark: "#5c3620",
  sail: "#f4efe3",
  sailShadow: "#dcd5c3",
  wake: "rgba(255, 255, 255, 0.35)",
};

function worldToScreen(wx, wy, camera, width, height) {
  return {
    x: wx - camera.x + width / 2,
    y: wy - camera.y + height / 2,
  };
}

function drawOcean(ctx, width, height, camera, time) {
  ctx.fillStyle = PALETTE.oceanDeep;
  ctx.fillRect(0, 0, width, height);

  drawWaveLayer(ctx, width, height, camera, time, 90, 0.35, PALETTE.waveLight);
  drawWaveLayer(ctx, width, height, camera, time, 140, 0.55, PALETTE.waveLight2);
}

function drawWaveLayer(ctx, width, height, camera, time, spacing, speed, color) {
  const offsetX = ((camera.x * speed + time * 12) % spacing + spacing) % spacing;
  const offsetY = ((camera.y * speed + time * 8) % spacing + spacing) % spacing;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  for (let y = -offsetY; y < height + spacing; y += spacing) {
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 14) {
      const wobble = Math.sin((x + camera.x * speed) * 0.02 + time * 1.3) * 3;
      const py = y + wobble;
      if (x === -20) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();
  }
}

function drawIsland(ctx, island, camera, width, height) {
  const screen = worldToScreen(island.x, island.y, camera, width, height);

  if (
    screen.x < -island.radius * 1.3 ||
    screen.x > width + island.radius * 1.3 ||
    screen.y < -island.radius * 1.3 ||
    screen.y > height + island.radius * 1.3
  ) {
    return;
  }

  ctx.save();
  ctx.translate(screen.x, screen.y);

  // sandy shoreline (slightly larger than the green core)
  ctx.beginPath();
  island.shape.forEach((p, i) => {
    const sx = p.x * 1.16;
    const sy = p.y * 1.16;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.closePath();
  ctx.fillStyle = PALETTE.sand;
  ctx.fill();

  // green interior
  ctx.beginPath();
  island.shape.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fillStyle = PALETTE.islandGreen;
  ctx.fill();

  // rocks near shoreline
  ctx.fillStyle = PALETTE.rock;
  for (const rock of island.rocks) {
    ctx.beginPath();
    ctx.arc(rock.x, rock.y, rock.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // trees as simple layered circles
  for (const tree of island.trees) {
    ctx.beginPath();
    ctx.arc(tree.x, tree.y, tree.size, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.treeGreen;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tree.x - tree.size * 0.25, tree.y - tree.size * 0.25, tree.size * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.islandGreenDark;
    ctx.fill();
  }

  ctx.restore();
}

function drawWake(ctx, ripple, camera, width, height) {
  const screen = worldToScreen(ripple.x, ripple.y, camera, width, height);
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, ripple.radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255,255,255,${ripple.alpha})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawBoat(ctx, boat, camera, width, height, time) {
  const screen = worldToScreen(boat.x, boat.y, camera, width, height);
  const bob = Math.sin(time * 2 + boat.bobPhase) * 1.5;

  ctx.save();
  ctx.translate(screen.x, screen.y + bob);
  ctx.rotate(boat.heading + Math.PI / 2);

  // hull
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.quadraticCurveTo(9, -4, 7, 12);
  ctx.quadraticCurveTo(0, 17, -7, 12);
  ctx.quadraticCurveTo(-9, -4, 0, -18);
  ctx.closePath();
  ctx.fillStyle = PALETTE.hull;
  ctx.fill();
  ctx.strokeStyle = PALETTE.hullDark;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // mast
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, -26);
  ctx.strokeStyle = PALETTE.hullDark;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // sail
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(11, 0);
  ctx.lineTo(0, 2);
  ctx.closePath();
  ctx.fillStyle = PALETTE.sail;
  ctx.fill();
  ctx.strokeStyle = PALETTE.sailShadow;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}
