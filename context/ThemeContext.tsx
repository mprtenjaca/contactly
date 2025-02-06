import React, { createContext, useContext, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colors: typeof themes.light;
}

const themes = {
  light: {
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
  },
  dark: {
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
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const colors = themes[theme];

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 