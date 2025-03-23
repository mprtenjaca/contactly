import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function RemindersScreen() {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
      },
      header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 10,
        backgroundColor: colors.background,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.separator,
      },
      headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        letterSpacing: 0.5,
      },
      headerSubtitle: {
        fontSize: 16,
        color: colors.secondaryText,
      },
  }); 

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
      </View>
    </SafeAreaView>
  );
}

