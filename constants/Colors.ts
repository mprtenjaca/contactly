// Light theme colors
export const lightColors = {
  background: '#fff',
  text: '#000',
  secondaryText: '#8e8e93',
  searchBar: '#e4e4ea',
  separator: '#c6c6c8',
  categoryBg: '#f2f2f7',
  categoryBorder: '#e5e5ea',
  selectedCategory: '#007AFF',
  avatarBg: '#e5e5ea',
  sectionHeader: '#f2f2f7',
  tabBar: '#fff',
  hoveredItem: '#f2f2f7',
  error: '#dc3545',
  border: '#e5e5ea',
};

// Dark theme colors
export const darkColors = {
  background: '#000',
  text: '#fff',
  secondaryText: '#8e8e93',
  searchBar: '#1c1c1e',
  separator: '#2c2c2e',
  categoryBg: '#1c1c1e',
  categoryBorder: '#333',
  selectedCategory: '#007AFF',
  avatarBg: '#2c2c2e',
  sectionHeader: '#000',
  tabBar: '#000',
  hoveredItem: '#1c1c1e',
  error: '#ff453a',
  border: '#2c2c2e',
};

// Add type for colors
export type ColorTheme = typeof lightColors; 