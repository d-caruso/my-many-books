import { Stack } from 'expo-router';

export default function AdminLayout() {
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
