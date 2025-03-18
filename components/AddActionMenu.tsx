import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface AddActionMenuProps {
  visible: boolean;
  onClose: () => void;
  onAddContact: () => void;
  onAddCategory: () => void;
  onSyncContacts: () => void;
}

export default function AddActionMenu({ 
  visible, 
  onClose, 
  onAddContact, 
  onAddCategory,
  onSyncContacts 
}: AddActionMenuProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]} />
        </TouchableWithoutFeedback>
        
        <View style={[styles.content, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text, borderBottomColor: colors.separator }]}>
            Add New
          </Text>
          
          <TouchableOpacity
            style={[styles.option, { borderBottomColor: colors.separator }]}
            onPress={onAddContact}
          >
            <Ionicons name="person-add-outline" size={24} color={colors.selectedCategory} />
            <Text style={[styles.optionText, { color: colors.text }]}>Add Contact</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.option, { borderBottomColor: colors.separator }]}
            onPress={onAddCategory}
          >
            <Ionicons name="bookmark-outline" size={24} color={colors.selectedCategory} />
            <Text style={[styles.optionText, { color: colors.text }]}>Add Category</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={onSyncContacts}
          >
            <Ionicons name="sync" size={24} color={colors.selectedCategory} />
            <Text style={[styles.optionText, { color: colors.text }]}>Sync Device Contacts</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    width: '80%',
    maxWidth: 300,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
}); 