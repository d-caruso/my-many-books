import React from 'react';
import renderer from 'react-test-renderer';
import { useVideoPlayer } from 'expo-video';
import MiniVideoPlayer from '../MiniVideoPlayer';
import type { TutorialVideo } from '@/pages/HowTo/howToContent';

const mockUseVideoPlayer = useVideoPlayer as jest.Mock;

const video: TutorialVideo = {
  src: 'https://cdn.example.com/tutorials/add-book.mp4',
  captionKey: 'videos.add_book.caption',
};

const defaultProps = {
  video,
  label: 'How to add a book',
  caption: 'Mini tutorial for adding a book.',
  fallbackMessage: 'Video is temporarily unavailable.',
  testID: 'mini-video',
};

const renderComponent = () => {
  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(<MiniVideoPlayer {...defaultProps} />);
  });
  return tree as renderer.ReactTestRenderer;
};

describe('MiniVideoPlayer', () => {
  beforeEach(() => {
    mockUseVideoPlayer.mockClear();
  });

  it('renders VideoView when no error', () => {
    const tree = renderComponent();
    const player = tree.root.findAll(
      (node) => typeof node.type === 'string' && node.props.testID === 'mini-video-player'
    );
    expect(player).toHaveLength(1);
  });

  it('does not render fallback by default', () => {
    const tree = renderComponent();
    const fallback = tree.root.findAll(
      (node) => typeof node.type === 'string' && node.props.testID === 'mini-video-fallback'
    );
    expect(fallback).toHaveLength(0);
  });

  it('renders caption below the player', () => {
    const tree = renderComponent();
    const caption = tree.root.findAll(
      (node) => typeof node.type === 'string' && node.props.testID === 'mini-video-caption'
    );
    expect(caption).toHaveLength(1);
  });

  it('appends durationLabel to caption when provided', () => {
    const videoWithDuration: TutorialVideo = { ...video, durationLabel: '0:42' };
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<MiniVideoPlayer {...defaultProps} video={videoWithDuration} />);
    });
    const caption = (tree as renderer.ReactTestRenderer).root.findAll(
      (node) => typeof node.type === 'string' && node.props.testID === 'mini-video-caption'
    )[0];
    expect(caption.props.children).toContain('0:42');
  });

  it('shows fallback text and hides VideoView when statusChange error fires', () => {
    const tree = renderComponent();

    const player = mockUseVideoPlayer.mock.results[0].value;
    const statusChangeCb = player.addListener.mock.calls.find(
      ([event]: [string]) => event === 'statusChange'
    )?.[1];

    renderer.act(() => {
      statusChangeCb({ status: 'error' });
    });

    const fallback = tree.root.findAll(
      (node) => typeof node.type === 'string' && node.props.testID === 'mini-video-fallback'
    );
    const playerNode = tree.root.findAll(
      (node) => typeof node.type === 'string' && node.props.testID === 'mini-video-player'
    );
    expect(fallback).toHaveLength(1);
    expect(playerNode).toHaveLength(0);
  });

  it('caption remains visible after error', () => {
    const tree = renderComponent();

    const player = mockUseVideoPlayer.mock.results[0].value;
    const statusChangeCb = player.addListener.mock.calls.find(
      ([event]: [string]) => event === 'statusChange'
    )?.[1];

    renderer.act(() => {
      statusChangeCb({ status: 'error' });
    });

    const caption = tree.root.findAll(
      (node) => typeof node.type === 'string' && node.props.testID === 'mini-video-caption'
    );
    expect(caption).toHaveLength(1);
  });
});
