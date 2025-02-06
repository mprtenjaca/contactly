import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: Array<{ number: string; }>;
  category?: string;
}

export async function setupCallDetector() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Incoming Calls',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  await Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function findContactByNumber(phoneNumber: string) {
  try {
    const contactsData = await AsyncStorage.getItem('contacts');
    if (!contactsData) return null;

    const contacts: Contact[] = JSON.parse(contactsData);
    const normalizedNumber = phoneNumber.replace(/\D/g, '');

    const contact = contacts.find(c => 
      c.phoneNumbers?.some(p => 
        p.number.replace(/\D/g, '').includes(normalizedNumber) ||
        normalizedNumber.includes(p.number.replace(/\D/g, ''))
      )
    );

    if (contact) {
      const category = await AsyncStorage.getItem(`category_${contact.id}`);
      const notes = await AsyncStorage.getItem(`notes_${contact.id}`);
      return {
        ...contact,
        category,
        notes,
      };
    }

    return null;
  } catch (error) {
    console.error('Error finding contact:', error);
    return null;
  }
}

export async function showIncomingCallInfo(phoneNumber: string) {
  const contact = await findContactByNumber(phoneNumber);
  if (contact) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Incoming Call: ${contact.name}`,
        body: `Category: ${contact.category || 'None'}\n${contact.notes ? `Notes: ${contact.notes}` : ''}`,
        data: { contact },
        sound: true,
      },
      trigger: null,
    });
  }
} 