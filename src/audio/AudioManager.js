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
// A tense minor loop for while a difficult client is in the salon: driving bass, tritone stabs.
const TENSE_BARS = [
  { chord: [57, 60, 64], bass: 45, melody: [[0, 69, 2], [3, 72, 1], [4, 71, 3], [8, 68, 3], [12, 69, 2], [14, 64, 2]] },
  { chord: [57, 60, 63], bass: 45, melody: [[0, 72, 2], [3, 75, 1], [4, 74, 3], [8, 72, 2], [10, 71, 2], [12, 69, 4]] },
  { chord: [53, 57, 60], bass: 41, melody: [[0, 65, 2], [3, 69, 1], [4, 72, 3], [8, 71, 2], [10, 69, 2], [12, 68, 4]] },
  { chord: [52, 56, 59], bass: 40, melody: [[0, 64, 3], [4, 68, 2], [6, 71, 2], [8, 74, 3], [12, 75, 2], [14, 76, 2]] },
];
// More original loops for the salon's calm hours. Each track has its own tempo, chords and groove.
const LOFI_BARS = [
  { chord: [53, 57, 60, 64], bass: 41, melody: [[2, 72, 3], [6, 69, 2], [10, 72, 2], [12, 74, 4]] },
  { chord: [52, 55, 59, 62], bass: 40, melody: [[0, 76, 4], [6, 74, 2], [8, 72, 6]] },
  { chord: [50, 53, 57, 60], bass: 38, melody: [[2, 69, 2], [4, 72, 2], [6, 74, 3], [12, 77, 4]] },
  { chord: [48, 52, 55, 58], bass: 36, melody: [[0, 76, 6], [8, 72, 2], [10, 74, 2], [12, 67, 4]] },
  { chord: [46, 50, 53, 57], bass: 46, melody: [[2, 74, 3], [6, 72, 2], [8, 70, 4], [12, 69, 2]] },
  { chord: [57, 60, 64, 67], bass: 45, melody: [[0, 72, 2], [2, 76, 2], [4, 79, 6], [12, 76, 4]] },
  { chord: [55, 58, 62, 65], bass: 43, melody: [[0, 74, 3], [4, 72, 2], [6, 70, 2], [8, 74, 6]] },
  { chord: [48, 52, 55, 58], bass: 48, melody: [[0, 72, 8], [10, 70, 2], [12, 67, 4]] },
];
const BOSSA_BARS = [
  { chord: [57, 60, 64, 67], bass: 45, melody: [[0, 76, 3], [4, 74, 2], [6, 72, 2], [8, 76, 6]] },
  { chord: [54, 57, 60, 64], bass: 50, melody: [[0, 74, 3], [4, 72, 2], [6, 69, 4], [12, 66, 4]] },
  { chord: [55, 59, 62, 66], bass: 43, melody: [[0, 67, 2], [2, 71, 2], [4, 74, 6], [12, 71, 4]] },
  { chord: [52, 55, 59, 60], bass: 48, melody: [[0, 72, 6], [8, 71, 2], [10, 72, 2], [12, 76, 4]] },
  { chord: [53, 57, 60, 64], bass: 41, melody: [[0, 77, 3], [4, 76, 2], [6, 74, 2], [8, 72, 6]] },
  { chord: [50, 53, 57, 59], bass: 47, melody: [[0, 74, 4], [4, 71, 2], [6, 69, 2], [8, 65, 6]] },
  { chord: [52, 56, 59, 62], bass: 40, melody: [[0, 68, 3], [4, 71, 2], [6, 74, 2], [8, 76, 4], [12, 74, 4]] },
  { chord: [57, 60, 64, 66], bass: 45, melody: [[0, 69, 10], [12, 64, 4]] },
];
const CITY_BARS = [
  { chord: [53, 57, 60, 64], bass: 41, melody: [[0, 72, 2], [2, 74, 2], [4, 76, 4], [10, 79, 2], [12, 77, 4]] },
  { chord: [55, 59, 62, 64], bass: 43, melody: [[0, 76, 2], [2, 74, 2], [4, 71, 4], [8, 74, 8]] },
  { chord: [52, 55, 59, 62], bass: 40, melody: [[0, 71, 2], [2, 72, 2], [4, 74, 4], [10, 76, 2], [12, 79, 4]] },
  { chord: [57, 60, 64, 67], bass: 45, melody: [[0, 81, 6], [8, 79, 2], [10, 76, 2], [12, 72, 4]] },
  { chord: [50, 53, 57, 60], bass: 38, melody: [[0, 74, 2], [2, 77, 2], [4, 81, 4], [10, 79, 2], [12, 77, 4]] },
  { chord: [55, 60, 62, 65], bass: 43, melody: [[0, 79, 6], [8, 77, 2], [10, 74, 2], [12, 72, 4]] },
  { chord: [52, 55, 59, 60], bass: 48, melody: [[0, 76, 4], [4, 79, 4], [8, 84, 8]] },
  { chord: [55, 57, 61, 64], bass: 45, melody: [[0, 81, 4], [4, 79, 2], [6, 76, 2], [8, 73, 8]] },
];
const NIGHT_BARS = [
  { chord: [57, 59, 60, 64], bass: 45, melody: [[0, 76, 6], [8, 72, 4], [12, 71, 4]] },
  { chord: [53, 57, 60, 64], bass: 41, melody: [[0, 72, 8], [10, 69, 6]] },
  { chord: [52, 55, 59, 60], bass: 48, melody: [[0, 67, 4], [4, 71, 4], [8, 72, 8]] },
  { chord: [55, 57, 62, 67], bass: 43, melody: [[0, 74, 6], [8, 71, 8]] },
];
/** The calm playlist: each track plays `loops` times, then the next one starts at the end of a bar. */
export const TRACKS = [
  { id: 'pop', tempo: 88, bars: BARS, loops: 4 },
  { id: 'lofi', tempo: 72, bars: LOFI_BARS, loops: 3 },
  { id: 'bossa', tempo: 96, bars: BOSSA_BARS, loops: 4 },
  { id: 'city', tempo: 104, bars: CITY_BARS, loops: 4 },
  { id: 'night', tempo: 66, bars: NIGHT_BARS, loops: 6 },
];
const MOODS = { calm: BARS, tense: TENSE_BARS };
const MIN_GAP = { snip: .11, click: .03, chime: .4, cash: .08, clap: .6, swish: .15 };

