import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, Searchbar, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { adminAPI } from '@/services/api';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function UserManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page] = useState(1);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAdminUsers(page, 50, searchQuery || undefined);
      setUsers(response.users);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          accessibilityLabel={t('accessibility:loading_users', 'Loading users...')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder={t('pages:admin.users.search_placeholder', 'Search by name or email...')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        accessibilityLabel={t('accessibility:search_users_label', 'Search users')}
        accessibilityHint={t('accessibility:search_users_hint', 'Search for users by name or email address')}
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {users.length === 0 ? (
          <Text
            style={styles.emptyText}
            accessible={true}
            accessibilityRole="text"
          >
            {t('pages:admin.users.no_users', 'No users found')}
          </Text>
        ) : (
          users.map((user) => (
            <Card
              key={user.id}
              style={styles.userCard}
              accessible={true}
              accessibilityLabel={t('accessibility:user_card_label', '{{name}}, {{email}}, {{role}} role, {{status}}, joined {{date}}', {
                name: user.fullName,
                email: user.email,
                role: user.role,
                status: user.isActive ? t('common:active', 'Active') : t('common:inactive', 'Inactive'),
                date: new Date(user.createdAt).toLocaleDateString()
              })}
              accessibilityRole="summary"
            >
              <Card.Content>
                <View style={styles.userHeader}>
                  <Text variant="titleMedium">{user.fullName}</Text>
                  <Chip
                    mode="flat"
                    style={user.role === 'admin' ? styles.adminChip : styles.userChip}
                    accessible={true}
                    accessibilityLabel={t('accessibility:user_role', '{{role}} role', { role: user.role })}
                  >
                    {user.role}
                  </Chip>
                </View>
                <Text variant="bodyMedium">{user.email}</Text>
                <View style={styles.userFooter}>
                  <Chip
                    mode="outlined"
                    compact
                    accessible={true}
                    accessibilityLabel={user.isActive ? t('accessibility:status_active', 'Active status') : t('accessibility:status_inactive', 'Inactive status')}
                  >
                    {user.isActive ? t('common:active', 'Active') : t('common:inactive', 'Inactive')}
                  </Chip>
                  <Text variant="bodySmall">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
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
  searchBar: {
    marginBottom: 16,
  },
  userCard: {
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  adminChip: {
    backgroundColor: '#9c27b0',
  },
  userChip: {
    backgroundColor: '#2196f3',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
    color: '#666',
  },
});
