import React, { useEffect, useState } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { type TutorialVideo } from '../../pages/HowTo/howToContent';

interface MiniVideoPlayerProps {
  video: TutorialVideo;
  label: string;
  caption: string;
  fallbackMessage: string;
  dataTestId: string;
}

export const MiniVideoPlayer: React.FC<MiniVideoPlayerProps> = ({
  video,
  label,
  caption,
  fallbackMessage,
  dataTestId,
}) => {
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const captionId = `${dataTestId}-caption`;

  useEffect(() => {
    setHasPlaybackError(false);
  }, [video.src]);

  return (
    <Stack spacing={1} sx={{ mt: 2 }} data-testid={dataTestId}>
      <Typography variant="subtitle2" component="h4">
        {label}
      </Typography>

      {hasPlaybackError ? (
        <Alert severity="info" data-testid={`${dataTestId}-fallback`}>
          {fallbackMessage}
        </Alert>
      ) : (
        <Box
          component="video"
          controls
          preload="metadata"
          src={video.src}
          poster={video.poster}
          onError={() => setHasPlaybackError(true)}
          aria-label={label}
          aria-describedby={captionId}
          data-testid={`${dataTestId}-element`}
          sx={{
            width: '100%',
            borderRadius: 1,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            backgroundColor: 'background.default',
          }}
        />
      )}

      <Typography
        id={captionId}
        variant="caption"
        color="text.secondary"
        component="p"
        data-testid={`${dataTestId}-caption`}
      >
        {video.durationLabel ? `${caption} • ${video.durationLabel}` : caption}
      </Typography>
    </Stack>
  );
};

export default MiniVideoPlayer;
