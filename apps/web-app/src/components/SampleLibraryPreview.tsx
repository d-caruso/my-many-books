import React from 'react';
import { Box, Button, Alert, Paper, Typography, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SAMPLE_BOOKS } from '../constants/sampleBooks';

interface SampleLibraryPreviewProps {
  onDismiss: () => void;
}

export const SampleLibraryPreview: React.FC<SampleLibraryPreviewProps> = ({ onDismiss }) => {
  const { t } = useTranslation('books');

  return (
    <Box>
      <Alert
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={onDismiss}>
            {t('preview_banner_dismiss')}
          </Button>
        }
        sx={{ mb: 3 }}
      >
        <Typography variant="subtitle2" fontWeight="bold">
          {t('preview_banner_title')}
        </Typography>
        <Typography variant="body2">{t('preview_banner_description')}</Typography>
      </Alert>

      <Box display="flex" flexDirection="column" gap={1}>
        {SAMPLE_BOOKS.map((book) => (
          <Paper
            key={book.id}
            variant="outlined"
            sx={{ p: 2, opacity: 0.6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant="body1" fontWeight="medium">
                {book.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {book.authorName}
              </Typography>
            </Box>
            <Chip label={t('preview_badge')} size="small" />
          </Paper>
        ))}
      </Box>
    </Box>
  );
};
