import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Switch,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentUser, signOut } from '../../services/AuthService';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/AuthService';
import { offlineManager } from '../../services/OfflineManager';
import EditProfileModal from '../EditProfileModal';
import { 
  getLocalUser, 
  saveUserToLocal, 
  getAllContacts, 
  importContacts, 
  Contact, 
  getFutureActivities,
  getPastActivities,
  saveContact,
  saveActivity
} from '../../services/DatabaseService';
import * as SecureStore from 'expo-secure-store';
import * as Contacts from 'expo-contacts';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Activity } from '@/services/ActivityService';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import { format } from 'date-fns';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

export default function ProfileScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [activityStats, setActivityStats] = useState<{
    total: number;
    byType: { [key: string]: number };
    byMonth: { [key: string]: number };
  }>({ total: 0, byType: {}, byMonth: {} });
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [isArchiveModalVisible, setIsArchiveModalVisible] = useState(false);
  const [archivedActivities, setArchivedActivities] = useState<Activity[]>([]);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'in_progress' | 'completed' | 'failed'>('idle');
  const [showBackupHistoryModal, setShowBackupHistoryModal] = useState(false);
  const [backupHistory, setBackupHistory] = useState<any[]>([]);

  useEffect(() => {
    loadUserProfile();
    loadLastBackupDate();
    const unsubscribe = offlineManager.addConnectivityListener(setIsOnline);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const loadLastBackupDate = async () => {
    try {
      const date = await SecureStore.getItemAsync('lastBackupDate');
      if (date) {
        setLastBackupDate(date);
      }
    } catch (error) {
      console.error('Error loading last backup date:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      // First try to get from local storage
      const currentUser = await getCurrentUser();

      if (currentUser?.id) {
        // Always set user from local storage first
        setUser(currentUser);

        // Then fetch latest from Supabase if online
        if (offlineManager.getIsOnline()) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
            return;
          }

          if (profileData) {
            const updatedUser = {
              id: currentUser.id,
              email: currentUser.email,
              firstName: profileData.first_name || currentUser.firstName,
              lastName: profileData.last_name || currentUser.lastName,
            };
            setUser(updatedUser);
            // Update local storage with latest data
            await saveUserToLocal(updatedUser);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    console.log('Handling logout...');

    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [

        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('Signing out...');
              await signOut();
              
              router.replace('/sign-in');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const handleUpdateProfile = async (firstName: string, lastName: string) => {
    try {
      console.log('Starting profile update...', { firstName, lastName });
      
      const currentUser = await getCurrentUser();
      if (!currentUser?.id) {
        throw new Error('No authenticated user found');
      }

      const updatedUser = {
        id: currentUser.id,
        email: currentUser.email,
        firstName,
        lastName,
      };

      if (offlineManager.getIsOnline()) {
        console.log('Online mode - updating Supabase...');

        // Update auth metadata
        const { error: authError } = await supabase.auth.updateUser({
          data: { 
            first_name: firstName,
            last_name: lastName,
          }
        });

        if (authError) {
          console.error('Auth update error:', authError);
          throw authError;
        }

        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: currentUser.id,
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('Profile update error:', profileError);
          throw profileError;
        }

        console.log('Supabase update successful');
      } else {
        console.log('Offline mode - queueing update...');
        await offlineManager.addPendingSync('UPDATE_PROFILE', {
          userId: currentUser.id,
          firstName,
          lastName,
        });
        console.log('Update queued for sync');
      }

      // Update local state
      console.log('Updating local state...', updatedUser);
      setUser(updatedUser);

      // Update local storage
      await saveUserToLocal(updatedUser);
      console.log('Local storage updated');

      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully');

    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleSyncContacts = async () => {
    Alert.alert(
      "Sync Contacts",
      "Would you like to sync your device contacts with the app? This will import any new contacts from your device.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sync",
          style: "default",
          onPress: async () => {
            try {
              const user = await getCurrentUser();
              if (!user) {
                console.error('No authenticated user');
                return;
              }

              const { status } = await Contacts.requestPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(
                  "Permission Required",
                  "Please allow access to your contacts to sync them."
                );
                return;
              }

              // Get existing contacts from database
              const existingContacts = await getAllContacts(user.id);
              const existingContactIds = new Set(existingContacts.map(c => c.id));

              // Get device contacts
              const { data } = await Contacts.getContactsAsync({
                fields: [
                  Contacts.Fields.ID,
                  Contacts.Fields.Name,
                  Contacts.Fields.PhoneNumbers,
                  Contacts.Fields.FirstName,
                  Contacts.Fields.LastName,
                  Contacts.Fields.Emails
                ],
              });

              // Filter new contacts
              const newContacts = data
                .filter(contact => 
                  contact.id && 
                  (contact.name || contact.firstName || contact.lastName) && 
                  !existingContactIds.has(contact.id)
                )
                .map(contact => ({
                  id: contact.id,
                  name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown',
                  phoneNumbers: contact.phoneNumbers?.map(phone => ({
                    number: phone.number,
                  })) || [],
                  email: contact.emails?.[0]?.email || '',
                  category: '',
                  notes: ''
                }));

              if (newContacts.length === 0) {
                Alert.alert('Sync Complete', 'All contacts are already synced.');
                return;
              }

              // Import new contacts
              await importContacts(newContacts as Contact[], user.id);
              Alert.alert('Sync Complete', `Successfully imported ${newContacts.length} new contacts.`);

            } catch (error) {
              console.error('Error syncing contacts:', error);
              Alert.alert('Error', 'Failed to sync contacts');
            }
          }
        }
      ]
    );
  };

  const exportActivitiesToCSV = async () => {
    Alert.alert(
      "Export Activities",
      "Would you like to export your activities to a CSV file?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Export",
          onPress: async () => {
            try {
              const user = await getCurrentUser();
              if (!user) return;

              // Get both future and past activities
              const futureActivities = await getFutureActivities(user.id);
              const pastActivities = await getPastActivities(user.id);
              const allActivities = [...futureActivities, ...pastActivities];
              
              // Create CSV content
              const csvHeader = 'Type,Contact,Date,Notes\n';
              const csvContent = allActivities.map((activity: Activity) => {
                return `${activity.type},"${activity.contactName}","${new Date(activity.date).toLocaleString()}","${activity.notes || ''}"`
              }).join('\n');
              
              const csvString = csvHeader + csvContent;
              const fileName = `activities_${new Date().toISOString().split('T')[0]}.csv`;
              const filePath = `${FileSystem.documentDirectory}${fileName}`;
              
              await FileSystem.writeAsStringAsync(filePath, csvString);
              await Sharing.shareAsync(filePath);
            } catch (error) {
              console.error('Error exporting activities:', error);
              Alert.alert('Error', 'Failed to export activities');
            }
          }
        }
      ]
    );
  };

  const loadActivityStats = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Get both future and past activities
      const futureActivities = await getFutureActivities(user.id);
      const pastActivities = await getPastActivities(user.id);
      const allActivities = [...futureActivities, ...pastActivities];
      
      // Calculate statistics
      const byType = allActivities.reduce((acc: { [key: string]: number }, activity: Activity) => {
        acc[activity.type] = (acc[activity.type] || 0) + 1;
        return acc;
      }, {});

      const byMonth = allActivities.reduce((acc: { [key: string]: number }, activity: Activity) => {
        const month = new Date(activity.date).toLocaleString('default', { month: 'short' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});

      setActivityStats({
        total: allActivities.length,
        byType,
        byMonth
      });
    } catch (error) {
      console.error('Error loading activity stats:', error);
    }
  };

  const exportActivitiesToPDF = async () => {
    Alert.alert(
      "Export Activities",
      "Would you like to export your activities to a PDF file?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Export",
          onPress: async () => {
            try {
              const user = await getCurrentUser();
              if (!user) return;

              const futureActivities = await getFutureActivities(user.id);
              const pastActivities = await getPastActivities(user.id);
              const allActivities = [...futureActivities, ...pastActivities];

              // Create HTML content for PDF
              const htmlContent = `
                <html>
                  <head>
                    <style>
                      body { font-family: 'Helvetica'; padding: 20px; }
                      h1 { color: #2196F3; }
                      .activity { border-bottom: 1px solid #eee; padding: 10px 0; }
                      .date { color: #666; }
                    </style>
                  </head>
                  <body>
                    <h1>Activity Report</h1>
                    <p>Generated on ${new Date().toLocaleDateString()}</p>
                    ${allActivities.map(activity => `
                      <div class="activity">
                        <h3>${activity.type} with ${activity.contactName}</h3>
                        <p class="date">${format(new Date(activity.date), 'PPP')}</p>
                        ${activity.notes ? `<p>${activity.notes}</p>` : ''}
                      </div>
                    `).join('')}
                  </body>
                </html>
              `;

              const { uri } = await Print.printToFileAsync({
                html: htmlContent,
                base64: false
              });

              await Sharing.shareAsync(uri, {
                UTI: 'com.adobe.pdf',
                mimeType: 'application/pdf'
              });
            } catch (error) {
              console.error('Error exporting PDF:', error);
              Alert.alert('Error', 'Failed to export PDF');
            }
          }
        }
      ]
    );
  };

  const toggleAutoBackup = async (enabled: boolean) => {
    try {
      await SecureStore.setItemAsync('autoBackupEnabled', enabled.toString());
      setBackupEnabled(enabled);
      if (enabled) {
        await performBackup();
      }
    } catch (error) {
      console.error('Error toggling backup:', error);
      Alert.alert('Error', 'Failed to update backup settings');
    }
  };

  const performBackup = async () => {
    Alert.alert(
      "Backup Data",
      "Would you like to create a backup of your contacts and activities?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Backup",
          onPress: async () => {
            try {
              const user = await getCurrentUser();
              if (!user) return;

              setBackupStatus('in_progress');

              // Backup activities and contacts to Supabase
              const futureActivities = await getFutureActivities(user.id);
              const pastActivities = await getPastActivities(user.id);
              const contacts = await getAllContacts(user.id);

              const activitiesData = [...futureActivities, ...pastActivities];
              const backupData = {
                user_id: user.id,
                activities: activitiesData,
                contacts: contacts,
                backup_type: 'manual',
                backup_size: JSON.stringify(activitiesData).length + JSON.stringify(contacts).length,
                status: 'completed'
              };

              const { error } = await supabase
                .from('backups')
                .insert(backupData);

              if (error) throw error;

              const backupDate = new Date().toLocaleString();
              await SecureStore.setItemAsync('lastBackupDate', backupDate);
              setLastBackupDate(backupDate);
              setBackupStatus('completed');
              
              Alert.alert('Success', 'Backup completed successfully');
            } catch (error) {
              console.error('Error performing backup:', error);
              setBackupStatus('failed');
              Alert.alert('Error', 'Failed to perform backup');
            }
          }
        }
      ]
    );
  };

  const restoreFromBackup = async () => {
    Alert.alert(
      "Restore Data",
      "This will restore your data from the latest backup. Any changes made after the last backup will be lost. Are you sure you want to continue?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            try {
              const user = await getCurrentUser();
              if (!user) return;

              // Get the latest backup
              const { data: latestBackup, error } = await supabase
                .from('backups')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              if (error) throw error;
              if (!latestBackup) {
                Alert.alert('No Backup', 'No backup found to restore from');
                return;
              }

              // Directly restore all data
              await restoreSpecificData(latestBackup, 'all');
            } catch (error) {
              console.error('Error restoring backup:', error);
              Alert.alert('Error', 'Failed to restore backup');
            }
          }
        }
      ]
    );
  };

  const importFromFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/json']
      });

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const fileContent = await FileSystem.readAsStringAsync(file.uri);
        
        // Parse the file content based on file type
        if (file.name.endsWith('.csv')) {
          // Parse CSV
          const rows = fileContent.split('\n').map(row => row.split(','));
          // Process the data...
        } else if (file.name.endsWith('.json')) {
          // Parse JSON
          const data = JSON.parse(fileContent);
          // Process the data...
        }

        Alert.alert('Success', 'Data imported successfully');
      }
    } catch (error) {
      console.error('Error importing file:', error);
      Alert.alert('Error', 'Failed to import file');
    }
  };

  const viewBackupHistory = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data: backups, error } = await supabase
        .from('backups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!backups?.length) {
        Alert.alert('No Backups', 'No backup history found');
        return;
      }

      // Show backup history in a modal
      setBackupHistory(backups);
      setShowBackupHistoryModal(true);
    } catch (error) {
      console.error('Error fetching backup history:', error);
      Alert.alert('Error', 'Failed to fetch backup history');
    }
  };

  const generateBackupCode = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Get latest backup
      const { data: latestBackup } = await supabase
        .from('backups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!latestBackup) {
        Alert.alert('No Backup', 'Please create a backup first');
        return;
      }

      // Generate a temporary access code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Store the code with backup reference
      await supabase
        .from('backup_codes')
        .insert({
          code,
          backup_id: latestBackup.id,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });

      Alert.alert(
        'Backup Code',
        `Your backup code is: ${code}\nThis code will expire in 24 hours.`,
        [
          {
            text: 'Copy Code',
            onPress: () => Clipboard.setString(code)
          },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Error generating backup code:', error);
      Alert.alert('Error', 'Failed to generate backup code');
    }
  };

  const handleSelectiveRestore = async (backup: any) => {
    Alert.alert(
      'Restore Options',
      'What would you like to restore?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Contacts Only',
          onPress: () => restoreSpecificData(backup, 'contacts')
        },
        {
          text: 'Activities Only',
          onPress: () => restoreSpecificData(backup, 'activities')
        },
        {
          text: 'Everything',
          onPress: () => restoreSpecificData(backup, 'all')
        }
      ]
    );
  };

  const restoreSpecificData = async (backup: any, type: 'contacts' | 'activities' | 'all') => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Show loading alert without any buttons
      Alert.alert(
        'Restoring',
        'Please wait while we restore your data...',
        [],
        { cancelable: false }
      );

      if (type === 'all' || type === 'contacts') {
        // Restore contacts
        const contacts = backup.contacts || [];
        for (const contact of contacts) {
          // Convert the contact data to match the Contact interface
          const contactToRestore: Contact = {
            id: contact.id,
            name: contact.name,
            phoneNumbers: contact.phoneNumbers || [],
            email: contact.email || '',
            category: contact.category || '',
            notes: contact.notes || ''
          };
          // Save to SQLite database
          await saveContact(contactToRestore, user.id);
        }
      }

      if (type === 'all' || type === 'activities') {
        // Restore activities
        const activities = backup.activities || [];
        for (const activity of activities) {
          // Convert the activity data to match the Activity interface
          const activityToRestore: Activity = {
            id: activity.id,
            type: activity.type,
            date: new Date(activity.date),
            notes: activity.notes || '',
            contactId: activity.contactId,
            contactName: activity.contactName
          };
          // Save to SQLite database
          await saveActivity(activityToRestore, user.id);
        }
      }

      // Update local storage with the restored data
      if (type === 'all' || type === 'activities') {
        const futureActivities = await getFutureActivities(user.id);
        const pastActivities = await getPastActivities(user.id);
        // await SecureStore.setItemAsync('futureActivities', JSON.stringify(futureActivities));
        // await SecureStore.setItemAsync('pastActivities', JSON.stringify(pastActivities));
      }

      if (type === 'all' || type === 'contacts') {
        const contacts = await getAllContacts(user.id);
        // await SecureStore.setItemAsync('contacts', JSON.stringify(contacts));
      }

      Alert.alert(
        'Success',
        `Successfully restored ${type === 'all' ? 'all data' : type} from backup`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Refresh the app or navigate to home screen
              router.replace('/');
            }
          }
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Error restoring data:', error);
      // Dismiss the loading alert by showing an empty alert
      Alert.alert('', '', [], { cancelable: false });
      
      Alert.alert(
        'Error',
        'Failed to restore data from backup',
        [{ text: 'OK' }],
        { cancelable: false }
      );
    }
  };

  const restoreFromCode = async () => {
    try {
      Alert.prompt(
        'Enter Backup Code',
        'Please enter the 6-character backup code you received',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Restore',
            onPress: async (code) => {
              if (!code) return;

              // Show loading alert
              Alert.alert(
                'Verifying Code',
                'Please wait while we verify your backup code...',
                [],
                { cancelable: false }
              );

              // Verify the code and get backup data
              const { data: backupCode, error: codeError } = await supabase
                .from('backup_codes')
                .select('backup_id, expires_at')
                .eq('code', code.toUpperCase())
                .single();

              if (codeError || !backupCode) {
                Alert.alert('', '', [], { cancelable: false }); // Dismiss loading
                Alert.alert('Error', 'Invalid or expired backup code');
                return;
              }

              // Check if code is expired
              if (new Date(backupCode.expires_at) < new Date()) {
                Alert.alert('', '', [], { cancelable: false }); // Dismiss loading
                Alert.alert('Error', 'This backup code has expired');
                return;
              }

              // Get the backup data
              const { data: backup, error: backupError } = await supabase
                .from('backups')
                .select('*')
                .eq('id', backupCode.backup_id)
                .single();

              if (backupError || !backup) {
                Alert.alert('', '', [], { cancelable: false }); // Dismiss loading
                Alert.alert('Error', 'Backup not found');
                return;
              }

              // Restore the data
              await restoreSpecificData(backup, 'all');
            }
          }
        ],
        'plain-text'
      );
    } catch (error) {
      console.error('Error restoring from code:', error);
      Alert.alert('Error', 'Failed to restore from backup code');
    }
  };

  const renderBackupHistoryModal = () => (
    <Modal
      visible={showBackupHistoryModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBackupHistoryModal(false)}
    >
      <View style={[styles.dataModalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.dataModalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Backup History</Text>
          <TouchableOpacity onPress={() => setShowBackupHistoryModal(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.dataModalContent}>
          {backupHistory.map((backup) => (
            <TouchableOpacity 
              key={backup.id}
              style={styles.backupHistoryItem}
              onPress={() => handleSelectiveRestore(backup)}
            >
              <View>
                <Text style={[styles.backupDate, { color: colors.text }]}>
                  {new Date(backup.created_at).toLocaleString()}
                </Text>
                <Text style={[styles.backupInfo, { color: colors.secondaryText }]}>
                  {backup.activities.length} activities, {backup.contacts.length} contacts
                </Text>
              </View>
              <Ionicons name="refresh" size={24} color={colors.selectedCategory} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: Platform.select({ ios: 12, android: 50 }),
      paddingBottom: 10,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      letterSpacing: 0.5,
    },
    headerSubtitle: {
      fontSize: 16,
      color: colors.secondaryText,
    },
    scrollContent: {
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    card: {
      backgroundColor: theme === 'dark' ? colors.categoryBg : colors.background,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    avatarContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.selectedCategory + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      borderWidth: 2,
      borderColor: colors.selectedCategory + '40',
    },
    nameContainer: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    name: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    email: {
      fontSize: 16,
      color: colors.secondaryText,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator + '50',
    },
    settingLabel: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    settingValue: {
      fontSize: 16,
      color: colors.secondaryText,
      marginRight: 8,
    },
    settingIcon: {
      width: 32,
      alignItems: 'flex-end',
    },
    languageOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator + '50',
    },
    languageFlag: {
      fontSize: 24,
      marginRight: 12,
    },
    languageName: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    logoutButton: {
      backgroundColor: theme === 'dark' ? colors.error : '#dc3545',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    logoutText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    versionText: {
      textAlign: 'center',
      color: colors.secondaryText,
      fontSize: 14,
      marginTop: 16,
    },
    dataModalContainer: {
      flex: 1,
      marginTop: Platform.select({ ios: 50, android: 0 }),
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    dataModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      // paddingTop: Platform.select({ ios: 0, android: 50 }),
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    dataModalContent: {
      flex: 1,
      padding: 20,
    },
    statsContainer: {
      padding: 16,
    },
    statsTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 24,
      textAlign: 'center',
    },
    statsSubtitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
    },
    statLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statText: {
      fontSize: 16,
    },
    statCount: {
      fontSize: 16,
      fontWeight: '600',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 0,
      textAlign: 'center',
      color: colors.text,
    },
    backupHistoryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
    },
    backupDate: {
      fontSize: 16,
      fontWeight: '600',
    },
    backupInfo: {
      fontSize: 14,
    },
  });

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

  const renderDataModal = () => (
    <Modal
      visible={showDataModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDataModal(false)}
    >
      <View style={[styles.dataModalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.dataModalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Activity Statistics</Text>
          <TouchableOpacity onPress={() => setShowDataModal(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.dataModalContent}>
          <View style={styles.statsContainer}>
            <Text style={[styles.statsTitle, { color: colors.text }]}>
              Total Activities: {activityStats.total}
            </Text>

            <Text style={[styles.statsSubtitle, { color: colors.text }]}>
              Activities by Type
            </Text>
            {Object.entries(activityStats.byType).map(([type, count]) => (
              <View key={type} style={styles.statRow}>
                <View style={styles.statLabel}>
                  <Ionicons 
                    name={getActivityIcon(type as any)} 
                    size={20} 
                    color={colors.selectedCategory} 
                  />
                  <Text style={[styles.statText, { color: colors.text }]}>
                    {type}
                  </Text>
                </View>
                <Text style={[styles.statCount, { color: colors.selectedCategory }]}>
                  {count}
                </Text>
              </View>
            ))}

            <Text style={[styles.statsSubtitle, { color: colors.text, marginTop: 20 }]}>
              Monthly Activity
            </Text>
            {Object.entries(activityStats.byMonth).map(([month, count]) => (
              <View key={month} style={styles.statRow}>
                <Text style={[styles.statText, { color: colors.text }]}>
                  {month}
                </Text>
                <Text style={[styles.statCount, { color: colors.selectedCategory }]}>
                  {count}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.selectedCategory} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={40} color={colors.selectedCategory} />
              </View>
              <View style={styles.nameContainer}>
                <TouchableOpacity 
                  style={styles.nameRow}
                  onPress={() => setShowEditModal(true)}
                >
                  <Text style={styles.name}>
                    {user?.firstName} {user?.lastName}
                  </Text>
                  <Ionicons name="pencil" size={16} color={colors.selectedCategory} />
                </TouchableOpacity>
                <Text style={styles.email}>{user?.email}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Switch
                value={theme === 'dark'}
                onValueChange={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleTheme();
                }}
                trackColor={{ false: '#767577', true: colors.selectedCategory + '80' }}
                thumbColor={theme === 'dark' ? colors.selectedCategory : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Sync Device Contacts</Text>
              <TouchableOpacity
                onPress={handleSyncContacts}
                style={[styles.settingIcon, { padding: 0, width: 40 }]}
              >
                <Ionicons name="sync" size={28} color={colors.selectedCategory} />
              </TouchableOpacity>
            </View>

            {/* <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowLanguageSelector(!showLanguageSelector)}
            >
              <Text style={styles.settingLabel}>Language</Text>
              <Text style={styles.settingValue}>
                {LANGUAGES.find(lang => lang.code === selectedLanguage)?.flag}
                {' '}
                {LANGUAGES.find(lang => lang.code === selectedLanguage)?.name}
              </Text>
              <View style={styles.settingIcon}>
                <Ionicons 
                  name={showLanguageSelector ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.secondaryText} 
                />
              </View>
            </TouchableOpacity> */}

            {showLanguageSelector && (
              <View style={{ marginTop: 8 }}>
                {LANGUAGES.map(language => (
                  <TouchableOpacity
                    key={language.code}
                    style={styles.languageOption}
                    onPress={() => {
                      setSelectedLanguage(language.code);
                      setShowLanguageSelector(false);
                    }}
                  >
                    <Text style={styles.languageFlag}>{language.flag}</Text>
                    <Text style={styles.languageName}>{language.name}</Text>
                    {selectedLanguage === language.code && (
                      <Ionicons name="checkmark" size={20} color={colors.selectedCategory} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data & Backup</Text>
          <View style={styles.card}>
            {/* <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Automatic Backup</Text>
              <Switch
                value={backupEnabled}
                onValueChange={toggleAutoBackup}
                trackColor={{ false: '#767577', true: colors.selectedCategory + '80' }}
                thumbColor={backupEnabled ? colors.selectedCategory : '#f4f3f4'}
              />
            </View> */}
            
            {lastBackupDate && (
              <Text style={[styles.settingValue, { fontSize: 12, marginTop: -8, marginBottom: 8 }]}>
                Last backup: {lastBackupDate}
              </Text>
            )}

            <TouchableOpacity
              style={styles.settingRow}
              onPress={performBackup}
              disabled={backupStatus === 'in_progress'}
            >
              <Text style={styles.settingLabel}>Backup Now</Text>
              <View style={styles.settingIcon}>
                {backupStatus === 'in_progress' ? (
                  <ActivityIndicator size="small" color={colors.selectedCategory} />
                ) : (
                  <Ionicons 
                    name={backupStatus === 'failed' ? "alert-circle" : "cloud-upload-outline"} 
                    size={24} 
                    color={backupStatus === 'failed' ? colors.error : colors.selectedCategory} 
                  />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={restoreFromBackup}
            >
              <Text style={styles.settingLabel}>Restore from Backup</Text>
              <View style={styles.settingIcon}>
                <Ionicons name="cloud-download-outline" size={24} color={colors.selectedCategory} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={exportActivitiesToCSV}
            >
              <Text style={styles.settingLabel}>Export Activities (CSV)</Text>
              <View style={styles.settingIcon}>
                <Ionicons name="download-outline" size={24} color={colors.selectedCategory} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={exportActivitiesToPDF}
            >
              <Text style={styles.settingLabel}>Export Activities (PDF)</Text>
              <View style={styles.settingIcon}>
                <Ionicons name="document-text-outline" size={24} color={colors.selectedCategory} />
              </View>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={styles.settingRow}
              onPress={importFromFile}
            >
              <Text style={styles.settingLabel}>Import Data</Text>
              <View style={styles.settingIcon}>
                <Ionicons name="cloud-upload-outline" size={24} color={colors.selectedCategory} />
              </View>
            </TouchableOpacity> */}

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => {
                loadActivityStats();
                setShowDataModal(true);
              }}
            >
              <Text style={styles.settingLabel}>View Statistics</Text>
              <View style={styles.settingIcon}>
                <Ionicons name="bar-chart-outline" size={24} color={colors.selectedCategory} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={viewBackupHistory}
            >
              <Text style={styles.settingLabel}>Backup History</Text>
              <View style={styles.settingIcon}>
                <Ionicons name="time-outline" size={24} color={colors.selectedCategory} />
              </View>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={styles.settingRow}
              onPress={generateBackupCode}
            >
              <Text style={styles.settingLabel}>Generate Backup Code</Text>
              <View style={styles.settingIcon}>
                <Ionicons name="key-outline" size={24} color={colors.selectedCategory} />
              </View>
            </TouchableOpacity> */}

            {/* <TouchableOpacity
              style={styles.settingRow}
              onPress={restoreFromCode}
            >
              <Text style={styles.settingLabel}>Restore from Backup Code</Text>
              <View style={styles.settingIcon}>
                <Ionicons name="key-outline" size={24} color={colors.selectedCategory} />
              </View>
            </TouchableOpacity> */}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>

      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleUpdateProfile}
        initialFirstName={user?.firstName || ''}
        initialLastName={user?.lastName || ''}
      />
      {renderDataModal()}
      {renderBackupHistoryModal()}
    </SafeAreaView>
  );
} 