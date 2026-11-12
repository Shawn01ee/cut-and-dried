const midiHz = m => 440 * 2 ** ((m - 69) / 12);
const TEMPO = 88, STEP = 60 / TEMPO / 4, STEPS_PER_BAR = 16, SCHEDULE_AHEAD = .25;
const STORAGE_KEY = 'cd-audio';

// Original eight-bar chiptune loop: [step, MIDI note, length in steps] for each melody note.
const BARS = [
  { chord: [60, 64, 67, 71], bass: 48, melody: [[0, 76, 3], [4, 79, 2], [6, 76, 2], [8, 74, 4], [12, 72, 3]] },
  { chord: [57, 60, 64, 67], bass: 45, melody: [[0, 69, 3], [4, 72, 2], [6, 74, 2], [8, 76, 6], [14, 74, 2]] },
  { chord: [62, 65, 69, 72], bass: 50, melody: [[0, 77, 3], [4, 76, 2], [6, 74, 2], [8, 72, 4], [12, 69, 3]] },
  { chord: [55, 59, 62, 65], bass: 43, melody: [[0, 71, 2], [2, 74, 2], [4, 79, 4], [10, 77, 2], [12, 74, 4]] },
  { chord: [57, 60, 64, 65], bass: 41, melody: [[0, 72, 2], [2, 76, 2], [4, 81, 4], [10, 79, 2], [12, 76, 4]] },
  { chord: [55, 59, 62, 64], bass: 40, melody: [[0, 79, 3], [4, 76, 2], [6, 71, 2], [8, 74, 4], [12, 76, 3]] },
  { chord: [62, 65, 69, 72], bass: 50, melody: [[0, 74, 2], [2, 77, 2], [4, 81, 3], [8, 79, 2], [10, 77, 2], [12, 74, 4]] },
  { chord: [55, 59, 62, 65], bass: 43, melody: [[0, 71, 4], [4, 74, 2], [6, 77, 2], [8, 79, 6]] },
];
const LOOP_STEPS = BARS.length * STEPS_PER_BAR;
const MIN_GAP = { snip: .11, click: .03, chime: .4, cash: .08, clap: .6, swish: .15 };

/** Synthesises all music and sound effects, so the game ships without audio files. */
export class AudioManager {
  #ctx = null; #master = null; #music = null; #sfx = null; #noiseBuffer = null;
  #nextTime = 0; #step = 0; #pass = 0; #lastPlayed = {};

