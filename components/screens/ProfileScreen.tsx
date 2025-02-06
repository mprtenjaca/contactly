import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentUser, signOut } from '../../services/AuthService';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/AuthService';
import { offlineManager } from '../../services/OfflineManager';
import EditProfileModal from '../EditProfileModal';
import { getLocalUser, saveUserToLocal } from '../../services/DatabaseService';

export default function ProfileScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<{
    email: string;
    firstName?: string;
    lastName?: string;
  } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    loadUserProfile();
    const unsubscribe = offlineManager.addConnectivityListener(setIsOnline);
    return unsubscribe;
  }, []);

  const loadUserProfile = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        // Try to get from local SQLite first
        const localUser = await getLocalUser(currentUser.id);
        if (localUser) {
          setUser(localUser);
        }

        // Then try to update from Supabase if online
        if (offlineManager.getIsOnline()) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

          if (profileData) {
            const updatedUser = {
              ...currentUser,
              firstName: profileData.first_name,
              lastName: profileData.last_name,
            };
            setUser(updatedUser);
            await saveUserToLocal(updatedUser);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleLogout = () => {
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
      const currentUser = await getCurrentUser();
      if (!currentUser?.id) {
        Alert.alert('Error', 'Unable to update profile. Please try again.');
        return;
      }

      const updateData = {
        userId: currentUser.id,
        firstName,
        lastName,
      };

      if (offlineManager.getIsOnline()) {
        // Online update
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentUser.id);

        if (error) throw error;
      } else {
        // Offline update - queue for later
        await offlineManager.addPendingSync('UPDATE_PROFILE', updateData);
      }

      // Update local state immediately
      setUser(prev => prev ? {
        ...prev,
        firstName,
        lastName,
      } : null);

      // Update local storage
      if (currentUser.id) {
        await saveUserToLocal({
          id: currentUser.id,
          email: currentUser.email,
          firstName,
          lastName,
        });
      }

    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
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

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
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