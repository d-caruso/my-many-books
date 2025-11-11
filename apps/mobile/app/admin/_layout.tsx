import { Stack, Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/auth" />;
  }

  if (user.role !== 'admin') {
    return (
      <View
        style={styles.container}
        accessible={true}
        accessibilityRole="alert"
<<<<<<< HEAD
        accessibilityLabel={t('pages:admin.access_denied_message', 'Access denied. You do not have permission to access this area.')}
=======
        accessibilityLabel={t('accessibility:access_denied_message', 'Access denied. You do not have permission to access this area.')}
>>>>>>> task/accessibility-phase-5
      >
        <Text variant="headlineMedium" style={styles.title}>
          {t('pages:admin.access_denied', 'Access Denied')}
        </Text>
        <Text variant="bodyLarge" style={styles.message}>
          {t('pages:admin.no_permission', 'You do not have permission to access this area.')}
        </Text>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Admin Dashboard',
          headerShown: true
        }}
      />
      <Stack.Screen
        name="users"
        options={{
          title: 'User Management',
          headerShown: true
        }}
      />
      <Stack.Screen
        name="books"
        options={{
          title: 'Book Management',
          headerShown: true
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerShown: true
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    marginBottom: 16,
    color: '#d32f2f',
  },
  message: {
    textAlign: 'center',
    color: '#666',
  },
});
