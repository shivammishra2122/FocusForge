/**
 * Obsidian Protocol Focus Metrics
 * Dynamic calculations for efficiency and focus depth.
 */

export const calculateFocusEfficiency = (elapsedSeconds, totalSeconds, deepFocus = false) => {
  if (elapsedSeconds <= 0) return 92;

  // Base efficiency starts high but slowly decays as mental fatigue sets in
  // Decay: -1% for every 10 minutes of session time
  const fatigueDecay = (elapsedSeconds / 600) * 1;
  const deepFocusBonus = deepFocus ? 5 : 0;
  
  // Consistency boost: adds stability as you maintain the session
  const consistencyBoost = Math.min(elapsedSeconds / 1800, 1) * 3;

  const result = 92 - fatigueDecay + deepFocusBonus + consistencyBoost;
  return Math.min(100, Math.max(65, Math.round(result)));
};

export const calculateFocusIndex = (elapsedSeconds, totalSeconds) => {
  // Focus Index (0.00 - 1.20)
  // Represents the mental immersion level
  
  let baseIndex = 0.85;
  
  // Immersion period: takes ~15 mins to reach peak state
  const immersionProgress = Math.min(elapsedSeconds / 900, 1);
  const immersionBoost = immersionProgress * 0.15;
  
  // High-frequency jitter to simulate active brain activity
  const brainJitter = (Math.sin(elapsedSeconds / 30) * 0.02);
  
  const index = baseIndex + immersionBoost + brainJitter;
  return index.toFixed(2);
};

export const get1000HourProgress = (totalMinutes) => {
  const goalMinutes = 1000 * 60;
  return Math.min(totalMinutes / goalMinutes, 1);
};
