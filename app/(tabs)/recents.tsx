import React, { useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityType } from '../../components/ActivityModal';
import { getPastActivities } from '../../services/DatabaseService';
import { getCurrentUser } from '../../services/AuthService';

interface Activity {
  id: string;
  type: ActivityType;
  date: Date;
  notes?: string;
  contactId: string;
  contactName: string;
}

export default function RecentsTab() {
  const { colors } = useTheme();
  const router = useRouter();
  const [pastActivities, setPastActivities] = useState<Activity[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadPastActivities();
    }, [])
  );

  const loadPastActivities = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error('No authenticated user');
        return;
      }
      const activities = await getPastActivities(user.id);
      setPastActivities(activities);
    } catch (error) {
      console.error('Error loading past activities:', error);
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

  const getActivityLabel = (type: ActivityType) => {
    switch (type) {
      case 'call': return 'Phone Call';
      case 'message': return 'Message';
      case 'meeting': return 'Meeting';
      case 'note': return 'Note';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const activityDate = new Date(date);
    activityDate.setHours(0, 0, 0, 0);
    
    // Calculate difference in days
    const diffTime = today.getTime() - activityDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    if (diffDays < 30) {
      return `${Math.ceil(diffDays / 7)} weeks ago`;
    }
    
    // For older dates, show the full date
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Group activities by date
  const groupedActivities = pastActivities.reduce((acc: { [key: string]: Activity[] }, activity) => {
    const date = new Date(activity.date);
    const dateKey = formatDate(date);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(activity);
    return acc;
  }, {});

  const sections = Object.entries(groupedActivities)
    .map(([date, items]) => ({
      title: date,
      data: items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }))
    .sort((a, b) => {
      // Helper function to get the date from the section title
      const getDateFromTitle = (title: string) => {
        if (title === 'Today') return new Date();
        if (title === 'Yesterday') {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          return yesterday;
        }
        if (title.includes('days ago')) {
          const days = parseInt(title);
          const date = new Date();
          date.setDate(date.getDate() - days);
          return date;
        }
        if (title.includes('weeks ago')) {
          const weeks = parseInt(title);
          const date = new Date();
          date.setDate(date.getDate() - (weeks * 7));
          return date;
        }
        return new Date(title);
      };

      const dateA = getDateFromTitle(a.title);
      const dateB = getDateFromTitle(b.title);
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });

  const renderItem = ({ item }: { item: Activity }) => (
    <TouchableOpacity 
      style={[
        styles.activityItem, 
        { 
          backgroundColor: colors.categoryBg,
          borderLeftWidth: 3,
          borderLeftColor: '#FF3B30' // iOS red color
        }
      ]}
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
      <View style={styles.activityContent}>
        {/* Icon Column */}
        <View style={styles.iconContainer}>
          <View style={[
            styles.iconCircle,
            { 
              backgroundColor: '#FF3B3015', // Red with transparency
              borderWidth: 1,
              borderColor: '#FF3B3030' // Red with more transparency
            }
          ]}>
            <Ionicons 
              name={getActivityIcon(item.type)} 
              size={24} 
              color="#FF3B30" // Red icon
              style={{ opacity: 0.9 }}
            />
          </View>
        </View>

        {/* Content Column */}
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={[
              styles.activityType, 
              { 
                color: '#FF3B30', // Red text
                opacity: 0.9
              }
            ]}>
              {getActivityLabel(item.type)}
            </Text>
            <Text style={[styles.dateText, { color: colors.secondaryText }]}>
              {formatDate(new Date(item.date))}
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
      <Text style={[styles.header, { color: colors.text }]}>Recent Activities</Text>
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
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: 16,
    paddingBottom: 8,
  },
  activityItem: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  activityContent: {
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
    opacity: 0.7,
  },
}); 