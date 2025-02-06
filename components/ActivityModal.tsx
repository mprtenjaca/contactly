import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export type ActivityType = 'call' | 'message' | 'meeting' | 'note';

interface Activity {
  id: string;
  type: ActivityType;
  date: Date;
  notes?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (type: ActivityType, date: Date, notes: string) => void;
  onDelete?: () => void;
  activity?: Activity;
}

export default function ActivityModal({ 
  visible, 
  onClose, 
  onSave, 
  onDelete,
  activity 
}: Props) {
  const { colors, theme } = useTheme();
  const [type, setType] = useState<ActivityType>(activity?.type || 'meeting');
  const [date, setDate] = useState(activity?.date || new Date());
  const [notes, setNotes] = useState(activity?.notes || '');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const activities: { type: ActivityType; icon: string; label: string }[] = [
    { type: 'call', icon: 'call', label: 'Call' },
    { type: 'message', icon: 'chatbubble', label: 'Message' },
    { type: 'meeting', icon: 'people', label: 'Meeting' },
    { type: 'note', icon: 'document-text', label: 'Note' },
  ];

  useEffect(() => {
    if (visible && activity) {
      setType(activity.type);
      setDate(new Date(activity.date));
      setNotes(activity.notes || '');
    } else if (visible) {
      // Reset form when opening for new activity
      setType('meeting');
      setDate(new Date());
      setNotes('');
    }
  }, [visible, activity]);

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    
    return `${date.toLocaleDateString()} ${timeStr}`;
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
      borderRadius: 12,
      padding: 20,
      maxHeight: '80%',
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
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
    },
    activityTypes: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    activityButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 8,
      gap: 8,
      flex: 1,
      minWidth: '45%',
    },
    activityButtonText: {
      fontSize: 14,
      fontWeight: '500',
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
    datePickerContainer: {
      backgroundColor: colors.categoryBg,
      borderRadius: 12,
      marginBottom: 16,
      padding: 16,
      alignItems: 'center',
    },
    doneDateButton: {
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    doneDateButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    saveButton: {
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    buttonContainer: {
      gap: 12,
      marginTop: 24,
    },
    deleteButton: {
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: '#dc3545',
    },
    deleteButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {activity ? 'Edit Activity' : 'New Activity'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView bounces={false}>
            <View style={styles.activityTypes}>
              {activities.map(activity => (
                <TouchableOpacity
                  key={activity.type}
                  style={[
                    styles.activityButton,
                    { backgroundColor: colors.categoryBg },
                    type === activity.type && { backgroundColor: colors.selectedCategory }
                  ]}
                  onPress={() => setType(activity.type)}
                >
                  <Ionicons
                    name={activity.icon as any}
                    size={24}
                    color={type === activity.type ? '#fff' : colors.text}
                  />
                  <Text
                    style={[
                      styles.activityButtonText,
                      { color: type === activity.type ? '#fff' : colors.text }
                    ]}
                  >
                    {activity.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.dateButton, { backgroundColor: colors.categoryBg }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color={colors.text} />
              <Text style={[styles.dateButtonText, { color: colors.text }]}>
                {formatDate(date)}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={date}
                  mode="datetime"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setDate(selectedDate);
                    }
                  }}
                  textColor={colors.text}
                  themeVariant={theme}
                />
                <TouchableOpacity
                  style={[styles.doneDateButton, { backgroundColor: colors.selectedCategory }]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.doneDateButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}

            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.searchBar,
                color: colors.text 
              }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes..."
              placeholderTextColor={colors.secondaryText}
              multiline
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              blurOnSubmit={true}
            />
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.selectedCategory }]}
              onPress={() => {
                onSave(type, date, notes);
              }}
            >
              <Text style={styles.saveButtonText}>
                {activity ? 'Save Changes' : 'Add Activity'}
              </Text>
            </TouchableOpacity>

            {activity && onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  onDelete();
                  onClose();
                }}
              >
                <Text style={styles.deleteButtonText}>Delete Activity</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
} 