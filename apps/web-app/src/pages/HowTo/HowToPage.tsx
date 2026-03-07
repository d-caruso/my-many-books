import React from 'react';
import { Box, Card, CardContent, Container, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  HOW_TO_SECTIONS,
  getTutorialCapabilities,
  getVisibleTutorialSections,
} from './howToContent';

const HowToPage: React.FC = () => {
  const { t } = useTranslation('tutorial');
  const capabilities = getTutorialCapabilities();
  const visibleSections = getVisibleTutorialSections(HOW_TO_SECTIONS, capabilities);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('page_title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t('page_description')}
      </Typography>

      <Stack spacing={4}>
        {visibleSections.map((section) => (
          <Box
            component="section"
            key={section.id}
            aria-labelledby={`how-to-section-${section.id}`}
          >
            <Typography
              id={`how-to-section-${section.id}`}
              variant="h5"
              component="h2"
              sx={{ mb: 2 }}
            >
              {t(section.titleKey)}
            </Typography>

            <Stack spacing={2}>
              {section.items.map((item) => (
                <Card key={item.id} variant="outlined" data-testid={`how-to-card-${item.id}`}>
                  <CardContent>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {t(item.titleKey)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {t(item.descriptionKey)}
                    </Typography>

                    <Box component="ol" sx={{ m: 0, pl: 3 }}>
                      {item.stepsKeys.map((stepKey, index) => (
                        <Box component="li" key={`${item.id}-${index}`} sx={{ mb: 0.75 }}>
                          <Typography variant="body2">{t(stepKey)}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>

      {!visibleSections.length && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t('no_guides_available', 'No guides available right now.')}
        </Typography>
      )}
    </Container>
  );
};

export default HowToPage;
