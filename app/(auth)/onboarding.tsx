import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppIntroSlider from 'react-native-app-intro-slider';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WelcomeIllustration from '../../components/WelcomeIllustration';
import TimelineIllustration from '../../components/TimelineIllustration';
import CalendarIllustration from '../../components/CalendarIllustration';
import GetStartedIllustration from '../../components/GetStartedIllustration';

const slides = [
  {
    key: '1',
    title: 'Welcome to Contactly',
    text: 'Organize contacts, track interactions, and never miss important calls or meetings again.',
    image: <WelcomeIllustration width={250} height={250} />,
  },
  {
    key: '2',
    title: 'Track Every Interactio',
    text: 'Log calls, meetings, and notes—all linked to your contacts. Set reminders to stay on schedule.',
    image: <TimelineIllustration width={250} height={250} />,
  },
  {
    key: '3',
    title: 'Plan Ahead',
    text: 'See upcoming meetings and calls in your calendar. Export reminders with one tap.',
    image: <CalendarIllustration width={250} height={250} />,
  },
  {
    key: '4',
    title: 'Get Started',
    text: 'Sign in or create an account to begin',
    image: <GetStartedIllustration width={250} height={250} />,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const value = await AsyncStorage.getItem('hasSeenOnboarding');
      if (value === 'true') {
        router.replace('/sign-in');
      } else {
        setHasSeenOnboarding(false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasSeenOnboarding(false);
    }
  };

  const onDone = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      router.replace('/sign-in');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      router.replace('/sign-in');
    }
  };

  if (hasSeenOnboarding === null) {
    return null; // or a loading indicator
  }

  const renderItem = ({ item }: { item: typeof slides[0] }) => {
    return (
      <View style={[styles.slide, { backgroundColor: colors.background }]}>
        {item.image}
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.text, { color: colors.secondaryText }]}>{item.text}</Text>
      </View>
    );
  };

  return (
    <AppIntroSlider
      renderItem={renderItem}
      data={slides}
      onDone={onDone}
      showSkipButton={false}
      showNextButton={true}
      showDoneButton={true}
      activeDotStyle={{ backgroundColor: '#1E1E1E' }}
      dotStyle={{ backgroundColor: colors.border }}
      nextLabel="Next"
      doneLabel="Get Started"
      renderNextButton={() => (
        <View style={styles.button}>
          <Text style={[styles.buttonText, { color: colors.placeholder }]}>Next</Text>
        </View>
      )}
      renderDoneButton={() => (
        <View style={styles.button}>
          <Text style={[styles.buttonText, { color: colors.placeholder }]}>Get Started</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  button: {
    // backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 