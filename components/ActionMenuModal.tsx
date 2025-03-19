import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface ActionOption {
  icon: string;
  label: string;
  onPress: () => void;
}

interface ActionMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  additionalOptions?: ActionOption[];
}

export default function ActionMenuModal({
  visible,
  onClose,
  onEdit,
  onDelete,
  additionalOptions = [],
}: ActionMenuModalProps) {
  const { colors, theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[
              styles.modalContent,
              {
                backgroundColor: colors.categoryBg,
                shadowColor: theme === 'dark' ? '#000' : '#666',
              }
            ]}>
              {/* Additional Options */}
              {additionalOptions.map((option, index) => (
                <TouchableOpacity
                  key={option.label}
                  style={[styles.option, { borderBottomColor: colors.separator }]}
                  onPress={() => {
                    onClose();
                    option.onPress();
                  }}
                >
                  <Ionicons name={option.icon as any} size={22} color={colors.text} />
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Edit Option */}
              <TouchableOpacity
                style={[styles.option, { borderBottomColor: colors.separator }]}
                onPress={() => {
                  onClose();
                  onEdit();
                }}
              >
                <Ionicons name="pencil" size={22} color={colors.text} />
                <Text style={[styles.optionText, { color: colors.text }]}>
                  Edit Activity
                </Text>
              </TouchableOpacity>

              {/* Delete Option */}
              <TouchableOpacity
                style={styles.option}
                onPress={() => {
                  onClose();
                  onDelete();
                }}
              >
                <Ionicons name="trash-outline" size={22} color={colors.error} />
                <Text style={[styles.optionText, { color: colors.error }]}>
                  Delete Activity
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
  modalContent: {
    width: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 17,
    marginLeft: 12,
  },
}); 