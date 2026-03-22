/* ============================================
   SOUNDS.JS - Web Audio API Sound Effects
   ============================================ */

const SoundEngine = (() => {
  let audioCtx = null;

  function getCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, duration, type = 'sine', volume = 0.15) {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) { /* ignore audio errors */ }
  }

  return {
    correct() {
      playTone(523.25, 0.1, 'sine', 0.12);
      setTimeout(() => playTone(659.25, 0.1, 'sine', 0.12), 80);
      setTimeout(() => playTone(783.99, 0.15, 'sine', 0.12), 160);
      setTimeout(() => playTone(1046.5, 0.25, 'sine', 0.15), 240);
    },

    wrong() {
      playTone(300, 0.15, 'sawtooth', 0.08);
      setTimeout(() => playTone(250, 0.25, 'sawtooth', 0.06), 120);
    },

    click() {
      playTone(800, 0.05, 'sine', 0.08);
    },

    levelUp() {
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((f, i) => {
        setTimeout(() => playTone(f, 0.12, 'sine', 0.1), i * 80);
      });
    },

    streak() {
      playTone(880, 0.08, 'triangle', 0.1);
      setTimeout(() => playTone(1100, 0.08, 'triangle', 0.1), 60);
      setTimeout(() => playTone(1320, 0.15, 'triangle', 0.12), 120);
    },

    build() {
      playTone(200, 0.08, 'square', 0.06);
      setTimeout(() => playTone(400, 0.08, 'square', 0.06), 50);
      setTimeout(() => playTone(600, 0.12, 'square', 0.08), 100);
    },

    tick() {
      playTone(1000, 0.03, 'sine', 0.05);
    },

    init() {
      // Pre-warm audio context on first user interaction
      document.addEventListener('click', () => getCtx(), { once: true });
    }
  };
})();
