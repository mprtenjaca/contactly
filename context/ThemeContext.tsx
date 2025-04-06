import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme, Platform, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../constants/Colors';

type Theme = 'light' | 'dark';

export const ThemeContext = createContext({
  theme: 'light' as Theme,
  colors: lightColors,
  toggleTheme: () => {},
});

const THEME_STORAGE_KEY = 'user_theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceTheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(Appearance.getColorScheme() as Theme);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = Appearance.getColorScheme();
      console.log('Device theme:', savedTheme);
      if (savedTheme) {
        console.log('Setting theme:', savedTheme);
        setTheme(savedTheme as Theme);
      } else {
        // Use light theme as default
        setTheme('light');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      setTheme('light');
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    console.log('Toggling theme:', newTheme);
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext); 