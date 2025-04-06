import React, { useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Alert, Vibration, Platform, TextInput, ScrollView, Modal, SafeAreaView } from 'react-native'; 
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityType } from '../../components/ActivityModal';
import { getPastActivities, deleteActivity } from '../../services/DatabaseService';
import { getCurrentUser } from '../../services/AuthService';
import EmptyState from '../../components/EmptyState';
import ActivityModal from '../../components/ActivityModal';
import { handleSaveActivity } from '../../services/ActivityService';
import { Activity } from '../../services/ActivityService';
import ActionMenuModal from '../../components/ActionMenuModal';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import * as Haptics from 'expo-haptics';

const ACTIVITY_TYPES: ActivityType[] = [
  'call',
  'message',
  'meeting',
  'note',
  'email',
  'whatsapp'
];

export default function RecentsTab() {
  const { colors } = useTheme();
  const router = useRouter();
  const [pastActivities, setPastActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [actionActivity, setActionActivity] = useState<Activity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>([]);
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({
    start: null,
    end: null
  });
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  const dateRangeOptions = [
    { label: 'All Time', value: 'all' },
    { label: 'Last 7 Days', value: '7days' },
    { label: 'Last 30 Days', value: '30days' },
    { label: 'Last 3 Months', value: '3months' },
  ];

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
      case 'email': return 'mail';
      case 'whatsapp': return 'logo-whatsapp';
    }
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

  // Filter activities based on search, type, and date range
  const filteredActivities = React.useMemo(() => {
    return pastActivities.filter(activity => {
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
  }, [pastActivities, searchQuery, selectedTypes, dateRange]);

  // Group filtered activities
  const groupedActivities = filteredActivities.reduce((acc: { [key: string]: Activity[] }, activity) => {
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
      await loadPastActivities();
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
      today.setHours(23, 59, 59, 999);
      const end = new Date(today);
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);

      switch (value) {
        case '7days':
          start.setDate(start.getDate() - 7);
          break;
        case '30days':
          start.setDate(start.getDate() - 30);
          break;
        case '3months':
          start.setMonth(start.getMonth() - 3);
          break;
      }
      
      setDateRange({ start, end });
    }
    setShowDateModal(false);
  };

  const getDateRangeText = () => {
    switch (selectedDateRange) {
      case 'all': return 'All Time';
      case '7days': return 'Last 7 Days';
      case '30days': return 'Last 30 Days';
      case '3months': return 'Last 3 Months';
      default: return 'All Time';
    }
  };

  const renderItem = ({ item }: { item: Activity }) => (
    <TouchableOpacity 
      style={[
        styles.activityItem, 
        { 
          backgroundColor: colors.categoryBg,
          borderLeftWidth: 3,
          borderLeftColor: '#FF3B30',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            android: {
              elevation: 3,
            },
          }),
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
      onLongPress={() => handleActionMenu(item)}
    >
      <View style={styles.activityContent}>
        {/* Icon Column */}
        <View style={styles.iconContainer}>
          <View style={[
            styles.iconCircle,
            { 
              backgroundColor: '#FF3B3015',
              borderWidth: 1,
              borderColor: '#FF3B3030'
            }
          ]}>
            <Ionicons 
              name={getActivityIcon(item.type)} 
              size={24} 
              color="#FF3B30"
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
                color: '#FF3B30',
                opacity: 0.9
              }
            ]}>
              {getActivityLabel(item.type)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.dateText, { color: colors.secondaryText, marginRight: 8 }]}>
                {formatDate(new Date(item.date))}
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Recent</Text>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.categoryBg }]}>
          <Ionicons name="search" size={20} color={colors.secondaryText} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search recent activities..."
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
                      color={selectedTypes.includes(type) ? '#FF3B30' : colors.text} 
                    />
                    <Text style={[
                      styles.modalItemText,
                      { color: selectedTypes.includes(type) ? '#FF3B30' : colors.text }
                    ]}>
                      {getActivityLabel(type)}
                    </Text>
                  </View>
                  {selectedTypes.includes(type) && (
                    <Ionicons name="checkmark" size={24} color="#FF3B30" />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#FF3B30' }]}
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
                    <Ionicons name="checkmark" size={24} color="#FF3B30" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>

      <View style={[styles.content, { backgroundColor: colors.background }]}>
        {filteredActivities.length === 0 ? (
          <EmptyState 
            icon="search"
            title={searchQuery ? "No Matching Activities" : "No Recent Activities"}
            message={searchQuery ? "Try adjusting your search or filters" : "Your recent activities with contacts will appear here"}
          />
        ) : (
          <SectionList
            contentContainerStyle={styles.listContent}
            sections={sections}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
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
            await loadPastActivities();
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
    paddingTop: Platform.select({ ios: 12, android: 50 }),
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
  activityItem: {
    padding: 16,
    borderRadius: 16,
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
}); 