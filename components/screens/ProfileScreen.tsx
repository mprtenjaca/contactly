import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentUser, signOut } from '../../services/AuthService';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/AuthService';
import { offlineManager } from '../../services/OfflineManager';
import EditProfileModal from '../EditProfileModal';
import { getLocalUser, saveUserToLocal } from '../../services/DatabaseService';
import * as SecureStore from 'expo-secure-store';

export default function ProfileScreen() {
  const { colors, theme } = useTheme();
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

  useEffect(() => {
    loadUserProfile();
    const unsubscribe = offlineManager.addConnectivityListener(setIsOnline);
    return unsubscribe;
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator,
    },
    headerTitle: {
      fontSize: 34,
      fontWeight: '700',
      color: colors.text,
    },
    profileSection: {
      padding: 20,
    },
    profileCard: {
      backgroundColor: theme === 'dark' ? colors.categoryBg : colors.background,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: theme === 'dark' ? 0.5 : 0.1,
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
      paddingVertical: 4,
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
    infoSection: {
      marginTop: 20,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.separator + '50',
    },
    infoLabel: {
      width: 100,
      fontSize: 16,
      color: colors.secondaryText,
    },
    infoValue: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    logoutButton: {
      backgroundColor: theme === 'dark' ? colors.error : '#dc3545',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginHorizontal: 20,
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
    editNameButton: {
      padding: 4,
      borderRadius: 12,
      backgroundColor: colors.selectedCategory + '20',
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

      <View style={styles.profileSection}>
        <View style={styles.profileCard}>
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

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>First Name</Text>
              <Text style={styles.infoValue}>{user?.firstName || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Name</Text>
              <Text style={styles.infoValue}>{user?.lastName || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

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