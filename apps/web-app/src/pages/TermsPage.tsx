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

const TermsPage: React.FC = () => {
  const { t } = useTranslation('pages');

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('terms.title')}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
        {t('terms.last_updated')}
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        {t('terms.intro')}
      </Typography>
      <Divider sx={{ mb: 4 }} />

      <Section title={t('terms.section_service_title')} body={t('terms.section_service_body')} />
      <Section title={t('terms.section_account_title')} body={t('terms.section_account_body')} />
      <Section title={t('terms.section_prohibited_title')} body={t('terms.section_prohibited_body')} />
      <Section title={t('terms.section_termination_title')} body={t('terms.section_termination_body')} />
      <Section title={t('terms.section_liability_title')} body={t('terms.section_liability_body')} />

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          {t('terms.section_contact_title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('terms.section_contact_body')}{' '}
          <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>.
        </Typography>
      </Box>
    </Container>
  );
};

export default TermsPage;
