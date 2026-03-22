export const BOSSES = [
  { id: 'PROCRASTINATOR', name: 'The Procrastinator Ghost', hp: 300, icon: '👻', xp: 500, description: 'Requires 5 hours of focus this week.' },
  { id: 'DISTRACTION_DEVIL', name: 'Distraction Devil', hp: 600, icon: '😈', xp: 1000, description: 'Requires 10 hours of focus this week.' },
  { id: 'SCROLL_SERPENT', name: 'Infinite Scroll Serpent', hp: 900, icon: '🐍', xp: 1500, description: 'Requires 15 hours of focus this week.' },
  { id: 'SLOTH_KING', name: 'The Sloth King', hp: 1200, icon: '🦥', xp: 2000, description: 'Requires 20 hours of focus this week.' },
  { id: 'TIME_THIEF', name: 'Chronos the Time Thief', hp: 1800, icon: '🧙‍♂️', xp: 3000, description: 'Requires 30 hours of focus this week.' },
];

export const getCurrentBoss = (weekNumber) => {
  // Rotate through bosses based on the week of the year
  return BOSSES[weekNumber % BOSSES.length];
};

export const getWeekNumber = (date = new Date()) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};
