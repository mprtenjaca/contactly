import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { 
  getAllContacts, 
  getContactsByCategory, 
  importContacts
} from '../../services/DatabaseService';
import { getCurrentUser } from '../../services/AuthService';

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: Array<{ number: string }>;
  isOnline?: boolean;
  lastActivity?: string;
  note?: string;
  category?: string;
}

interface SectionData {
  title: string;
  data: Contact[];
}

export default function ContactsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const { colors, toggleTheme, theme } = useTheme();

  const categories = ["All", "Clients", "Family", "Work", "Friends"];

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
    // Helper function to check if contact has only numbers/phone numbers
    const isPhoneNumberOnly = (name: string) => {
      // Remove common phone number characters and check if only numbers remain
      const cleanName = name.replace(/[\s\+\-\(\)]/g, '');
      return /^\d+$/.test(cleanName);
    };
    
    // Separate contacts into categories
    const namedContacts = contacts.filter(contact => 
      /^[A-Za-z]/.test(contact.name.trim())
    );
    const numberedContactsWithName = contacts.filter(contact => 
      !isPhoneNumberOnly(contact.name) && /\d/.test(contact.name)
    );
    const phoneNumberOnlyContacts = contacts.filter(contact => 
      isPhoneNumberOnly(contact.name)
    );
    const otherContacts = contacts.filter(contact => 
      !isPhoneNumberOnly(contact.name) && 
      !/^[A-Za-z]/.test(contact.name.trim()) && 
      !/\d/.test(contact.name)
    );

    // Sort each category
    const sortedNamed = namedContacts.sort((a, b) => a.name.localeCompare(b.name));
    const sortedNumberedWithName = numberedContactsWithName.sort((a, b) => a.name.localeCompare(b.name));
    const sortedPhoneNumbers = phoneNumberOnlyContacts.sort((a, b) => a.name.localeCompare(b.name));
    const sortedOther = otherContacts.sort((a, b) => a.name.localeCompare(b.name));

    // Return in strict order: A-Z names first, then mixed names with numbers, 
    // then other characters, and phone numbers last
    return [
      ...sortedNamed,
      ...sortedNumberedWithName,
      ...sortedOther,
      // ...sortedPhoneNumbers
    ];
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
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contacts, searchQuery]);

  const getSectionedContacts = (contacts: Contact[]) => {
    const sections: { [key: string]: Contact[] } = {};
    
    contacts.forEach(contact => {
      const firstLetter = contact.name.charAt(0).toUpperCase();
      if (!sections[firstLetter]) {
        sections[firstLetter] = [];
      }
      sections[firstLetter].push(contact);
    });

    return Object.keys(sections).sort().map(key => ({
      title: key,
      data: sections[key]
    }));
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.sectionHeader }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.secondaryText }]}>
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

  const handleCategorySelect = async (category: string) => {
    const user = await getCurrentUser();
    if (!user) {
      console.error('No authenticated user found');
      return;
    }
    setSelectedCategory(category);
    try {
      const filteredContacts = category === "All" 
        ? await getAllContacts(user.id)
        : await getContactsByCategory(category, user.id);
      
      const sortedContacts = sortContacts(filteredContacts);
      setContacts(sortedContacts);
    } catch (error) {
      console.error('Error filtering contacts:', error);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    filterContactsByCategory();
  }, [selectedCategory]);

  // Add this effect to reload contacts when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadContacts();
    }, [])
  );

  return (
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
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>+</Text>
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
          {categories.map((cat) => (
            <TouchableOpacity
              key={`category-${cat}-${categories.indexOf(cat)}`}
              style={[
                styles.categoryChip,
                { 
                  backgroundColor: colors.categoryBg,
                  borderColor: colors.categoryBorder 
                },
                selectedCategory === cat && {
                  backgroundColor: colors.selectedCategory,
                  borderColor: colors.selectedCategory
                }
              ]}
              onPress={() => handleCategorySelect(cat)}
            >
              <Text style={[
                styles.categoryChipText,
                { color: colors.text },
                selectedCategory === cat && { color: '#fff' }
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.selectedCategory} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading contacts...
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sectionedContacts}
          renderItem={renderContactItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          style={[styles.contactsList, { backgroundColor: colors.background }]}
          contentContainerStyle={[
            styles.contactsListContent, 
            { backgroundColor: colors.background }
          ]}
          stickySectionHeadersEnabled={true}
        />
      )}
    </SafeAreaView>
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
    backgroundColor: '#fff',
  },
  contactsListContent: {
    backgroundColor: '#000',
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
    backgroundColor: '#000',
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  emptyText: {
    fontSize: 18,
    color: '#000',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
}); 