import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ActivityType } from './ActivityModal';
import { format } from 'date-fns';

interface Activity {
  id: string;
  type: ActivityType;
  date: Date;
  notes?: string;
  contactId: string;
  contactName: string;
}

interface TimelineSection {
  title: string;
  data: Activity[];
}

interface Props {
  activities: Activity[];
  onAddActivity: () => void;
  onEditActivity?: (activity: Activity) => void;
  isEmbedded?: boolean;
}

export default function ActivityTimeline({ activities, onAddActivity, onEditActivity, isEmbedded }: Props) {
  const { colors, theme } = useTheme();

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'meeting':
        return 'people';
      case 'call':
        return 'call';
      case 'email':
        return 'mail';
      case 'note':
        return 'document-text';
      case 'message':
        return 'chatbubble';
      default:
        return 'ellipsis-horizontal';
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'meeting': return '#4CAF50';
      case 'call': return '#2196F3';
      case 'email': return '#FF9800';
      case 'note': return '#9C27B0';
      default: return '#757575';
    }
  };

  const getActivityLabel = (type: ActivityType) => {
    switch (type) {
      case 'meeting':
        return 'Meeting';
      case 'call':
        return 'Phone Call';
      case 'email':
        return 'Email';
      case 'message':
        return 'Message';
      case 'note':
        return 'Note';
      default:
        return type;
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    
    return `${date.toLocaleDateString()} ${timeStr}`;
  };

  // Update the groupActivitiesByDate function
  const groupActivitiesByDate = (activities: Activity[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const getDateLabel = (date: Date) => {
      const dateStr = date.toDateString();
      if (dateStr === today.toDateString()) return 'Today';
      if (dateStr === tomorrow.toDateString()) return 'Tomorrow';
      if (dateStr === yesterday.toDateString()) return 'Yesterday';
      return date.toLocaleDateString();
    };

    const groups = activities.reduce((acc, activity) => {
      const date = new Date(activity.date);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString(); // Use ISO string for accurate sorting
      const dateLabel = getDateLabel(date);
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          label: dateLabel,
          date: date,
          activities: []
        };
      }
      acc[dateKey].activities.push(activity);
      return acc;
    }, {} as Record<string, { label: string; date: Date; activities: Activity[] }>);

    // Sort the dates in reverse chronological order (newest to oldest)
    const sortedDates = Object.values(groups).sort((a, b) => {
      return b.date.getTime() - a.date.getTime();
    });

    return sortedDates.map(({ label, activities }) => {
      // Sort activities within each day from earliest to latest
      const sortedActivities = activities.sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      return {
        date: label,
        data: sortedActivities
      };
    });
  };

  const renderActivityItem = (item: Activity) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.activityContainer}
      onPress={() => onEditActivity?.(item)}
    >
      <View style={styles.iconColumn}>
        <View style={[
          styles.iconContainer, 
          { backgroundColor: getActivityColor(item.type) + '20' }
        ]}>
          <Ionicons 
            name={getActivityIcon(item.type)} 
            size={24}
            color={getActivityColor(item.type)} 
          />
        </View>
        {item.id !== activities[activities.length - 1].id && (
          <View style={[styles.timeline, { backgroundColor: colors.separator }]} />
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <Text style={[
            styles.activityType, 
            { color: getActivityColor(item.type) }
          ]}>
            {getActivityLabel(item.type)}
          </Text>
          <Text style={[styles.date, { color: colors.secondaryText }]}>
            {format(item.date, 'MMM d, yyyy h:mm a')}
          </Text>
        </View>

        <View style={styles.contentWrapper}>
          {item.notes && (
            <Text style={[styles.notes, { color: colors.text }]}>
              {item.notes}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Move static styles outside
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      gap: 6,
    },
    addButtonText: {
      fontSize: 15,
      fontWeight: '500',
    },
    scrollContent: {
      flexGrow: 1,
    },
    sectionHeader: {
      padding: 16,
      paddingBottom: 8,
    },
    sectionHeaderText: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      opacity: 0.7,
    },
    activityContainer: {
      flexDirection: 'row',
      marginBottom: 16,
      paddingHorizontal: 12,
    },
    iconColumn: {
      alignItems: 'center',
      width: 48,
      marginRight: 12,
    },
    iconContainer: {
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    timeline: {
      width: 2,
      flex: 1,
      marginTop: 12,
      opacity: 0.6,
    },
    contentContainer: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderRadius: 12,
      padding: 16,
      marginRight: 12,
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    activityType: {
      fontSize: 17,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    date: {
      fontSize: 14,
      opacity: 0.7,
    },
    contentWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 4,
    },
    notes: {
      flex: 1,
      fontSize: 15,
      lineHeight: 20,
      opacity: 0.9,
    },
  });

  // Add dynamic styles inside component
  const dynamicStyles = {
    container: {
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.background,
      borderBottomColor: colors.border,
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <Text style={[styles.title, { color: colors.text }]}>Timeline</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.categoryBg }]}
          onPress={onAddActivity}
        >
          <Ionicons name="add" size={20} color={colors.selectedCategory} />
          <Text style={[styles.addButtonText, { color: colors.text }]}>Add Activity</Text>
        </TouchableOpacity>
      </View>

      {isEmbedded ? (
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {groupActivitiesByDate(activities).map((section) => (
            <View key={section.date}>
              <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionHeaderText, { color: colors.secondaryText }]}>
                  {section.date}
                </Text>
              </View>
              {section.data.map(renderActivityItem)}
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={groupActivitiesByDate(activities)}
          keyExtractor={item => item.date}
          renderItem={({ item: section }) => (
            <View>
              <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionHeaderText, { color: colors.secondaryText }]}>
                  {section.date}
                </Text>
              </View>
              {section.data.map(renderActivityItem)}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
} 