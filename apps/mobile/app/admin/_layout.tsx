import { Stack, Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/auth" />;
  }

  if (user.role !== 'admin') {
    return (
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          Access Denied
        </Text>
        <Text variant="bodyLarge" style={styles.message}>
          You do not have permission to access this area.
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
