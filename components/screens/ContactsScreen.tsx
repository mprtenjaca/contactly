import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  SectionList,
  ScrollView,
  PanResponder,
  SectionList as RNSectionList,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { 
  getAllContacts, 
  getContactsByCategory, 
  importContacts,
  getAllCategories,
  createCategory,
  deleteCategory
} from '../../services/DatabaseService';
import { getCurrentUser } from '../../services/AuthService';
import AddActionMenu from '../AddActionMenu';
import AddCategoryModal from '../AddCategoryModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: Array<{ number: string }>;
  isOnline?: boolean;
  lastActivity?: string;
  note?: string;
  category?: string;
  email?: string;
}

interface SectionData {
  title: string;
  data: Contact[];
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export default function ContactsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { colors, toggleTheme, theme } = useTheme();
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const sectionListRef = useRef<RNSectionList>(null);
  const [showLetterOverlay, setShowLetterOverlay] = useState(false);
  const [currentLetter, setCurrentLetter] = useState('');

  // Load saved category on mount
  useEffect(() => {
    loadSavedCategory();
  }, []);

  // Save category whenever it changes
  useEffect(() => {
    AsyncStorage.setItem('selectedCategory', selectedCategory);
  }, [selectedCategory]);

  const loadSavedCategory = async () => {
    try {
      const savedCategory = await AsyncStorage.getItem('selectedCategory');
      if (savedCategory) {
        setSelectedCategory(savedCategory);
      }
    } catch (error) {
      console.error('Error loading saved category:', error);
    }
  };

