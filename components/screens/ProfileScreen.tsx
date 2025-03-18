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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentUser, signOut } from '../../services/AuthService';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/AuthService';
import { offlineManager } from '../../services/OfflineManager';
import EditProfileModal from '../EditProfileModal';
import { getLocalUser, saveUserToLocal, getAllContacts, importContacts, Contact } from '../../services/DatabaseService';
import * as SecureStore from 'expo-secure-store';
import * as Contacts from 'expo-contacts';

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

  useEffect(() => {
    loadUserProfile();
    const unsubscribe = offlineManager.addConnectivityListener(setIsOnline);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

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
      paddingTop: 12,
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
  });

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
                onValueChange={toggleTheme}
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

            <TouchableOpacity
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
            </TouchableOpacity>

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
    </SafeAreaView>
  );
} 