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
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export type ActivityType = 'call' | 'message' | 'meeting' | 'note' | 'email' | 'whatsapp' | 'other';

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
  const [showTimePicker, setShowTimePicker] = useState(false);

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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        // Preserve the current time when setting new date
        const currentTime = date.getTime();
        selectedDate.setTime(currentTime);
        setDate(selectedDate);
      }
    } else {
      if (selectedDate) {
        setDate(selectedDate);
      }
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      // Preserve the current date when setting new time
      const currentDate = date.getDate();
      const currentMonth = date.getMonth();
      const currentYear = date.getFullYear();
      selectedTime.setDate(currentDate);
      selectedTime.setMonth(currentMonth);
      selectedTime.setFullYear(currentYear);
      setDate(selectedTime);
    }
  };

  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(true);
    }
  };

  const openTimePicker = () => {
    if (Platform.OS === 'android') {
      setShowTimePicker(true);
    } else {
      setShowDatePicker(true);
    }
  };

  const styles = StyleSheet.create({
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
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    dateButtonText: {
      flex: 1,
      marginLeft: 12,
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
    datePickerWrapper: {
      borderRadius: 12,
      padding: 8,
      marginTop: 8,
      overflow: 'hidden',
    },
    datePickerContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    datePicker: {
      width: '100%',
      backgroundColor: 'transparent',
    },
    datePickerButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    datePickerButton: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    datePickerButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    saveButton: {
      flex: 1,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    deleteButton: {
      flex: 1,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#dc3545',
    },
    deleteButtonText: {
      color: '#dc3545',
      fontSize: 16,
      fontWeight: '600',
    },
    closeButton: {
      padding: 8,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 8,
      marginTop: 8,
    },
    dateButtonIcon: {
      opacity: 0.5,
    },
    headerButton: {
      fontSize: 17,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalInner}>
              <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                {showDatePicker && Platform.OS === 'ios' ? (
                  <View>
                    <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, { color: colors.text }]}>Select Date & Time</Text>
                    </View>
                    <View style={[styles.datePickerWrapper, { backgroundColor: colors.categoryBg }]}>
                      <View style={styles.datePickerContent}>
                        <DateTimePicker
                          value={date}
                          mode="datetime"
                          display="spinner"
                          onChange={handleDateChange}
                          textColor={colors.text}
                          themeVariant={theme}
                          style={styles.datePicker}
                        />
                      </View>
                    </View>
                    <View style={styles.datePickerButtons}>
                      <TouchableOpacity
                        style={[styles.datePickerButton, { backgroundColor: colors.searchBar }]}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={[styles.datePickerButtonText, { color: colors.text }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.datePickerButton, { backgroundColor: colors.selectedCategory }]}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={[styles.datePickerButtonText, { color: '#fff' }]}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, { color: colors.text }]}>
                        {activity ? 'Edit Activity' : 'New Activity'}
                      </Text>
                      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color={colors.text} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView bounces={false}>
                      <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>
                        Activity Type
                      </Text>
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

                      <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>
                        Date & Time
                      </Text>
                      {Platform.OS === 'android' ? (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={[styles.dateButton, { flex: 1, backgroundColor: colors.categoryBg }]}
                            onPress={openDatePicker}
                          >
                            <Ionicons name="calendar" size={20} color={colors.text} />
                            <Text style={[styles.dateButtonText, { color: colors.text }]}>
                              {date.toLocaleDateString()}
                            </Text>
                            <Ionicons 
                              name="chevron-forward" 
                              size={20} 
                              color={colors.text} 
                              style={styles.dateButtonIcon}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.dateButton, { flex: 1, backgroundColor: colors.categoryBg }]}
                            onPress={openTimePicker}
                          >
                            <Ionicons name="time" size={20} color={colors.text} />
                            <Text style={[styles.dateButtonText, { color: colors.text }]}>
                              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            <Ionicons 
                              name="chevron-forward" 
                              size={20} 
                              color={colors.text} 
                              style={styles.dateButtonIcon}
                            />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.dateButton, { backgroundColor: colors.categoryBg }]}
                          onPress={openDatePicker}
                        >
                          <Ionicons name="calendar" size={20} color={colors.text} />
                          <Text style={[styles.dateButtonText, { color: colors.text }]}>
                            {formatDate(date)}
                          </Text>
                          <Ionicons 
                            name="chevron-forward" 
                            size={20} 
                            color={colors.text} 
                            style={styles.dateButtonIcon}
                          />
                        </TouchableOpacity>
                      )}

                      <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>
                        Notes
                      </Text>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: colors.searchBar,
                          color: colors.text 
                        }]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Add any additional notes..."
                        placeholderTextColor={colors.secondaryText}
                        multiline
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        blurOnSubmit={true}
                      />
                    </ScrollView>

                    <View style={styles.buttonContainer}>
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
                      <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.selectedCategory }]}
                        onPress={() => onSave(type, date, notes)}
                      >
                        <Text style={styles.saveButtonText}>
                          {activity ? 'Save Changes' : 'Add Activity'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={date}
          mode="time"
          display="default"
          textColor="red"
          onChange={handleTimeChange}
        />
      )}
    </Modal>
  );
} 