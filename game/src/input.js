// Keyboard and mouse input. Movement is WASD or the arrow keys; Space or a click
// fires a flare; P or Escape pauses; Enter or Space confirms on menus; M mutes.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_FLARE = 4;
export const ACTION_MUTE = 8;

const CONFIRM_KEYS = new Set(['Enter', ' ']);
const PAUSE_KEYS = new Set(['p', 'P', 'Escape']);
const FLARE_KEYS = new Set([' ']);
const MUTE_KEYS = new Set(['m', 'M']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;

  function keyDown(event) {
    if (event.repeat) return;
    keys.add(event.key);
    if (CONFIRM_KEYS.has(event.key)) actions |= ACTION_CONFIRM;
    if (PAUSE_KEYS.has(event.key)) actions |= ACTION_PAUSE;
    if (FLARE_KEYS.has(event.key)) actions |= ACTION_FLARE;
    if (MUTE_KEYS.has(event.key)) actions |= ACTION_MUTE;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
  }

  function keyUp(event) {
    keys.delete(event.key);
  }

  function mouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  }

  function mouseDown(event) {
    mouseMove(event);
    actions |= ACTION_FLARE;
    if (event.target === canvas) actions |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mousedown', mouseDown);

  return {
    // -1, 0 or 1 on each axis, from the keys held down right now.
    direction() {
      const left = keys.has('a') || keys.has('A') || keys.has('ArrowLeft') ? 1 : 0;
      const right = keys.has('d') || keys.has('D') || keys.has('ArrowRight') ? 1 : 0;
      const up = keys.has('w') || keys.has('W') || keys.has('ArrowUp') ? 1 : 0;
      const down = keys.has('s') || keys.has('S') || keys.has('ArrowDown') ? 1 : 0;
      return { x: right - left, y: down - up };
    },
    mouse() {
      return { x: mouseX, y: mouseY };
    },
    // One-shot actions since the last call; reading them clears them.
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
