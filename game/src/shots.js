// The screenshot scenes behind ?shot=play|title|victory|over. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by an autopilot, so the frame is what a real game looks like and
// the same seed always gives the same frame. The play scene's pilot plays
// well and keeps its light; the victory pilot hunts beacons until the grove
// is lit; the over scene's pilot is careless, so the dark catches it.
import { PLAYER, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const PLAY_SECONDS = 20;
const VICTORY_LIMIT_SECONDS = 300;
const OVER_LIMIT_SECONDS = 300;
const TITLE_SECONDS = 6;

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// The awake beacon: beacons wake one at a time, in the order they stand.
function nearestBeacon(state) {
  for (const beacon of state.beacons) {
    if (!beacon.lit) return beacon;
  }
  return null;
}

function nearestEmber(state) {
  let best = null;
  let bestDistance = Infinity;
  for (const ember of state.embers) {
    if (!ember.active) continue;
    const d = distance(ember.x, ember.y, state.player.x, state.player.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = ember;
    }
  }
  return best;
}

function nearestShade(state) {
  let best = null;
  let bestDistance = Infinity;
  for (const shade of state.shades) {
    if (!shade.active) continue;
    const d = distance(shade.x, shade.y, state.player.x, state.player.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = shade;
    }
  }
  return best;
}

// Steer toward (tx, ty), but veer away when a shade is close ahead.
function steer(state, tx, ty) {
  const player = state.player;
  let dx = tx - player.x;
  let dy = ty - player.y;
  const shade = nearestShade(state);
  if (shade) {
    const d = distance(shade.x, shade.y, player.x, player.y);
    if (d < 85) {
      // Step sideways from the shade's approach instead of into it.
      const awayX = player.x - shade.x;
      const awayY = player.y - shade.y;
      dx = awayX - awayY * 0.8;
      dy = awayY + awayX * 0.8;
    }
  }
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

// A careful pilot: feed the lantern first, kindle beacons when it can
// afford to, and flare when the shades crowd in.
function carefulPilot(state) {
  const player = state.player;
  const beacon = nearestBeacon(state);
  const ember = nearestEmber(state);
  let target = null;
  if (player.fuel < 38 && ember) target = ember;
  else if (beacon && player.fuel > 26) target = beacon;
  else if (ember) target = ember;
  else target = { x: 640, y: 360 };
  const dir = steer(state, target.x, target.y);
  let flare = false;
  if (player.fuel > 42 && player.flareCooldown <= 0) {
    let close = 0;
    for (const shade of state.shades) {
      if (shade.active && distance(shade.x, shade.y, player.x, player.y) < PLAYER.flareRadius) close += 1;
    }
    flare = close >= 2;
  }
  return { dir, flare };
}

// A beacon-hungry pilot for the victory scene: beacons first, embers only
// when the lantern runs low, flares whenever the shades press in. Once it
// has started kindling, it stands its ground and flares rather than veering
// off and breaking the channel.
function victoryPilot(state) {
  const player = state.player;
  const beacon = nearestBeacon(state);
  const ember = nearestEmber(state);
  let target = null;
  if (player.fuel < 45 && ember) target = ember;
  else if (beacon) target = beacon;
  else if (ember) target = ember;
  else target = { x: 640, y: 360 };
  let dir;
  if (state.channel > 0 && beacon) {
    const dx = beacon.x - player.x;
    const dy = beacon.y - player.y;
    const length = Math.hypot(dx, dy) || 1;
    dir = { x: dx / length, y: dy / length };
  } else {
    dir = steer(state, target.x, target.y);
  }
  let flare = false;
  if (player.fuel > 25 && player.flareCooldown <= 0) {
    let close = 0;
    for (const shade of state.shades) {
      if (shade.active && distance(shade.x, shade.y, player.x, player.y) < PLAYER.flareRadius) close += 1;
    }
    flare = close >= 1;
  }
  return { dir, flare };
}

// A careless pilot for the game-over scene: it drifts through the grove,
// never gathers embers, never flares, never dodges — so the lantern burns
// down and the dark catches it, as it does any keeper who forgets the light.
function carelessPilot(state) {
  const t = state.time * 0.3;
  return { dir: { x: Math.cos(t), y: Math.sin(t * 0.7) * 0.6 }, flare: false };
}

/**
 * Set `world` to the named scene (title, play, victory or over; any other
 * name is title) and return the screen to draw over it and the best score
 * to show.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'victory' && name !== 'over') {
    for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) {
      world.step(STEP, { x: 0, y: 0 }, false, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
      const { dir, flare } = carefulPilot(state);
      const events = world.step(STEP, dir, flare, false);
      if (events & (EVENT_OVER | EVENT_WIN)) break;
    }
    return { screen: state.won ? SCREEN_WIN : state.over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
  }
  if (name === 'victory') {
    for (let index = 0; index < VICTORY_LIMIT_SECONDS / STEP; index += 1) {
      const { dir, flare } = victoryPilot(state);
      const events = world.step(STEP, dir, flare, false);
      if (events & EVENT_WIN) break;
      if (events & EVENT_OVER) break;
    }
    return { screen: state.won ? SCREEN_WIN : SCREEN_PLAY, best: state.score };
  }
  // over
  for (let index = 0; index < OVER_LIMIT_SECONDS / STEP; index += 1) {
    const { dir, flare } = carelessPilot(state);
    const events = world.step(STEP, dir, flare, false);
    if (events & EVENT_OVER) break;
  }
  return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
}
