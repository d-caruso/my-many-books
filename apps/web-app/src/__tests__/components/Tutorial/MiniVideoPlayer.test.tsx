import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MiniVideoPlayer from '../../../components/Tutorial/MiniVideoPlayer';

describe('MiniVideoPlayer', () => {
  const baseVideo = {
    src: '/tutorials/add-book.mp4',
    poster: '/tutorials/posters/add-book.jpg',
    captionKey: 'videos.add_book.caption',
    durationLabel: '00:20',
    tracks: [
      {
        src: '/tutorials/captions/en/add-book.vtt',
        srcLang: 'en' as const,
        label: 'English',
      },
      {
        src: '/tutorials/captions/it/add-book.vtt',
        srcLang: 'it' as const,
        label: 'Italian',
      },
    ],
  };

  test('renders video player with caption and duration', () => {
    const { container } = render(
      <MiniVideoPlayer
        video={baseVideo}
        label="Mini video"
        caption="Add book tutorial"
        fallbackMessage="Video unavailable"
        dataTestId="test-mini-video"
      />
    );

    expect(screen.getByTestId('test-mini-video-element')).toBeInTheDocument();
    expect(screen.getByTestId('test-mini-video-caption')).toHaveTextContent('Add book tutorial • 00:20');
    expect(container.querySelectorAll('track')).toHaveLength(2);
    expect(container.querySelector('track[srclang="en"]')).toHaveAttribute(
      'src',
      '/tutorials/captions/en/add-book.vtt'
    );
  });

  test('shows fallback message when video playback fails', () => {
    render(
      <MiniVideoPlayer
        video={baseVideo}
        label="Mini video"
        caption="Add book tutorial"
        fallbackMessage="Video unavailable"
        dataTestId="test-mini-video"
      />
    );

    fireEvent.error(screen.getByTestId('test-mini-video-element'));

    expect(screen.queryByTestId('test-mini-video-element')).not.toBeInTheDocument();
    expect(screen.getByTestId('test-mini-video-fallback')).toHaveTextContent('Video unavailable');
  });
});
