import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from './AdminLayout';

export const AdminSettingsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          {t('pages:admin.settings.page_title', 'Settings')}
        </Typography>

        <Paper sx={{ p: 3 }}>
          <Typography variant="body1" color="textSecondary">
            {t('pages:admin.settings.coming_soon', 'Settings configuration coming soon...')}
          </Typography>
        </Paper>
      </Box>
    </AdminLayout>
  );
};
