function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

class Boat {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.heading = -Math.PI / 2;
    this.speed = 0;
    this.maxSpeed = 150;
    this.accel = 70;
    this.turnRate = 2.0;
    this.target = null;
    this.bobPhase = Math.random() * Math.PI * 2;
  }

  setTarget(x, y) {
    this.target = { x, y };
  }

  update(dt, input) {
    const usingManual = input.turn !== 0 || input.throttle !== 0;

    if (usingManual) {
      this.target = null;
      this.heading += input.turn * this.turnRate * dt;
      this.speed += input.throttle * this.accel * dt;
      if (input.throttle === 0) {
        this.speed -= Math.sign(this.speed) * this.accel * 0.5 * dt;
      }
    } else if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 10) {
        this.target = null;
        this.speed -= this.accel * dt;
      } else {
        const desiredHeading = Math.atan2(dy, dx);
        const diff = normalizeAngle(desiredHeading - this.heading);
        const maxTurn = this.turnRate * dt;
        this.heading += clamp(diff, -maxTurn, maxTurn);

        const slowRadius = 140;
        const speedTarget =
          dist < slowRadius ? this.maxSpeed * (dist / slowRadius) : this.maxSpeed;

        if (this.speed < speedTarget) {
          this.speed += this.accel * dt;
        } else {
          this.speed -= this.accel * 0.6 * dt;
        }
      }
    } else {
      this.speed -= this.accel * 0.5 * dt;
    }

    this.speed = clamp(this.speed, 0, this.maxSpeed);

    this.x += Math.cos(this.heading) * this.speed * dt;
    this.y += Math.sin(this.heading) * this.speed * dt;
  }
}
