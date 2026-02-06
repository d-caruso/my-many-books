import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../AdminLayout';
import { TestingPanel } from './components/configuration/TestingPanel';

export const MobileHookTestingPage: React.FC = () => {
  const { t } = useTranslation('pages');
  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          {t('admin.mobile_hooks.pages.testing.title')}
        </Typography>
        <TestingPanel />
      </Box>
    </AdminLayout>
  );
};

export default MobileHookTestingPage;
