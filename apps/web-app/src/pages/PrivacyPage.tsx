import React from 'react';
import { Box, Container, Divider, Link, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

const CONTACT_EMAIL = 'info@domenicocaruso.com';

const Section: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="h6" component="h2" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body1" color="text.secondary">
      {body}
    </Typography>
  </Box>
);

const PrivacyPage: React.FC = () => {
  const { t } = useTranslation('pages');

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('privacy.title')}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
        {t('privacy.last_updated')}
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        {t('privacy.intro')}
      </Typography>
      <Divider sx={{ mb: 4 }} />

      <Section title={t('privacy.section_collect_title')} body={t('privacy.section_collect_body')} />
      <Section title={t('privacy.section_use_title')} body={t('privacy.section_use_body')} />
      <Section title={t('privacy.section_storage_title')} body={t('privacy.section_storage_body')} />
      <Section title={t('privacy.section_deletion_title')} body={t('privacy.section_deletion_body')} />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          {t('privacy.section_contact_title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('privacy.section_contact_body')}{' '}
          <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>.
        </Typography>
      </Box>
    </Container>
  );
};

export default PrivacyPage;
