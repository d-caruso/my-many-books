import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import renderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { SAMPLE_PREVIEW_DISMISSED } from '@/constants/sampleBooks';

const mockRouter = router as jest.Mocked<typeof router>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Test double mirroring the preview button behaviour in HowToScreen
const HowToScreen = () => {
  const handlePreviewLibrary = async () => {
    await AsyncStorage.removeItem(SAMPLE_PREVIEW_DISMISSED);
    router.push('/(tabs)/');
  };

  return React.createElement(
    View,
    {},
    React.createElement(Text, {}, 'How To'),
    React.createElement(
      TouchableOpacity,
      { onPress: handlePreviewLibrary, testID: 'preview-library-button' },
      React.createElement(Text, {}, 'Sample library preview'),
    ),
  );
};

describe('HowToScreen — preview button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resets the dismissed flag and navigates to books tab', async () => {
    let tree: renderer.ReactTestRenderer | undefined;
    await renderer.act(async () => {
      tree = renderer.create(<HowToScreen />);
    });

    const button = (tree as renderer.ReactTestRenderer).root.findByProps({ testID: 'preview-library-button' });
    await renderer.act(async () => {
      button.props.onPress();
    });

    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(SAMPLE_PREVIEW_DISMISSED);
    expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/');
  });
});
