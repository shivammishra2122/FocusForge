// FocusForge — Premium Monochrome Palette
// One accent. No noise. Clean like Linear.app.
export const Colors = {
  // Backgrounds: The Obsidian Depth
  bg: '#131313',               // Base Layer
  bgCard: '#1B1B1B',           // surface-container-low (main cards)
  bgElevated: '#1F1F1F',       // surface-container (raised elements)
  bgHighlight: '#353535',      // surface-container-highest (hovers/active)
  bgInset: '#0E0E0E',          // surface-container-lowest (inputs/carved out)

  // Typography
  textPrimary: '#E2E2E2',      // on-surface (No pure white)
  textSecondary: '#CBC3D9',    // on-surface-variant 
  textMuted: '#948DA2',        // outline for muted text

  // Primary Accent (The Forge Gradient Base)
  primary: '#6200EE',
  primaryLight: '#CFBDFF',
  primaryDark: '#3A0093',
  primaryGlow: 'rgba(98, 0, 238, 0.3)',

  // Secondary Accent (The Transition point)
  secondary: '#00D8C4',
  secondaryLight: '#46F5E0',
  secondaryGlow: 'rgba(0, 216, 196, 0.3)',

  // Semantic
  danger: '#FFB4AB',
  dangerSubtle: 'rgba(147, 0, 10, 0.2)',
  success: '#00D8C4',         // Reuse secondary for success
  successSubtle: 'rgba(0, 216, 196, 0.1)',
  warning: '#F59E0B',         

  // Borders - The "Ghost Border"
  border: 'rgba(73, 68, 86, 0.15)',      // outline-variant at 15%
  borderSubtle: 'rgba(73, 68, 86, 0.08)',
  borderActive: 'rgba(98, 0, 238, 0.5)',

  // Gradients
  gradientPrimary: ['#6200EE', '#00D8C4'], // 135-degree transition
  gradientBg: ['#131313', '#0E0E0E'],
  gradientCard: ['#1B1B1B', '#1B1B1B'],   // Solid cards now
  gradientForge: { colors: ['#6200EE', '#00D8C4'], start: {x: 0, y: 0}, end: {x: 1, y: 1} },
};
