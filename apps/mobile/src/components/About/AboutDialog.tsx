import React from 'react';
import { StyleSheet, Text as RNText } from 'react-native';
import { Button, Checkbox, Dialog, Portal, Text } from 'react-native-paper';
import { Trans, useTranslation } from 'react-i18next';

interface AboutDialogProps {
  visible: boolean;
  onClose: () => void;
  showDontShowAgain?: boolean;
  dontShowAgain?: boolean;
  onDontShowAgainChange?: (checked: boolean) => void;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({
  visible,
  onClose,
  showDontShowAgain = false,
  dontShowAgain = false,
  onDontShowAgainChange,
}) => {
  const { t } = useTranslation('common');

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onClose}
      >
        <Dialog.Title>{t('about_app_title', 'What this app is for')}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">
            <Trans
              ns="common"
              i18nKey="about_app_body"
              defaults="<bold>My Many Books</bold> helps you organize your personal library, track reading status, search books, and manage your collection."
              components={{ bold: <RNText key="about-app-name-bold" style={styles.bold} /> }}
            />
          </Text>
          {showDontShowAgain && (
            <Checkbox.Item
              label={t('dont_show_again', "Don't show again")}
              status={dontShowAgain ? 'checked' : 'unchecked'}
              onPress={() => onDontShowAgainChange?.(!dontShowAgain)}
              style={styles.checkbox}
            />
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onClose}>{t('ok', 'OK')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  checkbox: {
    marginTop: 8,
    paddingHorizontal: 0,
  },
  bold: {
    fontWeight: '700',
  },
});

export default AboutDialog;
