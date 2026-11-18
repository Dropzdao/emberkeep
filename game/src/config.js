// Emberkeep — tuning constants. One place for every number the game balances on,
// so a reader can see the whole design at a glance.
export const VIEW = { width: 1280, height: 720 };

// Fixed simulation step: the world advances in 1/60 s slices, whatever the frame rate.
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  speed: 250,
  // Fuel is the player's life: it drains, embers refill it, hits burn it.
  fuelMax: 100,
  fuelDrain: 1.25,
  emberFuel: 12,
  hitFuel: 18,
  // A flare burst costs fuel and disperses every shade inside its ring.
  flareCost: 8,
  flareRadius: 150,
  flareCooldown: 0.9,
  invulnerable: 1.0,
  magnetSeconds: 8,
};

export const BEACONS = [
  { x: 150, y: 130 },
  { x: 1130, y: 130 },
  { x: 640, y: 110 },
  { x: 220, y: 590 },
  { x: 1060, y: 590 },
];
export const BEACON_KINDLE_COST = 10;
// Seconds a keeper must stand at the awake beacon to kindle it; stepping
// away or being hit starts the kindling over.
export const BEACON_CHANNEL_SECONDS = 2.5;
export const BEACON_SCORE = 150;
export const BEACON_SAFE_RADIUS = 110;

export const EMBER = {
  radius: 9,
  score: 10,
  // Embers on the field at once, and how often a new one appears.
  target: 6,
  spawnEvery: 1.9,
  comboWindow: 3,
  comboMax: 8,
};

export const SHADE = {
  radius: 15,
  // Spawn interval and speed grow with the wave number.
  spawnStart: 2.1,
  spawnMin: 0.75,
  speedStart: 46,
  speedPerWave: 7,
  speedMax: 96,
  wobble: 0.9,
  // Shades keep their distance from a lit beacon's glow.
  beaconRepel: 60,
  // The field never holds more shades than this: beyond it the dark waits.
  maxAlive: 26,
};

export const WAVE_SECONDS = 20;
export const WIN_WAVES_BONUS = 0;

// Sunshards are rare pickups: +1 flare charge and a magnet that pulls embers in.
export const SHARD = { radius: 12, spawnAfter: 45, spawnEvery: 40 };

export const PARTICLES = { max: 420 };

export const BEST_KEY = 'emberkeep.best';
export const MUTE_KEY = 'emberkeep.muted';
