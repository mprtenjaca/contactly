import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ScrollView,
  SectionList,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import ActivityModal from '../ActivityModal';
import ActivityTimeline from '../ActivityTimeline';
import { scheduleReminderNotification } from '../../services/NotificationService';
import { ActivityType } from '../ActivityModal';
import { 
  saveContact, 
  saveActivity, 
  getActivitiesForContact, 
  getContact,
  updateContactCategory, 
  updateContactNotes,
  deleteActivity
} from '../../services/DatabaseService';
import { getCurrentUser } from '../../services/AuthService';
import { registerForPushNotificationsAsync } from '../../services/NotificationService';
import { savePushToken } from '../../services/SupabaseService';
import { scheduleActivityNotification } from '../../services/NotificationService';
import { cancelScheduledNotificationsForActivity, scheduleNotificationsForActivity } from '../../services/NotificationService';

interface Activity {
  id: string;
  type: ActivityType;
  date: Date;
  notes?: string;
  contactId: string;
  contactName: string;
}

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: Array<{ number: string; }>;
  category?: string;
  notes?: string;
}

type Section = {
  type: 'info' | 'category' | 'notes' | 'timeline';
  data: any[];
};

// Move static styles outside the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    padding: 8,
    paddingHorizontal: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoContent: {
    flex: 1,
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
  section: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timelineSection: {
    height: 600,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  contactName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 16,
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  modalBody: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  modalInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  modalSaveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function ContactDetailsScreen({ contact }: { contact: Contact }) {
  const router = useRouter();
  const { colors } = useTheme();
  const [name, setName] = useState(contact.name);
  const [phoneNumber, setPhoneNumber] = useState(
    contact.phoneNumbers?.[0]?.number || ''
  );
  const [category, setCategory] = useState(contact.category || '');
  const [notes, setNotes] = useState(contact.notes || '');
  const [isSaving, setSaving] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | undefined>();
  
  const categories = ["Clients", "Family", "Work", "Friends"];

  useEffect(() => {
    loadContactData();
  }, [contact]);

  useEffect(() => {
    const changes = 
      name !== contact.name || 
      phoneNumber !== contact.phoneNumbers?.[0]?.number || 
      category !== contact.category || 
      notes !== contact.notes;

    setHasChanges(changes);
  }, [name, phoneNumber, category, notes]);

  const loadContactData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error('No authenticated user');
        return;
      }

      if (!contact?.id) {
        console.warn('Contact is missing an ID');
        return;
      }

      // Load contact details
      const contactDetails = await getContact(contact.id, user.id);
      if (contactDetails) {
        setName(contactDetails.name);
        setPhoneNumber(contactDetails.phoneNumbers?.[0]?.number || '');
        setCategory(contactDetails.category || '');
        setNotes(contactDetails.notes || '');
      }

      // Load activities
      const activities = await getActivitiesForContact(contact.id, user.id);
      setActivities(activities);
    } catch (error) {
      console.error('Error loading contact data:', error);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setSaving(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error('No authenticated user');
        return;
      }

      console.log('Saving contact:', {
        id: contact.id,
        name,
        phoneNumber,
        category,
        notes,
        userId: user.id
      });

      // Save all contact info in one operation
      const contactToUpdate = {
        id: contact.id,
        name,
        phoneNumbers: [{ number: phoneNumber }],
        category,
        notes,
      };

      await saveContact(contactToUpdate, user.id);
      console.log('Contact saved successfully');

      router.back();
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowActivityModal(true);
  };

  const handleDeleteActivity = async () => {
    if (!selectedActivity) return;
    
    Alert.alert(
      "Delete Activity",
      "Are you sure you want to delete this activity?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const user = await getCurrentUser();
              if (!user) return;

              await deleteActivity(selectedActivity.id, user.id);
              
              setActivities(activities.filter(activity => activity.id !== selectedActivity.id));
              setShowActivityModal(false);
              setSelectedActivity(undefined);
            } catch (error) {
              console.error('Error deleting activity:', error);
              Alert.alert('Error', 'Failed to delete activity');
            }
          }
        }
      ]
    );
  };

  const handleSaveActivity = async (type: ActivityType, date: Date, notes: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      if (!contact) return;

      let activityToSave: Activity;

      if (selectedActivity) {
        // Updating existing activity
        activityToSave = {
          ...selectedActivity,
          type,
          date,
          notes,
          contactId: contact.id,
          contactName: contact.name
        };

        // Only handle notifications if the date has changed
        if (selectedActivity.date.getTime() !== date.getTime()) {
          // Cancel existing notifications if the new date is in the past
          // or if the date has changed
          await cancelScheduledNotificationsForActivity(selectedActivity.id);
          
          // Schedule new notifications only if the new date is in the future
          if (date > new Date()) {
            await scheduleNotificationsForActivity(activityToSave);
          }
        }
      } else {
        // Creating new activity
        activityToSave = {
          id: `activity_${Date.now()}`,
          type,
          date,
          notes,
          contactId: contact.id,
          contactName: contact.name
        };

        // Schedule notifications only for future activities
        if (date > new Date()) {
          await scheduleNotificationsForActivity(activityToSave);
        }
      }

      // Save activity to database
      await saveActivity(activityToSave, user.id);

      // Update activities list
      const updatedActivities = selectedActivity 
        ? activities.map(a => a.id === selectedActivity.id ? activityToSave : a)
        : [...activities, activityToSave];
      
      setActivities(updatedActivities);
      setSelectedActivity(undefined);
      setShowActivityModal(false);

    } catch (error) {
      console.error('Error saving activity:', error);
      Alert.alert('Error', 'Failed to save activity');
    }
  };

  const handleUpdateCategory = async (newCategory: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      await updateContactCategory(contact.id, newCategory, user.id);
      setCategory(newCategory);
    } catch (error) {
      console.error('Error updating category:', error);
      Alert.alert('Error', 'Failed to update category');
    }
  };


  const handleUpdateNotes = async (newNotes: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      await updateContactNotes(contact.id, newNotes, user.id);
      setNotes(newNotes);
    } catch (error) {
      console.error('Error updating notes:', error);
      Alert.alert('Error', 'Failed to update notes');
    }
  };

  const sections: Section[] = [
    {
      type: 'info',
      data: [{
        name,
        phoneNumber,
        onEdit: () => setShowEditModal(true)
      }]
    },
    { type: 'category', data: [null] },
    { type: 'notes', data: [null] },
    { type: 'timeline', data: [null] },
  ];

  const renderItem = ({ item, section }: { item: any; section: Section }) => {
    switch (section.type) {
      case 'info':
        return (
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <View style={styles.infoContent}>
                <Text style={[styles.contactName, { color: colors.text }]}>{name}</Text>
                <Text style={[styles.phoneNumber, { color: colors.secondaryText }]}>
                  {phoneNumber}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowEditModal(true)}
                style={styles.editButton}
              >
                <Ionicons name="pencil" size={20} color={colors.selectedCategory} />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'category':
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category</Text>
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    { 
                      backgroundColor: cat === category ? colors.selectedCategory : colors.categoryBg,
                      borderColor: colors.categoryBorder 
                    }
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { color: cat === category ? '#fff' : colors.text }
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'notes':
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[
                styles.input,
                styles.notesInput,
                { 
                  backgroundColor: colors.categoryBg,
                  color: colors.text 
                }
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
              placeholderTextColor={colors.secondaryText}
              multiline
            />
          </View>
        );

      case 'timeline':
        return (
          <View style={styles.timelineSection}>
            <ActivityTimeline
              activities={activities}
              onAddActivity={() => {
                setSelectedActivity(undefined);
                setShowActivityModal(true);
              }}
              onEditActivity={handleEditActivity}
              isEmbedded={true}
            />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { 
        backgroundColor: colors.background,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.separator,
      }]}>
        <TouchableOpacity 
          onPress={() => {
            if (hasChanges) {
              Alert.alert(
                "Unsaved Changes",
                "You have unsaved changes. Are you sure you want to go back?",
                [
                  {
                    text: "Stay",
                    style: "cancel"
                  },
                  {
                    text: "Discard",
                    style: "destructive",
                    onPress: () => router.back()
                  }
                ]
              );
            } else {
              router.back();
            }
          }} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Contact Details</Text>
        <TouchableOpacity 
          style={[styles.saveButton, hasChanges && { backgroundColor: colors.selectedCategory, borderRadius: 8 }]}
          onPress={handleSave}
          disabled={isSaving || !hasChanges}
        >
          <Text style={[
            styles.saveButtonText, 
            { 
              color: hasChanges ? '#fff' : colors.selectedCategory,
              opacity: isSaving ? 0.5 : 1 
            }
          ]}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        renderItem={renderItem}
        keyExtractor={(item, index) => String(index)}
        renderSectionHeader={() => null}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Contact</Text>
              <TouchableOpacity 
                onPress={() => setShowEditModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>Name</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.searchBar, color: colors.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Name"
                  placeholderTextColor={colors.secondaryText}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>Phone Number</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.searchBar, color: colors.text }]}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Phone Number"
                  placeholderTextColor={colors.secondaryText}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalSaveButton, { backgroundColor: colors.selectedCategory }]}
              onPress={async () => {
                await handleSave();
                setShowEditModal(false);
              }}
            >
              <Text style={styles.modalSaveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ActivityModal
        visible={showActivityModal}
        onClose={() => {
          setShowActivityModal(false);
          setSelectedActivity(undefined);
        }}
        onSave={handleSaveActivity}
        onDelete={selectedActivity ? handleDeleteActivity : undefined}
        activity={selectedActivity}
      />
    </SafeAreaView>
  );
} 