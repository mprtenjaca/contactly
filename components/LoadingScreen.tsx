import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
// import { useTheme } from '../context/ThemeContext';

export default function LoadingScreen() {
  // const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: 'white' }]}>
      <ActivityIndicator size="large" color="black" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 