/** Synthesises all music and sound effects, so the game ships without audio files. */
export class AudioManager {
  #ctx = null; #master = null; #music = null; #sfx = null; #noiseBuffer = null;
  #nextTime = 0; #step = 0; #pass = 0; #lastPlayed = {}; #mood = 'calm'; #playing = 'calm'; #track = 0; #skip = false;

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
  /** 'calm' or 'tense'. The music changes at the start of the next bar. */
  setMood(mood) { if (MOODS[mood]) this.#mood = mood; }
  /** The calm track playing now, by id. */
  get trackId() { return TRACKS[this.#track].id; }
  /** Moves on to the next calm track at the start of the next bar. */
  nextTrack() { this.#skip = true; }
  /** Called with the new track's id whenever the calm track changes. */
  onTrack = null;
  #changed() { if (this.onTrack) this.onTrack(this.trackId); }
  get #calm() { return TRACKS[this.#track]; }
  get #stepLen() { return this.#playing === 'tense' ? STEP * .8 : 60 / this.#calm.tempo / 4; }
  #scheduleMusic() {
    if (!this.#ctx || this.#ctx.state !== 'running') return;
    while (this.#nextTime < this.#ctx.currentTime + SCHEDULE_AHEAD) {
      if (this.#step % STEPS_PER_BAR === 0) {
        if (this.#mood !== this.#playing) { this.#playing = this.#mood; this.#step = 0; this.#pass = 0; }
        else if (this.#skip && this.#playing === 'calm') { this.#skip = false; this.#track = (this.#track + 1) % TRACKS.length; this.#step = 0; this.#pass = 0; this.#changed(); }
      }
      const tense = this.#playing === 'tense', bars = tense ? TENSE_BARS : this.#calm.bars;
      if (tense) this.#playTenseStep(this.#step, this.#nextTime); else this.#playCalm(this.#step, this.#nextTime);
      this.#nextTime += this.#stepLen; this.#step++;
      if (this.#step >= bars.length * STEPS_PER_BAR) {
        this.#step = 0; this.#pass++;
        if (!tense && this.#pass >= this.#calm.loops) { this.#track = (this.#track + 1) % TRACKS.length; this.#pass = 0; this.#changed(); }
      }
    }
  }
  #playTenseStep(step, t) {
    const out = this.#music, bar = TENSE_BARS[Math.floor(step / STEPS_PER_BAR)], s = step % STEPS_PER_BAR, st = STEP * .8;
    if (s % 4 === 0) this.#tone(out, { freq: 120, to: 45, start: t, dur: .12, type: 'sine', vol: .26 });
    if (s === 4 || s === 12) this.#noise(out, { start: t, dur: .08, vol: .06, type: 'bandpass', freq: 2000 });
    this.#noise(out, { start: t, dur: .02, vol: s % 2 ? .012 : .022, freq: 8000 });
    if (s % 2 === 0) this.#tone(out, { freq: midiHz(bar.bass + (s % 8 === 6 ? 12 : 0)), start: t, dur: st * 1.4, type: 'sawtooth', vol: .06 });
    if (s === 0 || s === 10) bar.chord.forEach(n => this.#tone(out, { freq: midiHz(n + 12), start: t, dur: st * 2, type: 'square', vol: .025 }));
    if (s === 7) this.#tone(out, { freq: midiHz(bar.bass + 18), start: t, dur: st, type: 'square', vol: .03 });
    bar.melody.filter(([at]) => at === s).forEach(([, note, len]) => this.#tone(out, { freq: midiHz(note), start: t, dur: st * len, type: 'triangle', vol: .1, attack: .01 }));
  }
  /** One step of whichever calm track is playing. */
  #playCalm(step, t) {
    const id = this.#calm.id;
    if (id === 'pop') return this.#playStep(step, t);
    const bar = this.#calm.bars[Math.floor(step / STEPS_PER_BAR)], s = step % STEPS_PER_BAR, st = this.#stepLen, out = this.#music;
    const melody = (type, vol, shift = 0) => bar.melody.filter(([at]) => at === s).forEach(([, note, len]) => this.#tone(out, { freq: midiHz(note + shift), start: t, dur: st * len, type, vol, attack: .015 }));
    if (id === 'lofi') {
      // laid-back kick, soft rim, swung hats, warm electric-piano chords
      if (s === 0 || s === 10) this.#tone(out, { freq: 95, to: 45, start: t, dur: .16, type: 'sine', vol: .2 });
      if (s === 4 || s === 12) this.#noise(out, { start: t, dur: .06, vol: .035, type: 'bandpass', freq: 2600 });
      if (s % 2 === 0) this.#noise(out, { start: t + (s % 4 === 2 ? st * .33 : 0), dur: .025, vol: .014, freq: 7500 });
      if (s === 0) this.#tone(out, { freq: midiHz(bar.bass), start: t, dur: st * 6, type: 'triangle', vol: .22 });
      if (s === 10) this.#tone(out, { freq: midiHz(bar.bass + 7), start: t, dur: st * 3, type: 'triangle', vol: .18 });
      if (s === 0 || s === 8) bar.chord.forEach(n => this.#tone(out, { freq: midiHz(n + 12), start: t + .02, dur: st * 7, type: 'triangle', vol: .03, attack: .04 }));
      melody('triangle', .07);
    } else if (id === 'bossa') {
      // clave and shaker, bossa bass, syncopated guitar comping, nylon-like melody
      if ([0, 3, 6, 10, 12].includes(s)) this.#noise(out, { start: t, dur: .03, vol: .03, type: 'bandpass', freq: 3200 });
      this.#noise(out, { start: t, dur: .02, vol: s % 2 ? .008 : .014, freq: 9000 });
      if (s === 0 || s === 8) this.#tone(out, { freq: midiHz(bar.bass), start: t, dur: st * 3, type: 'triangle', vol: .22 });
      if (s === 6 || s === 14) this.#tone(out, { freq: midiHz(bar.bass + 7), start: t, dur: st * 2, type: 'triangle', vol: .17 });
      if ([0, 3, 6, 10, 13].includes(s)) bar.chord.forEach(n => this.#tone(out, { freq: midiHz(n), start: t, dur: st * 1.5, type: 'triangle', vol: .03 }));
      melody('sine', .09);
    } else if (id === 'city') {
      // four on the floor, open hat, octave bass, bright arpeggio and pulse lead
      if (s % 4 === 0) this.#tone(out, { freq: 120, to: 50, start: t, dur: .12, type: 'sine', vol: .22 });
      if (s === 4 || s === 12) this.#noise(out, { start: t, dur: .1, vol: .05, type: 'bandpass', freq: 1700 });
      this.#noise(out, { start: t, dur: s === 14 ? .12 : .02, vol: s === 14 ? .02 : .011, freq: 8000 });
      if (s % 2 === 0) this.#tone(out, { freq: midiHz(bar.bass + (s % 4 === 2 ? 12 : 0)), start: t, dur: st * 1.2, type: 'sawtooth', vol: .045 });
      if (s % 2 === 1) this.#tone(out, { freq: midiHz(bar.chord[(s >> 1) % bar.chord.length] + 12), start: t, dur: st * .9, type: 'square', vol: .02 });
      melody('square', .05);
    } else if (id === 'night') {
      // slow pads, a soft heartbeat and a bell melody an octave up
      if (s === 0) bar.chord.forEach(n => this.#tone(out, { freq: midiHz(n), start: t, dur: st * 16, type: 'triangle', vol: .035, attack: .5 }));
      if (s === 0) this.#tone(out, { freq: midiHz(bar.bass), start: t, dur: st * 14, type: 'sine', vol: .2, attack: .2 });
      if (s % 4 === 2) this.#noise(out, { start: t, dur: .05, vol: .01, freq: 6000 });
      melody('sine', .07, 12);
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
