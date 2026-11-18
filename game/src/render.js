// Emberkeep's renderer: everything the player sees, painted on one canvas.
// The grove is dark indigo; the keeper's lantern is the only warm light, so
// the game reads at a glance even shrunk to a contact sheet: amber glow,
// violet shades, gold embers, and a HUD that always says how the run stands.
import { BEACONS, PLAYER, VIEW } from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const TAU = Math.PI * 2;

// The grove's trees and stones never move: one fixed layout, drawn from a
// seed that never changes, so every run and every screenshot shares it.
const groveRandom = createRandom(20261115);
const TREES = [];
const STONES = [];
for (let i = 0; i < 26; i += 1) {
  TREES.push({
    x: groveRandom() * VIEW.width,
    y: 90 + groveRandom() * (VIEW.height - 130),
    size: 26 + groveRandom() * 34,
  });
}
for (let i = 0; i < 14; i += 1) {
  STONES.push({
    x: groveRandom() * VIEW.width,
    y: 100 + groveRandom() * (VIEW.height - 140),
    size: 5 + groveRandom() * 9,
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function glowCircle(ctx, x, y, radius, inner, outer) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

export function createRenderer(canvas) {
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  const ctx = canvas.getContext('2d');

  function drawGround() {
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    gradient.addColorStop(0, '#12172e');
    gradient.addColorStop(1, '#0b0e1c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    // Faint moss patches.
    ctx.fillStyle = 'rgba(46, 90, 62, 0.20)';
    for (let i = 0; i < 10; i += 1) {
      const x = ((i * 397) % VIEW.width) + 40;
      const y = 120 + ((i * 211) % 560);
      ctx.beginPath();
      ctx.ellipse(x, y, 90 + (i % 3) * 30, 34 + (i % 2) * 14, 0, 0, TAU);
      ctx.fill();
    }
    // Trees: dark trunks with a cold rim.
    for (const tree of TREES) {
      ctx.fillStyle = '#0a0d18';
      ctx.beginPath();
      ctx.ellipse(tree.x, tree.y, tree.size * 0.42, tree.size, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90, 110, 160, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(tree.x, tree.y, tree.size * 0.42, tree.size, 0, Math.PI * 0.9, Math.PI * 1.7);
      ctx.stroke();
    }
    // Stones.
    ctx.fillStyle = '#1a2036';
    for (const stone of STONES) {
      ctx.beginPath();
      ctx.ellipse(stone.x, stone.y, stone.size, stone.size * 0.62, 0, 0, TAU);
      ctx.fill();
    }
  }

  function drawBeacon(beacon, time, awake, channel) {
    const { x, y } = beacon;
    // Stone pillar.
    ctx.fillStyle = '#232a44';
    roundRect(ctx, x - 16, y - 26, 32, 52, 6);
    ctx.fill();
    ctx.fillStyle = '#2e3757';
    roundRect(ctx, x - 20, y - 32, 40, 12, 5);
    ctx.fill();
    if (beacon.lit) {
      const flicker = 1 + Math.sin(time * 6 + x) * 0.12;
      ctx.globalCompositeOperation = 'lighter';
      glowCircle(ctx, x, y - 40, 90 * flicker, 'rgba(255, 179, 71, 0.55)', 'rgba(255, 179, 71, 0)');
      ctx.globalCompositeOperation = 'source-over';
      // Flame.
      ctx.fillStyle = '#ffd27d';
      ctx.beginPath();
      ctx.moveTo(x, y - 62);
      ctx.quadraticCurveTo(x + 11, y - 44, x, y - 30);
      ctx.quadraticCurveTo(x - 11, y - 44, x, y - 62);
      ctx.fill();
      ctx.fillStyle = '#ff9d2e';
      ctx.beginPath();
      ctx.moveTo(x, y - 50);
      ctx.quadraticCurveTo(x + 6, y - 40, x, y - 32);
      ctx.quadraticCurveTo(x - 6, y - 40, x, y - 50);
      ctx.fill();
    } else {
      // Cold bowl, waiting for a spark.
      ctx.strokeStyle = awake ? 'rgba(255, 210, 125, 0.9)' : 'rgba(160, 175, 220, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y - 30, 9, 0, TAU);
      ctx.stroke();
      if (awake) {
        // The awake beacon calls: a pulsing ring and a kindling progress arc.
        const pulse = 1 + Math.sin(time * 4) * 0.12;
        ctx.strokeStyle = 'rgba(255, 210, 125, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y, 44 * pulse, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = '#ffd27d';
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('KINDLE — STAND CLOSE', x, y + 44);
        if (channel > 0) {
          ctx.strokeStyle = '#ffd27d';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(x, y - 30, 16, -Math.PI / 2, -Math.PI / 2 + channel * TAU);
          ctx.stroke();
        }
      }
    }
  }

  function drawEmber(ember) {
    const pulse = 1 + Math.sin(ember.phase) * 0.18;
    ctx.globalCompositeOperation = 'lighter';
    glowCircle(ctx, ember.x, ember.y, 26 * pulse, 'rgba(255, 200, 94, 0.75)', 'rgba(255, 200, 94, 0)');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, 5.5 * pulse, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff9d2e';
    ctx.beginPath();
    ctx.arc(ember.x, ember.y, 3, 0, TAU);
    ctx.fill();
  }

  function drawShard(shard) {
    const pulse = 1 + Math.sin(shard.phase) * 0.2;
    ctx.globalCompositeOperation = 'lighter';
    glowCircle(ctx, shard.x, shard.y, 34 * pulse, 'rgba(120, 200, 255, 0.6)', 'rgba(120, 200, 255, 0)');
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(shard.phase * 0.5);
    ctx.fillStyle = '#cfeeff';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = '#5aa9e6';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }

  function drawShade(shade) {
    const wobble = Math.sin(shade.phase) * 3;
    ctx.save();
    ctx.translate(shade.x, shade.y + wobble);
    // Wisp body.
    const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
    gradient.addColorStop(0, 'rgba(141, 123, 255, 0.85)');
    gradient.addColorStop(0.6, 'rgba(90, 70, 200, 0.55)');
    gradient.addColorStop(1, 'rgba(90, 70, 200, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, TAU);
    ctx.fill();
    // Tail.
    ctx.fillStyle = 'rgba(70, 55, 170, 0.6)';
    ctx.beginPath();
    ctx.moveTo(-10, 8);
    ctx.quadraticCurveTo(0, 30 + wobble, 10, 8);
    ctx.closePath();
    ctx.fill();
    // Eyes: two cold sparks that find the keeper.
    ctx.fillStyle = '#e8e4ff';
    ctx.beginPath();
    ctx.arc(-6, -3, 2.6, 0, TAU);
    ctx.arc(6, -3, 2.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer(player, time) {
    const { x, y } = player;
    const blink = player.invulnerable > 0 && Math.floor(time * 12) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.45;
    // Lantern glow first, so the keeper stands inside warm light.
    ctx.globalCompositeOperation = 'lighter';
    const glow = 300 + Math.sin(time * 3) * 12;
    glowCircle(ctx, x, y, glow, 'rgba(255, 179, 71, 0.34)', 'rgba(255, 179, 71, 0)');
    ctx.globalCompositeOperation = 'source-over';
    // Cloak.
    ctx.fillStyle = '#2b3350';
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.quadraticCurveTo(x + 15, y - 6, x + 12, y + 14);
    ctx.quadraticCurveTo(x, y + 19, x - 12, y + 14);
    ctx.quadraticCurveTo(x - 15, y - 6, x, y - 18);
    ctx.fill();
    // Hood.
    ctx.fillStyle = '#39415f';
    ctx.beginPath();
    ctx.arc(x, y - 12, 10, 0, TAU);
    ctx.fill();
    // Face in shadow, two warm eyes.
    ctx.fillStyle = '#ffd27d';
    ctx.beginPath();
    ctx.arc(x - 3.5, y - 12, 1.6, 0, TAU);
    ctx.arc(x + 3.5, y - 12, 1.6, 0, TAU);
    ctx.fill();
    // The lantern, held out toward where the keeper faces.
    const lx = x + Math.cos(player.facing) * 20;
    const ly = y + Math.sin(player.facing) * 20;
    ctx.strokeStyle = '#8a6a2f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 2);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.fillStyle = '#3a2f16';
    roundRect(ctx, lx - 5, ly - 7, 10, 14, 3);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(lx, ly, 3.4, 0, TAU);
    ctx.fill();
    // Shield ring when a sunshard guards the keeper.
    if (player.shield) {
      ctx.strokeStyle = 'rgba(159, 216, 255, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, 26 + Math.sin(time * 4) * 2, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHud(state, best) {
    const player = state.player;
    ctx.textBaseline = 'alphabetic';
    // Fuel: a lantern bar, top left.
    ctx.fillStyle = 'rgba(5, 8, 18, 0.6)';
    roundRect(ctx, 20, 16, 260, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#ffd27d';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LANTERN', 34, 34);
    const fuelWidth = 150 * Math.max(0, player.fuel / 100);
    ctx.fillStyle = '#1a2036';
    roundRect(ctx, 110, 22, 150, 14, 7);
    ctx.fill();
    const fuelGradient = ctx.createLinearGradient(110, 0, 260, 0);
    fuelGradient.addColorStop(0, '#ff9d2e');
    fuelGradient.addColorStop(1, '#ffd27d');
    ctx.fillStyle = player.fuel < 25 ? '#ff5d5d' : fuelGradient;
    if (fuelWidth > 0) {
      roundRect(ctx, 110, 22, fuelWidth, 14, 7);
      ctx.fill();
    }
    // Flare readiness beside the bar.
    ctx.fillStyle = player.flareCooldown <= 0 ? '#c9a7ff' : 'rgba(160, 160, 190, 0.5)';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText(player.flareCooldown <= 0 ? 'FLARE READY [SPACE]' : 'FLARE…', 34, 52);

    // Score, top centre.
    ctx.fillStyle = 'rgba(5, 8, 18, 0.6)';
    roundRect(ctx, VIEW.width / 2 - 130, 16, 260, 52, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(state.score), VIEW.width / 2, 42);
    ctx.fillStyle = state.combo > 1 ? '#ffd27d' : 'rgba(200, 205, 230, 0.8)';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText(state.combo > 1 ? `COMBO x${state.combo}` : `WAVE ${state.wave}`, VIEW.width / 2, 60);

    // Beacons, top right: five dots that fill as the grove lights.
    ctx.fillStyle = 'rgba(5, 8, 18, 0.6)';
    roundRect(ctx, VIEW.width - 240, 16, 220, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#c8cde6';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BEACONS', VIEW.width - 226, 34);
    state.beacons.forEach((beacon, index) => {
      const bx = VIEW.width - 150 + index * 24;
      const by = 38;
      ctx.fillStyle = beacon.lit ? '#ffd27d' : 'rgba(120, 130, 170, 0.45)';
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, TAU);
      ctx.fill();
      if (beacon.lit) {
        ctx.fillStyle = '#fff3cf';
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, TAU);
        ctx.fill();
      }
    });
    ctx.fillStyle = 'rgba(200, 205, 230, 0.8)';
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, VIEW.width - 226, 52);
    if (player.magnet > 0) {
      ctx.fillStyle = '#9fd8ff';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('MAGNET', VIEW.width - 20, 76);
    }
  }

  function drawPanel(title, lines, accent) {
    ctx.fillStyle = 'rgba(4, 6, 14, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = 'rgba(10, 14, 28, 0.92)';
    roundRect(ctx, VIEW.width / 2 - 330, 130, 660, 460, 18);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    roundRect(ctx, VIEW.width / 2 - 330, 130, 660, 460, 18);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.font = '800 54px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, VIEW.width / 2, 215);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '400 20px Georgia, serif';
    let y = 265;
    for (const line of lines) {
      ctx.fillText(line, VIEW.width / 2, y);
      y += 32;
    }
    return y;
  }

  function drawStats(state, y) {
    ctx.fillStyle = '#ffd27d';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `SCORE ${state.score}   •   EMBERS ${state.embersEaten}   •   BEACONS ${state.beaconsLit}/5   •   WAVE ${state.wave}`,
      VIEW.width / 2,
      y + 18,
    );
  }

  return {
    draw(state, screen, best, muted = false) {
      const time = state.time;
      ctx.save();
      if (state.shake > 0) {
        ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
      }
      drawGround();
      let awakeBeacon = null;
      for (const beacon of state.beacons) {
        if (!beacon.lit) {
          awakeBeacon = beacon;
          break;
        }
      }
      for (const beacon of state.beacons) {
        drawBeacon(beacon, time, beacon === awakeBeacon, beacon === awakeBeacon ? state.channel : 0);
      }
      for (const ember of state.embers) drawEmber(ember);
      for (const shard of state.shards) drawShard(shard);
      for (const shade of state.shades) drawShade(shade);
      drawPlayer(state.player, time);
      // Particles over the world.
      ctx.globalCompositeOperation = 'lighter';
      for (const particle of state.particles) {
        ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // Night closes in beyond the lantern's reach, but never so far that
      // the grove stops reading.
      const player = state.player;
      const dark = ctx.createRadialGradient(player.x, player.y, 60, player.x, player.y, 460);
      dark.addColorStop(0, 'rgba(5, 6, 16, 0)');
      dark.addColorStop(0.62, 'rgba(5, 6, 16, 0.3)');
      dark.addColorStop(1, 'rgba(5, 6, 16, 0.72)');
      ctx.fillStyle = dark;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      // Flare flash.
      if (state.flash > 0) {
        ctx.fillStyle = `rgba(255, 220, 150, ${state.flash * 0.35})`;
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      }
      // Floating score text.
      ctx.textAlign = 'center';
      for (const floater of state.floaters) {
        ctx.globalAlpha = Math.max(0, floater.life);
        ctx.fillStyle = floater.color;
        ctx.font = '800 17px system-ui, sans-serif';
        ctx.fillText(floater.text, floater.x, floater.y);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      if (screen === SCREEN_TITLE) {
        ctx.fillStyle = 'rgba(4, 6, 14, 0.55)';
        ctx.fillRect(0, 0, VIEW.width, VIEW.height);
        ctx.fillStyle = '#ffd27d';
        ctx.font = '800 84px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('EMBERKEEP', VIEW.width / 2, 250);
        ctx.fillStyle = '#e8e4d8';
        ctx.font = 'italic 400 26px Georgia, serif';
        ctx.fillText('Keep the light alive. Light all five beacons.', VIEW.width / 2, 300);
        ctx.font = '400 20px system-ui, sans-serif';
        ctx.fillStyle = '#c8cde6';
        ctx.fillText('WASD / Arrows — move      SPACE / Click — flare burst', VIEW.width / 2, 360);
        ctx.fillText('Gather embers to feed your lantern. Shades snuff it out.', VIEW.width / 2, 394);
        ctx.fillText('A beacon costs 10 fuel to kindle — and lights the way home.', VIEW.width / 2, 428);
        ctx.fillText('Stand at the glowing beacon to kindle it. A shade hit breaks the kindling.', VIEW.width / 2, 462);
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 24px system-ui, sans-serif';
        ctx.fillText('PRESS ENTER OR CLICK TO BEGIN', VIEW.width / 2, 500);
        if (best > 0) {
          ctx.fillStyle = '#ffd27d';
          ctx.font = '700 18px system-ui, sans-serif';
          ctx.fillText(`BEST SCORE ${best}`, VIEW.width / 2, 544);
        }
      } else if (screen === SCREEN_PAUSED) {
        const y = drawPanel('PAUSED', ['The grove waits in the dark.', 'Press P or Enter to keep playing.'], '#9fb4d8');
        drawStats(state, y + 10);
      } else if (screen === SCREEN_WIN) {
        const y = drawPanel(
          'THE GROVE IS LIT',
          ['All five beacons burn. Dawn is coming.', 'The Emberkeeper kept the light alive.'],
          '#ffd27d',
        );
        drawStats(state, y + 10);
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 22px system-ui, sans-serif';
        ctx.fillText('PRESS ENTER TO PLAY AGAIN', VIEW.width / 2, y + 92);
      } else if (screen === SCREEN_OVER) {
        const y = drawPanel(
          'THE LIGHT WENT OUT',
          ['The lantern is empty and the shades close in.', 'Gather embers faster. Kindle beacons sooner.'],
          '#8d7bff',
        );
        drawStats(state, y + 10);
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 22px system-ui, sans-serif';
        ctx.fillText('PRESS ENTER TO TRY AGAIN', VIEW.width / 2, y + 92);
      }

      // The HUD stays bright on top of every screen, so the run's state is
      // always readable — even behind a victory or game-over panel.
      drawHud(state, best);
      if (muted) {
        ctx.fillStyle = 'rgba(200, 205, 230, 0.8)';
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('MUTED [M]', VIEW.width - 20, VIEW.height - 16);
      }
    },
  };
}
