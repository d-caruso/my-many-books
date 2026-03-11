import React from 'react';
import renderer from 'react-test-renderer';
import { router } from 'expo-router';
import ForgotPasswordScreen from '../../app/forgot-password';
import { useAuth } from '@my-many-books/shared-auth';

jest.mock('@/i18n', () => ({
  changeLanguage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/components/LanguageSelector', () => () => null);

jest.mock('@my-many-books/shared-auth', () => ({
  useAuth: jest.fn(),
  AuthApiError: class AuthApiError extends Error {
    i18nKey: string;

    constructor(code: string, message: string, i18nKey: string) {
      super(message);
      this.name = code;
      this.i18nKey = i18nKey;
    }
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockRouter = router as {
  push: jest.Mock;
  replace: jest.Mock;
  back: jest.Mock;
};

describe('Forgot Password Screen', () => {
  const mockRequestPasswordReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      requestPasswordReset: mockRequestPasswordReset,
    } as ReturnType<typeof useAuth>);
  });

  it('submits forgot password request with trimmed email', async () => {
    mockRequestPasswordReset.mockResolvedValue({
      accepted: true,
      expiresInMinutes: 60,
    });

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<ForgotPasswordScreen />);
    });

    const root = (tree as renderer.ReactTestRenderer).root;
    const emailInput = root.findByType('TextInput');
    const buttons = root.findAllByType('Button');
    const submitButton = buttons[0];

    expect(submitButton).toBeTruthy();

    await renderer.act(async () => {
      emailInput.props.onChangeText('  user@example.com  ');
    });

    const updatedSubmitButton = root.findAllByType('Button')[0];

    await renderer.act(async () => {
      await updatedSubmitButton?.props.onPress();
    });

    expect(mockRequestPasswordReset).toHaveBeenCalledWith('user@example.com');
  });

  it('navigates back to sign in', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<ForgotPasswordScreen />);
    });

    const root = (tree as renderer.ReactTestRenderer).root;
    const buttons = root.findAllByType('Button');
    const backButton = buttons[1];

    expect(backButton).toBeTruthy();

    renderer.act(() => {
      backButton?.props.onPress();
    });

    expect(mockRouter.replace).toHaveBeenCalledWith('/auth');
  });
});
