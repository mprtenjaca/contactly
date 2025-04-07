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
  // Initialize with light theme, but will be overridden by stored preference
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme preference from storage when component mounts
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        console.log('Setting theme from storage:', savedTheme);
        setTheme(savedTheme as Theme);
      } else {
        // Use light theme as default if no preference is found
        console.log('No saved theme, defaulting to light theme');
        setTheme('light');
        // Save the default theme
        await AsyncStorage.setItem(THEME_STORAGE_KEY, 'light');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      // Default to light theme in case of error
      setTheme('light');
    } finally {
      setIsLoaded(true);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    console.log('Toggling theme:', newTheme);
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      console.log('Theme preference saved:', newTheme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  // Only render children once the theme is loaded from storage
  if (!isLoaded) {
    return null; // Or a loading indicator if preferred
  }

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext); 