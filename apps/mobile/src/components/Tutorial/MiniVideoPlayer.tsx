import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { TutorialVideo } from '@/pages/HowTo/howToContent';

interface Props {
  video: TutorialVideo;
  label: string;
  caption: string;
  fallbackMessage: string;
  testID: string;
}

export default function MiniVideoPlayer({ video, label, caption, fallbackMessage, testID }: Props) {
  const [hasError, setHasError] = useState(false);
  const player = useVideoPlayer(video.src, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }: { status: string }) => {
      if (status === 'error') setHasError(true);
    });
    return () => sub.remove();
  }, [player]);

  return (
    <View testID={testID}>
      {hasError ? (
        <Text testID={`${testID}-fallback`}>{fallbackMessage}</Text>
      ) : (
        <VideoView
          player={player}
          nativeControls
          contentFit="contain"
          accessibilityLabel={label}
          style={styles.video}
          testID={`${testID}-player`}
        />
      )}
      <Text variant="bodySmall" testID={`${testID}-caption`} style={styles.caption}>
        {video.durationLabel ? `${caption} • ${video.durationLabel}` : caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  caption: {
    marginTop: 6,
    opacity: 0.7,
    textAlign: 'center',
  },
});
