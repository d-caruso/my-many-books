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
  const [page, setPage] = useState(1);

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
        <ActivityIndicator size="large" />
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
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {users.length === 0 ? (
          <Text style={styles.emptyText}>
            {t('pages:admin.users.no_users', 'No users found')}
          </Text>
        ) : (
          users.map((user) => (
            <Card key={user.id} style={styles.userCard}>
              <Card.Content>
                <View style={styles.userHeader}>
                  <Text variant="titleMedium">{user.fullName}</Text>
                  <Chip
                    mode="flat"
                    style={user.role === 'admin' ? styles.adminChip : styles.userChip}
                  >
                    {user.role}
                  </Chip>
                </View>
                <Text variant="bodyMedium">{user.email}</Text>
                <View style={styles.userFooter}>
                  <Chip mode="outlined" compact>
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
