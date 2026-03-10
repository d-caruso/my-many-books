import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@my-many-books/shared-auth';
import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { SyncQueueBadge } from '@/components/SyncQueueBadge';

const logoMark = require('../../assets/logo-mark-primary.png');

export default function TabLayout() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const appName = t('common:app_name', 'My Many Books');

  if (loading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/auth" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <SyncQueueBadge />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          headerShown: true,
          headerTitleAlign: 'center',
          headerTitle: () => (
            <View style={styles.headerBrand}>
              <Image
                source={logoMark}
                style={styles.headerLogo}
                accessibilityRole="image"
                accessibilityLabel={`${appName} logo`}
              />
              <Text style={styles.headerTitle}>{appName}</Text>
            </View>
          ),
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
        name="queue"
        options={{
          title: t('sync.queue.title', { ns: 'offline' }),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="sync" size={size} color={color} />
          ),
          tabBarAccessibilityLabel: `${t('sync.queue.title', { ns: 'offline' })} tab`,
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
    </View>
  );
}

const styles = StyleSheet.create({
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
  },
});
