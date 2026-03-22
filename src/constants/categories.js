export const CATEGORIES = [
  { id: 'WORK', label: 'Work', icon: '💼', color: '#6366F1' },
  { id: 'STUDY', label: 'Study', icon: '📚', color: '#10B981' },
  { id: 'CODING', label: 'Coding', icon: '💻', color: '#F59E0B' },
  { id: 'READING', label: 'Reading', icon: '📖', color: '#EF4444' },
  { id: 'CREATIVE', label: 'Creative', icon: '🎨', color: '#8B5CF6' },
  { id: 'EXERCISE', label: 'Exercise', icon: '🏃', color: '#EC4899' },
  { id: 'ADMIN', label: 'Admin', icon: '📂', color: '#64748B' },
  { id: 'OTHER', label: 'Other', icon: '✨', color: '#A1A1AA' },
];

export const getCategoryById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[7];
