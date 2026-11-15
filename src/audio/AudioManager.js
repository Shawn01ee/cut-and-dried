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
const RUSH_BARS = [
  { chord: [52, 55, 59], bass: 40, melody: [[0, 71, 2], [2, 74, 2], [4, 76, 2], [6, 74, 2], [8, 71, 4], [12, 67, 4]] },
  { chord: [48, 52, 55], bass: 36, melody: [[0, 72, 2], [2, 71, 2], [4, 72, 2], [6, 76, 2], [8, 79, 6], [14, 76, 2]] },
  { chord: [55, 59, 62], bass: 43, melody: [[0, 74, 2], [2, 71, 2], [4, 67, 4], [8, 71, 2], [10, 74, 2], [12, 79, 4]] },
  { chord: [50, 54, 57], bass: 38, melody: [[0, 78, 4], [4, 76, 2], [6, 74, 2], [8, 74, 8]] },
  { chord: [52, 55, 59], bass: 40, melody: [[0, 71, 2], [2, 74, 2], [4, 76, 2], [6, 79, 2], [8, 83, 4], [12, 79, 4]] },
  { chord: [48, 52, 55], bass: 36, melody: [[0, 81, 2], [2, 79, 2], [4, 76, 4], [8, 72, 4], [12, 76, 4]] },
  { chord: [57, 60, 64], bass: 45, melody: [[0, 76, 2], [2, 72, 2], [4, 69, 4], [8, 72, 2], [10, 76, 2], [12, 81, 4]] },
  { chord: [47, 51, 54, 57], bass: 47, melody: [[0, 78, 4], [4, 75, 4], [8, 71, 8]] },
];
const BRUNCH_BARS = [
  { chord: [60, 64, 67], bass: 48, melody: [[0, 72, 2], [2, 74, 2], [4, 76, 4], [8, 79, 2], [10, 76, 2], [12, 74, 4]] },
  { chord: [57, 60, 64], bass: 45, melody: [[0, 72, 4], [4, 69, 2], [6, 72, 2], [8, 76, 8]] },
  { chord: [53, 57, 60], bass: 41, melody: [[0, 77, 2], [2, 76, 2], [4, 74, 2], [6, 72, 2], [8, 69, 4], [12, 72, 4]] },
  { chord: [55, 59, 62], bass: 43, melody: [[0, 74, 6], [8, 71, 2], [10, 72, 2], [12, 74, 4]] },
  { chord: [60, 64, 67], bass: 48, melody: [[0, 76, 2], [2, 79, 2], [4, 84, 4], [8, 83, 2], [10, 79, 2], [12, 76, 4]] },
  { chord: [52, 55, 59], bass: 40, melody: [[0, 79, 4], [4, 76, 2], [6, 74, 2], [8, 71, 8]] },
  { chord: [53, 57, 60], bass: 41, melody: [[0, 72, 2], [2, 74, 2], [4, 76, 2], [6, 77, 2], [8, 81, 4], [12, 79, 4]] },
  { chord: [55, 59, 62, 65], bass: 43, melody: [[0, 77, 2], [2, 74, 2], [4, 71, 4], [8, 72, 8]] },
];
const NEON_BARS = [
  { chord: [57, 60, 64], bass: 45, melody: [[0, 76, 6], [8, 77, 2], [10, 76, 2], [12, 74, 4]] },
  { chord: [53, 57, 60], bass: 41, melody: [[0, 72, 6], [8, 74, 2], [10, 72, 2], [12, 69, 4]] },
  { chord: [55, 60, 64], bass: 48, melody: [[0, 72, 4], [4, 76, 4], [8, 79, 8]] },
  { chord: [55, 59, 62], bass: 43, melody: [[0, 79, 4], [4, 77, 2], [6, 76, 2], [8, 74, 8]] },
  { chord: [57, 60, 64], bass: 45, melody: [[0, 81, 6], [8, 79, 2], [10, 77, 2], [12, 76, 4]] },
  { chord: [53, 57, 60], bass: 41, melody: [[0, 77, 6], [8, 76, 2], [10, 74, 2], [12, 72, 4]] },
  { chord: [55, 60, 64], bass: 48, melody: [[0, 72, 2], [2, 74, 2], [4, 76, 4], [8, 79, 4], [12, 84, 4]] },
  { chord: [55, 59, 62], bass: 43, melody: [[0, 83, 8], [8, 79, 8]] },
];
const RAIN_BARS = [
  { chord: [50, 54, 57, 61], bass: 38, melody: [[0, 78, 4], [4, 76, 2], [6, 74, 2], [8, 73, 8]] },
  { chord: [47, 50, 54, 57], bass: 47, melody: [[0, 74, 4], [4, 73, 2], [6, 71, 2], [8, 69, 8]] },
  { chord: [55, 59, 62, 66], bass: 43, melody: [[0, 71, 2], [2, 74, 2], [4, 78, 4], [8, 79, 4], [12, 78, 4]] },
  { chord: [57, 61, 64, 66], bass: 45, melody: [[0, 76, 8], [8, 73, 4], [12, 69, 4]] },
];
const SWING_BARS = [
  { chord: [55, 58, 62, 65], bass: 43, melody: [[0, 74, 2], [2, 77, 2], [4, 79, 2], [6, 77, 2], [8, 74, 4], [12, 70, 4]] },
  { chord: [52, 55, 58, 62], bass: 48, melody: [[0, 72, 2], [2, 76, 2], [4, 79, 2], [6, 82, 2], [8, 81, 6], [14, 79, 2]] },
  { chord: [53, 57, 60, 64], bass: 41, melody: [[0, 77, 4], [4, 76, 2], [6, 74, 2], [8, 72, 8]] },
  { chord: [54, 57, 60, 62], bass: 50, melody: [[0, 74, 2], [2, 78, 2], [4, 81, 4], [8, 78, 2], [10, 74, 2], [12, 72, 4]] },
  { chord: [55, 58, 62, 65], bass: 43, melody: [[0, 70, 2], [2, 74, 2], [4, 77, 4], [8, 79, 2], [10, 77, 2], [12, 74, 4]] },
  { chord: [52, 55, 58, 62], bass: 48, melody: [[0, 76, 2], [2, 79, 2], [4, 82, 2], [6, 79, 2], [8, 76, 4], [12, 72, 4]] },
  { chord: [53, 57, 60, 62], bass: 41, melody: [[0, 77, 6], [8, 74, 2], [10, 72, 2], [12, 69, 4]] },
  { chord: [52, 55, 58, 62], bass: 48, melody: [[0, 67, 2], [2, 70, 2], [4, 72, 4], [8, 76, 8]] },
];
const FUNK_BARS = [
  { chord: [55, 59, 62, 66], bass: 40, melody: [[0, 71, 1], [2, 74, 1], [3, 76, 2], [6, 74, 1], [8, 71, 2], [11, 69, 1], [12, 67, 4]] },
  { chord: [55, 57, 61, 64], bass: 45, melody: [[0, 69, 1], [2, 72, 1], [3, 73, 2], [6, 76, 2], [10, 73, 1], [12, 69, 4]] },
  { chord: [55, 59, 62, 66], bass: 40, melody: [[0, 76, 1], [2, 79, 1], [3, 81, 2], [6, 79, 1], [8, 76, 2], [11, 74, 1], [12, 71, 4]] },
  { chord: [55, 57, 61, 64], bass: 45, melody: [[0, 73, 2], [4, 76, 2], [6, 79, 2], [8, 81, 8]] },
  { chord: [55, 59, 62, 64], bass: 43, melody: [[0, 79, 1], [2, 78, 1], [3, 76, 2], [6, 74, 2], [8, 71, 4], [12, 74, 4]] },
  { chord: [55, 57, 61, 64], bass: 45, melody: [[0, 76, 2], [3, 73, 1], [4, 76, 2], [8, 69, 8]] },
  { chord: [54, 57, 62, 66], bass: 47, melody: [[0, 74, 1], [2, 78, 1], [3, 81, 2], [6, 78, 1], [8, 74, 2], [12, 71, 4]] },
  { chord: [55, 57, 62, 64], bass: 45, melody: [[0, 69, 2], [2, 71, 2], [4, 74, 2], [6, 76, 2], [8, 74, 8]] },
];
const TROPICAL_BARS = [
  { chord: [55, 59, 62], bass: 43, melody: [[0, 74, 2], [2, 71, 2], [4, 74, 2], [6, 79, 2], [8, 78, 4], [12, 74, 4]] },
  { chord: [54, 57, 62], bass: 38, melody: [[0, 74, 2], [2, 73, 2], [4, 74, 2], [6, 78, 2], [8, 81, 4], [12, 78, 4]] },
  { chord: [52, 55, 59], bass: 40, melody: [[0, 76, 2], [2, 74, 2], [4, 71, 2], [6, 74, 2], [8, 76, 4], [12, 79, 4]] },
  { chord: [52, 55, 60], bass: 48, melody: [[0, 79, 4], [4, 76, 2], [6, 72, 2], [8, 74, 8]] },
  { chord: [55, 59, 62], bass: 43, melody: [[0, 83, 2], [2, 81, 2], [4, 79, 2], [6, 78, 2], [8, 79, 4], [12, 74, 4]] },
  { chord: [54, 57, 62], bass: 38, melody: [[0, 78, 2], [2, 76, 2], [4, 74, 2], [6, 73, 2], [8, 74, 8]] },
  { chord: [52, 55, 60], bass: 48, melody: [[0, 72, 2], [2, 76, 2], [4, 79, 4], [8, 84, 4], [12, 79, 4]] },
  { chord: [54, 57, 62], bass: 38, melody: [[0, 78, 4], [4, 81, 4], [8, 79, 8]] },
];
const BALLAD_BARS = [
  { chord: [48, 52, 55, 60], bass: 48, melody: [[0, 76, 6], [6, 74, 2], [8, 72, 8]] },
  { chord: [47, 50, 55, 59], bass: 47, melody: [[0, 74, 6], [6, 72, 2], [8, 71, 8]] },
  { chord: [45, 48, 52, 57], bass: 45, melody: [[0, 72, 4], [4, 76, 4], [8, 79, 6], [14, 77, 2]] },
  { chord: [45, 48, 53, 57], bass: 41, melody: [[0, 77, 6], [6, 76, 2], [8, 74, 8]] },
  { chord: [48, 52, 55, 60], bass: 48, melody: [[0, 76, 4], [4, 79, 4], [8, 84, 8]] },
  { chord: [45, 48, 53, 57], bass: 41, melody: [[0, 81, 6], [6, 79, 2], [8, 77, 8]] },
  { chord: [47, 50, 55, 59], bass: 43, melody: [[0, 76, 4], [4, 74, 4], [8, 72, 4], [12, 74, 4]] },
  { chord: [50, 53, 55, 59], bass: 43, melody: [[0, 74, 8], [8, 71, 8]] },
];
const BUBBLE_BARS = [
  { chord: [62, 66, 69], bass: 38, melody: [[0, 78, 2], [2, 78, 2], [4, 76, 2], [6, 78, 2], [8, 81, 4], [12, 78, 4]] },
  { chord: [59, 62, 66], bass: 47, melody: [[0, 74, 2], [2, 76, 2], [4, 78, 2], [6, 74, 2], [8, 71, 8]] },
  { chord: [55, 59, 62], bass: 43, melody: [[0, 74, 2], [2, 74, 2], [4, 76, 2], [6, 78, 2], [8, 79, 4], [12, 83, 4]] },
  { chord: [57, 61, 64], bass: 45, melody: [[0, 81, 6], [8, 78, 2], [10, 76, 2], [12, 73, 4]] },
  { chord: [62, 66, 69], bass: 38, melody: [[0, 78, 2], [2, 81, 2], [4, 86, 4], [8, 85, 2], [10, 83, 2], [12, 81, 4]] },
  { chord: [54, 57, 61], bass: 42, melody: [[0, 78, 4], [4, 76, 4], [8, 73, 8]] },
  { chord: [55, 59, 62], bass: 43, melody: [[0, 74, 2], [2, 76, 2], [4, 78, 2], [6, 79, 2], [8, 81, 4], [12, 83, 4]] },
  { chord: [55, 57, 61, 64], bass: 45, melody: [[0, 85, 4], [4, 81, 4], [8, 86, 8]] },
];
const CHILL_BARS = [
  { chord: [57, 61, 64], bass: 45, melody: [[2, 73, 2], [4, 76, 4], [10, 73, 2], [12, 71, 4]] },
  { chord: [57, 62, 66], bass: 38, melody: [[2, 74, 2], [4, 78, 4], [10, 76, 2], [12, 74, 4]] },
  { chord: [56, 59, 64], bass: 40, melody: [[2, 76, 2], [4, 80, 4], [10, 78, 2], [12, 76, 4]] },
  { chord: [57, 62, 66], bass: 38, melody: [[2, 74, 2], [4, 73, 2], [6, 71, 2], [8, 69, 8]] },
  { chord: [57, 61, 64], bass: 45, melody: [[2, 73, 2], [4, 76, 4], [10, 81, 2], [12, 80, 4]] },
  { chord: [57, 61, 66], bass: 42, melody: [[2, 78, 2], [4, 76, 4], [10, 73, 2], [12, 71, 4]] },
  { chord: [57, 62, 66], bass: 38, melody: [[2, 74, 2], [4, 73, 2], [6, 74, 2], [8, 78, 4], [12, 76, 4]] },
  { chord: [56, 59, 62, 64], bass: 40, melody: [[0, 76, 4], [4, 73, 4], [8, 71, 8]] },
];
// Lo-fi tracks: jazzy ninth and thirteenth chords, sparse tunes. Their groove is shared (see #playLofi).
const COFFEE_BARS = [
  { chord: [56, 60, 63, 67], bass: 41, melody: [[2, 72, 2], [4, 75, 4], [10, 77, 2], [12, 75, 4]] },
  { chord: [56, 60, 62, 67], bass: 46, melody: [[0, 74, 6], [8, 72, 2], [10, 70, 6]] },
  { chord: [55, 58, 62, 65], bass: 39, melody: [[2, 75, 2], [4, 79, 4], [10, 77, 2], [12, 75, 4]] },
  { chord: [58, 62, 63, 67], bass: 48, melody: [[0, 75, 8], [10, 72, 2], [12, 70, 4]] },
  { chord: [56, 60, 63, 67], bass: 41, melody: [[2, 72, 2], [4, 75, 2], [6, 77, 2], [8, 80, 4], [12, 79, 4]] },
  { chord: [56, 60, 62, 67], bass: 46, melody: [[0, 77, 4], [4, 74, 4], [8, 72, 8]] },
  { chord: [55, 58, 62, 65], bass: 39, melody: [[2, 79, 2], [4, 82, 4], [10, 79, 2], [12, 77, 4]] },
  { chord: [55, 58, 60, 62], bass: 39, melody: [[0, 75, 12]] },
];
const STUDY_BARS = [
  { chord: [55, 59, 60, 64], bass: 45, melody: [[4, 72, 4], [10, 71, 2], [12, 69, 4]] },
  { chord: [53, 57, 60, 64], bass: 38, melody: [[4, 69, 4], [10, 72, 2], [12, 74, 4]] },
  { chord: [53, 57, 59, 64], bass: 43, melody: [[4, 71, 4], [10, 74, 2], [12, 76, 4]] },
  { chord: [55, 59, 62, 64], bass: 48, melody: [[0, 76, 8], [12, 74, 4]] },
  { chord: [53, 57, 59, 64], bass: 41, melody: [[4, 72, 4], [10, 71, 2], [12, 69, 4]] },
  { chord: [53, 56, 59, 62], bass: 40, melody: [[4, 68, 4], [10, 71, 2], [12, 74, 4]] },
  { chord: [55, 59, 60, 64], bass: 45, melody: [[0, 72, 6], [8, 71, 2], [10, 69, 6]] },
  { chord: [55, 59, 60, 64], bass: 45, melody: [[0, 69, 12]] },
];
const TRAM_BARS = [
  { chord: [55, 57, 60, 64], bass: 41, melody: [[0, 76, 2], [2, 77, 2], [4, 79, 4], [8, 77, 2], [10, 76, 2], [12, 72, 4]] },
  { chord: [52, 55, 59, 62], bass: 40, melody: [[0, 74, 4], [4, 71, 2], [6, 72, 2], [8, 74, 8]] },
  { chord: [53, 57, 60, 64], bass: 38, melody: [[0, 72, 2], [2, 74, 2], [4, 77, 4], [8, 81, 4], [12, 79, 4]] },
  { chord: [53, 55, 60, 62], bass: 43, melody: [[0, 77, 6], [8, 74, 2], [10, 72, 6]] },
  { chord: [55, 57, 60, 64], bass: 41, melody: [[0, 76, 2], [2, 77, 2], [4, 79, 4], [8, 84, 4], [12, 81, 4]] },
  { chord: [55, 57, 60, 64], bass: 45, melody: [[0, 79, 4], [4, 76, 4], [8, 72, 8]] },
  { chord: [53, 57, 58, 62], bass: 46, melody: [[0, 74, 2], [2, 77, 2], [4, 81, 4], [8, 79, 2], [10, 77, 2], [12, 74, 4]] },
  { chord: [53, 55, 58, 60], bass: 48, melody: [[0, 72, 4], [4, 70, 4], [8, 72, 8]] },
];
const BALCONY_BARS = [
  { chord: [56, 60, 63, 65], bass: 49, melody: [[0, 80, 6], [8, 77, 4], [12, 75, 4]] },
  { chord: [56, 60, 61, 65], bass: 46, melody: [[0, 77, 8], [10, 73, 6]] },
  { chord: [54, 58, 61, 65], bass: 42, melody: [[0, 73, 4], [4, 77, 4], [8, 78, 8]] },
  { chord: [54, 56, 61, 63], bass: 44, melody: [[0, 75, 6], [8, 73, 8]] },
];
const POLAROID_BARS = [
  { chord: [55, 59, 60, 64], bass: 48, melody: [[0, 76, 2], [2, 74, 2], [4, 72, 2], [6, 71, 2], [8, 72, 6], [14, 76, 2]] },
  { chord: [55, 57, 61, 64], bass: 45, melody: [[0, 79, 4], [4, 76, 2], [6, 73, 2], [8, 76, 8]] },
  { chord: [53, 57, 60, 62], bass: 38, melody: [[0, 77, 2], [2, 76, 2], [4, 74, 2], [6, 72, 2], [8, 74, 4], [12, 77, 4]] },
  { chord: [53, 55, 59, 62], bass: 43, melody: [[0, 79, 6], [8, 77, 2], [10, 74, 2], [12, 71, 4]] },
  { chord: [55, 59, 62, 64], bass: 40, melody: [[0, 74, 2], [2, 76, 2], [4, 79, 4], [8, 83, 4], [12, 81, 4]] },
  { chord: [55, 58, 61, 64], bass: 45, melody: [[0, 79, 4], [4, 76, 4], [8, 73, 8]] },
  { chord: [53, 57, 60, 64], bass: 38, melody: [[0, 77, 2], [2, 81, 2], [4, 84, 4], [8, 81, 2], [10, 77, 2], [12, 74, 4]] },
  { chord: [53, 55, 60, 62], bass: 43, melody: [[0, 76, 4], [4, 74, 4], [8, 72, 8]] },
];
/**
 * The playlist. Each track plays `loops` times, then the next one starts at a bar line. `energy` (up, mid, low) lets the
 * automatic pick suit the moment: upbeat when the salon is busy, mellow in the evening.
 */
