import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import EmptyState from '../EmptyState';
import ActivityTimeline from '../ActivityTimeline';
import { Activity } from '../../services/DatabaseService';

export default function RecentsScreen() {
  const { colors } = useTheme();
  const [activities, setActivities] = React.useState<Activity[]>([]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {activities.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="No Recent Activities"
          message="Your recent activities with contacts will appear here"
        />
      ) : (
        <ActivityTimeline 
          activities={activities}
          onAddActivity={() => {}}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 