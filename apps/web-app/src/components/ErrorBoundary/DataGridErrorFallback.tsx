import React from 'react';
import { Box, Typography, Button, Alert, Stack } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TableIcon from '@mui/icons-material/TableChart';
import { useTranslation } from 'react-i18next';

interface DataGridErrorFallbackProps {
  error: Error;
  reset: () => void;
}

export const DataGridErrorFallback: React.FC<DataGridErrorFallbackProps> = ({
  error,
  reset
}) => {
  const { t } = useTranslation();

  return (
    <Box
      data-testid="datagrid-error-fallback"
      sx={{
        p: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400
      }}
    >
      <Stack spacing={3} alignItems="center" sx={{ maxWidth: 500 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            bgcolor: 'error.light',
            color: 'error.contrastText'
          }}
        >
          <TableIcon sx={{ fontSize: 40 }} />
        </Box>

        <Box textAlign="center">
          <Typography variant="h6" fontWeight="600" gutterBottom>
            {t('admin:table_error_title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('admin:table_error_message')}
          </Typography>
        </Box>

        <Alert severity="error" sx={{ width: '100%' }}>
          <Typography variant="caption" sx={{ wordBreak: 'break-word' }}>
            {error.message}
          </Typography>
        </Alert>

        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={reset}
          data-testid="retry-datagrid"
        >
          {t('common:retry')}
        </Button>
      </Stack>
    </Box>
  );
};
