import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface ReminderModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (date: Date, notes: string) => void;
}

export default function ReminderModal({ visible, onClose, onSave }: ReminderModalProps) {
  const { colors, theme } = useTheme();
  const [reminderDate, setReminderDate] = useState(new Date());
  const [reminderNotes, setReminderNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Set Reminder</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: colors.categoryBg }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color={colors.text} />
            <Text style={[styles.dateButtonText, { color: colors.text }]}>
              {reminderDate.toLocaleString()}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.searchBar,
              color: colors.text 
            }]}
            value={reminderNotes}
            onChangeText={setReminderNotes}
            placeholder="Reminder notes..."
            placeholderTextColor={colors.secondaryText}
            multiline
          />

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.selectedCategory }]}
            onPress={() => {
              onSave(reminderDate, reminderNotes);
              setReminderNotes('');
              onClose();
            }}
          >
            <Text style={styles.saveButtonText}>Set Reminder</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={reminderDate}
              mode="datetime"
              display="spinner"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setReminderDate(selectedDate);
                }
              }}
              textColor={colors.text}
              themeVariant={theme}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dateButtonText: {
    marginLeft: 8,
    fontSize: 16,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 