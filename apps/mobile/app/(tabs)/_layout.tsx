import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/auth" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#757575',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('books:my_books'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="library-books" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: `${t('books:my_books')} tab`,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('search'),
          tabBarIcon: ({ color, size}) => (
            <MaterialIcons name="search" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: `${t('search')} tab`,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: t('scan'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="qr-code-scanner" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: `${t('scan')} tab`,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: `${t('profile')} tab`,
        }}
      />
    </Tabs>
  );
}
