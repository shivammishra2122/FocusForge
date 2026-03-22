export const SOUNDS = [
  { id: 'NONE', label: 'None', icon: '🔇', url: null },
  { id: 'RAIN', label: 'Heavy Rain', icon: '🌧️', url: 'https://www.soundjay.com/nature/rain-01.mp3' },
  { id: 'FOREST', label: 'Forest Birds', icon: '🌲', url: 'https://www.soundjay.com/nature/forest-01.mp3' },
  { id: 'WHITE_NOISE', label: 'White Noise', icon: '🌫️', url: 'https://www.soundjay.com/misc/sounds/white-noise-01.mp3' },
  { id: 'LOFI', label: 'Lofi Beats', icon: '🎧', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
];

export const getSoundById = (id) => SOUNDS.find((s) => s.id === id) || SOUNDS[0];
