import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (firstName: string, lastName: string) => void;
  initialFirstName: string;
  initialLastName: string;
}

export default function EditProfileModal({
  visible,
  onClose,
  onSave,
  initialFirstName,
  initialLastName,
}: Props) {
  const { colors, theme } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setFirstName(initialFirstName);
      setLastName(initialLastName);
    }
  }, [visible, initialFirstName, initialLastName]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please fill in both first and last name');
      return;
    }

    try {
      setIsLoading(true);
      await onSave(firstName.trim(), lastName.trim());
      // Success is handled by the parent component
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: width - 40,
      backgroundColor: theme === 'dark' ? colors.categoryBg : colors.background,
      borderRadius: 16,
      padding: 24,
      shadowColor: theme === 'dark' ? '#fff' : 'gray',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 24,
      textAlign: 'center',
    },
    input: {
      height: 56,
      backgroundColor: colors.searchBar,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.text,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.separator + '50',
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 16,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme === 'dark' ? 'rgba(255,59,48,0.2)' : 'rgba(255,59,48,0.1)',
      borderWidth: 1,
      borderColor: theme === 'dark' ? '#fff' : colors.error,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme === 'dark' ? '#fff' : colors.error,
    },
    saveButton: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.selectedCategory,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <Text style={styles.title}>Edit Profile</Text>
          
          <TextInput
            style={styles.input}
            placeholder="First Name"
            placeholderTextColor={colors.secondaryText}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            editable={!isLoading}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            placeholderTextColor={colors.secondaryText}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            editable={!isLoading}
          />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.saveButton,
                isLoading && { opacity: 0.7 }
              ]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.buttonText, { color: '#fff' }]}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
} 