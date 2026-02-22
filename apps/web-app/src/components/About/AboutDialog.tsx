import React from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography
} from '@mui/material';
import { Trans, useTranslation } from 'react-i18next';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
  showDontShowAgain?: boolean;
  dontShowAgain?: boolean;
  onDontShowAgainChange?: (checked: boolean) => void;
  actionLabel?: string;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({
  open,
  onClose,
  showDontShowAgain = false,
  dontShowAgain = false,
  onDontShowAgainChange,
  actionLabel,
}) => {
  const { t } = useTranslation('common');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="about-dialog-title"
      aria-describedby="about-dialog-description"
    >
      <DialogTitle id="about-dialog-title">
        {t('about_app_title', 'What this app is for')}
      </DialogTitle>
      <DialogContent dividers>
        <Typography id="about-dialog-description" variant="body1">
          <Trans
            ns="common"
            i18nKey="about_app_body"
            defaults="<bold>My Many Books</bold> helps you organize your personal library, track reading status, search books, and manage your collection."
            components={{ bold: <strong key="about-app-name-bold" /> }}
          />
        </Typography>
        {showDontShowAgain && (
          <FormControlLabel
            sx={{ mt: 2 }}
            control={(
              <Checkbox
                checked={dontShowAgain}
                onChange={(event) => onDontShowAgainChange?.(event.target.checked)}
              />
            )}
            label={t('dont_show_again', "Don't show again")}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          {actionLabel ?? t('ok', 'OK')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AboutDialog;
