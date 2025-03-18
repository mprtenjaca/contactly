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
  Dimensions,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { signIn } from '../../services/AuthService';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const result = await signIn(email, password);
      
      if (result.error) {
        const errorLower = result.error.toLowerCase();
        
        if (errorLower.includes('email not confirmed')) {
          Alert.alert(
            'Verification Required',
            'Please check your email and click the verification link before signing in.',
            [{ text: 'OK', style: 'default' }]
          );
          return;
        }
        
        if (errorLower.includes('invalid') || errorLower.includes('credentials')) {
          Alert.alert('Sign In Failed', 'Invalid email or password');
          return;
        }

        Alert.alert('Sign In Failed', 'Please check your credentials and try again');
        return;
      }
      
      if (result.data?.session) {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    header: {
      height: 350,
      position: 'relative',
      backgroundColor: '#2563eb',
    },
    backButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 60 : 40,
      left: 20,
      zIndex: 1,
    },
    wave: {
      position: 'absolute',
      bottom: -50,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
    },
    welcomeContainer: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 150 : 130,
      left: 24,
    },
    welcomeText: {
      fontSize: 32,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 4,
    },
    form: {
      paddingTop: 60,
    },
    inputContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    input: {
      height: 48,
      backgroundColor: '#f8fafc',
      borderRadius: 8,
      paddingHorizontal: 48,
      fontSize: 16,
      borderWidth: 0,
      color: '#1a1a1a',
    },
    inputIcon: {
      position: 'absolute',
      left: 16,
      top: '50%',
      transform: [{ translateY: -10 }],
      zIndex: 1,
    },
    passwordContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    eyeIcon: {
      position: 'absolute',
      right: 16,
      top: '50%',
      transform: [{ translateY: -10 }],
      zIndex: 1,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginTop: 4,
      marginBottom: 32,
    },
    forgotPasswordText: {
      color: '#2563eb',
      fontSize: 14,
    },
    button: {
      height: 48,
      backgroundColor: '#2563eb',
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },
    footerText: {
      color: '#64748b',
      fontSize: 14,
    },
    footerLink: {
      color: '#2563eb',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 4,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Welcome Back</Text>
        </View>

        <Svg
          height="180"
          width={width + 5}
          viewBox="0 0 1440 320"
          style={styles.wave}
        >
          <Path
            fill="#fff"
            d="M0,128L40,149.3C80,171,160,213,240,224C320,235,400,213,480,181.3C560,149,640,107,720,101.3C800,96,880,128,960,154.7C1040,181,1120,203,1200,192C1280,181,1360,139,1400,117.3L1440,96L1440,320L1400,320C1360,320,1280,320,1200,320C1120,320,1040,320,960,320C880,320,800,320,720,320C640,320,560,320,480,320C400,320,320,320,240,320C160,320,80,320,40,320L0,320Z"
          />
        </Svg>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons 
                name="mail-outline" 
                size={20} 
                color="#94a3b8" 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="off"
              />
            </View>

            <View style={styles.passwordContainer}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color="#94a3b8" 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="off"
                textContentType="password"
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, loading && { opacity: 0.7 }]}
              onPress={handleSignIn}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Signing In...' : 'Log In'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <Link href="/sign-up" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

 