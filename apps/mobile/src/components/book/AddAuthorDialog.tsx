import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Author } from '@my-many-books/shared-types';

interface AddAuthorDialogProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (author: Author) => void;
  onCreate: (input: { name: string; surname: string; nationality?: string }) => Promise<Author>;
}

export function AddAuthorDialog({
  visible,
  onClose,
  onCreated,
  onCreate,
}: AddAuthorDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [nationality, setNationality] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setName('');
      setSurname('');
      setNationality('');
      setError(null);
      setSubmitting(false);
    }
  }, [visible]);

  const validationError = useMemo(() => {
    if (!name.trim()) {
      return t('dialogs:author.name_required');
    }
    if (!surname.trim()) {
      return t('dialogs:author.surname_required');
    }
    return null;
  }, [name, surname, t]);

  const handleSubmit = async () => {
    const currentValidationError = validationError;
    if (currentValidationError) {
      setError(currentValidationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await onCreate({
        name: name.trim(),
        surname: surname.trim(),
        nationality: nationality.trim() || undefined,
      });
      onCreated(created);
    } catch (err: unknown) {
      const apiError = getApiErrorMessage(err);
      setError(apiError || t('dialogs:author.create_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={submitting ? undefined : onClose}>
        <Dialog.Title>{t('dialogs:author.add_title')}</Dialog.Title>
        <Dialog.Content>
          <View style={styles.content}>
            {error ? (
              <Text variant="bodySmall" style={styles.errorText}>
                {error}
              </Text>
            ) : null}

            <TextInput
              label={t('dialogs:author.name_label')}
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (error) setError(null);
              }}
              autoCapitalize="words"
              disabled={submitting}
            />

            <TextInput
              label={t('dialogs:author.surname_label')}
              value={surname}
              onChangeText={(value) => {
                setSurname(value);
                if (error) setError(null);
              }}
              autoCapitalize="words"
              disabled={submitting}
            />

            <TextInput
              label={t('dialogs:author.nationality_label')}
              value={nationality}
              onChangeText={(value) => {
                setNationality(value);
                if (error) setError(null);
              }}
              autoCapitalize="words"
              placeholder={t('dialogs:author.nationality_placeholder')}
              disabled={submitting}
            />
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose} disabled={submitting}>
            {t('common:cancel')}
          </Button>
          <Button onPress={handleSubmit} loading={submitting} disabled={submitting}>
            {submitting ? t('dialogs:author.creating') : t('dialogs:author.create_button')}
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

export default AddAuthorDialog;
  const getApiErrorMessage = (err: unknown): string | null => {
    if (typeof err === 'object' && err !== null) {
      const maybeResponse = (err as { response?: { data?: { error?: unknown } } }).response;
      if (typeof maybeResponse?.data?.error === 'string') {
        return maybeResponse.data.error;
      }
    }
    return null;
  };
