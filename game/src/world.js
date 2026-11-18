// Emberkeep's world: the player, the embers, the shades, the beacons and the
// particles, and the one step that moves them all. Everything the game is can
// be read from this file: the lantern fuel is the player's life, embers feed
// it, shades burn it, and lighting all five beacons wins the game.
import {
  BEACON_CHANNEL_SECONDS,
  BEACON_KINDLE_COST,
  BEACON_SAFE_RADIUS,
  BEACON_SCORE,
  BEACONS,
  EMBER,
  PARTICLES,
  PLAYER,
  SHADE,
  SHARD,
  VIEW,
  WAVE_SECONDS,
} from './config.js';
import { range } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_HIT = 2;
export const EVENT_FLARE = 4;
export const EVENT_BEACON = 8;
export const EVENT_SHARD = 16;
export const EVENT_WAVE = 32;
export const EVENT_OVER = 64;
export const EVENT_WIN = 128;

const TAU = Math.PI * 2;

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function spawnPoint(random) {
  return { x: range(random, 60, VIEW.width - 60), y: range(random, 90, VIEW.height - 60) };
}

export function createWorld(random) {
  const state = freshState();

  function freshState() {
    return {
      time: 0,
      wave: 1,
      waveTimer: WAVE_SECONDS,
      score: 0,
      best: 0,
      combo: 0,
      comboTimer: 0,
      beaconsLit: 0,
      // Kindle progress on the one beacon that is awake right now (0 to 1).
      channel: 0,
      embersEaten: 0,
      shadesDispersed: 0,
      flaresFired: 0,
      over: false,
      won: false,
      shake: 0,
      flash: 0,
      player: {
        x: VIEW.width / 2,
        y: VIEW.height / 2,
        fuel: PLAYER.fuelMax,
        flareCooldown: 0,
        invulnerable: 0,
        magnet: 0,
        shield: false,
        facing: -Math.PI / 2,
      },
      embers: [],
      shades: [],
      shards: [],
      particles: [],
      floaters: [],
      beacons: BEACONS.map((spot) => ({ x: spot.x, y: spot.y, lit: false })),
      spawnTimer: 1.2,
      emberTimer: 0,
      shardTimer: SHARD.spawnAfter,
    };
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      if (state.particles.length >= PARTICLES.max) return;
      const angle = random() * TAU;
      const velocity = range(random, speed * 0.3, speed);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: range(random, 0.35, 0.8),
        maxLife: 0.8,
        size: range(random, 2, 5),
        color,
      });
    }
  }

  function floater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, life: 1.1 });
  }

  function spawnEmber() {
    const point = spawnPoint(random);
    state.embers.push({ x: point.x, y: point.y, phase: random() * TAU, active: true });
  }

  function spawnShade(atEdge) {
    if (state.shades.length >= SHADE.maxAlive) return;
    const edge = Math.floor(random() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = range(random, 0, VIEW.width);
      y = -30;
    } else if (edge === 1) {
      x = VIEW.width + 30;
      y = range(random, 0, VIEW.height);
    } else if (edge === 2) {
      x = range(random, 0, VIEW.width);
      y = VIEW.height + 30;
    } else {
      x = -30;
      y = range(random, 0, VIEW.height);
    }
    if (!atEdge) {
      const point = spawnPoint(random);
      x = point.x;
      y = point.y;
    }
    // The grove fights back as it lights: each lit beacon quickens the dark.
    const speed = Math.min(
      SHADE.speedMax,
      SHADE.speedStart + (state.wave - 1) * SHADE.speedPerWave + state.beaconsLit * 3,
    );
    state.shades.push({
      x,
      y,
      speed: range(random, speed * 0.85, speed * 1.15),
      wobble: random() * TAU,
      phase: random() * TAU,
      active: true,
    });
  }

  function spawnShard() {
    const point = spawnPoint(random);
    state.shards.push({ x: point.x, y: point.y, phase: 0, active: true });
  }

  function kindleBeacon(beacon) {
    beacon.lit = true;
    state.beaconsLit += 1;
    state.channel = 0;
    state.player.fuel = Math.max(5, state.player.fuel - BEACON_KINDLE_COST);
    state.score += BEACON_SCORE;
    burst(beacon.x, beacon.y, '#ffb347', 42, 190);
    floater(beacon.x, beacon.y - 34, `+${BEACON_SCORE} BEACON LIT`, '#ffd27d');
    if (state.beaconsLit >= state.beacons.length) {
      state.won = true;
      return EVENT_WIN;
    }
    return EVENT_BEACON;
  }

  // The awake beacon: beacons wake one at a time, in the order they stand,
  // so the keeper must cross the grove five times while the dark thickens.
  function activeBeacon() {
    for (const beacon of state.beacons) {
      if (!beacon.lit) return beacon;
    }
    return null;
  }

  function fireFlare() {
    const player = state.player;
    if (player.flareCooldown > 0 || player.fuel <= PLAYER.flareCost + 1) return EVENT_NONE;
    player.fuel -= PLAYER.flareCost;
    player.flareCooldown = PLAYER.flareCooldown;
    state.flaresFired += 1;
    state.flash = 0.55;
    state.shake = Math.max(state.shake, 7);
    let dispersed = 0;
    for (const shade of state.shades) {
      if (!shade.active) continue;
      if (distance(shade.x, shade.y, player.x, player.y) <= PLAYER.flareRadius) {
        shade.active = false;
        dispersed += 1;
        burst(shade.x, shade.y, '#c9a7ff', 14, 150);
      }
    }
    state.shadesDispersed += dispersed;
    if (dispersed > 0) {
      const gained = dispersed * 25;
      state.score += gained;
      floater(player.x, player.y - 30, `+${gained}`, '#c9a7ff');
    }
    return EVENT_FLARE;
  }

  function hitPlayer(shade) {
    const player = state.player;
    shade.active = false;
    burst(player.x, player.y, '#8d7bff', 26, 170);
    state.shake = Math.max(state.shake, 11);
    state.combo = 0;
    // A hit breaks the kindling: the keeper starts the beacon over.
    state.channel = 0;
    if (player.shield) {
      player.shield = false;
      player.invulnerable = PLAYER.invulnerable;
      floater(player.x, player.y - 30, 'SHIELD HELD', '#9fd8ff');
      return EVENT_HIT;
    }
    player.fuel -= PLAYER.hitFuel;
    player.invulnerable = PLAYER.invulnerable;
    const angle = Math.atan2(player.y - shade.y, player.x - shade.x);
    player.x += Math.cos(angle) * 26;
    player.y += Math.sin(angle) * 26;
    player.x = Math.max(24, Math.min(VIEW.width - 24, player.x));
    player.y = Math.max(70, Math.min(VIEW.height - 24, player.y));
    if (player.fuel <= 0) {
      player.fuel = 0;
      state.over = true;
      burst(player.x, player.y, '#ffb347', 60, 220);
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  return {
    state,
    reset() {
      const fresh = freshState();
      for (const key of Object.keys(fresh)) state[key] = fresh[key];
    },

    // Advance the world one fixed step. `dir` is the movement direction,
    // `flare` asks for a flare burst, `demo` runs the title-screen attract
    // mode: the keeper wanders, the grove glows, nothing can end the game.
    step(dt, dir, flare, demo = false) {
      let events = EVENT_NONE;
      const player = state.player;
      state.time += dt;
      state.shake = Math.max(0, state.shake - dt * 26);
      state.flash = Math.max(0, state.flash - dt * 1.8);
      player.flareCooldown = Math.max(0, player.flareCooldown - dt);
      player.invulnerable = Math.max(0, player.invulnerable - dt);
      player.magnet = Math.max(0, player.magnet - dt);
      state.comboTimer = Math.max(0, state.comboTimer - dt);
      if (state.comboTimer === 0) state.combo = 0;

      // --- movement ---
      let moveX = dir.x;
      let moveY = dir.y;
      if (demo) {
        const t = state.time * 0.35;
        moveX = Math.cos(t);
        moveY = Math.sin(t * 0.7) * 0.6;
      }
      const length = Math.hypot(moveX, moveY);
      if (length > 0) {
        player.x += (moveX / length) * PLAYER.speed * dt;
        player.y += (moveY / length) * PLAYER.speed * dt;
        player.facing = Math.atan2(moveY, moveX);
      }
      player.x = Math.max(24, Math.min(VIEW.width - 24, player.x));
      player.y = Math.max(70, Math.min(VIEW.height - 24, player.y));

      if (demo) {
        // Attract mode: embers drift in, shades keep their distance, the
        // lantern never dies. The title screen plays over this living scene.
        state.emberTimer -= dt;
        if (state.emberTimer <= 0 && state.embers.length < 9) {
          state.emberTimer = 0.9;
          spawnEmber();
        }
        for (const ember of state.embers) ember.phase += dt * 2;
        for (const shade of state.shades) {
          shade.wobble += dt;
          shade.x += Math.cos(shade.wobble) * 12 * dt;
          shade.y += Math.sin(shade.wobble * 1.3) * 12 * dt;
        }
        updateFx(dt);
        return EVENT_NONE;
      }

      // --- lantern fuel drains; an empty lantern ends the game ---
      player.fuel -= PLAYER.fuelDrain * dt;
      if (player.fuel <= 0) {
        player.fuel = 0;
        state.over = true;
        burst(player.x, player.y, '#ffb347', 60, 220);
        return EVENT_OVER;
      }

      if (flare) events |= fireFlare();

      // --- embers ---
      state.emberTimer -= dt;
      const liveEmbers = state.embers.filter((ember) => ember.active).length;
      if (state.emberTimer <= 0 && liveEmbers < EMBER.target) {
        state.emberTimer = EMBER.spawnEvery;
        spawnEmber();
      }
      for (const ember of state.embers) {
        if (!ember.active) continue;
        ember.phase += dt * 3;
        if (player.magnet > 0) {
          const d = distance(ember.x, ember.y, player.x, player.y);
          if (d < 220 && d > 1) {
            ember.x += ((player.x - ember.x) / d) * 260 * dt;
            ember.y += ((player.y - ember.y) / d) * 260 * dt;
          }
        }
        if (distance(ember.x, ember.y, player.x, player.y) < PLAYER.radius + EMBER.radius + 6) {
          ember.active = false;
          state.embersEaten += 1;
          state.combo = state.comboTimer > 0 ? Math.min(EMBER.comboMax, state.combo + 1) : 1;
          state.comboTimer = EMBER.comboWindow;
          const gained = EMBER.score * state.combo;
          state.score += gained;
          player.fuel = Math.min(PLAYER.fuelMax, player.fuel + PLAYER.emberFuel);
          burst(ember.x, ember.y, '#ffc85e', 12, 120);
          floater(ember.x, ember.y - 18, `+${gained}`, '#ffd27d');
          events |= EVENT_PICKUP;
        }
      }
      state.embers = state.embers.filter((ember) => ember.active);

      // --- beacons: stand at the awake beacon to kindle it ---
      const awake = activeBeacon();
      if (awake) {
        if (distance(awake.x, awake.y, player.x, player.y) < PLAYER.radius + 40) {
          state.channel += dt / BEACON_CHANNEL_SECONDS;
          if (random() < dt * 14) {
            state.particles.push({
              x: awake.x + (random() - 0.5) * 30,
              y: awake.y - 20 - random() * 20,
              vx: (random() - 0.5) * 20,
              vy: -range(random, 20, 60),
              life: 0.5,
              maxLife: 0.5,
              size: range(random, 2, 4),
              color: '#ffc85e',
            });
          }
          if (state.channel >= 1) {
            events |= kindleBeacon(awake);
            if (state.won) return events;
          }
        } else {
          state.channel = 0;
        }
      }

      // --- sunshards ---
      state.shardTimer -= dt;
      if (state.shardTimer <= 0) {
        state.shardTimer = SHARD.spawnEvery;
        spawnShard();
      }
      for (const shard of state.shards) {
        if (!shard.active) continue;
        shard.phase += dt * 2;
        if (distance(shard.x, shard.y, player.x, player.y) < PLAYER.radius + SHARD.radius + 6) {
          shard.active = false;
          player.magnet = PLAYER.magnetSeconds;
          player.shield = true;
          state.score += 50;
          burst(shard.x, shard.y, '#9fd8ff', 22, 160);
          floater(shard.x, shard.y - 20, 'MAGNET + SHIELD', '#9fd8ff');
          events |= EVENT_SHARD;
        }
      }
      state.shards = state.shards.filter((shard) => shard.active);

      // --- waves ---
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) {
        state.waveTimer = WAVE_SECONDS;
        state.wave += 1;
        for (let i = 0; i < Math.min(2 + state.wave, 6); i += 1) spawnShade(true);
        events |= EVENT_WAVE;
      }

      // --- shades ---
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnTimer = Math.max(
          SHADE.spawnMin,
          SHADE.spawnStart - (state.wave - 1) * 0.16 - state.beaconsLit * 0.08,
        );
        spawnShade(true);
      }
      for (const shade of state.shades) {
        if (!shade.active) continue;
        shade.wobble += dt;
        shade.phase += dt * 2;
        const dx = player.x - shade.x;
        const dy = player.y - shade.y;
        const d = Math.hypot(dx, dy) || 1;
        // A lit beacon's glow pushes shades back.
        let pushX = 0;
        let pushY = 0;
        for (const beacon of state.beacons) {
          if (!beacon.lit) continue;
          const bd = distance(beacon.x, beacon.y, shade.x, shade.y);
          if (bd < BEACON_SAFE_RADIUS && bd > 1) {
            pushX += ((shade.x - beacon.x) / bd) * SHADE.beaconRepel;
            pushY += ((shade.y - beacon.y) / bd) * SHADE.beaconRepel;
          }
        }
        const wobbleX = Math.cos(shade.wobble * SHADE.wobble) * 14;
        const wobbleY = Math.sin(shade.wobble * SHADE.wobble * 1.2) * 14;
        shade.x += ((dx / d) * shade.speed + wobbleX + pushX) * dt;
        shade.y += ((dy / d) * shade.speed + wobbleY + pushY) * dt;
        if (player.invulnerable <= 0 && distance(shade.x, shade.y, player.x, player.y) < PLAYER.radius + SHADE.radius - 4) {
          events |= hitPlayer(shade);
          if (state.over) return events;
        }
      }
      state.shades = state.shades.filter((shade) => shade.active);

      updateFx(dt);
      return events;

      function updateFx(dt) {
        for (const particle of state.particles) {
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          particle.vx *= 1 - 2.2 * dt;
          particle.vy *= 1 - 2.2 * dt;
          particle.life -= dt;
        }
        state.particles = state.particles.filter((particle) => particle.life > 0);
        for (const floaterItem of state.floaters) {
          floaterItem.y -= 34 * dt;
          floaterItem.life -= dt;
        }
        state.floaters = state.floaters.filter((floaterItem) => floaterItem.life > 0);
      }
    },
  };
}
