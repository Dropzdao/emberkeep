# Emberkeep

A top-down arena survival game. You are the Emberkeeper of a dark grove.
Your lantern light is your life: it drains as you walk, embers feed it,
shades snuff it out — and lighting all five beacons wins the game.

## How to play

- **Move:** WASD or arrow keys
- **Flare burst:** Space or click (costs 8 fuel, disperses shades nearby)
- **Pause:** P or Escape
- **Mute:** M
- **Start / restart:** Enter or click

Gather embers to feed your lantern (+14 fuel each, chained pickups build a
combo up to x8). Stand at the one glowing beacon to kindle it (2.5 seconds;
stepping away or taking a hit starts the kindling over, and it costs 10
fuel); a lit beacon glows and pushes shades back. Beacons wake one at a
time, so the keeper must cross the grove five times while the dark thickens.
Sunshards grant a magnet and a shield. Survive the rising waves — light all
five beacons before your lantern goes out.

## Play it

Serve `game/` with any static server, or run `node serve.ts` and open
http://localhost:8080. No build step, no network requests, no libraries:
plain ES modules on a canvas, with synthesized WebAudio sound.

## Shots

`screenshots/` holds four real renders of the game's own code, staged by
`game/src/shots.js` through `?shot=play|title|victory|over&seed=7`:
the cover is a mid-game play frame, then the title, the victory screen and
the game-over screen — the whole loop.

## License

MIT. See LICENSE.
