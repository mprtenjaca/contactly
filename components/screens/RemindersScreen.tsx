import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import EmptyState from '../EmptyState';
import { Activity } from '../../services/DatabaseService';

export default function RemindersScreen() {
  const { colors } = useTheme();
  const [reminders, setReminders] = React.useState<Activity[]>([]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {reminders.length === 0 ? (
        <EmptyState
          icon="alarm-outline"
          title="No Reminders Set"
          message="Set reminders for your upcoming calls and meetings"
        />
      ) : (
        // Your reminders list component here
        null
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 