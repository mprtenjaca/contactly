import { useLocalSearchParams } from 'expo-router';
import ContactDetailsScreen from '../components/screens/ContactDetailsScreen';

export default function ContactDetailsRoute() {
  const { contact } = useLocalSearchParams();
  const contactData = JSON.parse(contact as string);
  
  return <ContactDetailsScreen contact={contactData} />;
} 