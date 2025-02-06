import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface CallLog {
  id: string;
  date: Date;
  notes?: string;
}

interface Props {
  callLogs: CallLog[];
  onLogCall: () => void;
  onSetReminder: () => void;
}

export default function CallHistorySection({ callLogs, onLogCall, onSetReminder }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Call History</Text>
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.categoryBg }]}
            onPress={onLogCall}
          >
            <Ionicons name="call" size={20} color={colors.selectedCategory} />
            <Text style={[styles.actionText, { color: colors.text }]}>Log Call</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.categoryBg }]}
            onPress={onSetReminder}
          >
            <Ionicons name="alarm" size={20} color={colors.selectedCategory} />
            <Text style={[styles.actionText, { color: colors.text }]}>Set Reminder</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={callLogs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.logItem, { backgroundColor: colors.categoryBg }]}>
            <View style={styles.logHeader}>
              <Text style={[styles.logDate, { color: colors.text }]}>
                {new Date(item.date).toLocaleString()}
              </Text>
            </View>
            {item.notes && (
              <Text style={[styles.logNotes, { color: colors.secondaryText }]}>
                {item.notes}
              </Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  logItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  logNotes: {
    fontSize: 14,
  },
}); 