  const loadContacts = async () => {
    try {
      console.log("CONTACT SCREEN LOAD CONTACTS!!!")
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        console.error('No authenticated user');
        return;
      }

      console.log('Loading contacts for user:', user.id);
      
      // First get existing contacts from database
      const existingContacts = await getAllContacts(user.id);
      const existingContactIds = new Set(existingContacts.map(c => c.id));
      
      const { status } = await Contacts.requestPermissionsAsync();
      console.log('Permission status:', status);
      
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [
            Contacts.Fields.ID,
            Contacts.Fields.Name,
            Contacts.Fields.PhoneNumbers,
            Contacts.Fields.FirstName,
            Contacts.Fields.LastName
          ],
        });

        if (data.length > 0) {
          // Filter out contacts that already exist in database
          const newContacts = data
            .filter(contact => 
              contact.id && 
              (contact.name || contact.firstName || contact.lastName) && 
              !existingContactIds.has(contact.id)
            )
            .map(contact => ({
              id: contact.id,
              name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown',
              phoneNumbers: contact.phoneNumbers?.map(phone => ({
                number: phone.number,
              })) || [],
              category: '',
              notes: ''
            }));

          console.log(`Found ${newContacts.length} new contacts to import`);

          // Only import new contacts
          if (newContacts.length > 0) {
            await importContacts(newContacts as Contact[], user.id);
          }
        }
      } else {
        Alert.alert(
          "Permission Required",
          "Please allow access to your contacts to use this feature."
        );
      }

      // Get all contacts (including newly imported ones)
      const allContacts = await getAllContacts(user.id);
      const sortedContacts = sortContacts(allContacts);
      setContacts(sortedContacts);
      
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert("Error", "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const filterContactsByCategory = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      console.log('Filtering contacts for category:', selectedCategory, 'user:', user.id);
      const filteredContacts = selectedCategory === "All" 
        ? await getAllContacts(user.id)
        : await getContactsByCategory(selectedCategory, user.id);
      
      const sortedContacts = sortContacts(filteredContacts);
      setContacts(sortedContacts);
    } catch (error) {
      console.error('Error filtering contacts:', error);
      Alert.alert('Error', 'Failed to filter contacts');
    } finally {
      setLoading(false);
    }
  };

  const sortContacts = (contacts: Contact[]) => {
    // First ensure we have no duplicates by ID
    const uniqueContacts = Array.from(
      new Map(contacts.map(contact => [contact.id, contact])).values()
    );

    // Helper function to check if contact has only numbers
    const isPhoneNumberOnly = (name: string) => {
      // Remove common phone number characters and check if only numbers remain
      const cleanName = name.replace(/[\s\+\-\(\)]/g, '');
      return /^\d+$/.test(cleanName);
    };

    // Filter out contacts with only phone numbers as names
    const validContacts = uniqueContacts.filter(contact => {
      const name = contact.name.trim();
      return name.length > 0 && !isPhoneNumberOnly(name);
    });

    // Separate contacts into alphabetical and numerical
    const alphabeticalContacts = validContacts.filter(contact => 
      /^[a-zA-Z]/.test(contact.name.trim())
    );
    const numericalContacts = validContacts.filter(contact => 
      /^[0-9]/.test(contact.name.trim())
    );

    // Sort each group
    const sortedAlphabetical = alphabeticalContacts.sort((a, b) => {
      const nameA = a.name.trim().toLowerCase();
      const nameB = b.name.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });

    const sortedNumerical = numericalContacts.sort((a, b) => {
      const nameA = a.name.trim().toLowerCase();
      const nameB = b.name.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Combine the groups with numerical at the end
    return [...sortedAlphabetical, ...sortedNumerical];
  };

  const getSearchPriority = (contactName: string, query: string) => {
    const lowerName = contactName.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const words = lowerName.split(' ');

    // Exact match of full name
    if (lowerName === lowerQuery) return 0;
    
    // Exact match of any word in the name
    if (words.some(word => word === lowerQuery)) return 1;
    
    // Starts with query
    if (lowerName.startsWith(lowerQuery)) return 2;
    
    // Any word starts with query
    if (words.some(word => word.startsWith(lowerQuery))) return 3;
    
    // Contains query anywhere
    if (lowerName.includes(lowerQuery)) return 4;
    
    // Number matches (if query is a number)
    if (/^\d+$/.test(query) && lowerName.includes(query)) return 5;
    
    return 6; // No match
  };

  const filteredContacts = React.useMemo(() => {
    if (!searchQuery) return contacts;
    
    const matchedContacts = contacts
      .map(contact => ({
        contact,
        priority: getSearchPriority(contact.name, searchQuery)
      }))
      .filter(item => item.priority !== 6) // Filter out non-matches
      .sort((a, b) => a.priority - b.priority); // Sort by priority (lower is better)

    // Ensure no duplicates in search results
    const uniqueMatches = Array.from(
      new Map(matchedContacts.map(item => [item.contact.id, item.contact])).values()
    );

    return uniqueMatches;
  }, [contacts, searchQuery]);

  const getSectionedContacts = (contacts: Contact[]) => {
    const sections: { [key: string]: Contact[] } = {};
    
    contacts.forEach(contact => {
      const name = contact.name.trim();
      let firstLetter = name.charAt(0).toUpperCase();
      
      // Group all numbers under '#'
      if (/^[0-9]/.test(firstLetter)) {
        firstLetter = '#';
      }

      if (!sections[firstLetter]) {
        sections[firstLetter] = [];
      }
      sections[firstLetter].push(contact);
    });

    // Sort sections alphabetically, but ensure '#' comes last
    return Object.keys(sections)
      .sort((a, b) => {
        if (a === '#') return 1;
        if (b === '#') return -1;
        return a.localeCompare(b);
      })
      .map(key => ({
        title: key,
        data: sections[key]
      }));
  };

  const renderSectionHeader = ({ section }: { section: { title: string; data: Contact[] } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.selectedCategory }]}>
        {section.title}
      </Text>
    </View>
  );

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity 
      style={[
        styles.contactItem, 
        { 
          backgroundColor: colors.background,
        }
      ]}
      onPress={() => handleContactPress(item)}
    >
      <View style={[styles.avatarPlaceholder, { backgroundColor: colors.avatarBg }]}>
        <Text style={[styles.avatarText, { color: colors.text }]}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={[
        styles.contactInfo, 
        { borderBottomColor: colors.separator }
      ]}>
        <Text style={[styles.contactName, { color: colors.text }]}>
          {item.name}
        </Text>
        {item.phoneNumbers && item.phoneNumbers[0] && (
          <Text style={[styles.phoneNumber, { color: colors.secondaryText }]}>
            {item.phoneNumbers[0].number}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const sectionedContacts = React.useMemo(() => {
    return getSectionedContacts(filteredContacts);
  }, [filteredContacts]);

  const handleContactPress = (contact: Contact) => {
    router.push({
      pathname: `/contact/${contact.id}`,
      params: { contact: JSON.stringify(contact) }
    });
  };

  const handleCategorySelect = async (categoryId: string) => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      let contactsList;
      if (categoryId === 'all') {
        contactsList = await getAllContacts(user.id);
      } else {
        const category = categories.find(c => c.id === categoryId);
        if (!category) {
          console.error('Category not found:', categoryId);
          return;
        }
        contactsList = await getContactsByCategory(category.name, user.id);
      }

      setSelectedCategory(categoryId);
      const sortedContacts = sortContacts(contactsList); // This now includes deduplication
      setContacts(sortedContacts);
    } catch (error) {
      console.error('Error in category selection:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (categoryName: string, color: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const newCategory = await createCategory(categoryName, color, user.id);
      setCategories(prev => [...prev, newCategory]);
      setShowAddCategoryModal(false);
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to add category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      await deleteCategory(categoryId, user.id);
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      if (selectedCategory === categoryId) {
        setSelectedCategory('all');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      Alert.alert('Error', 'Failed to delete category');
    }
  };

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

  useEffect(() => {
    loadCategories();
  }, []);

  // Update useFocusEffect to handle all contact loading scenarios
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        try {
          setLoading(true);
          const user = await getCurrentUser();
          if (!user) return;

          // Load or restore the selected category
          const savedCategory = await AsyncStorage.getItem('selectedCategory');
          let categoryToUse = savedCategory || selectedCategory || 'all';
          
          // Load contacts based on category
          let contactsList;
          if (categoryToUse === 'all') {
            contactsList = await getAllContacts(user.id);
          } else {
            const category = categories.find(c => c.id === categoryToUse);
            if (category) {
              contactsList = await getContactsByCategory(category.name, user.id);
            } else {
              // If category not found, fallback to all contacts
              categoryToUse = 'all';
              contactsList = await getAllContacts(user.id);
            }
          }

          // Remove any potential duplicates by ID
          const uniqueContacts = Array.from(
            new Map(contactsList.map(contact => [contact.id, contact])).values()
          );

          setSelectedCategory(categoryToUse);
          const sortedContacts = sortContacts(uniqueContacts);
          setContacts(sortedContacts);
        } catch (error) {
          console.error('Error refreshing data:', error);
          Alert.alert('Error', 'Failed to load contacts');
        } finally {
          setLoading(false);
        }
      };

      refreshData();
    }, [categories]) // Keep categories as dependency
  );

  // Get available letters from contacts
  const availableLetters = React.useMemo(() => {
    const letters = sectionedContacts.map(section => section.title);
    return letters;
  }, [sectionedContacts]);

  const handleLetterPress = (letter: string) => {
    const sectionIndex = sectionedContacts.findIndex(section => section.title === letter);
    if (sectionIndex !== -1 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewPosition: 0
      });
    }
  };

  // Add getItemLayout handler
  const getItemLayout = (data: any, index: number) => {
    const itemHeight = 60; // Adjust this to match your item height
    const headerHeight = 32; // Adjust this to match your section header height
    return {
      length: itemHeight,
      offset: itemHeight * index + headerHeight,
      index,
    };
  };

  const updateLetterFromTouch = (pageY: number) => {
    // Get the height of the list
    const letterHeight = 16; // Height of each letter item
    const totalHeight = availableLetters.length * letterHeight;
    const screenHeight = Dimensions.get('window').height;
    const listTop = (screenHeight - totalHeight) / 2;
    
    // Calculate the touched index
    const relativeY = pageY - listTop;
    const index = Math.floor(relativeY / letterHeight);
    
    if (index >= 0 && index < availableLetters.length) {
      const letter = availableLetters[index];
      handleLetterPress(letter);
      setCurrentLetter(letter);
      setShowLetterOverlay(true);
    }
  };

  const createPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const touch = evt.nativeEvent;
          updateLetterFromTouch(touch.pageY);
        },
        onPanResponderMove: (evt) => {
          const touch = evt.nativeEvent;
          updateLetterFromTouch(touch.pageY);
        },
        onPanResponderRelease: () => {
          setTimeout(() => setShowLetterOverlay(false), 500);
        },
      }),
    [availableLetters] // Add availableLetters as dependency
  );

  const handleAddContact = () => {
    setShowAddMenu(false);
    router.push('/contact/new');
  };

  const handleSyncContacts = async () => {
    Alert.alert(
      "Sync Contacts",
      "Would you like to sync your device contacts with the app? This will import any new contacts from your device.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sync",
          style: "default",
          onPress: async () => {
            try {
              setLoading(true);
              const user = await getCurrentUser();
              if (!user) {
                console.error('No authenticated user');
                return;
              }

              const { status } = await Contacts.requestPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(
                  "Permission Required",
                  "Please allow access to your contacts to sync them."
                );
                return;
              }

              // Get existing contacts from database
              const existingContacts = await getAllContacts(user.id);
              const existingContactIds = new Set(existingContacts.map(c => c.id));

              // Get device contacts
              const { data } = await Contacts.getContactsAsync({
                fields: [
                  Contacts.Fields.ID,
                  Contacts.Fields.Name,
                  Contacts.Fields.PhoneNumbers,
                  Contacts.Fields.FirstName,
                  Contacts.Fields.LastName,
                  Contacts.Fields.Emails
                ],
              });

              // Filter new contacts
              const newContacts = data
                .filter(contact => 
                  contact.id && 
                  (contact.name || contact.firstName || contact.lastName) && 
                  !existingContactIds.has(contact.id)
                )
                .map(contact => ({
                  id: contact.id,
                  name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown',
                  phoneNumbers: contact.phoneNumbers?.map(phone => ({
                    number: phone.number,
                  })) || [],
                  email: contact.emails?.[0]?.email || '',
                  category: '',
                  notes: ''
                }));

              if (newContacts.length === 0) {
                Alert.alert('Sync Complete', 'All contacts are already synced.');
                return;
              }

              // Import new contacts
              await importContacts(newContacts as Contact[], user.id);
              
              // Refresh the contacts list
              const allContacts = await getAllContacts(user.id);
              const sortedContacts = sortContacts(allContacts);
              setContacts(sortedContacts);

              Alert.alert('Sync Complete', `Successfully imported ${newContacts.length} new contacts.`);
            } catch (error) {
              console.error('Error syncing contacts:', error);
              Alert.alert('Error', 'Failed to sync contacts');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Contacts</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
              <Ionicons 
                name={theme === 'dark' ? 'sunny' : 'moon'} 
                size={22} 
                color={colors.text} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.selectedCategory, borderRadius: 50 }]}
              onPress={() => setShowAddMenu(true)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.searchBar }]}>
          <Ionicons name="search" size={18} color={colors.secondaryText} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search"
            placeholderTextColor={colors.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons 
                name="close-circle" 
                size={18} 
                color={colors.secondaryText}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.categoriesContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                { 
                  backgroundColor: selectedCategory === 'all' ? colors.selectedCategory : colors.categoryBg,
                  borderColor: colors.selectedCategory 
                }
              ]}
              onPress={() => handleCategorySelect('all')}
            >
              <Text style={[
                styles.categoryChipText,
                { color: selectedCategory === 'all' ? '#fff' : colors.text }
              ]}>
                All
              </Text>
            </TouchableOpacity>

            {categories
              .filter(category => category.id !== 'all') // Filter out any potential "all" category from database
              .map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  { 
                    backgroundColor: selectedCategory === category.id ? category.color : colors.categoryBg,
                    borderColor: category.color 
                  }
                ]}
                onPress={() => handleCategorySelect(category.id)}
                onLongPress={() => {
                  Alert.alert(
                    'Delete Category',
                    `Are you sure you want to delete "${category.name}"?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Delete', 
                        style: 'destructive',
                        onPress: () => handleDeleteCategory(category.id)
                      }
                    ]
                  );
                }}
              >
                <Text style={[
                  styles.categoryChipText,
                  { color: selectedCategory === category.id ? '#fff' : category.color }
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={[
                styles.categoryChip,
                { 
                  backgroundColor: colors.categoryBg,
                  borderColor: colors.categoryBorder,
                  paddingHorizontal: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }
              ]}
              onPress={() => setShowAddCategoryModal(true)}
            >
              <Ionicons name="add" size={20} color={colors.selectedCategory} />
              <Text style={[styles.categoryChipText, { color: colors.selectedCategory }]}>
                Add Category
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {loading ? (
          <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.selectedCategory} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading contacts...
            </Text>
          </View>
        ) : filteredContacts.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
            <View style={styles.emptyIconContainer}>
              <Ionicons 
                name="people-circle-outline" 
                size={120} 
                color={colors.selectedCategory} 
                style={styles.emptyIcon}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No contacts here yet
            </Text>
            <Text style={[styles.emptySubText, { color: colors.secondaryText }]}>
              {selectedCategory === 'all' 
                ? "Start by adding your first contact!"
                : `This category is feeling a bit lonely.\nAdd some contacts to keep it company!`
              }
            </Text>
          </View>
        ) : searchQuery ? (
          <ScrollView 
            style={[styles.contactsList, { backgroundColor: colors.background }]}
            contentContainerStyle={[styles.contactsListContent, { backgroundColor: colors.background }]}
          >
            {filteredContacts.map((contact, index) => (
              <TouchableOpacity 
                key={`${contact.id}-${index}`}
                style={[
                  styles.contactItem, 
                  { 
                    backgroundColor: colors.background,
                  }
                ]}
                onPress={() => handleContactPress(contact)}
              >
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.avatarBg }]}>
                  <Text style={[styles.avatarText, { color: colors.text }]}>
                    {contact.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={[
                  styles.contactInfo, 
                  { borderBottomColor: colors.separator }
                ]}>
                  <Text style={[styles.contactName, { color: colors.text }]}>
                    {contact.name}
                  </Text>
                  {contact.phoneNumbers && contact.phoneNumbers[0] && (
                    <Text style={[styles.phoneNumber, { color: colors.secondaryText }]}>
                      {contact.phoneNumbers[0].number}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.listContainer}>
            <SectionList
              ref={sectionListRef}
              sections={sectionedContacts}
              renderItem={renderContactItem}
              renderSectionHeader={renderSectionHeader}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              style={[styles.contactsList, { backgroundColor: colors.background }]}
              contentContainerStyle={[styles.contactsListContent, { backgroundColor: colors.background }]}
              stickySectionHeadersEnabled={true}
              initialNumToRender={20}
              maxToRenderPerBatch={10}
              windowSize={5}
              getItemLayout={getItemLayout}
              onScrollToIndexFailed={(info) => {
                const wait = new Promise(resolve => setTimeout(resolve, 500));
                wait.then(() => {
                  sectionListRef.current?.scrollToLocation({
                    sectionIndex: info.index,
                    itemIndex: 0,
                    animated: true,
                    viewPosition: 0
                  });
                });
              }}
            />

            <View 
              style={[
                styles.alphabetList,
                {
                  // Calculate height based on number of letters
                  height: Math.min(
                    availableLetters.length * 16,
                    Dimensions.get('window').height * 0.7
                  ), // Limit to 70% of screen height
                  marginTop: -(Math.min(
                    availableLetters.length * 16,
                    Dimensions.get('window').height * 0.7
                  ) / 2), // Center the list
                }
              ]}
              {...createPanResponder.panHandlers}
            >
              {availableLetters.map((letter) => (
                <TouchableOpacity
                  key={letter}
                  onPress={() => {
                    handleLetterPress(letter);
                    setCurrentLetter(letter);
                    setShowLetterOverlay(true);
                    setTimeout(() => setShowLetterOverlay(false), 500);
                  }}
                  style={styles.letterItem}
                >
                  <Text style={[
                    styles.letterText,
                    { color: colors.secondaryText }
                  ]}>
                    {letter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {showLetterOverlay && (
          <View style={styles.letterOverlay}>
            <View style={[styles.letterOverlayInner, { backgroundColor: colors.selectedCategory }]}>
              <Text style={styles.letterOverlayText}>{currentLetter}</Text>
            </View>
          </View>
        )}
      </SafeAreaView>

      <AddActionMenu
        visible={showAddMenu}
        onClose={() => setShowAddMenu(false)}
        onAddContact={handleAddContact}
        onAddCategory={() => {
          setShowAddMenu(false);
          setShowAddCategoryModal(true);
        }}
        onSyncContacts={() => {
          setShowAddMenu(false);
          handleSyncContacts();
        }}
      />

      <AddCategoryModal
        visible={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        onSave={handleAddCategory}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#000',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  addButton: {
    padding: 4,
  },
  addButtonText: {
    fontSize: 28,
    color: '#007AFF',
    fontWeight: '400',
  },
  searchContainer: {
    backgroundColor: '#1c1c1e',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 17,
    color: '#fff',
  },
  categoriesContainer: {
    marginBottom: 8,
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedCategoryChip: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryChipText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  selectedCategoryChipText: {
    color: '#fff',
  },
  contactsList: {
    flex: 1,
  },
  contactsListContent: {
    flexGrow: 1,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#000',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2c2c2e",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: '#fff',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2c2c2e',
    paddingVertical: 8,
    marginRight: 8,
  },
  contactName: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 2,
  },
  phoneNumber: {
    fontSize: 14,
    color: '#8e8e93',
  },
  sectionHeader: {
    backgroundColor: '#141414',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8e8e93',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    marginBottom: 24,
    opacity: 0.9,
  },
  emptyIcon: {
    transform: [{ rotate: '-5deg' }],
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#007AFF',
  },
  emptyButtonIcon: {
    marginRight: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  addCategoryChip: {
    width: 40,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
    position: 'relative',
  },
  alphabetList: {
    position: 'absolute',
    right: 2,
    top: '50%',
    transform: [{ translateY: -8 }], // Small offset to account for padding
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'center', // Changed to center
    alignItems: 'center',
    zIndex: 1,
  },
  letterItem: {
    height: 16,
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0, // Remove vertical margin
  },
  letterText: {
    fontSize: 10,
    fontWeight: '500',
  },
  letterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  letterOverlayInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.9)',
  },
  letterOverlayText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '80%',
    maxWidth: 300,
    transform: [{ translateX: -150 }, { translateY: -80 }],
    backgroundColor: '#fff',
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
}); 