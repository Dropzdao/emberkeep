// Emberkeep's boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast
// one), and the renderer paints what is there. The game moves between five
// screens: title, play, paused, victory and game over.
//
// ?seed=N fixes the pattern of embers and shades. ?shot=title|play|victory|over
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, MUTE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BEACON, EVENT_FLARE, EVENT_HIT, EVENT_OVER, EVENT_PICKUP, EVENT_SHARD, EVENT_WAVE, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_FLARE, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readNumber(key) {
  try {
    return Number.parseInt(window.localStorage.getItem(key) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveNumber(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage can be off (private windows): the value then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, audio.isMuted());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readNumber(BEST_KEY);
  let accumulator = 0;
  let last = performance.now();
  // A flare press is queued here and spent by the next world step, so one
  // press fires exactly one burst even when a frame runs several steps.
  let flareQueued = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Keep your lantern fed and light all five beacons.');
  }

  function finishGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveNumber(BEST_KEY, best);
    }
    if (won) {
      audio.victory();
      announce(`Victory. The grove is lit. Score ${world.state.score}. Best ${best}.`);
    } else {
      audio.defeat();
      announce(`Game over. The light went out. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function handleEvents(events) {
    if (events & EVENT_PICKUP) audio.pickup(world.state.combo);
    if (events & EVENT_FLARE) audio.flare();
    if (events & EVENT_HIT) {
      audio.hit();
      announce(world.state.player.fuel <= 20 ? 'Hit. Your lantern is nearly out.' : 'Hit. A shade snuffed your light.');
    }
    if (events & EVENT_BEACON) audio.beacon();
    if (events & EVENT_SHARD) audio.shard();
    if (events & EVENT_WAVE) audio.wave();
    if (events & EVENT_WIN) finishGame(true);
    else if (events & EVENT_OVER) finishGame(false);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMuted();
      saveNumber(MUTE_KEY, muted ? 1 : 0);
    }
    if (actions & ACTION_FLARE) {
      audio.unlock();
      flareQueued = true;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, false, true);
      return;
    }
    const direction = input.direction();
    const flare = flareQueued;
    flareQueued = false;
    const events = world.step(STEP, direction, flare, false);
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, audio.isMuted());
  }

  // Leaving the tab pauses a running game rather than letting the lantern burn unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Emberkeep. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
