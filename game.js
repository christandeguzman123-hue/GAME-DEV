"use strict";

class Entity {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.active = true;
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  update(dt) {}

  draw(ctx) {}

  intersects(other) {
    return (
      this.x < other.x + other.width &&
      this.x + this.width > other.x &&
      this.y < other.y + other.height &&
      this.y + this.height > other.y
    );
  }
}

class Bullet extends Entity {
  constructor(x, y) {
    super(x, y, 4, 14);
    this.speed = 520;
  }

  update(dt) {
    this.y -= this.speed * dt;
    if (this.y + this.height < 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

class Player extends Entity {
  constructor(x, y) {
    super(x, y, 40, 40);
    this.speed = 320;
    this.maxLives = 3;
    this.lives = this.maxLives;
    this.fireDelay = 0.28;
    this.cooldown = 0;
    this.invulnerable = 0;
  }

  update(dt, input, bounds) {
    const direction =
      (input.isDown("ArrowRight") || input.isDown("KeyD") ? 1 : 0) -
      (input.isDown("ArrowLeft") || input.isDown("KeyA") ? 1 : 0);
    this.x += direction * this.speed * dt;
    this.x = Math.max(0, Math.min(bounds.width - this.width, this.x));
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
  }

  tryShoot() {
    if (this.cooldown > 0) {
      return null;
    }
    this.cooldown = this.fireDelay;
    return new Bullet(this.centerX - 2, this.y - 10);
  }

  loseLife() {
    this.lives = Math.max(0, this.lives - 1);
  }

  takeHit() {
    if (this.invulnerable > 0) {
      return false;
    }
    this.loseLife();
    this.invulnerable = 1.5;
    return true;
  }

  get isDead() {
    return this.lives <= 0;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.lives = this.maxLives;
    this.cooldown = 0;
    this.invulnerable = 0;
  }

  draw(ctx) {
    if (this.invulnerable > 0 && Math.floor(this.invulnerable * 10) % 2 === 0) {
      return;
    }
    const { x, y, width, height } = this;
    ctx.fillStyle = "#4fd1c5";
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width / 2, y + height * 0.75);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e6fffb";
    ctx.fillRect(x + width / 2 - 3, y + 12, 6, 12);
  }
}

class Enemy extends Entity {
  constructor(x, y, speed) {
    super(x, y, 34, 34);
    this.speed = speed;
    this.color = "#ff6b6b";
  }

  get points() {
    return 10;
  }

  update(dt) {
    this.y += this.speed * dt;
  }

  draw(ctx) {
    const { x, y, width, height } = this;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width / 2, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(x + 8, y + 6, 6, 6);
    ctx.fillRect(x + width - 14, y + 6, 6, 6);
  }
}

class ZigZagEnemy extends Enemy {
  constructor(x, y, speed, boundsWidth) {
    super(x, y, speed * 0.85);
    this.color = "#b57bff";
    this.originX = x;
    this.boundsWidth = boundsWidth;
    this.phase = Math.random() * Math.PI * 2;
    this.amplitude = 60;
  }

  get points() {
    return 25;
  }

  update(dt) {
    super.update(dt);
    this.phase += dt * 3;
    const target = this.originX + Math.sin(this.phase) * this.amplitude;
    this.x = Math.max(0, Math.min(this.boundsWidth - this.width, target));
  }
}

class Star {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.size = 1 + Math.random() * 1.5;
    this.speed = 20 + Math.random() * 60;
  }

  update(dt) {
    this.y += this.speed * dt;
    if (this.y > this.height) {
      this.y = 0;
      this.x = Math.random() * this.width;
    }
  }

  draw(ctx) {
    ctx.fillStyle = "rgba(230, 236, 255, 0.7)";
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

class Score {
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.value = 0;
    this.high = this.loadHigh();
  }

  loadHigh() {
    try {
      const stored = Number(localStorage.getItem(this.storageKey));
      return Number.isFinite(stored) ? stored : 0;
    } catch (error) {
      return 0;
    }
  }

  saveHigh() {
    try {
      localStorage.setItem(this.storageKey, String(this.high));
    } catch (error) {}
  }

  add(points) {
    this.value += points;
    if (this.value > this.high) {
      this.high = this.value;
      this.saveHigh();
    }
  }

  get level() {
    return 1 + Math.floor(this.value / 200);
  }

  reset() {
    this.value = 0;
  }
}

class InputHandler {
  constructor() {
    this.keys = new Set();
    window.addEventListener("keydown", (event) => this.keys.add(event.code));
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
    window.addEventListener("blur", () => this.keys.clear());
  }

  isDown(code) {
    return this.keys.has(code);
  }
}

class Game {
  static WIN_SCORE = 1500;
  static GAME_KEYS = new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Space",
  ]);

  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = canvas.width;
    this.height = canvas.height;
    this.input = new InputHandler();
    this.score = new Score("spaceDefenderHighScore");
    this.player = new Player(this.width / 2 - 20, this.height - 70);
    this.bullets = [];
    this.enemies = [];
    this.stars = Array.from({ length: 60 }, () => new Star(this.width, this.height));
    this.spawnTimer = 0;
    this.state = "ready";
    this.lastTime = 0;
    this.loop = this.loop.bind(this);
    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === "running") {
        this.state = "paused";
      }
    });
  }

  start() {
    requestAnimationFrame(this.loop);
  }

  handleKeyDown(event) {
    if (Game.GAME_KEYS.has(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) {
      return;
    }
    if (event.code === "Enter" && this.state !== "running" && this.state !== "paused") {
      this.reset();
      this.state = "running";
    } else if (event.code === "KeyP") {
      if (this.state === "running") {
        this.state = "paused";
      } else if (this.state === "paused") {
        this.state = "running";
      }
    }
  }

  reset() {
    this.score.reset();
    this.player.reset(this.width / 2 - 20, this.height - 70);
    this.bullets = [];
    this.enemies = [];
    this.spawnTimer = 0;
  }

  get spawnInterval() {
    return Math.max(0.35, 1 - 0.08 * (this.score.level - 1));
  }

  get enemySpeed() {
    return 110 + 18 * this.score.level;
  }

  spawnEnemy() {
    const x = Math.random() * (this.width - 34);
    const useZigZag = this.score.level >= 2 && Math.random() < 0.3;
    const enemy = useZigZag
      ? new ZigZagEnemy(x, -34, this.enemySpeed, this.width)
      : new Enemy(x, -34, this.enemySpeed);
    this.enemies.push(enemy);
  }

  loop(timestamp) {
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000 || 0);
    this.lastTime = timestamp;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.loop);
  }

  update(dt) {
    this.stars.forEach((star) => star.update(dt));
    if (this.state !== "running") {
      return;
    }

    this.player.update(dt, this.input, this);
    if (this.input.isDown("Space")) {
      const bullet = this.player.tryShoot();
      if (bullet) {
        this.bullets.push(bullet);
      }
    }

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    this.bullets.forEach((bullet) => bullet.update(dt));
    this.enemies.forEach((enemy) => enemy.update(dt));

    this.resolveCollisions();
    this.bullets = this.bullets.filter((bullet) => bullet.active);
    this.enemies = this.enemies.filter((enemy) => enemy.active);

    if (this.player.isDead) {
      this.state = "over";
    } else if (this.score.value >= Game.WIN_SCORE) {
      this.state = "won";
    }
  }

  resolveCollisions() {
    for (const enemy of this.enemies) {
      if (!enemy.active) {
        continue;
      }
      for (const bullet of this.bullets) {
        if (bullet.active && enemy.intersects(bullet)) {
          bullet.active = false;
          enemy.active = false;
          this.score.add(enemy.points);
          break;
        }
      }
      if (!enemy.active) {
        continue;
      }
      if (enemy.intersects(this.player)) {
        if (this.player.takeHit()) {
          enemy.active = false;
        }
      } else if (enemy.y > this.height) {
        enemy.active = false;
        this.player.loseLife();
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#050914";
    ctx.fillRect(0, 0, this.width, this.height);
    this.stars.forEach((star) => star.draw(ctx));
    this.bullets.forEach((bullet) => bullet.draw(ctx));
    this.enemies.forEach((enemy) => enemy.draw(ctx));
    this.player.draw(ctx);
    this.drawHud();
    this.drawOverlay();
  }

  drawHud() {
    const ctx = this.ctx;
    ctx.fillStyle = "#e6ecff";
    ctx.font = "16px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Score ${this.score.value}`, 12, 24);
    ctx.fillText(`Level ${this.score.level}`, 12, 46);
    ctx.textAlign = "right";
    ctx.fillText(`Best ${this.score.high}`, this.width - 12, 24);
    ctx.fillText(`Lives ${this.player.lives}`, this.width - 12, 46);
  }

  drawOverlay() {
    const messages = {
      ready: ["Space Defender", "Press Enter to start"],
      paused: ["Paused", "Press P to resume"],
      over: ["Game over", `Final score ${this.score.value}`, "Press Enter to play again"],
      won: ["You win!", `Final score ${this.score.value}`, "Press Enter to play again"],
    };
    const lines = messages[this.state];
    if (!lines) {
      return;
    }
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(5, 9, 20, 0.75)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.textAlign = "center";
    ctx.fillStyle = "#4fd1c5";
    ctx.font = "bold 36px 'Trebuchet MS', sans-serif";
    ctx.fillText(lines[0], this.width / 2, this.height / 2 - 20);
    ctx.fillStyle = "#e6ecff";
    ctx.font = "18px 'Trebuchet MS', sans-serif";
    lines.slice(1).forEach((line, index) => {
      ctx.fillText(line, this.width / 2, this.height / 2 + 20 + index * 28);
    });
  }
}

new Game(document.getElementById("game")).start();
