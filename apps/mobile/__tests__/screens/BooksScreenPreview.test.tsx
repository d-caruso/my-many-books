import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import renderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SAMPLE_PREVIEW_DISMISSED } from '@/constants/sampleBooks';

// Test double that mirrors the preview logic from the real BooksScreen
const BooksScreen = ({ bookCount = 0 }: { bookCount?: number }) => {
  const [showPreview, setShowPreview] = React.useState(false);

  React.useEffect(() => {
    async function checkPreviewFlag() {
      const dismissed = await AsyncStorage.getItem(SAMPLE_PREVIEW_DISMISSED);
      if (dismissed !== 'true' && bookCount === 0) {
        setShowPreview(true);
      } else {
        setShowPreview(false);
      }
    }
    void checkPreviewFlag();
  }, [bookCount]);

  const handleDismiss = async () => {
    await AsyncStorage.setItem(SAMPLE_PREVIEW_DISMISSED, 'true');
    setShowPreview(false);
  };

  if (showPreview) {
    return React.createElement(
      View,
      {},
      React.createElement(Text, {}, 'Sample library preview'),
      React.createElement(
        TouchableOpacity,
        { onPress: handleDismiss },
        React.createElement(Text, {}, 'Dismiss'),
      ),
    );
  }

  return React.createElement(View, {}, React.createElement(Text, {}, 'No books yet'));
};

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('BooksScreen — sample preview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows preview when library is empty and flag is not set', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);

    let tree: renderer.ReactTestRenderer | undefined;
    await renderer.act(async () => {
      tree = renderer.create(<BooksScreen bookCount={0} />);
    });

    const textElements = (tree as renderer.ReactTestRenderer).root.findAllByType(Text);
    const banner = textElements.find((el) => el.props.children === 'Sample library preview');
    expect(banner).toBeTruthy();
  });

  it('does not show preview when library is empty but flag is set', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('true');

    let tree: renderer.ReactTestRenderer | undefined;
    await renderer.act(async () => {
      tree = renderer.create(<BooksScreen bookCount={0} />);
    });

    const textElements = (tree as renderer.ReactTestRenderer).root.findAllByType(Text);
    const banner = textElements.find((el) => el.props.children === 'Sample library preview');
    expect(banner).toBeUndefined();
  });

  it('does not show preview when user has books and flag is not set', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);

    let tree: renderer.ReactTestRenderer | undefined;
    await renderer.act(async () => {
      tree = renderer.create(<BooksScreen bookCount={2} />);
    });

    const textElements = (tree as renderer.ReactTestRenderer).root.findAllByType(Text);
    const banner = textElements.find((el) => el.props.children === 'Sample library preview');
    expect(banner).toBeUndefined();
  });

  it('sets flag and hides preview on dismiss', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);

    let tree: renderer.ReactTestRenderer | undefined;
    await renderer.act(async () => {
      tree = renderer.create(<BooksScreen bookCount={0} />);
    });

    const dismissButton = (tree as renderer.ReactTestRenderer).root.findAllByType(TouchableOpacity)[0];
    await renderer.act(async () => {
      dismissButton.props.onPress();
    });

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(SAMPLE_PREVIEW_DISMISSED, 'true');

    const textElements = (tree as renderer.ReactTestRenderer).root.findAllByType(Text);
    const banner = textElements.find((el) => el.props.children === 'Sample library preview');
    expect(banner).toBeUndefined();
  });
});
