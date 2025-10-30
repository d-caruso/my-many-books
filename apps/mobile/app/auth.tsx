import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';

type AuthMode = 'login' | 'register';

export default function AuthScreen() {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, register } = useAuth();

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      // Basic validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (authMode === 'register') {
        if (!name) {
          throw new Error('Name is required');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        await register(email, password, name);
      } else {
        await login(email, password);
      }

      // Navigation is handled by the auth context
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setError(null);
  };

  const handleModeChange = (mode: string) => {
    setAuthMode(mode as AuthMode);
    resetForm();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text variant="displaySmall" style={styles.title} accessibilityRole="header">
              My Many Books
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Your personal library in your pocket
            </Text>
          </View>

          <Card style={styles.authCard}>
            <Card.Content>
              <SegmentedButtons
                value={authMode}
                onValueChange={handleModeChange}
                buttons={[
                  { value: 'login', label: 'Login' },
                  { value: 'register', label: 'Register' },
                ]}
                style={styles.segmentedButtons}
                accessibilityLabel="Select authentication mode"
              />

              {error && (
                <View style={styles.errorContainer}>
                  <Text variant="bodyMedium" style={styles.errorText} accessibilityLiveRegion="assertive" nativeID="authError">
                    {error}
                  </Text>
                </View>
              )}

              {authMode === 'register' && (
                <TextInput
                  label="Name"
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  autoCapitalize="words"
                  autoComplete="name"
                  accessibilityInvalid={!!error}
                />
              )}

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                accessibilityInvalid={!!error}
              />

              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={authMode === 'login' ? 'password' : 'new-password'}
                accessibilityInvalid={!!error}
              />

              {authMode === 'register' && (
                <TextInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={styles.input}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  accessibilityInvalid={!!error}
                />
              )}

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                style={styles.submitButton}
                accessibilityLabel={authMode === 'login' ? 'Login' : 'Create Account'}
              >
                {authMode === 'login' ? 'Login' : 'Create Account'}
              </Button>
            </Card.Content>
          </Card>

          <View style={styles.footer}>
            <Text variant="bodySmall" style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  authCard: {
    marginBottom: 32,
  },
  segmentedButtons: {
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    opacity: 0.6,
  },
});