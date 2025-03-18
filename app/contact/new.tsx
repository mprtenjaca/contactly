import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentUser } from '../../services/AuthService';
import { getAllCategories, saveContact } from '../../services/DatabaseService';

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function NewContact() {
  const router = useRouter();
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      const dbCategories = await getAllCategories(user.id);
      setCategories(dbCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;

      const selectedCategoryObj = categories.find(cat => cat.id === selectedCategory);
      
      const newContact = {
        id: `contact_${Date.now()}`,
        name: name.trim(),
        phoneNumbers: phoneNumber.trim() ? [{ number: phoneNumber.trim() }] : [],
        email: email.trim(),
        notes: notes.trim(),
        category: selectedCategoryObj?.name || '',
        userId: user.id
      };

      await saveContact(newContact, user.id);
      router.back();
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to save contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
              <TouchableOpacity 
                onPress={() => router.back()} 
                style={styles.headerButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text }]}>New Contact</Text>
              <View style={styles.headerButton} />
            </View>

            <ScrollView 
              style={styles.form}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formContent}
            >
              {/* Form Fields */}
              <View style={styles.fieldsContainer}>
                <View style={[styles.inputContainer, { backgroundColor: colors.searchBar }]}>
                  <Text style={[styles.label, { color: colors.secondaryText }]}>Name</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter name"
                    placeholderTextColor={colors.secondaryText}
                  />
                </View>

                <View style={[styles.inputContainer, { backgroundColor: colors.searchBar }]}>
                  <Text style={[styles.label, { color: colors.secondaryText }]}>Phone</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="Enter phone number"
                    placeholderTextColor={colors.secondaryText}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={[styles.inputContainer, { backgroundColor: colors.searchBar }]}>
                  <Text style={[styles.label, { color: colors.secondaryText }]}>Email</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter email"
                    placeholderTextColor={colors.secondaryText}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Categories */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Category</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoriesContainer}
                >
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        { 
                          backgroundColor: selectedCategory === category.id ? category.color : colors.categoryBg,
                          borderColor: category.color 
                        }
                      ]}
                      onPress={() => setSelectedCategory(category.id)}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        { color: selectedCategory === category.id ? '#fff' : category.color }
                      ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={[styles.inputContainer, { backgroundColor: colors.searchBar }]}>
                  <Text style={[styles.label, { color: colors.secondaryText }]}>Notes</Text>
                  <TextInput
                    style={[styles.input, styles.notesInput, { color: colors.text }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add notes"
                    placeholderTextColor={colors.secondaryText}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </ScrollView>

            {/* Save Button */}
            <View style={[styles.saveButtonContainer, { backgroundColor: colors.background }]}>
              <TouchableOpacity 
                onPress={handleSave}
                disabled={!name.trim() || loading}
                style={[
                  styles.saveButtonLarge,
                  { 
                    backgroundColor: colors.selectedCategory,
                    opacity: !name.trim() || loading ? 0.5 : 1 
                  }
                ]}
              >
                <Text style={styles.saveButtonLargeText}>
                  {loading ? 'Saving...' : 'Save Contact'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2c2c2e',
  },
  headerButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  form: {
    flex: 1,
  },
  formContent: {
    paddingBottom: 24,
  },
  fieldsContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 20,
  },
  inputContainer: {
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    fontSize: 17,
    padding: 0,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  saveButtonContainer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2c2c2e',
  },
  saveButtonLarge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonLargeText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
}); 