import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { ActivityType } from '../../components/ActivityModal';
import { getFutureActivities } from '../../services/DatabaseService';
import { getCurrentUser } from '../../services/AuthService';

interface Activity {
  id: string;
  type: ActivityType;
  date: Date;
  notes?: string;
  contactId: string;
  contactName: string;
}

export default function RemindersTab() {
  const { colors } = useTheme();
  const router = useRouter();
  const [futureActivities, setFutureActivities] = useState<Activity[]>([]);

  useEffect(() => {
    loadFutureActivities();
  }, []);

  // Add real-time updates when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadFutureActivities();
    }, [])
  );

  const loadFutureActivities = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error('No authenticated user');
        return;
      }
      const activities = await getFutureActivities(user.id);
      setFutureActivities(activities);
    } catch (error) {
      console.error('Error loading future activities:', error);
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'call': return 'call';
      case 'message': return 'chatbubble';
      case 'meeting': return 'people';
      case 'note': return 'document-text';
    }
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const activityDate = new Date(date);
    activityDate.setHours(0, 0, 0, 0);
    
    // Calculate difference in days
    const diffTime = activityDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 7) return `Due in ${diffDays} days`;
    if (diffDays < 30) return `Due in ${Math.ceil(diffDays / 7)} weeks`;
    return `Due on ${date.toLocaleDateString()}`;
  };

  const getActivityLabel = (type: ActivityType) => {
    switch (type) {
      case 'call': return 'Phone Call';
      case 'message': return 'Message';
      case 'meeting': return 'Meeting';
      case 'note': return 'Note';
    }
  };

  // Group activities by date
  const groupedActivities = futureActivities.reduce((acc: { [key: string]: Activity[] }, activity) => {
    const date = new Date(activity.date);
    const dateKey = getRelativeTime(date).split(',')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(activity);
    return acc;
  }, {});

  const sections = Object.entries(groupedActivities)
    .map(([date, items]) => ({
      title: date,
      data: items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }));

  const renderItem = ({ item }: { item: Activity }) => (
    <TouchableOpacity 
      style={[styles.reminderItem, { backgroundColor: colors.categoryBg }]}
      onPress={() => {
        const contactData = {
          id: item.contactId,
          name: item.contactName,
          phoneNumbers: [],
          category: '',
          notes: ''
        };
        router.push({
          pathname: `/contact/${item.contactId}`,
          params: { contact: JSON.stringify(contactData) }
        });
      }}
    >
      <View style={styles.reminderContent}>
        {/* Icon Column */}
        <View style={styles.iconContainer}>
          <View style={[
            styles.iconCircle,
            { backgroundColor: colors.selectedCategory + '20' }
          ]}>
            <Ionicons 
              name={getActivityIcon(item.type)} 
              size={24} 
              color={colors.selectedCategory}
            />
          </View>
        </View>

        {/* Content Column */}
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.activityType, { color: colors.selectedCategory }]}>
              {getActivityLabel(item.type)}
            </Text>
            <Text style={[styles.dateText, { color: colors.secondaryText }]}>
              {new Date(item.date).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          </View>
          <Text style={[styles.contactName, { color: colors.text }]}>
            {item.contactName}
          </Text>
          {item.notes && (
            <Text style={[styles.notes, { color: colors.secondaryText }]}>
              {item.notes}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>Upcoming Activities</Text>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={[styles.sectionHeader, { color: colors.secondaryText }]}>
            {title}
          </Text>
        )}
        renderItem={renderItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 13,
    paddingHorizontal: 18,
    textTransform: 'uppercase',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  reminderItem: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    alignItems: 'center',
    marginRight: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityType: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    opacity: 0.7,
  },
  notes: {
    fontSize: 15,
    lineHeight: 20,
    opacity: 0.9,
  },
}); 