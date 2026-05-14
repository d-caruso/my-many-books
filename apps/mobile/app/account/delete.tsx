import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@my-many-books/shared-auth';
import { userAPI } from '@/services/api';

export default function DeleteAccountScreen() {
  const { t } = useTranslation('profile');
  const theme = useTheme();
  const router = useRouter();
  const { logout } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const canDelete = confirmText.trim() === 'DELETE' && !busy;

  const onDelete = async () => {
    setBusy(true);
    try {
      await userAPI.deleteAccount();
      await logout();
      router.replace('/auth');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">{t('delete_account_title')}</Text>
      <Text style={{ color: theme.colors.error }}>{t('delete_account_warning')}</Text>
      <TextInput
        label={t('delete_account_confirm')}
        value={confirmText}
        onChangeText={setConfirmText}
        autoCapitalize="characters"
      />
      <Button
        mode="contained"
        buttonColor={theme.colors.error}
        disabled={!canDelete}
        loading={busy}
        onPress={onDelete}
      >
        {t('delete_account_cta')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({ container: { padding: 16, gap: 12 } });
