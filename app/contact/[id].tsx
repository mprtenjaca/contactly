import { useLocalSearchParams, Stack } from 'expo-router';
import ContactDetailsScreen from '../../components/screens/ContactDetailsScreen';

export default function ContactDetailsRoute() {
  const { contact } = useLocalSearchParams();
  
  // Parse the contact data
  const contactData = typeof contact === 'string' ? JSON.parse(contact) : contact;

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false 
        }} 
      />
      <ContactDetailsScreen contact={contactData} />
    </>
  );
} 