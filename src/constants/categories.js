export const CATEGORIES = [
  { id: 'WORK', label: 'Work', icon: 'briefcase-outline', color: '#6200EE' },
  { id: 'STUDY', label: 'Study', icon: 'book-open-outline', color: '#00D8C4' },
  { id: 'CODING', label: 'Coding', icon: 'code-tags', color: '#46F5E0' },
  { id: 'READING', label: 'Reading', icon: 'book-multiple-outline', color: '#FFB4AB' },
  { id: 'CREATIVE', label: 'Creative', icon: 'palette-outline', color: '#CFBDFF' },
  { id: 'EXERCISE', label: 'Exercise', icon: 'run', color: '#F59E0B' },
  { id: 'ADMIN', label: 'Admin', icon: 'folder-outline', color: '#948DA2' },
  { id: 'OTHER', label: 'Other', icon: 'star-outline', color: '#CBC3D9' },
];

export const getCategoryById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[7];
