import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SectionList, Alert, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { ActivityType } from '../../components/ActivityModal';
import { getFutureActivities, deleteActivity } from '../../services/DatabaseService';
import { getCurrentUser } from '../../services/AuthService';
import EmptyState from '../../components/EmptyState';
import ActivityModal from '../../components/ActivityModal';
import { handleSaveActivity } from '../../services/ActivityService';
import { Activity } from '../../services/ActivityService';
import ActionMenuModal from '../../components/ActionMenuModal';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import * as Haptics from 'expo-haptics';

export default function RemindersTab() {
  const { colors } = useTheme();
  const router = useRouter();
  const [futureActivities, setFutureActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [actionActivity, setActionActivity] = useState<Activity | null>(null);

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
      case 'email': return 'mail';
      case 'whatsapp': return 'logo-whatsapp';
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
      case 'email': return 'Email';
      case 'whatsapp': return 'WhatsApp';
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

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowActivityModal(true);
  };

  const handleActionMenu = (activity: Activity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActionActivity(activity);
    setShowActionMenu(true);
  };

  const handleDeleteActivity = async (activity: Activity) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error('No authenticated user');
        return;
      }
      await deleteActivity(activity.id, user.id);
      await loadFutureActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      Alert.alert('Error', 'Failed to delete activity');
    }
  };

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
      onLongPress={() => handleActionMenu(item)}
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.dateText, { color: colors.secondaryText, marginRight: 8 }]}>
                {new Date(item.date).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
              <TouchableOpacity
                onPress={() => handleActionMenu(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Reminders</Text>
      </View>

      <View style={[styles.content, { backgroundColor: colors.background }]}>
        {futureActivities.length === 0 ? (
          <EmptyState 
            icon="time-outline"
            title="No Upcoming Activities"
            message="Your upcoming activities will appear here"
          />
        ) : (
          <SectionList
            contentContainerStyle={styles.listContent}
            sections={sections}
            keyExtractor={item => item.id}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={[styles.sectionHeader, { 
                color: colors.secondaryText, 
                backgroundColor: colors.background 
              }]}>
                {title}
              </Text>
            )}
            renderItem={renderItem}
            stickySectionHeaders={true}
          />
        )}
      </View>

      <ActionMenuModal
        visible={showActionMenu}
        onClose={() => {
          setShowActionMenu(false);
        }}
        onEdit={() => {
          if (actionActivity) {
            handleEditActivity(actionActivity);
            setShowActionMenu(false);
          }
        }}
        onDelete={() => {
          if (actionActivity) {
            setShowDeleteConfirmation(true);
            setShowActionMenu(false);
          }
        }}
      />

      <DeleteConfirmationModal
        visible={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false);
        }}
        onConfirm={async () => {
          if (actionActivity) {
            await handleDeleteActivity(actionActivity);
            setShowDeleteConfirmation(false);
          }
        }}
      />

      <ActivityModal
        visible={showActivityModal}
        onClose={() => {
          setShowActivityModal(false);
          setSelectedActivity(null);
        }}
        onSave={async (type: ActivityType, date: Date, notes?: string) => {
          try {
            if (!selectedActivity) return;
            
            await handleSaveActivity(
              type,
              date,
              notes,
              selectedActivity.contactId,
              selectedActivity.contactName,
              selectedActivity
            );
            
            setShowActivityModal(false);
            setSelectedActivity(null);
            await loadFutureActivities();
          } catch (error) {
            console.error('Error saving activity:', error);
            Alert.alert('Error', 'Failed to save activity');
          }
        }}
        activity={selectedActivity || undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  listContent: {
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