export const ACHIEVEMENTS = [
  {
    id: 'first_session',
    title: 'First Focus',
    description: 'Complete your first focus session',
    icon: '🎯',
    condition: (stats) => stats.totalSessions >= 1,
    xp: 50,
  },
  {
    id: 'streak_3',
    title: 'Consistency Begins',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    condition: (stats) => stats.streak >= 3,
    xp: 100,
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '⚡',
    condition: (stats) => stats.streak >= 7,
    xp: 250,
  },
  {
    id: 'streak_30',
    title: 'Unstoppable',
    description: 'Maintain a 30-day streak',
    icon: '💎',
    condition: (stats) => stats.streak >= 30,
    xp: 1000,
  },
  {
    id: 'hours_10',
    title: 'Deep Diver',
    description: 'Accumulate 10 hours of focus time',
    icon: '🌊',
    condition: (stats) => stats.totalMinutes >= 600,
    xp: 200,
  },
  {
    id: 'hours_50',
    title: 'Focus Master',
    description: 'Accumulate 50 hours of focus time',
    icon: '🏆',
    condition: (stats) => stats.totalMinutes >= 3000,
    xp: 500,
  },
  {
    id: 'hours_100',
    title: 'Legend',
    description: 'Accumulate 100 hours of focus time',
    icon: '👑',
    condition: (stats) => stats.totalMinutes >= 6000,
    xp: 1000,
  },
  {
    id: 'sessions_10',
    title: 'Getting Serious',
    description: 'Complete 10 focus sessions',
    icon: '💪',
    condition: (stats) => stats.totalSessions >= 10,
    xp: 150,
  },
  {
    id: 'sessions_50',
    title: 'Habit Formed',
    description: 'Complete 50 focus sessions',
    icon: '🧠',
    condition: (stats) => stats.totalSessions >= 50,
    xp: 400,
  },
  {
    id: 'tasks_complete_5',
    title: 'Task Slayer',
    description: 'Complete 5 tasks',
    icon: '✅',
    condition: (stats) => stats.tasksCompleted >= 5,
    xp: 100,
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Start a session before 8 AM',
    icon: '🌅',
    condition: (stats) => stats.hasEarlySession,
    xp: 75,
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Start a session after 10 PM',
    icon: '🦉',
    condition: (stats) => stats.hasLateSession,
    xp: 75,
  },
];

export const LEVELS = [
  { level: 1, title: 'Initiate', minXP: 0, maxXP: 200 },
  { level: 2, title: 'Apprentice', minXP: 200, maxXP: 500 },
  { level: 3, title: 'Scholar', minXP: 500, maxXP: 900 },
  { level: 4, title: 'Practitioner', minXP: 900, maxXP: 1400 },
  { level: 5, title: 'Expert', minXP: 1400, maxXP: 2000 },
  { level: 6, title: 'Master', minXP: 2000, maxXP: 2750 },
  { level: 7, title: 'Grand Master', minXP: 2750, maxXP: 3600 },
  { level: 8, title: 'Sage', minXP: 3600, maxXP: 4600 },
  { level: 9, title: 'Legend', minXP: 4600, maxXP: 5750 },
  { level: 10, title: 'Transcendent', minXP: 5750, maxXP: Infinity },
];

export const getLevelInfo = (xp) => {
  const level = LEVELS.find((l) => xp >= l.minXP && xp < l.maxXP) || LEVELS[LEVELS.length - 1];
  return level;
};

export const getProgressToNextLevel = (xp) => {
  const level = getLevelInfo(xp);
  if (level.maxXP === Infinity) return 1;
  return (xp - level.minXP) / (level.maxXP - level.minXP);
};
