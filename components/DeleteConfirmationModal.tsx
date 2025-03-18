import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface DeleteConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmationModal({
  visible,
  onClose,
  onConfirm,
}: DeleteConfirmationModalProps) {
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
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>
                  Delete Activity
                </Text>
                <Text style={[styles.message, { color: colors.secondaryText }]}>
                  Are you sure you want to delete this activity? This action cannot be undone.
                </Text>
              </View>

              <View style={[styles.buttonContainer, { borderTopColor: colors.separator }]}>
                <TouchableOpacity
                  style={[styles.button, { borderRightColor: colors.separator }]}
                  onPress={onClose}
                >
                  <Text style={[styles.buttonText, { color: colors.text }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    onClose();
                    onConfirm();
                  }}
                >
                  <Text style={[styles.buttonText, { color: colors.error }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
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
  header: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
  },
}); 