import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface AddContactModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (contact: { name: string; phoneNumbers: Array<{ number: string }> }) => void;
}

export default function AddContactModal({ visible, onClose, onSave }: AddContactModalProps) {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const { colors } = useTheme();

  const handleSave = () => {
    if (!name.trim()) {
      return;
    }

    onSave({
      name: name.trim(),
      phoneNumbers: phoneNumber.trim() ? [{ number: phoneNumber.trim() }] : [],
    });

    // Reset form
    setName('');
    setPhoneNumber('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
              <View style={[styles.header, { borderBottomColor: colors.separator }]}>
                <Text style={[styles.title, { color: colors.text }]}>New Contact</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.secondaryText }]}>Name</Text>
                  <TextInput
                    style={[styles.input, { 
                      color: colors.text,
                      backgroundColor: colors.searchBar,
                      borderColor: colors.separator
                    }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter name"
                    placeholderTextColor={colors.secondaryText}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.secondaryText }]}>Phone Number</Text>
                  <TextInput
                    style={[styles.input, { 
                      color: colors.text,
                      backgroundColor: colors.searchBar,
                      borderColor: colors.separator
                    }]}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="Enter phone number"
                    placeholderTextColor={colors.secondaryText}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { 
                  backgroundColor: name.trim() ? colors.selectedCategory : colors.categoryBg,
                }]}
                onPress={handleSave}
                disabled={!name.trim()}
              >
                <Text style={[styles.saveButtonText, { 
                  color: name.trim() ? '#fff' : colors.secondaryText 
                }]}>
                  Add Contact
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    position: 'relative',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
  },
  form: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  saveButton: {
    margin: 16,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 