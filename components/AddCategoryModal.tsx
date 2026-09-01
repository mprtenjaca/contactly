import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Pressable,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (categoryName: string, color: string) => void;
}

const CATEGORY_COLORS = [
  { value: '#FF6B6B' }, // Red
  { value: '#45B7D1' }, // Blue
  { value: '#2ECC71' }, // Green
  { value: '#9B59B6' }, // Purple
  { value: '#E67E22' }, // Orange
  { value: '#4ECDC4' }, // Teal
  { value: '#FF7979' }, // Pink
  { value: '#F1C40F' }, // Yellow
];

export default function AddCategoryModal({ visible, onClose, onSave }: Props) {
  const { colors, theme } = useTheme();
  const [categoryName, setCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0].value);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleSave = () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    onSave(categoryName.trim(), selectedColor);
    setCategoryName('');
    setSelectedColor(CATEGORY_COLORS[0].value);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <View style={styles.overlay} />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <TouchableWithoutFeedback onPress={() => {
            Keyboard.dismiss();
            setShowColorPicker(false);
          }}>
            <View style={styles.modalContainer}>
              <View style={[styles.content, { backgroundColor: colors.background }]}>
                <Text style={[styles.title, { color: colors.text }]}>
                  New Category
                </Text>

                <View style={styles.formContainer}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Category Name
                  </Text>
                  
                  <View style={styles.inputRow}>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: colors.searchBar,
                          color: colors.text,
                          borderColor: colors.separator,
                        }]}
                        placeholder="Enter category name"
                        placeholderTextColor={colors.secondaryText}
                        value={categoryName}
                        onChangeText={setCategoryName}
                        returnKeyType="done"
                      />
                    </View>

                    <View style={styles.colorSection}>
                      <TouchableOpacity
                        style={[
                          styles.colorButton,
                          { borderColor: selectedColor }
                        ]}
                        onPress={() => setShowColorPicker(!showColorPicker)}
                      >
                        <View style={[styles.selectedColor, { backgroundColor: selectedColor }]} />
                      </TouchableOpacity>

                      {showColorPicker && (
                        <View style={[styles.colorPickerPopup, { 
                          backgroundColor: theme === 'dark' ? colors.searchBar : colors.background,
                          borderColor: colors.separator,
                        }]}>
                          <View style={styles.colorGrid}>
                            {CATEGORY_COLORS.map((color) => (
                              <TouchableOpacity
                                key={color.value}
                                style={[
                                  styles.colorOption,
                                  { 
                                    borderColor: selectedColor === color.value ? color.value : 'transparent',
                                    backgroundColor: theme === 'dark' ? colors.background : 'transparent',
                                  }
                                ]}
                                onPress={() => {
                                  setSelectedColor(color.value);
                                  setShowColorPicker(false);
                                }}
                              >
                                <View style={[styles.colorDot, { backgroundColor: color.value }]} />
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.buttons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton, { borderColor: colors.error }]}
                    onPress={onClose}
                  >
                    <Text style={[styles.buttonText, { color: colors.error }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton, { backgroundColor: colors.selectedCategory }]}
                    onPress={handleSave}
                  >
                    <Text style={[styles.buttonText, { color: '#fff' }]}>
                      Create
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardView: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    width: '90%',
    maxWidth: 340,
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  colorSection: {
    position: 'relative',
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    padding: 2,
  },
  selectedColor: {
    flex: 1,
    borderRadius: 20,
  },
  colorPickerPopup: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: 140,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    padding: 2,
  },
  colorDot: {
    flex: 1,
    borderRadius: 18,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  saveButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 