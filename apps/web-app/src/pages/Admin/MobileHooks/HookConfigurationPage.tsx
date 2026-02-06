import React from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../AdminLayout';
import { HookListenerForm } from './components/configuration/HookListenerForm';
import { ActionSettingsForm } from './components/configuration/ActionSettingsForm';
import { RateLimitingForm } from './components/configuration/RateLimitingForm';
import { TestingPanel } from './components/configuration/TestingPanel';

export const HookConfigurationPage: React.FC = () => {
  const { t } = useTranslation('pages');
  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          {t('admin.mobile_hooks.pages.configuration.title')}
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <HookListenerForm />
          </Grid>
          <Grid item xs={12} md={6}>
            <ActionSettingsForm />
          </Grid>
          <Grid item xs={12} md={6}>
            <RateLimitingForm />
          </Grid>
          <Grid item xs={12}>
            <TestingPanel />
          </Grid>
        </Grid>
      </Box>
    </AdminLayout>
  );
};

export default HookConfigurationPage;
