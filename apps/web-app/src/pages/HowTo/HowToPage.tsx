import React from 'react';
import { Box, Button, Card, CardContent, Container, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MiniVideoPlayer } from '../../components/Tutorial/MiniVideoPlayer';
import {
  HOW_TO_SECTIONS,
  getTutorialCapabilities,
  getVisibleTutorialSections,
} from './howToContent';

const HowToPage: React.FC = () => {
  const { t } = useTranslation('tutorial');
  const navigate = useNavigate();
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

                    {item.video && (
                      <MiniVideoPlayer
                        video={item.video}
                        label={t('video.label', 'Mini video')}
                        caption={t(item.video.captionKey)}
                        fallbackMessage={t('video.fallback', 'Video unavailable right now.')}
                        dataTestId={`how-to-video-${item.id}`}
                      />
                    )}

                    {item.ctaPath && (
                      <Box
                        sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}
                        data-testid={`how-to-cta-container-${item.id}`}
                      >
                        <Button
                          variant="contained"
                          onClick={() => navigate(item.ctaPath)}
                          data-testid={`how-to-cta-${item.id}`}
                        >
                          {t(item.ctaLabelKey ?? 'cta_try_it_now', 'Try it now')}
                        </Button>
                      </Box>
                    )}
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
