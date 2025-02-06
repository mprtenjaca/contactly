import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { signUp } from '../../services/AuthService';
import { Ionicons } from '@expo/vector-icons';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import { useGoogleAuth, signInWithGoogle } from '../../services/GoogleAuthService';

export default function SignUpScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { promptAsync } = useGoogleAuth();

  const handleSignUp = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      const { error, user } = await signUp(email, password, firstName, lastName);
      
      if (error) {
        Alert.alert('Error', error);
        return;
      }

      if (user) {
        Alert.alert(
          "Email Verification Required",
          "Please check your email and verify your account before signing in.",
          [
            {
              text: "OK",
              onPress: () => router.replace('/sign-in')
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to sign up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const userInfo = await signInWithGoogle(promptAsync);
      if (userInfo) {
        const user = await signUp(
          userInfo.email,
          '', // You might want to generate a random password or handle this differently
          userInfo.given_name,
          userInfo.family_name
        );
        if (user) {
          router.replace('/(tabs)');
        }
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      Alert.alert('Error', 'Failed to sign in with Google');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    backButton: {
      padding: 8,
      marginLeft: -8,
    },
    logoContainer: {
      alignItems: 'center',
    },
    logo: {
      width: 180,
      height: 180,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 32,
      color: colors.text,
    },
    form: {
      paddingHorizontal: 24,
    },
    input: {
      height: 52,
      borderRadius: 10,
      paddingHorizontal: 16,
      fontSize: 16,
      marginBottom: 16,
    },
    button: {
      height: 52,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      marginBottom: 16,
      backgroundColor: colors.selectedCategory,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.separator,
    },
    dividerText: {
      paddingHorizontal: 16,
      fontSize: 14,
      color: colors.secondaryText,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    footerText: {
      fontSize: 14,
      color: colors.secondaryText,
    },
    footerLink: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.selectedCategory,
    },
  });

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/contactly-transparent.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Create Account</Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.searchBar, color: colors.text }]}
            placeholder="First Name"
            placeholderTextColor={colors.secondaryText}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.searchBar, color: colors.text }]}
            placeholder="Last Name"
            placeholderTextColor={colors.secondaryText}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.searchBar, color: colors.text }]}
            placeholder="Email"
            placeholderTextColor={colors.secondaryText}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.searchBar, color: colors.text }]}
            placeholder="Password"
            placeholderTextColor={colors.secondaryText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.searchBar, color: colors.text }]}
            placeholder="Confirm Password"
            placeholderTextColor={colors.secondaryText}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity 
            style={styles.button}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <GoogleSignInButton onPress={handleGoogleSignIn} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
            </Text>
            <Link href="/sign-in" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
} 