export const TRACKS = [
  { id: 'pop', tempo: 88, bars: BARS, loops: 4, energy: 'mid' },
  { id: 'lofi', tempo: 72, bars: LOFI_BARS, loops: 3, energy: 'low' },
  { id: 'bossa', tempo: 96, bars: BOSSA_BARS, loops: 4, energy: 'mid' },
  { id: 'city', tempo: 104, bars: CITY_BARS, loops: 4, energy: 'up' },
  { id: 'night', tempo: 66, bars: NIGHT_BARS, loops: 6, energy: 'low' },
  { id: 'rush', tempo: 120, bars: RUSH_BARS, loops: 4, energy: 'up' },
  { id: 'brunch', tempo: 84, bars: BRUNCH_BARS, loops: 4, energy: 'mid' },
  { id: 'neon', tempo: 112, bars: NEON_BARS, loops: 4, energy: 'up' },
  { id: 'rain', tempo: 70, bars: RAIN_BARS, loops: 5, energy: 'low' },
  { id: 'swing', tempo: 132, bars: SWING_BARS, loops: 4, energy: 'mid', swing: true },
  { id: 'funk', tempo: 100, bars: FUNK_BARS, loops: 4, energy: 'up' },
  { id: 'tropical', tempo: 102, bars: TROPICAL_BARS, loops: 4, energy: 'up' },
  { id: 'ballad', tempo: 64, bars: BALLAD_BARS, loops: 3, energy: 'low' },
  { id: 'bubble', tempo: 116, bars: BUBBLE_BARS, loops: 4, energy: 'up' },
  { id: 'chill', tempo: 80, bars: CHILL_BARS, loops: 4, energy: 'low' },
  // lo-fi: `lofi` sets the drum steps, how the keys play (pad, stab or roll), the lead and the bass line [step, interval, length]
  { id: 'coffee', tempo: 76, bars: COFFEE_BARS, loops: 3, energy: 'low', lofi: { kick: [0, 7, 10], snare: [4, 12], keys: 'stab', lead: 'sine', leadVol: .08, bass: [[0, 0, 6], [10, 7, 4]] } },
  { id: 'study', tempo: 70, bars: STUDY_BARS, loops: 3, energy: 'low', lofi: { kick: [0, 10], snare: [8], keys: 'pad', lead: 'triangle', leadVol: .07, bass: [[0, 0, 10]] } },
  { id: 'tram', tempo: 82, bars: TRAM_BARS, loops: 3, energy: 'mid', lofi: { kick: [0, 3, 8, 11], snare: [4, 12], keys: 'roll', lead: 'triangle', leadVol: .065, bass: [[0, 0, 4], [6, 7, 2], [8, 0, 4], [14, 12, 2]] } },
  { id: 'balcony', tempo: 68, bars: BALCONY_BARS, loops: 5, energy: 'low', lofi: { kick: [0], snare: [8], keys: 'pad', lead: 'sine', leadVol: .08, bass: [[0, 0, 14]], rain: true } },
  { id: 'polaroid', tempo: 86, bars: POLAROID_BARS, loops: 3, energy: 'mid', lofi: { kick: [0, 6, 8], snare: [4, 12], keys: 'stab', lead: 'square', leadVol: .028, lead2: 'triangle', bass: [[0, 0, 3], [3, 0, 2], [8, 7, 3], [12, 0, 3]] } },
];
/** Ready-made playlists by mood; 'custom' is the tracks the player ticks. */
export const PLAYLISTS = {
  all: TRACKS.map(t => t.id),
  lofi: ['lofi', 'coffee', 'study', 'tram', 'balcony', 'polaroid'],
  cafe: ['lofi', 'coffee', 'tram', 'bossa', 'brunch', 'polaroid', 'rain', 'chill', 'swing'],
  energy: ['city', 'rush', 'neon', 'funk', 'bubble', 'tropical', 'pop'],
  evening: ['night', 'rain', 'lofi', 'study', 'balcony', 'ballad', 'chill'],
  custom: null,
};
const MIN_GAP = { snip: .11, click: .03, chime: .4, cash: .08, clap: .6, swish: .15 };

