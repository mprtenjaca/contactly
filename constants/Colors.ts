// Light theme colors
export const lightColors = {
  background: '#fff',
  containerBg: 'rgba(0, 0, 0, 0.04)',
  placeholder: '#000',
  text: '#000',
  secondaryText: '#8e8e93',
  searchBar: '#e4e4ea',
  separator: '#c6c6c8',
  categoryBg: '#f2f2f7',
  categoryBorder: '#e5e5ea',
  selectedCategory: '#007AFF',
  appBlue: '#007AFF',
  avatarBg: '#e5e5ea',
  sectionHeader: '#f2f2f7',
  tabBar: '#fff',
  hoveredItem: '#f2f2f7',
  error: '#dc3545',
  border: '#e5e5ea',
};

// Dark theme colors
export const darkColors = {
  background: '#141414',
  containerBg: 'rgba(255, 255, 255, 0.03)',
  placeholder: '#fff',
  text: '#fff',
  secondaryText: '#8e8e93',
  searchBar: '#1c1c1e',
  separator: '#2c2c2e',
  categoryBg: '#1c1c1e',
  categoryBorder: '#333',
  selectedCategory: '#007AFF',
  appBlue: '#007AFF',
  avatarBg: '#2c2c2e',
  sectionHeader: '#000',
  tabBar: '#000',
  hoveredItem: '#1c1c1e',
  error: '#ff453a',
  border: '#2c2c2e',
};

// Add type for colors
export type ColorTheme = typeof lightColors; 