  constructor(bus) {
    this.musicVolume = .5; this.sfxVolume = .8; this.muted = false;
    this.#loadSettings();
    bus.on('level:up', () => this.play('levelUp'));
    bus.on('day:closed', () => this.play('bell'));
    // Browsers only allow audio to start from a user gesture.
    ['click', 'keydown', 'touchend'].forEach(type => addEventListener(type, () => this.#unlock(), true));
    document.addEventListener('visibilitychange', () => { if (this.#ctx) document.hidden ? this.#ctx.suspend() : this.#ctx.resume(); });
  }

  #loadSettings() { try { Object.assign(this, JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { /* keep defaults */ } }
  #saveSettings() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ musicVolume: this.musicVolume, sfxVolume: this.sfxVolume, muted: this.muted })); } catch { /* unavailable */ } }

  #unlock() {
    if (this.#ctx) { if (this.#ctx.state === 'suspended' && !document.hidden) this.#ctx.resume(); return; }
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const ctx = this.#ctx = new Context();
    const compressor = ctx.createDynamicsCompressor();
    const warmth = ctx.createBiquadFilter(); warmth.type = 'lowpass'; warmth.frequency.value = 3200;
    this.#master = ctx.createGain(); this.#music = ctx.createGain(); this.#sfx = ctx.createGain();
    this.#music.connect(warmth).connect(this.#master); this.#sfx.connect(this.#master);
    this.#master.connect(compressor).connect(ctx.destination);
    this.#applyVolumes();
    this.#noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const samples = this.#noiseBuffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    ctx.resume();
    this.#nextTime = ctx.currentTime + .1;
    setInterval(() => this.#scheduleMusic(), 100);
  }
  #applyVolumes() {
    if (!this.#ctx) return;
    this.#master.gain.value = this.muted ? 0 : .9;
    this.#music.gain.value = this.musicVolume * .8;
    this.#sfx.gain.value = this.sfxVolume;
  }
  setVolume(kind, value) { if (kind === 'music') this.musicVolume = value; else this.sfxVolume = value; this.#applyVolumes(); this.#saveSettings(); }
  toggleMute() { this.muted = !this.muted; this.#applyVolumes(); this.#saveSettings(); }

  #tone(out, { freq, start, dur, type = 'square', vol = .1, to = null, attack = .005 }) {
    const ctx = this.#ctx, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, start);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, start + dur);
    gain.gain.setValueAtTime(.0001, start); gain.gain.linearRampToValueAtTime(vol, start + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, start + dur);
    osc.connect(gain).connect(out); osc.start(start); osc.stop(start + dur + .02);
  }
  #noise(out, { start, dur, vol, type = 'highpass', freq = 6000, attack = .002 }) {
    const ctx = this.#ctx, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = this.#noiseBuffer; filter.type = type; filter.frequency.value = freq;
    gain.gain.setValueAtTime(.0001, start); gain.gain.linearRampToValueAtTime(vol, start + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, start + dur);
    source.connect(filter).connect(gain).connect(out);
    source.start(start, Math.random() * 1.5, dur + .05);
  }
  #scheduleMusic() {
    if (!this.#ctx || this.#ctx.state !== 'running') return;
    while (this.#nextTime < this.#ctx.currentTime + SCHEDULE_AHEAD) {
      this.#playStep(this.#step, this.#nextTime);
      this.#nextTime += STEP; this.#step++;
      if (this.#step >= LOOP_STEPS) { this.#step = 0; this.#pass++; }
    }
  }
  #playStep(step, t) {
    const out = this.#music, bar = BARS[Math.floor(step / STEPS_PER_BAR)], s = step % STEPS_PER_BAR;
    if (s === 0 || s === 8) this.#tone(out, { freq: 110, to: 48, start: t, dur: .14, type: 'sine', vol: .24 });
    if (s === 4 || s === 12) this.#noise(out, { start: t, dur: .09, vol: .05, type: 'bandpass', freq: 1800 });
    if (s % 2 === 0) this.#noise(out, { start: t, dur: .03, vol: .02, freq: 7000 });
    if (s === 0 || s === 6 || s === 8 || s === 14) this.#tone(out, { freq: midiHz(bar.bass + (s === 8 ? 7 : 0)), start: t, dur: STEP * 3, type: 'triangle', vol: .24 });
    if (s === 2 || s === 10) bar.chord.forEach(n => this.#tone(out, { freq: midiHz(n), start: t, dur: STEP * 5, type: 'triangle', vol: .045, attack: .02 }));
    if (this.#pass % 2 === 0) {
      bar.melody.filter(([at]) => at === s).forEach(([, note, len]) => this.#tone(out, { freq: midiHz(note), start: t, dur: STEP * len, vol: .06, attack: .01 }));
    } else if (s % 2 === 0) {
      this.#tone(out, { freq: midiHz(bar.chord[(s / 2) % bar.chord.length] + 12), start: t, dur: STEP * 1.6, vol: .04 });
    }
  }

  #arpeggio(notes, gap, opts) { const t = this.#ctx.currentTime; notes.forEach((n, i) => this.#tone(this.#sfx, { freq: midiHz(n), start: t + i * gap, ...opts })); }

  #effects = {
    click: t => this.#tone(this.#sfx, { freq: 880, start: t, dur: .04, vol: .05 }),
    snip: t => { this.#noise(this.#sfx, { start: t, dur: .025, vol: .22, freq: 5000 }); this.#noise(this.#sfx, { start: t + .05, dur: .03, vol: .18, freq: 6500 }); },
    swish: t => this.#noise(this.#sfx, { start: t, dur: .22, vol: .08, type: 'bandpass', freq: 2200, attack: .08 }),
    dryer: (t, { duration = 2 }) => { this.#noise(this.#sfx, { start: t, dur: duration, vol: .1, type: 'bandpass', freq: 1400, attack: .12 }); this.#tone(this.#sfx, { freq: 130, start: t, dur: duration, type: 'sawtooth', vol: .018, attack: .12 }); },
    chime: t => { this.#tone(this.#sfx, { freq: midiHz(88), start: t, dur: .5, type: 'sine', vol: .14 }); this.#tone(this.#sfx, { freq: midiHz(84), start: t + .16, dur: .7, type: 'sine', vol: .14 }); },
    cash: t => { this.#tone(this.#sfx, { freq: midiHz(83), start: t, dur: .08, vol: .08 }); this.#tone(this.#sfx, { freq: midiHz(88), start: t + .07, dur: .28, vol: .08 }); },
    clap: t => { for (let i = 0; i < 7; i++) this.#noise(this.#sfx, { start: t + i * .1 + Math.random() * .04, dur: .05, vol: .1, type: 'bandpass', freq: 1500 + Math.random() * 900 }); },
    happy: () => this.#arpeggio([72, 76, 79], .09, { dur: .2, vol: .08 }),
    sad: () => this.#arpeggio([64, 60], .18, { dur: .32, type: 'triangle', vol: .14 }),
    bad: t => this.#tone(this.#sfx, { freq: 200, to: 110, start: t, dur: .24, type: 'sawtooth', vol: .05 }),
    bell: t => this.#tone(this.#sfx, { freq: midiHz(79), start: t, dur: 1.1, type: 'sine', vol: .18 }),
    levelUp: () => this.#arpeggio([72, 76, 79, 84, 88], .1, { dur: .3, vol: .09 }),
    dayEnd: () => this.#arpeggio([67, 72, 76, 79], .16, { dur: .55, type: 'triangle', vol: .16 }),
    place: t => { this.#tone(this.#sfx, { freq: 170, to: 70, start: t, dur: .12, type: 'sine', vol: .28 }); this.#noise(this.#sfx, { start: t, dur: .05, vol: .06, type: 'lowpass', freq: 1200 }); },
    deny: t => this.#tone(this.#sfx, { freq: 130, start: t, dur: .14, vol: .06 }),
  };

  /** Plays a named sound effect. Rapid repeats of the same sound are ignored. */
  play(name, options = {}) {
    if (!this.#ctx || this.#ctx.state !== 'running' || this.muted) return;
    const now = this.#ctx.currentTime;
    if (now - (this.#lastPlayed[name] ?? -1) < (MIN_GAP[name] || 0)) return;
    this.#lastPlayed[name] = now;
    this.#effects[name](now, options);
  }
}
