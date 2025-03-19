import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Activity } from '../../services/ActivityService';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface CalendarViewProps {
  activities: Activity[];
  onDayPress: (date: string) => void;
  onActivityPress: (activity: Activity) => void;
}

export default function CalendarView({ activities, onDayPress, onActivityPress }: CalendarViewProps) {
  const { colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Process activities for calendar marking
  const markedDates = activities.reduce((acc: any, activity) => {
    const date = new Date(activity.date).toISOString().split('T')[0];
    const now = new Date();
    const isPast = new Date(activity.date) < now;

    acc[date] = {
      marked: true,
      dotColor: isPast ? '#FF3B30' : colors.selectedCategory,
      selected: date === selectedDate,
      selectedColor: colors.categoryBg,
    };
    return acc;
  }, {});

  // Get activities for selected date and sort them by time
  const selectedDateActivities = activities
    .filter(activity => {
      const activityDate = new Date(activity.date).toISOString().split('T')[0];
      return activityDate === selectedDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Add helper function to determine if activity is in the past
  const isActivityInPast = (activity: Activity) => {
    return new Date(activity.date) < new Date();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return 'call';
      case 'message': return 'chatbubble';
      case 'meeting': return 'people';
      case 'note': return 'document-text';
      case 'email': return 'mail';
      case 'whatsapp': return 'logo-whatsapp';
      default: return 'alert-circle';
    }
  };

  return (
    <View style={styles.container}>
      <Calendar
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.background,
          textSectionTitleColor: colors.text,
          selectedDayBackgroundColor: colors.selectedCategory,
          selectedDayTextColor: '#ffffff',
          todayTextColor: colors.selectedCategory,
          dayTextColor: colors.text,
          textDisabledColor: colors.secondaryText,
          dotColor: colors.selectedCategory,
          monthTextColor: colors.text,
          textMonthFontWeight: 'bold',
          textDayFontSize: 16,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 14
        }}
        markedDates={markedDates}
        onDayPress={(day: DateData) => {
          setSelectedDate(day.dateString);
          onDayPress(day.dateString);
        }}
        enableSwipeMonths={true}
      />

      <View style={[styles.activitiesList, { backgroundColor: colors.background }]}>
        <Text style={[styles.dateHeader, { color: colors.text }]}>
          {new Date(selectedDate).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>

        <ScrollView style={styles.activitiesScrollView}>
          {selectedDateActivities.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.secondaryText }]}>
                No activities scheduled for this day
              </Text>
            </View>
          ) : (
            selectedDateActivities.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={[styles.activityItem, { backgroundColor: colors.categoryBg }]}
                onPress={() => onActivityPress(activity)}
              >
                <View style={[
                  styles.iconContainer, 
                  { 
                    backgroundColor: isActivityInPast(activity) 
                      ? '#FF3B3015' 
                      : `${colors.selectedCategory}15` 
                  }
                ]}>
                  <Ionicons
                    name={getActivityIcon(activity.type)}
                    size={24}
                    color={isActivityInPast(activity) ? '#FF3B30' : colors.selectedCategory}
                  />
                </View>
                <View style={styles.activityDetails}>
                  <Text style={[styles.activityTime, { color: colors.secondaryText }]}>
                    {new Date(activity.date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                  <Text style={[
                    styles.activityTitle, 
                    { 
                      color: isActivityInPast(activity) ? '#FF3B30' : colors.text 
                    }
                  ]}>
                    {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} with {activity.contactName}
                  </Text>
                  {activity.notes && (
                    <Text style={[styles.activityNotes, { color: colors.secondaryText }]}>
                      {activity.notes}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  activitiesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dateHeader: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  activitiesScrollView: {
    flex: 1,
  },
  activityItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityTime: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityNotes: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 