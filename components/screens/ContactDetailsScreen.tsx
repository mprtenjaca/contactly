import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Linking,
  AppState,
  Dimensions,
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
  deleteActivity,
  getAllCategories,
  deleteContact
} from '../../services/DatabaseService';
import { getCurrentUser } from '../../services/AuthService';
import { registerForPushNotificationsAsync } from '../../services/NotificationService';
import { savePushToken } from '../../services/SupabaseService';
import { scheduleActivityNotification } from '../../services/NotificationService';
import { cancelScheduledNotificationsForActivity, scheduleNotificationsForActivity } from '../../services/NotificationService';
import { openInbox, openComposer } from 'react-native-email-link';
import Checkbox from 'expo-checkbox';

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
  email?: string;
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
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
    flex: 1,
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardView: {
    flex: 1,
  },
  modalInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
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
    marginTop: 8,
  },
  modalSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickLogSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1002,
  },
  quickLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  quickLogIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickLogTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  quickLogInput: {
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  quickLogButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  quickLogButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickLogButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  quickLogTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickLogSubtitle: {
    fontSize: 16,
    marginLeft: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  checkboxHint: {
    fontSize: 12,
    marginLeft: 32,
  },
  menuModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuModal: {
    borderRadius: 14,
    overflow: 'hidden',
    width: 200,
  },
  menuModalHeader: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuModalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 17,
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
  const [categories, setCategories] = useState<{ id: string; name: string; color: string; }[]>([]);
  const [overlayOpacity] = useState(new Animated.Value(0));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnimation = useRef(new Animated.Value(0)).current;
  const buttonAnimation = useRef(new Animated.Value(0)).current;
  const [lastAction, setLastAction] = useState<{
    type: ActivityType;
    timestamp: number;
  } | null>(null);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const appState = useRef(AppState.currentState);
  const actionTimeout = useRef<NodeJS.Timeout>();
  const [quickLogVisible, setQuickLogVisible] = useState(false);
  const [quickLogNotes, setQuickLogNotes] = useState('');
  const quickLogAnimation = useRef(new Animated.Value(0)).current;
  const [tempNotes, setTempNotes] = useState(notes);
  const [email, setEmail] = useState(contact?.email || '');
  const [tempEmail, setTempEmail] = useState(contact?.email || '');
  const [emailError, setEmailError] = useState('');
  const [updateDeviceContact, setUpdateDeviceContact] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  
  useEffect(() => {
    loadContactData();
    loadCategories();
  }, [contact]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('AppState changed:', { current: appState.current, next: nextAppState, lastAction, showQuickLog });
      
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App is going to background
        if (lastAction && (Date.now() - lastAction.timestamp) < 2000) {
          console.log('Setting timeout for quick log');
          // Clear any existing timeout
          if (actionTimeout.current) {
            clearTimeout(actionTimeout.current);
          }
          // Start timeout only if action was recent (within 2 seconds)
          actionTimeout.current = setTimeout(() => {
            console.log('Timeout completed, setting showQuickLog');
            setShowQuickLog(true);
          }, 2000); // Wait 2 seconds before enabling quick log
        }
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App is coming to foreground
        console.log('App coming to foreground, showQuickLog:', showQuickLog);
        if (showQuickLog && lastAction) {
          // Small delay to ensure the app is fully active
          setTimeout(() => {
            handleQuickLog();
          }, 200);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      if (actionTimeout.current) {
        clearTimeout(actionTimeout.current);
      }
    };
  }, [lastAction, showQuickLog]);

  useEffect(() => {
    setTempNotes(notes);
  }, [notes]);

  useEffect(() => {
    const changes = 
      name !== contact.name || 
      phoneNumber !== contact.phoneNumbers?.[0]?.number || 
      category !== contact.category || 
      tempNotes !== contact.notes ||
      email !== contact.email ||
      tempEmail !== contact.email;

    setHasChanges(changes);
  }, [name, phoneNumber, category, tempNotes, email, tempEmail]);

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
        setEmail(contactDetails.email || '');
        setTempEmail(contactDetails.email || '');

        // Load activities and ensure they have the current contact name
        const loadedActivities = await getActivitiesForContact(contact.id, user.id);
        const updatedActivities = loadedActivities.map(activity => ({
          ...activity,
          contactName: contactDetails.name
        }));
        setActivities(updatedActivities);
      }
    } catch (error) {
      console.error('Error loading contact data:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const dbCategories = await getAllCategories(user.id);
      setCategories(dbCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSave2 = async () => {
    if (isSaving) return;
    setSaving(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error('No authenticated user');
        return;
      }

      // Save all contact info in one operation
      const contactToUpdate = {
        id: contact.id,
        name,
        phoneNumbers: [{ number: phoneNumber }],
        category,
        notes,
        email,
      };

      await saveContact(contactToUpdate, user.id);

      // If name has changed, update all activities for this contact
      if (name !== contact.name) {
        const updatedActivities = activities.map(activity => ({
          ...activity,
          contactName: name
        }));

        // Update each activity in the database
        await Promise.all(
          updatedActivities.map(activity => saveActivity(activity, user.id))
        );

        setActivities(updatedActivities);
      }

      // router.back();
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to update contact');
    } finally {
      setSaving(false);
    }
  };

  const validateEmail = (email: string) => {
    if (!email) return true; // Empty email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text: string) => {
    setTempEmail(text);
    if (text && !validateEmail(text)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    
    // Validate email before saving
    if (tempEmail && !validateEmail(tempEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setSaving(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error('No authenticated user');
        return;
      }

      // Update device contact if checkbox is checked
      if (updateDeviceContact) {
        try {
          await updateDeviceContactName(contact.id, name);
        } catch (error) {
          Alert.alert(
            'Warning',
            'Failed to update device contact, but will continue updating in app.',
            [{ text: 'OK' }]
          );
        }
      }

      const updatedContact = {
        ...contact,
        name: name.trim(),
        phoneNumbers: phoneNumber.trim() ? [{ number: phoneNumber.trim() }] : [],
        email: tempEmail.trim(),
        notes: notes,
        category: category.trim(),
        userId: user.id,
      };

      await saveContact(updatedContact, user.id);
      
      setName(name);
      setPhoneNumber(phoneNumber);
      setEmail(tempEmail);
      setShowEditModal(false);

      // If name has changed, update all activities for this contact
      if (name !== contact.name) {
        const updatedActivities = activities.map(activity => ({
          ...activity,
          contactName: name
        }));

        await Promise.all(
          updatedActivities.map(activity => saveActivity(activity, user.id))
        );

        setActivities(updatedActivities);
      }

    } catch (error) {
      console.error('Error updating contact:', error);
      Alert.alert('Error', 'Failed to update contact');
    } finally {
      setSaving(false);
      setUpdateDeviceContact(false); // Reset checkbox state
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

  const handleSaveActivity = async (type: ActivityType, date: Date, notes: string = '') => {
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

  const handleUpdateNotesOnBlur = async () => {
    if (tempNotes !== notes) {
      try {
        const user = await getCurrentUser();
        if (!user) return;

        await updateContactNotes(contact.id, tempNotes, user.id);
        setNotes(tempNotes);
      } catch (error) {
        console.error('Error updating notes:', error);
        Alert.alert('Error', 'Failed to update notes');
        setTempNotes(notes); // Reset to original notes if update fails
      }
    }
  };

  const sections: Section[] = [
    {
      type: 'info',
      data: [{
        name,
        phoneNumber,
        email,
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
                {email && (
                  <Text style={[styles.phoneNumber, { color: colors.secondaryText }]}>
                    {email}
                  </Text>
                )}
              </View>
              <TouchableOpacity 
                onPress={() => setShowMenuModal(true)}
                style={styles.editButton}
              >
                <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
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
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    { 
                      backgroundColor: cat.name === category ? cat.color : colors.categoryBg,
                      borderColor: cat.color 
                    }
                  ]}
                  onPress={() => {
                    handleUpdateCategory(cat.name)
                  }}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { color: cat.name === category ? '#fff' : cat.color }
                  ]}>
                    {cat.name}
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
              value={tempNotes}
              onChangeText={setTempNotes}
              onBlur={handleUpdateNotesOnBlur}
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

  // Move FAB styles inside component to access colors
  const dynamicStyles = StyleSheet.create({
    menuContainer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 999,
      pointerEvents: 'box-none',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
      opacity: 0,
    },
    quickLogOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    fab: {
      position: 'absolute',
      bottom: 44,
      right: 24,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.selectedCategory,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      zIndex: 1001,
    },
    actionButton: {
      position: 'absolute',
      bottom: 64,
      right: 24,
      width: 64,
      height: 64,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionButtonInner: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.selectedCategory,
    },
    labelContainer: {
      position: 'absolute',
      right: 72,
      minWidth: 120,
      height: 56,
      justifyContent: 'center',
      paddingHorizontal: 5,
    },
    labelText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'right',
    },
  });

  const handleQuickLog = () => {
    if (!lastAction) return;
    setQuickLogVisible(true);
    setQuickLogNotes('');
  };

  const hideQuickLog = () => {
    console.log('hideQuickLog');
    setQuickLogVisible(false);
    setShowQuickLog(false);
    setLastAction(null);
  };

  const saveQuickLog = async () => {
    if (!lastAction) return;

    const activityToSave: Activity = {
      id: `activity_${Date.now()}`,
      type: lastAction.type,
      date: new Date(),
      contactId: contact.id,
      contactName: contact.name,
      notes: quickLogNotes || ''
    };

    await handleSaveActivity(activityToSave.type, activityToSave.date, activityToSave.notes);
    hideQuickLog();
  };

  const handleAction = async (type: ActivityType, action: () => Promise<void>) => {
    try {
      setLastAction({ type, timestamp: Date.now() });
      setShowQuickLog(false); // Reset quick log state
      await action();
      toggleMenu();
    } catch (error) {
      console.error('Action failed:', error);
      setLastAction(null);
      setShowQuickLog(false);
    }
  };

  const handleCall = async () => {
    const phoneUrl = `tel:${phoneNumber.replace(/\s+/g, '')}`;
    await handleAction('call', () => Linking.openURL(phoneUrl));
  };

  const handleEmail = async () => {
    try {
      if (!contact.email) {
        Alert.alert('Error', 'No email address available');
        return;
      }
      await handleAction('email', async () => {
        const url = `mailto:${contact.email}`;
        const canOpen = await Linking.canOpenURL(url);
        
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${contact.email}`;
          await Linking.openURL(gmailUrl);
        }
      });
    } catch (error) {
      Alert.alert(
        'Email Error', 
        'No email app found. Please install Gmail.',
        [
          { text: 'OK' },
          { 
            text: 'Install Gmail', 
            onPress: () => {
              Linking.openURL('market://details?id=com.google.android.gm');
            }
          }
        ]
      );
    }
  };

  const handleWhatsApp = async () => {
    try {
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${cleanNumber}`;
      await handleAction('whatsapp', () => Linking.openURL(whatsappUrl));
    } catch (error) {
      Alert.alert('Error', 'Failed to open WhatsApp');
    }
  };

  const handleMessage = async () => {
    const smsUrl = `sms:${phoneNumber.replace(/\s+/g, '')}`;
    await handleAction('message', () => Linking.openURL(smsUrl));
  };

  const actionItems = [
    { 
      icon: 'call' as const, 
      color: colors.selectedCategory, 
      label: 'Call', 
      onPress: handleCall 
    },
    { 
      icon: 'mail' as const, 
      color: colors.selectedCategory, 
      label: 'Email', 
      onPress: handleEmail 
    },
    { 
      icon: 'logo-whatsapp' as const, 
      color: colors.selectedCategory, 
      label: 'WhatsApp', 
      onPress: handleWhatsApp 
    },
    { 
      icon: 'chatbubble' as const, 
      color: colors.selectedCategory, 
      label: 'Message', 
      onPress: handleMessage 
    },
  ];

  const getActionStyle = (index: number) => {
    const translateY = menuAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -60 * (index + 1)],
    });

    const scale = menuAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const opacity = menuAnimation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0, 1],
    });

    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  };

  const rotation = buttonAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const overlayAnimation = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isMenuOpen ? 0 : 1;
    
    Animated.parallel([
      Animated.spring(menuAnimation, {
        toValue,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(buttonAnimation, {
        toValue,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnimation, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setIsMenuOpen(!isMenuOpen);
  };

  const updateDeviceContactName = async (contactId: string, newName: string) => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your contacts to update them.');
        return;
      }

      const contact = await Contacts.getContactByIdAsync(contactId);
      if (!contact) {
        throw new Error('Contact not found on device');
      }

      // Split the name into first and last name
      const nameParts = newName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      const contactToUpdate = {
        [Contacts.Fields.ID]: contactId,
        [Contacts.Fields.FirstName]: firstName,
        [Contacts.Fields.LastName]: lastName,
        [Contacts.Fields.Name]: newName,
      };

      await Contacts.updateContactAsync(contactToUpdate as any);
    } catch (error) {
      console.error('Error updating device contact:', error);
      throw error;
    }
  };

  const handleDeleteContact = async () => {
    if (!contact?.id) {
      console.error('Contact ID is missing');
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Check if contact exists in device contacts
      const { status } = await Contacts.requestPermissionsAsync();
      let deviceContactExists = false;
      if (status === 'granted') {
        try {
          const deviceContact = await Contacts.getContactByIdAsync(contact.id);
          deviceContactExists = !!deviceContact;
        } catch (error) {
          console.error('Error checking device contact:', error);
        }
      }

      // Show appropriate alert based on whether contact exists in device
      if (deviceContactExists) {
        Alert.alert(
          "Delete Contact",
          "Do you want to delete this contact from your device contacts as well?",
          [
            {
              text: "Cancel",
              style: "cancel"
            },
            {
              text: "App Only",
              style: "destructive",
              onPress: async () => {
                try {
                  await deleteContact(contact.id, user.id);
                  router.back();
                } catch (error) {
                  console.error('Error deleting contact:', error);
                  Alert.alert('Error', 'Failed to delete contact');
                }
              }
            },
            {
              text: "Both",
              style: "destructive",
              onPress: async () => {
                try {
                  // Delete from device contacts
                  const deviceContact = await Contacts.getContactByIdAsync(contact.id);
                  if (deviceContact?.id) {
                    await Contacts.removeContactAsync(deviceContact.id);
                  }
                  
                  // Delete from app database
                  await deleteContact(contact.id, user.id);
                  router.back();
                } catch (error) {
                  console.error('Error deleting contact:', error);
                  Alert.alert('Error', 'Failed to delete contact');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert(
          "Delete Contact",
          "Are you sure you want to delete this contact?",
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
                  await deleteContact(contact.id, user.id);
                  router.back();
                } catch (error) {
                  console.error('Error deleting contact:', error);
                  Alert.alert('Error', 'Failed to delete contact');
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking contact:', error);
      Alert.alert('Error', 'Failed to check contact status');
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
      </View>

      <SectionList
        sections={sections}
        renderItem={renderItem}
        keyExtractor={(item, index) => String(index)}
        renderSectionHeader={() => null}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <Modal
        visible={showEditModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalInner}>
                <View style={[styles.modalContent, { 
                  backgroundColor: colors.background,
                }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Contact</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        setTempEmail(email);
                        setEmailError('');
                        setShowEditModal(false);
                      }}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView 
                    style={styles.modalBody}
                    keyboardShouldPersistTaps="always"
                  >
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

                    <View style={styles.inputContainer}>
                      <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>Email</Text>
                      <TextInput
                        style={[
                          styles.modalInput, 
                          { 
                            backgroundColor: colors.searchBar, 
                            color: colors.text,
                            borderColor: emailError ? '#ff6b6b' : colors.searchBar,
                            borderWidth: emailError ? 1 : 0
                          }
                        ]}
                        value={tempEmail}
                        onChangeText={handleEmailChange}
                        placeholder="Email"
                        placeholderTextColor={colors.secondaryText}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {emailError ? (
                        <Text style={{ 
                          color: '#ff6b6b', 
                          fontSize: 12, 
                          marginTop: 4,
                          marginLeft: 4 
                        }}>
                          {emailError}
                        </Text>
                      ) : null}
                    </View>

                    <View style={[styles.inputContainer, { marginTop: 16 }]}>
                      <View style={styles.checkboxContainer}>
                        <Checkbox
                          value={updateDeviceContact}
                          onValueChange={setUpdateDeviceContact}
                          color={updateDeviceContact ? colors.selectedCategory : undefined}
                        />
                        <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                          Also update in device contacts
                        </Text>
                      </View>
                      <Text style={[styles.checkboxHint, { color: colors.secondaryText }]}>
                        This will update the contact's name in your phone's contacts app
                      </Text>
                    </View>
                  </ScrollView>

                  <TouchableOpacity
                    style={[
                      styles.modalSaveButton, 
                      { 
                        backgroundColor: colors.selectedCategory,
                        opacity: emailError ? 0.5 : 1 
                      }
                    ]}
                    onPress={async () => {
                      await handleSave();
                      setShowEditModal(false);
                    }}
                    disabled={!!emailError}
                  >
                    <Text style={[
                      styles.modalSaveButtonText,
                      { opacity: emailError ? 0.7 : 1 }
                    ]}>
                      {emailError ? 'Invalid Email' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
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

      <View style={dynamicStyles.menuContainer} pointerEvents={isMenuOpen ? "auto" : "none"}>
        <Animated.View 
          style={[
            dynamicStyles.overlay,
            { opacity: overlayAnimation }
          ]} 
        />
        <TouchableWithoutFeedback onPress={toggleMenu}>
          <View style={StyleSheet.absoluteFill}>
            {actionItems.map((item, index) => (
              <Animated.View
                key={item.icon}
                style={[
                  dynamicStyles.actionButton,
                  getActionStyle(index),
                ]}
              >
                <TouchableOpacity
                  style={[dynamicStyles.actionButtonInner]}
                  onPress={() => {
                    item.onPress();
                    toggleMenu();
                  }}
                >
                  <Ionicons name={item.icon} size={28} color="white" />
                </TouchableOpacity>
                <View style={dynamicStyles.labelContainer}>
                  <Text style={dynamicStyles.labelText}>{item.label}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </TouchableWithoutFeedback>
      </View>

      <TouchableOpacity
        style={dynamicStyles.fab}
        onPress={toggleMenu}
      >
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="add" size={36} color="white" />
        </Animated.View>
      </TouchableOpacity>

      {quickLogVisible && (
        <>
          <View
            style={[
              dynamicStyles.quickLogOverlay,
              { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1002 }
            ]}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={[StyleSheet.absoluteFill, { zIndex: 1002 }]}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          >
            <TouchableWithoutFeedback onPress={hideQuickLog}>
              <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                  <View
                    style={[
                      styles.quickLogSheet,
                      {
                        backgroundColor: colors.background,
                      }
                    ]}
                  >
                    <View style={[styles.quickLogHeader, { marginBottom: 16 }]}>
                      <Text style={[styles.quickLogTitle, { 
                        color: colors.text,
                        fontSize: 20,
                        fontWeight: '600',
                      }]}>
                        Save Activity?
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity 
                          onPress={() => {
                            hideQuickLog();
                            setShowActivityModal(true);
                          }}
                          style={{ marginRight: 16 }}
                        >
                          <Ionicons name="pencil" size={20} color={colors.selectedCategory} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={hideQuickLog}>
                          <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={[styles.quickLogTypeContainer, { marginBottom: 16 }]}>
                      <View style={[styles.quickLogIcon, { backgroundColor: colors.selectedCategory }]}>
                        <Ionicons 
                          name={
                            lastAction?.type === 'call' ? 'call' :
                            lastAction?.type === 'message' ? 'chatbubble' :
                            lastAction?.type === 'email' ? 'mail' :
                            lastAction?.type === 'whatsapp' ? 'logo-whatsapp' : 'document-text'
                          } 
                          size={24} 
                          color="white" 
                        />
                      </View>
                      <Text style={[styles.quickLogSubtitle, { color: colors.secondaryText }]}>
                        {lastAction?.type ? `${lastAction.type.charAt(0).toUpperCase()}${lastAction.type.slice(1)} with ${contact.name}` : ''}
                      </Text>
                    </View>
                    
                    <TextInput
                      style={[
                        styles.quickLogInput,
                        { 
                          backgroundColor: colors.searchBar,
                          color: colors.text,
                          height: 80,
                        }
                      ]}
                      value={quickLogNotes}
                      onChangeText={setQuickLogNotes}
                      placeholder="Add notes about this interaction..."
                      placeholderTextColor={colors.secondaryText}
                      multiline
                    />

                    <View style={styles.quickLogButtons}>
                      <TouchableOpacity
                        style={[styles.quickLogButton, { backgroundColor: colors.searchBar }]}
                        onPress={hideQuickLog}
                      >
                        <Text style={[styles.quickLogButtonText, { color: colors.text }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.quickLogButton, { backgroundColor: colors.selectedCategory }]}
                        onPress={saveQuickLog}
                      >
                        <Text style={[styles.quickLogButtonText, { color: 'white' }]}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </>
      )}

      <Modal
        visible={showMenuModal}
        transparent
        onRequestClose={() => setShowMenuModal(false)}
      >
        <TouchableOpacity 
          style={[styles.menuModalOverlay]}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={[styles.menuModal, { 
            backgroundColor: colors.background,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }]}>
            <View style={[styles.menuModalHeader, { borderBottomColor: colors.separator }]}>
              <Text style={[styles.menuModalTitle, { color: colors.text }]}>Contact Options</Text>
            </View>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenuModal(false);
                setShowEditModal(true);
              }}
            >
              <Ionicons name="pencil" size={20} color={colors.text} style={styles.menuIcon} />
              <Text style={[styles.menuText, { color: colors.text }]}>Edit Contact</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}
              onPress={() => {
                setShowMenuModal(false);
                handleDeleteContact();
              }}
            >
              <Ionicons name="trash" size={20} color="#FF3B30" style={styles.menuIcon} />
              <Text style={[styles.menuText, { color: "#FF3B30" }]}>Delete Contact</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
} 