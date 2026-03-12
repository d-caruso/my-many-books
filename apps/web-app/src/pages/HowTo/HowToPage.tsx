import React from 'react';
import { Box, Button, Card, CardContent, Container, Link, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import LockIcon from '@mui/icons-material/Lock';
import { MiniVideoPlayer } from '../../components/Tutorial/MiniVideoPlayer';
import {
  HOW_TO_SECTIONS,
  getTutorialCapabilities,
  getVisibleTutorialSections,
} from './howToContent';

const CARD_ICONS: Record<string, React.ElementType> = {
  'add-book': LibraryAddIcon,
  'modify-book': EditIcon,
  'delete-book': DeleteIcon,
  'scanner': QrCodeScannerIcon,
  'assign-authors-categories': PersonAddIcon,
  'add-authors-categories': GroupAddIcon,
  'modify-delete-authors-categories': ManageAccountsIcon,
  'change-password': LockIcon,
};

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

      {visibleSections.length > 0 && (
        <Box component="nav" aria-label={t('toc_label')} sx={{ mb: 4 }}>
          <Typography variant="subtitle2" component="p" color="text.secondary" gutterBottom>
            {t('toc_label')}
          </Typography>
          <Stack component="ul" sx={{ pl: 0, m: 0, listStyle: 'none' }} spacing={0.5}>
            {visibleSections.flatMap((section) =>
              section.items.map((item) => (
                <Box component="li" key={item.id}>
                  <Link href={`#how-to-card-${item.id}`} underline="hover" variant="body2">
                    {t(item.titleKey)}
                  </Link>
                </Box>
              ))
            )}
          </Stack>
        </Box>
      )}

      <Stack spacing={4}>
        {visibleSections.map((section) => (
          <Box
            component="section"
            key={section.id}
            aria-labelledby={`how-to-section-${section.id}`}
          >
            {visibleSections.length > 1 && (
              <Typography
                id={`how-to-section-${section.id}`}
                variant="h5"
                component="p"
                sx={{ mb: 2 }}
              >
                {t(section.titleKey)}
              </Typography>
            )}

            <Stack spacing={2}>
              {section.items.map((item) => {
                const CardIcon = CARD_ICONS[item.id];
                return (
                  <Card
                    key={item.id}
                    variant="outlined"
                    id={`how-to-card-${item.id}`}
                    data-testid={`how-to-card-${item.id}`}
                  >
                    <CardContent>
                      <Typography
                        variant="h6"
                        component="h2"
                        gutterBottom
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        {CardIcon && <CardIcon fontSize="small" color="primary" />}
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
                          sx={{
                            mt: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: 0.5,
                          }}
                          data-testid={`how-to-cta-container-${item.id}`}
                        >
                          <Button
                            variant="contained"
                            onClick={() => navigate(item.ctaPath!)}
                            data-testid={`how-to-cta-${item.id}`}
                          >
                            {t(item.ctaLabelKey ?? 'cta_try_it_now')}
                          </Button>
                          {item.ctaNoteKey && (
                            <Typography variant="caption" color="text.secondary">
                              {t(item.ctaNoteKey)}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
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
