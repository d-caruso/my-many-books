import React from 'react';
import { Box, Typography } from '@mui/material';
import { AdminLayout } from '../AdminLayout';
import { TestingPanel } from './components/configuration/TestingPanel';

export const MobileHookTestingPage: React.FC = () => {
  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Mobile Hooks Testing
        </Typography>
        <TestingPanel />
      </Box>
    </AdminLayout>
  );
};

export default MobileHookTestingPage;
