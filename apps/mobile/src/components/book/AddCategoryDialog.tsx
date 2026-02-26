import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Category } from '@/types';
import { extractErrorMessage } from '@my-many-books/shared-utils';

interface AddCategoryDialogProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (category: Category) => void;
  onCreate: (input: { name: string }) => Promise<Category>;
}

export function AddCategoryDialog({
  visible,
  onClose,
  onCreated,
  onCreate,
}: AddCategoryDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setName('');
      setError(null);
      setSubmitting(false);
    }
  }, [visible]);

  const validationError = useMemo(() => {
    if (!name.trim()) {
      return t('dialogs:category.name_required');
    }
    return null;
  }, [name, t]);

  const handleSubmit = async () => {
    const currentValidationError = validationError;
    if (currentValidationError) {
      setError(currentValidationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await onCreate({ name: name.trim() });
      onCreated(created);
    } catch (err: unknown) {
      setError(extractErrorMessage(err) || t('dialogs:category.create_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={submitting ? undefined : onClose}>
        <Dialog.Title>{t('dialogs:category.add_title')}</Dialog.Title>
        <Dialog.Content>
          <View style={styles.content}>
            {error ? (
              <Text variant="bodySmall" style={styles.errorText}>
                {error}
              </Text>
            ) : null}

            <TextInput
              label={t('dialogs:category.name_label')}
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (error) setError(null);
              }}
              autoCapitalize="words"
              placeholder={t('dialogs:category.name_placeholder')}
              disabled={submitting}
            />
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose} disabled={submitting}>
            {t('common:cancel')}
          </Button>
          <Button onPress={handleSubmit} loading={submitting} disabled={submitting}>
            {submitting ? t('dialogs:category.creating') : t('dialogs:category.create_button')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  errorText: {
    color: '#b91c1c',
  },
});

export default AddCategoryDialog;
