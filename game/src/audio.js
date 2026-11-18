// All sound is synthesized with WebAudio: no audio files, no network, and the
// game stays silent until the first key or click (browsers require a gesture).
// Every effect is one small function so the game can name what it wants to hear.
export function createAudio() {
  let context = null;
  let muted = false;
  try {
    muted = window.localStorage.getItem('emberkeep.muted') === '1';
  } catch {
    muted = false;
  }

  function ensure() {
    if (!context) {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  }

  function tone({ frequency, to = null, duration, type = 'sine', gain = 0.12, when = 0 }) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const start = ctx.currentTime + when;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (to !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noise({ duration, gain = 0.1, from = 1200, to = 200, when = 0 }) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const start = ctx.currentTime + when;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(envelope).connect(ctx.destination);
    source.start(start);
  }

  return {
    unlock() {
      ensure();
    },
    isMuted() {
      return muted;
    },
    toggleMuted() {
      muted = !muted;
      try {
        window.localStorage.setItem('emberkeep.muted', muted ? '1' : '0');
      } catch {
        // Storage can be off: muting then lasts this visit only.
      }
      return muted;
    },
    // A bright blip, rising a semitone with the combo so streaks sound better.
    pickup(combo) {
      const step = Math.min(combo, 12);
      tone({ frequency: 520 * Math.pow(2, step / 12), duration: 0.14, gain: 0.1 });
      tone({ frequency: 780 * Math.pow(2, step / 12), duration: 0.1, gain: 0.06, when: 0.03 });
    },
    flare() {
      noise({ duration: 0.35, gain: 0.16, from: 2400, to: 180 });
      tone({ frequency: 180, to: 60, duration: 0.3, type: 'triangle', gain: 0.12 });
    },
    hit() {
      tone({ frequency: 110, to: 45, duration: 0.35, type: 'sawtooth', gain: 0.16 });
      noise({ duration: 0.2, gain: 0.12, from: 500, to: 90 });
    },
    // A beacon kindles with a rising chime.
    beacon() {
      [523, 659, 784, 1047].forEach((frequency, index) => {
        tone({ frequency, duration: 0.5, gain: 0.09, when: index * 0.09 });
      });
    },
    shard() {
      tone({ frequency: 880, to: 1760, duration: 0.25, gain: 0.09 });
    },
    wave() {
      tone({ frequency: 392, duration: 0.12, gain: 0.07 });
      tone({ frequency: 523, duration: 0.16, gain: 0.07, when: 0.1 });
    },
    victory() {
      [523, 659, 784, 1047, 1319].forEach((frequency, index) => {
        tone({ frequency, duration: 0.6, gain: 0.1, when: index * 0.12 });
      });
    },
    defeat() {
      [392, 330, 262, 196].forEach((frequency, index) => {
        tone({ frequency, duration: 0.5, type: 'triangle', gain: 0.1, when: index * 0.16 });
      });
    },
  };
}