/** Synthesises all music and sound effects, so the game ships without audio files. */
export class AudioManager {
  #ctx = null; #master = null; #music = null; #sfx = null; #noiseBuffer = null;
  #nextTime = 0; #step = 0; #pass = 0; #lastPlayed = {}; #track = 0; #want = null; #recent = [];
  // The playlist: how the next track is chosen, which tracks are in it, and what the salon is like right now.
  #mode = 'auto'; #list = 'all'; #enabled = new Set(TRACKS.map(t => t.id)); #scene = { busy: false, evening: false }; #tension = 0; #warmth = null;

  constructor(bus) {
    this.musicVolume = .5; this.sfxVolume = .8; this.muted = false;
    this.#loadSettings();
    bus.on('level:up', () => this.play('levelUp'));
    bus.on('day:closed', () => this.play('bell'));
    // Browsers only allow audio to start from a user gesture.
    ['click', 'keydown', 'touchend'].forEach(type => addEventListener(type, () => this.#unlock(), true));
    document.addEventListener('visibilitychange', () => { if (this.#ctx) document.hidden ? this.#ctx.suspend() : this.#ctx.resume(); });
  }

  #loadSettings() {
    try {
      const d = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      for (const k of ['musicVolume', 'sfxVolume', 'muted']) if (d[k] !== undefined) this[k] = d[k];
      if (['auto', 'order', 'repeat'].includes(d.mode)) this.#mode = d.mode;
      if (d.list in PLAYLISTS) this.#list = d.list;
      const ids = Array.isArray(d.playlist) ? d.playlist.filter(id => TRACKS.some(t => t.id === id)) : [];
      if (ids.length) this.#enabled = new Set(ids);
    } catch { /* keep defaults */ }
  }
  #saveSettings() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ musicVolume: this.musicVolume, sfxVolume: this.sfxVolume, muted: this.muted, mode: this.#mode, list: this.#list, playlist: [...this.#enabled] })); } catch { /* unavailable */ } }

  #unlock() {
    if (this.#ctx) { if (this.#ctx.state === 'suspended' && !document.hidden) this.#ctx.resume(); return; }
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const ctx = this.#ctx = new Context();
    const compressor = ctx.createDynamicsCompressor();
    const warmth = ctx.createBiquadFilter(); warmth.type = 'lowpass'; warmth.frequency.value = 3200; this.#warmth = warmth;
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
  /** The track playing now, by id. */
  get trackId() { return TRACKS[this.#track].id; }
  /** Every track, with its energy, tempo and whether it is in the playlist. */
  get tracks() { const pool = this.#pool; return TRACKS.map(t => ({ id: t.id, energy: t.energy, tempo: t.tempo, enabled: this.#enabled.has(t.id), inList: pool.has(t.id) })); }
  /** The playlist in use: a ready-made one or 'custom'. */
  get playlist() { return this.#list; }
  get playlists() { return Object.keys(PLAYLISTS); }
  setPlaylist(id) { if (!(id in PLAYLISTS)) return; this.#list = id; this.#saveSettings(); if (!this.#pool.has(this.trackId)) this.#want = this.#pickNext(true); }
  /** The tracks the current playlist draws from. */
  get #pool() { return new Set(PLAYLISTS[this.#list] || [...this.#enabled]); }
  /** auto (suits the moment), order (playlist order) or repeat (the same track). */
  get mode() { return this.#mode; }
  setMode(mode) { if (['auto', 'order', 'repeat'].includes(mode)) { this.#mode = mode; this.#saveSettings(); } }
  /** Puts a track in the playlist or takes it out; at least one stays. */
  toggleTrack(id) { if (this.#enabled.has(id)) { if (this.#enabled.size > 1) this.#enabled.delete(id); } else if (TRACKS.some(t => t.id === id)) this.#enabled.add(id); this.#saveSettings(); }
  /** Plays a track from the next bar line. */
  playTrack(id) { const i = TRACKS.findIndex(t => t.id === id); if (i >= 0) this.#want = i; }
  /** Moves on to the next track at the next bar line. */
  nextTrack() { this.#want = this.#pickNext(true); }
  /** How many difficult clients are about: each one darkens the music a little more, on top of whatever is playing. */
  setTension(n) { n = Math.max(0, Math.min(3, n | 0)); if (n === this.#tension) return; this.#tension = n; if (this.#warmth) this.#warmth.frequency.setTargetAtTime([3200, 1900, 1500, 1200][n], this.#ctx.currentTime, .6); }
  /** What the salon is like: busy brings extra percussion and upbeat picks, evening mellow ones. */
  setScene(scene) { this.#scene = { busy: !!scene.busy, evening: !!scene.evening }; }
  /** The next track: playlist order, or in auto mode one that suits the moment and has not played lately. */
  #pickNext(skip = false) {
    const inList = this.#pool, pool = TRACKS.map((t, i) => i).filter(i => inList.has(TRACKS[i].id));
    if (!pool.length) return this.#track;
    if (this.#mode !== 'auto') { const after = pool.find(i => i > this.#track); return this.#mode === 'repeat' && !skip ? this.#track : after ?? pool[0]; }
    const others = pool.filter(i => i !== this.#track), fresh = others.filter(i => !this.#recent.includes(i)), choices = fresh.length ? fresh : others.length ? others : pool;
    const want = this.#scene.busy ? 'up' : this.#scene.evening ? 'low' : null, fit = want ? choices.filter(i => TRACKS[i].energy === want) : choices, list = fit.length ? fit : choices;
    return list[Math.floor(Math.random() * list.length)];
  }
  /** Called with the new track's id whenever the calm track changes. */
  onTrack = null;
  #changed() { if (this.onTrack) this.onTrack(this.trackId); }
  get #calm() { return TRACKS[this.#track]; }
  get #stepLen() { return 60 / this.#calm.tempo / 4; }
  #scheduleMusic() {
    if (!this.#ctx || this.#ctx.state !== 'running') return;
    while (this.#nextTime < this.#ctx.currentTime + SCHEDULE_AHEAD) {
      if (this.#step % STEPS_PER_BAR === 0) this.#barLine();
      this.#playCalm(this.#step, this.#nextTime);
      if (this.#tension) this.#playTension(this.#step, this.#nextTime);
      if (this.#scene.busy) this.#playRush(this.#step, this.#nextTime);
      this.#nextTime += this.#stepLen; this.#step++;
      if (this.#step >= this.#calm.bars.length * STEPS_PER_BAR) {
        this.#step = 0; this.#pass++;
        if (this.#pass >= this.#calm.loops && this.#mode !== 'repeat') this.#want = this.#pickNext();
      }
    }
  }
  /** At a bar line: a requested track starts, and a sleepy track gives way when the salon gets busy. */
  #barLine() {
    if (this.#want == null && this.#mode === 'auto' && this.#scene.busy && this.#calm.energy === 'low') this.#want = this.#pickNext();
    const next = this.#want; this.#want = null;
    if (next == null || next === this.#track) return;
    this.#recent = [this.#track, ...this.#recent].slice(0, 2); this.#track = next; this.#step = 0; this.#pass = 0; this.#changed();
  }
  /** Difficult clients: a low drone and a heartbeat, tritone stabs from two, a driving pulse from three. */
  #playTension(step, t) {
    const n = this.#tension, bar = this.#calm.bars[Math.floor(step / STEPS_PER_BAR)], s = step % STEPS_PER_BAR, st = this.#stepLen, out = this.#music;
    if (s === 0) this.#tone(out, { freq: midiHz(bar.bass - 12), start: t, dur: st * 16, type: 'sawtooth', vol: .03 + n * .01, attack: .4 });
    if (s === 0 || s === 2) this.#tone(out, { freq: 75, to: 40, start: t, dur: .18, type: 'sine', vol: s ? .08 : .12 });
    if (n >= 2 && (s === 6 || s === 14)) this.#tone(out, { freq: midiHz(bar.bass + 18), start: t, dur: st * 1.5, type: 'square', vol: .025 });
    if (n >= 3 && s % 2 === 0) this.#tone(out, { freq: midiHz(bar.bass + (s % 4 ? 6 : 0)), start: t, dur: st * .9, type: 'sawtooth', vol: .035 });
  }
  /** A busy salon: quick hats and claps on top of the track. */
  #playRush(step, t) {
    const s = step % STEPS_PER_BAR, out = this.#music;
    if (s % 2 === 1) this.#noise(out, { start: t, dur: .018, vol: .008, freq: 9000 });
    if (s === 4 || s === 12) this.#noise(out, { start: t, dur: .07, vol: .025, type: 'bandpass', freq: 1400 });
  }
  /**
   * The lo-fi groove: vinyl hiss and crackle, dusty drums with swung hats, a worn electric piano (two detuned voices),
   * a round bass and a tune that drifts a touch out of tape.
   */
  #playLofi(bar, s, t, st, out, o) {
    const wob = f => f * (1 + (Math.random() - .5) * .006), lag = s % 4 === 2 ? st * .3 : 0;
    if (s === 0) this.#noise(out, { start: t, dur: st * 16, vol: .005, type: 'lowpass', freq: 5000, attack: .2 });
    if (Math.random() < .3) this.#noise(out, { start: t + Math.random() * st, dur: .006, vol: .01 + Math.random() * .012, type: 'highpass', freq: 3500 });
    if (o.rain && s === 0) this.#noise(out, { start: t, dur: st * 16, vol: .01, type: 'lowpass', freq: 1400, attack: .4 });
    if (o.kick.includes(s)) this.#tone(out, { freq: 88, to: 42, start: t, dur: .2, type: 'sine', vol: .19 });
    if (o.snare.includes(s)) { this.#noise(out, { start: t, dur: .12, vol: .03, type: 'bandpass', freq: 1700 }); this.#noise(out, { start: t, dur: .08, vol: .015, type: 'lowpass', freq: 900 }); }
    if (s % 2 === 0) this.#noise(out, { start: t + lag, dur: .02, vol: s % 4 ? .008 : .011, freq: 7000 });
    const keys = (n, start, dur, vol) => [1.003, .997].forEach(k => this.#tone(out, { freq: wob(midiHz(n)) * k, start, dur, type: 'triangle', vol, attack: .03 }));
    if (o.keys === 'pad' && s === 0) bar.chord.forEach(n => keys(n, t, st * 15, .018));
    if (o.keys === 'stab' && (s === 0 || s === 10)) bar.chord.forEach(n => keys(n, t + (s ? lag : 0), st * (s ? 4 : 7), .02));
    if (o.keys === 'roll' && s % 2 === 0) keys(bar.chord[(s / 2) % bar.chord.length] + 12, t + lag, st * 2.5, .022);
    const b = o.bass.find(([at]) => at === s);
    if (b) this.#tone(out, { freq: midiHz(bar.bass + b[1]), start: t, dur: st * b[2], type: 'sine', vol: .22, attack: .02 });
    bar.melody.filter(([at]) => at === s).forEach(([, note, len]) => {
      this.#tone(out, { freq: wob(midiHz(note)), start: t + lag, dur: st * len, type: o.lead, vol: o.leadVol, attack: .02 });
      if (o.lead2) this.#tone(out, { freq: wob(midiHz(note + 12)), start: t + lag, dur: st * len, type: o.lead2, vol: o.leadVol * .5, attack: .02 });
    });
  }
  /** One step of whichever calm track is playing. */
  #playCalm(step, t) {
    const id = this.#calm.id;
    if (this.#calm.lofi) return this.#playLofi(this.#calm.bars[Math.floor(step / STEPS_PER_BAR)], step % STEPS_PER_BAR, t, this.#stepLen, this.#music, this.#calm.lofi);
    if (id === 'pop') return this.#playStep(step, t);
    const bar = this.#calm.bars[Math.floor(step / STEPS_PER_BAR)], s = step % STEPS_PER_BAR, st = this.#stepLen, out = this.#music;
    const lag = this.#calm.swing && s % 4 === 2 ? st * .33 : 0;
    const melody = (type, vol, shift = 0) => bar.melody.filter(([at]) => at === s).forEach(([, note, len]) => this.#tone(out, { freq: midiHz(note + shift), start: t + lag, dur: st * len, type, vol, attack: .015 }));
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
    } else if (id === 'rush') {
      // driving: kick on every beat and the and of three, claps, sixteenth hats, octave saw bass, stabs
      if (s % 4 === 0 || s === 10) this.#tone(out, { freq: 130, to: 50, start: t, dur: .11, type: 'sine', vol: .22 });
      if (s === 4 || s === 12) this.#noise(out, { start: t, dur: .09, vol: .05, type: 'bandpass', freq: 1600 });
      this.#noise(out, { start: t, dur: .018, vol: s % 2 ? .009 : .014, freq: 8500 });
      if (s % 2 === 0) this.#tone(out, { freq: midiHz(bar.bass + (s % 4 ? 12 : 0)), start: t, dur: st * 1.1, type: 'sawtooth', vol: .045 });
      if ([2, 6, 10, 14].includes(s)) bar.chord.forEach(n => this.#tone(out, { freq: midiHz(n + 12), start: t, dur: st * .8, type: 'square', vol: .016 }));
      melody('square', .05);
    } else if (id === 'brunch') {
      // ukulele strums, a light kick and rim, shaker, a walking bass
      if (s === 0 || s === 8) this.#tone(out, { freq: 100, to: 50, start: t, dur: .12, type: 'sine', vol: .16 });
      if (s === 4 || s === 12) this.#noise(out, { start: t, dur: .04, vol: .03, type: 'bandpass', freq: 3000 });
      if (s % 2 === 0) this.#noise(out, { start: t, dur: .03, vol: .01, freq: 9000 });
      if (s === 0 || s === 8) this.#tone(out, { freq: midiHz(bar.bass), start: t, dur: st * 3, type: 'triangle', vol: .2 });
      if (s === 14) this.#tone(out, { freq: midiHz(bar.bass + 7), start: t, dur: st * 2, type: 'triangle', vol: .15 });
      if ([0, 3, 6, 8, 11, 14].includes(s)) bar.chord.forEach((n, k) => this.#tone(out, { freq: midiHz(n + 12), start: t + k * .015, dur: st * 1.3, type: 'triangle', vol: .028 }));
      melody('triangle', .08);
    } else if (id === 'neon') {
      // synthwave: four on the floor, a long snare, eighth saw bass, a rising arpeggio and a pad
      if (s % 4 === 0) this.#tone(out, { freq: 120, to: 48, start: t, dur: .13, type: 'sine', vol: .22 });
      if (s === 4 || s === 12) this.#noise(out, { start: t, dur: .22, vol: .045, type: 'bandpass', freq: 1300 });
      if (s % 2 === 0) this.#tone(out, { freq: midiHz(bar.bass), start: t, dur: st * 1.6, type: 'sawtooth', vol: .05 });
      this.#tone(out, { freq: midiHz(bar.chord[s % bar.chord.length] + 12 + (s >= 8 ? 12 : 0)), start: t, dur: st * .8, type: 'square', vol: .014 });
      if (s === 0) bar.chord.forEach(n => this.#tone(out, { freq: midiHz(n), start: t, dur: st * 16, type: 'triangle', vol: .025, attack: .3 }));
      melody('sawtooth', .035);
    } else if (id === 'rain') {
      // rain on the window, broken piano chords and a quiet melody
      if (s === 0) this.#noise(out, { start: t, dur: st * 16, vol: .012, type: 'lowpass', freq: 1200, attack: .5 });
      if (s % 2 === 0) this.#tone(out, { freq: midiHz(bar.chord[(s / 2) % bar.chord.length]), start: t, dur: st * 3, type: 'triangle', vol: .04 });
      if (s === 0) this.#tone(out, { freq: midiHz(bar.bass), start: t, dur: st * 12, type: 'sine', vol: .18, attack: .1 });
      melody('sine', .08);
    } else if (id === 'swing') {
      // walking bass in quarters, a swung ride, foot hat on two and four, piano comps on the swung off-beats
      const walk = [0, 4, 7, 10][s / 4];
      if (s % 4 === 0) this.#tone(out, { freq: midiHz(bar.bass + walk), start: t, dur: st * 3.5, type: 'triangle', vol: .2 });
      if (s % 4 === 0 || s % 8 === 6) this.#noise(out, { start: t + lag, dur: .09, vol: .014, freq: 9000 });
      if (s === 4 || s === 12) this.#noise(out, { start: t, dur: .03, vol: .012, type: 'bandpass', freq: 5000 });
      if (s === 6 || s === 10) bar.chord.forEach(n => this.#tone(out, { freq: midiHz(n + 12), start: t + lag, dur: st * 1.2, type: 'triangle', vol: .026 }));
      melody('triangle', .075);
    } else if (id === 'funk') {
      // tight drums with ghost notes, syncopated staccato bass, chord stabs
      if ([0, 3, 8, 10].includes(s)) this.#tone(out, { freq: 125, to: 50, start: t, dur: .1, type: 'sine', vol: s === 3 ? .1 : .2 });
      if (s === 4 || s === 12) this.#noise(out, { start: t, dur: .09, vol: .05, type: 'bandpass', freq: 1800 });
      if (s === 7 || s === 15) this.#noise(out, { start: t, dur: .04, vol: .015, type: 'bandpass', freq: 1800 });
      this.#noise(out, { start: t, dur: .016, vol: s % 2 ? .008 : .013, freq: 8500 });
      const bassAt = { 0: 0, 3: 12, 6: 0, 8: 0, 11: 10, 14: 12 };
      if (s in bassAt) this.#tone(out, { freq: midiHz(bar.bass + bassAt[s]), start: t, dur: st * .8, type: 'sawtooth', vol: .05 });
      if ([2, 7, 10, 15].includes(s)) bar.chord.forEach(n => this.#tone(out, { freq: midiHz(n + 12), start: t, dur: st * .5, type: 'square', vol: .018 }));
      melody('square', .045);
    } else if (id === 'tropical') {
      // a soft four on the floor, off-beat plucks, shaker, syncopated bass and a marimba lead
      if (s % 4 === 0) this.#tone(out, { freq: 110, to: 50, start: t, dur: .12, type: 'sine', vol: .17 });
      this.#noise(out, { start: t, dur: .02, vol: .008, freq: 9500 });
      if (s % 4 === 2) bar.chord.forEach(n => this.#tone(out, { freq: midiHz(n + 12), start: t, dur: st * .9, type: 'triangle', vol: .03 }));
      if (s === 0 || s === 6 || s === 10) this.#tone(out, { freq: midiHz(bar.bass), start: t, dur: st * 2, type: 'triangle', vol: .2 });
      bar.melody.filter(([at]) => at === s).forEach(([, note]) => this.#tone(out, { freq: midiHz(note), start: t, dur: st * 1.4, type: 'sine', vol: .09, attack: .003 }));
    } else if (id === 'ballad') {
      // a rolling piano arpeggio, a soft pad, a sine bass and a gentle melody
      const up = [...bar.chord, ...bar.chord.slice(1, -1).reverse()];
      if (s % 2 === 0) this.#tone(out, { freq: midiHz(up[(s / 2) % up.length] + 12), start: t, dur: st * 2.5, type: 'triangle', vol: .035 });
      if (s === 0) { this.#tone(out, { freq: midiHz(bar.bass), start: t, dur: st * 14, type: 'sine', vol: .18, attack: .1 }); bar.chord.forEach(n => this.#tone(out, { freq: midiHz(n), start: t, dur: st * 16, type: 'triangle', vol: .018, attack: .6 })); }
      melody('sine', .09);
    } else if (id === 'bubble') {
      // bright pop: four on the floor, clap and snare, bouncy octave bass, high plucks and a doubled lead
      if (s % 4 === 0) this.#tone(out, { freq: 130, to: 50, start: t, dur: .11, type: 'sine', vol: .22 });
      if (s === 4 || s === 12) { this.#noise(out, { start: t, dur: .08, vol: .045, type: 'bandpass', freq: 1500 }); this.#noise(out, { start: t + .012, dur: .06, vol: .03, type: 'bandpass', freq: 2400 }); }
      if (s % 2 === 0) this.#tone(out, { freq: midiHz(bar.bass + (s % 4 ? 12 : 0)), start: t, dur: st * .9, type: 'sawtooth', vol: .045 });
      if (s % 4 === 2) bar.chord.forEach(n => this.#tone(out, { freq: midiHz(n + 12), start: t, dur: st * .7, type: 'square', vol: .016 }));
      melody('square', .045); melody('triangle', .02, 12);
    } else if (id === 'chill') {
      // reggae one-drop: kick and rim on three, skank chords on two and four with an echo, a round bass
      if (s === 8) { this.#tone(out, { freq: 90, to: 45, start: t, dur: .16, type: 'sine', vol: .2 }); this.#noise(out, { start: t, dur: .04, vol: .03, type: 'bandpass', freq: 3200 }); }
      if (s % 2 === 0) this.#noise(out, { start: t, dur: .02, vol: .009, freq: 8000 });
      if (s === 4 || s === 12) bar.chord.forEach(n => { this.#tone(out, { freq: midiHz(n + 12), start: t, dur: st * .7, type: 'square', vol: .02 }); this.#tone(out, { freq: midiHz(n + 12), start: t + st * 3, dur: st * .6, type: 'square', vol: .008 }); });
      const line = { 0: 0, 6: 7, 10: 0, 14: 12 };
      if (s in line) this.#tone(out, { freq: midiHz(bar.bass + line[s]), start: t, dur: st * (s === 14 ? 2 : 3), type: 'sine', vol: .22 });
      melody('triangle', .07);
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
