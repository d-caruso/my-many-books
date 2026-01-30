import React from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { AdminLayout } from '../AdminLayout';
import { HookListenerForm } from './components/HookListenerForm';
import { ActionSettingsForm } from './components/ActionSettingsForm';
import { RateLimitingForm } from './components/RateLimitingForm';
import { TestingPanel } from './components/TestingPanel';

export const HookConfigurationPage: React.FC = () => {
  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Mobile Hooks Configuration
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

