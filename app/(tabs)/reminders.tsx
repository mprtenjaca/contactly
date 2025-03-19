import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SectionList, Alert, Vibration, RefreshControl, Platform, TextInput, ScrollView, Modal, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { ActivityType } from '../../components/ActivityModal';
import { getFutureActivities, deleteActivity, getPastActivities } from '../../services/DatabaseService';
import { getCurrentUser } from '../../services/AuthService';
import EmptyState from '../../components/EmptyState';
import ActivityModal from '../../components/ActivityModal';
import { handleSaveActivity } from '../../services/ActivityService';
import { Activity } from '../../services/ActivityService';
import ActionMenuModal from '../../components/ActionMenuModal';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import * as Haptics from 'expo-haptics';
import * as Calendar from 'expo-calendar';
import CalendarView from '../components/CalendarView';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const ACTIVITY_TYPES: ActivityType[] = [
  'call',
  'message',
  'meeting',
  'note',
  'email',
  'whatsapp'
];

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

const formatActivityForSharing = (activity: Activity) => {
  const date = new Date(activity.date).toLocaleString();
  return `${getActivityLabel(activity.type)} with ${activity.contactName}\nDate: ${date}${activity.notes ? `\nNotes: ${activity.notes}` : ''}`;
};

export default function RemindersTab() {
  const { colors } = useTheme();
  const router = useRouter();
  const [futureActivities, setFutureActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [actionActivity, setActionActivity] = useState<Activity | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>([]);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({
    start: null,
    end: null
  });
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarPermission, setCalendarPermission] = useState<boolean>(false);
  const [deviceCalendars, setDeviceCalendars] = useState<Calendar.Calendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showCalendarViewModal, setShowCalendarViewModal] = useState(false);
  const [combinedActivities, setCombinedActivities] = useState<Activity[]>([]);

  const dateRangeOptions = [
    { label: 'All Time', value: 'all' },
    { label: 'Next 7 Days', value: '7days' },
    { label: 'Next 30 Days', value: '30days' },
    { label: 'Next 3 Months', value: '3months' },
  ];

  useEffect(() => {
    loadAllActivities();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadAllActivities();
    }, [])
  );

  useEffect(() => {
    (async () => {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      setCalendarPermission(status === 'granted');
      
      if (status === 'granted') {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        setDeviceCalendars(calendars);
        if (calendars.length > 0) {
          setSelectedCalendar(calendars[0].id);
        }
      }
    })();
  }, []);

  const loadAllActivities = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error('No authenticated user');
        return;
      }
      const futureActivities = await getFutureActivities(user.id);
      const pastActivities = await getPastActivities(user.id);
      setFutureActivities(futureActivities);
      setCombinedActivities([...futureActivities, ...pastActivities]);
    } catch (error) {
      console.error('Error loading activities:', error);
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

  const filteredActivities = React.useMemo(() => {
    return futureActivities.filter(activity => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        activity.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.notes?.toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(activity.type);

      // Date range filter
      const activityDate = new Date(activity.date);
      const matchesDateRange = (!dateRange.start || activityDate >= dateRange.start) &&
                              (!dateRange.end || activityDate <= dateRange.end);

      return matchesSearch && matchesType && matchesDateRange;
    });
  }, [futureActivities, searchQuery, selectedTypes, dateRange]);

  const groupedActivities = filteredActivities.reduce((acc: { [key: string]: Activity[] }, activity) => {
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

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadAllActivities();
    setRefreshing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleActionMenu = (activity: Activity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      await loadAllActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      Alert.alert('Error', 'Failed to delete activity');
    }
  };

  const toggleActivityType = (type: ActivityType) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDateRangeSelect = (value: string) => {
    setSelectedDateRange(value);
    if (value === 'all') {
      setDateRange({ start: null, end: null });
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(today);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);

      switch (value) {
        case '7days':
          end.setDate(end.getDate() + 7);
          break;
        case '30days':
          end.setDate(end.getDate() + 30);
          break;
        case '3months':
          end.setMonth(end.getMonth() + 3);
          break;
      }
      
      setDateRange({ start, end });
    }
    setShowDateModal(false);
  };

  const getDateRangeText = () => {
    switch (selectedDateRange) {
      case 'all': return 'All Time';
      case '7days': return 'Next 7 Days';
      case '30days': return 'Next 30 Days';
      case '3months': return 'Next 3 Months';
      default: return 'All Time';
    }
  };

  const syncWithCalendar = async (activity: Activity) => {
    if (!calendarPermission || !selectedCalendar) return;

    try {
      const eventDetails = {
        title: `${activity.type.toUpperCase()} with ${activity.contactName}`,
        startDate: new Date(activity.date),
        endDate: new Date(new Date(activity.date).getTime() + 30 * 60000), // 30 min duration
        notes: activity.notes || '',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        alarms: [{
          relativeOffset: -30, // 30 minutes before
          method: Calendar.AlarmMethod.ALERT,
        }],
      };

      await Calendar.createEventAsync(selectedCalendar, eventDetails);
      Alert.alert('Success', 'Activity added to calendar');
    } catch (error) {
      console.error('Error syncing with calendar:', error);
      Alert.alert('Error', 'Failed to add activity to calendar');
    }
  };

  const handleShareActivity = async (activity: Activity) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // Create a descriptive filename
      const sanitizedName = activity.contactName.replace(/[^a-zA-Z0-9]/g, '');
      const fileName = `${getActivityLabel(activity.type)}_with_${sanitizedName}.ics`;
      const fileUri = FileSystem.documentDirectory + fileName;

      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.log('No existing file to delete');
      }
      
      const startDate = new Date(activity.date);
      const endDate = new Date(startDate.getTime() + 30 * 60000); // 30 minutes duration

      // Format dates for ICS file (YYYYMMDDTHHMMSSZ)
      const formatDateForICS = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      // Create ICS content with proper line endings and required fields
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${activity.id}@contactly.app`,
        `DTSTAMP:${formatDateForICS(new Date())}`,
        `DTSTART:${formatDateForICS(startDate)}`,
        `DTEND:${formatDateForICS(endDate)}`,
        'STATUS:CONFIRMED',
        `SUMMARY:${getActivityLabel(activity.type)} with ${activity.contactName}`,
        `DESCRIPTION:${activity.notes || ''}`,
        'CLASS:PUBLIC',
        'SEQUENCE:0',
        'BEGIN:VALARM',
        'TRIGGER:-PT30M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Reminder',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      try {
        // Write the ICS content to the file
        await FileSystem.writeAsStringAsync(fileUri, icsContent);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create a text message with calendar details
        const message = `📅 Calendar Event: ${getActivityLabel(activity.type)} with ${activity.contactName}\n` +
          `📆 Date: ${startDate.toLocaleDateString()}\n` +
          `⏰ Time: ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n` +
          (activity.notes ? `📝 Notes: ${activity.notes}\n\n` : '\n') +
          `📲 Calendar file attached - Open the .ics file to add to your calendar`;

        // Share both the message and the file
        if (Platform.OS === 'ios') {
          await Share.share({
            url: fileUri,
            message: message,
            title: `${getActivityLabel(activity.type)} with ${activity.contactName}`
          });
        } else {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/calendar',
            UTI: 'public.calendar-event',
            dialogTitle: `Add "${getActivityLabel(activity.type)} with ${activity.contactName}" to Calendar`
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        
      } catch (error) {
        console.error('Error in share process:', error);
        Alert.alert('Error', 'Failed to share activity');
      }
    } catch (error) {
      console.error('Error preparing share:', error);
      Alert.alert('Error', 'Failed to prepare activity for sharing');
    }
  };

  const exportToCalendar = async (activity: Activity) => {
    if (!calendarPermission) {
      Alert.alert(
        'Calendar Permission Required',
        'Please enable calendar access in your device settings to use this feature.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      if (!selectedCalendar) {
        setShowCalendarModal(true);
        return;
      }

      await syncWithCalendar(activity);
      Alert.alert('Success', 'Activity exported to calendar');
    } catch (error) {
      console.error('Error exporting to calendar:', error);
      Alert.alert('Error', 'Failed to export activity');
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
              <Ionicons 
                name="time-outline" 
                size={16} 
                color={colors.secondaryText} 
                style={{ marginRight: 4 }}
              />
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

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <View style={styles.headerTitleRow}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Reminders</Text>
        <TouchableOpacity
          style={[styles.viewModeButton, { backgroundColor: colors.categoryBg }]}
          onPress={() => setShowCalendarViewModal(true)}
        >
          <Ionicons 
            name="calendar" 
            size={20} 
            color={colors.text} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.categoryBg }]}>
        <Ionicons name="search" size={20} color={colors.secondaryText} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search reminders..."
          placeholderTextColor={colors.secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters Row */}
      <View style={[styles.filtersRow]}>
        <TouchableOpacity 
          style={[styles.filterButton, { backgroundColor: colors.categoryBg }]}
          onPress={() => setShowTypeModal(true)}
        >
          <Text style={[styles.filterButtonText, { color: colors.text }]}>
            {selectedTypes.length === 0 
              ? "All Types" 
              : `${selectedTypes.length} Selected`}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.filterButton, { backgroundColor: colors.categoryBg }]}
          onPress={() => setShowDateModal(true)}
        >
          <Text style={[styles.filterButtonText, { color: colors.text }]}>
            {getDateRangeText()}
          </Text>
          <Ionicons name="calendar-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Activity Type Modal */}
      <Modal
        visible={showTypeModal}
        transparent
        onRequestClose={() => setShowTypeModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowTypeModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.categoryBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Activity Types</Text>
            {ACTIVITY_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.modalItem, { borderBottomColor: colors.border }]}
                onPress={() => toggleActivityType(type)}
              >
                <View style={styles.modalItemContent}>
                  <Ionicons 
                    name={getActivityIcon(type)} 
                    size={24} 
                    color={selectedTypes.includes(type) ? colors.selectedCategory : colors.text} 
                  />
                  <Text style={[
                    styles.modalItemText,
                    { color: selectedTypes.includes(type) ? colors.selectedCategory : colors.text }
                  ]}>
                    {getActivityLabel(type)}
                  </Text>
                </View>
                {selectedTypes.includes(type) && (
                  <Ionicons name="checkmark" size={24} color={colors.selectedCategory} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.selectedCategory }]}
              onPress={() => setShowTypeModal(false)}
            >
              <Text style={styles.modalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Range Modal */}
      <Modal
        visible={showDateModal}
        transparent
        onRequestClose={() => setShowDateModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowDateModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.categoryBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Date Range</Text>
            {dateRangeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.modalItem, { borderBottomColor: colors.border }]}
                onPress={() => handleDateRangeSelect(option.value)}
              >
                <Text style={[styles.modalItemText, { color: colors.text }]}>
                  {option.label}
                </Text>
                {selectedDateRange === option.value && (
                  <Ionicons name="checkmark" size={24} color={colors.selectedCategory} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );

  const renderCalendarModal = () => (
    <Modal
      visible={showCalendarModal}
      transparent
      onRequestClose={() => setShowCalendarModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setShowCalendarModal(false)}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.categoryBg }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Calendar</Text>
          {deviceCalendars.map((calendar) => (
            <TouchableOpacity
              key={calendar.id}
              style={[styles.modalItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setSelectedCalendar(calendar.id);
                setShowCalendarModal(false);
              }}
            >
              <Text style={[styles.modalItemText, { color: colors.text }]}>
                {calendar.title}
              </Text>
              {selectedCalendar === calendar.id && (
                <Ionicons name="checkmark" size={24} color={colors.selectedCategory} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderCalendarViewModal = () => (
    <Modal
      visible={showCalendarViewModal}
      transparent
      onRequestClose={() => setShowCalendarViewModal(false)}
    >
      <View style={[styles.calendarModalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.calendarModalHeader}>
          <Text style={[styles.modalTitle, { 
            color: colors.text, 
            textAlign: 'left',
            marginBottom: 0,
            fontSize: 18,
            flex: 1 
          }]}>
            Calendar
          </Text>
          <TouchableOpacity 
            onPress={() => setShowCalendarViewModal(false)}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <CalendarView
          activities={combinedActivities}
          onDayPress={(date) => {
            // Handle day press if needed
          }}
          onActivityPress={(activity) => {
            const contactData = {
              id: activity.contactId,
              name: activity.contactName,
              phoneNumbers: [],
              category: '',
              notes: ''
            };
            router.push({
              pathname: `/contact/${activity.contactId}`,
              params: { contact: JSON.stringify(contactData) }
            });
            setShowCalendarViewModal(false);
          }}
        />
      </View>
    </Modal>
  );

  const renderActionMenu = () => (
    <ActionMenuModal
      visible={showActionMenu}
      onClose={() => setShowActionMenu(false)}
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
      additionalOptions={[
        {
          icon: 'calendar',
          label: 'Export to Calendar',
          onPress: () => {
            if (actionActivity) {
              exportToCalendar(actionActivity);
            }
            setShowActionMenu(false);
          },
        },
        {
          icon: 'share-social',
          label: 'Share',
          onPress: () => {
            if (actionActivity) {
              handleShareActivity(actionActivity);
            }
            setShowActionMenu(false);
          },
        },
      ]}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {renderHeader()}
      {renderCalendarModal()}
      {renderCalendarViewModal()}
      
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        {filteredActivities.length === 0 ? (
          <EmptyState 
            icon="search"
            title={searchQuery ? "No Matching Activities" : "No Upcoming Activities"}
            message={searchQuery ? "Try adjusting your search or filters" : "Your upcoming activities will appear here"}
          />
        ) : (
          <SectionList
            contentContainerStyle={styles.listContent}
            sections={sections}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.text}
              />
            }
            renderSectionHeader={({ section: { title } }) => (
              <Text style={[styles.sectionHeader, { 
                color: colors.secondaryText, 
                backgroundColor: colors.background 
              }]}>
                {title}
              </Text>
            )}
            renderItem={renderItem}
            stickySectionHeadersEnabled={true}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {renderActionMenu()}

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
            await loadAllActivities();
            await syncWithCalendar(selectedActivity);
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
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewModeButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    padding: 16,
    paddingBottom: 8,
  },
  reminderItem: {
    padding: 16,
    borderRadius: 16,
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
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '500',
    opacity: 0.8,
  },
  notes: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    marginHorizontal: 0,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 20,
    gap: 8,
    marginHorizontal: -20,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    height: 44,
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalItemText: {
    fontSize: 17,
    fontWeight: '500',
  },
  modalButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  calendarModalContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 44,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 