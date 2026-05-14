import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { adminAPI } from '@/services/api';
import { mobileHooks, MOBILE_EVENTS } from '@/services/hooks/mobileHooks';
import { extractErrorDetails } from '@my-many-books/shared-utils';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  totalBooks: number;
}

function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminAPI.getAdminStats<DashboardStats>();
      setStats(data);
    } catch (err: unknown) {
      const details = extractErrorDetails(err);
      mobileHooks.emit(MOBILE_EVENTS.ERROR.API_RESPONSE, {
        operation: 'fetch_admin_stats',
        error: details.message,
        statusCode: details.status,
        source: 'admin_dashboard'
      });
      setError(t('pages:admin.dashboard.failed_to_load_statistics', 'Failed to load statistics'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          accessibilityLabel={t('accessibility:loading_statistics', 'Loading statistics...')}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={styles.centered}
        accessible={true}
        accessibilityRole="alert"
        accessibilityLabel={t('accessibility:error_message', 'Error: {{message}}', { message: error })}
      >
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.statsGrid}>
        <Card
          style={styles.statCard}
          accessible={true}
          accessibilityLabel={t('accessibility:stat_total_users', 'Total Users: {{count}}', { count: stats?.totalUsers || 0 })}
          accessibilityRole="summary"
        >
          <Card.Content>
            <Text variant="labelLarge">{t('pages:admin.dashboard.total_users', 'Total Users')}</Text>
            <Text variant="displaySmall">{stats?.totalUsers || 0}</Text>
          </Card.Content>
        </Card>

        <Card
          style={styles.statCard}
          accessible={true}
          accessibilityLabel={t('accessibility:stat_total_books', 'Total Books: {{count}}', { count: stats?.totalBooks || 0 })}
          accessibilityRole="summary"
        >
          <Card.Content>
            <Text variant="labelLarge">{t('pages:admin.dashboard.total_books', 'Total Books')}</Text>
            <Text variant="displaySmall">{stats?.totalBooks || 0}</Text>
          </Card.Content>
        </Card>

        <Card
          style={styles.statCard}
          accessible={true}
          accessibilityLabel={t('accessibility:stat_active_users', 'Active Users: {{count}}', { count: stats?.activeUsers || 0 })}
          accessibilityRole="summary"
        >
          <Card.Content>
            <Text variant="labelLarge">{t('pages:admin.dashboard.active_users', 'Active Users')}</Text>
            <Text variant="displaySmall">{stats?.activeUsers || 0}</Text>
          </Card.Content>
        </Card>

        <Card
          style={styles.statCard}
          accessible={true}
          accessibilityLabel={t('accessibility:stat_admin_users', 'Admin Users: {{count}}', { count: stats?.adminUsers || 0 })}
          accessibilityRole="summary"
        >
          <Card.Content>
            <Text variant="labelLarge">{t('pages:admin.dashboard.admin_users', 'Admin Users')}</Text>
            <Text variant="displaySmall">{stats?.adminUsers || 0}</Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.navigation}>
        <Button
          mode="contained"
          onPress={() => router.push('/admin/users')}
          style={styles.navButton}
          accessibilityLabel={t('pages:admin.menu.users', 'Users')}
          accessibilityHint={t('accessibility:navigate_to_user_management', 'Navigate to user management screen')}
        >
          {t('pages:admin.menu.users', 'Users')}
        </Button>
        <Button
          mode="contained"
          onPress={() => router.push('/admin/books')}
          style={styles.navButton}
          accessibilityLabel={t('pages:admin.menu.books', 'Books')}
          accessibilityHint={t('accessibility:navigate_to_book_management', 'Navigate to book management screen')}
        >
          {t('pages:admin.menu.books', 'Books')}
        </Button>
        <Button
          mode="contained"
          onPress={() => router.push('/admin/settings')}
          style={styles.navButton}
          accessibilityLabel={t('pages:admin.menu.settings', 'Settings')}
          accessibilityHint={t('accessibility:navigate_to_settings', 'Navigate to admin settings screen')}
        >
          {t('pages:admin.menu.settings', 'Settings')}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: 'red',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
  },
  navigation: {
    gap: 12,
  },
  navButton: {
    marginBottom: 8,
  },
});

export default function AdminDashboardRoute() {
  return (
    <PageErrorBoundary screenName="AdminDashboard">
      <AdminDashboard />
    </PageErrorBoundary>
  );
}
