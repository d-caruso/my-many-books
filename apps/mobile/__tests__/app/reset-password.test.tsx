import React from 'react';
import renderer from 'react-test-renderer';
import { router, useLocalSearchParams } from 'expo-router';
import ResetPasswordScreen from '../../app/reset-password';
import { useAuth } from '@my-many-books/shared-auth';

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
const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;
const mockRouter = router as {
  push: jest.Mock;
  replace: jest.Mock;
  back: jest.Mock;
};

describe('Reset Password Screen', () => {
  const mockConfirmPasswordReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({});
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      confirmPasswordReset: mockConfirmPasswordReset,
    } as ReturnType<typeof useAuth>);
  });

  it('prefills email and code from search params', () => {
    mockUseLocalSearchParams.mockReturnValue({
      email: 'from-link@example.com',
      code: 'ABC123',
    });

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<ResetPasswordScreen />);
    });

    const root = (tree as renderer.ReactTestRenderer).root;
    const inputs = root.findAllByType('TextInput');

    expect(inputs[0]?.props.value).toBe('from-link@example.com');
    expect(inputs[1]?.props.value).toBe('ABC123');
  });

  it('submits password reset with locale', async () => {
    mockConfirmPasswordReset.mockResolvedValue({
      reset: true,
      signInRequired: true,
    });

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<ResetPasswordScreen />);
    });

    const root = (tree as renderer.ReactTestRenderer).root;
    const inputs = root.findAllByType('TextInput');
    const buttons = root.findAllByType('Button');
    const submitButton = buttons[0];

    expect(submitButton).toBeTruthy();

    await renderer.act(async () => {
      inputs[0]?.props.onChangeText('  user@example.com ');
      inputs[1]?.props.onChangeText('  123456 ');
      inputs[2]?.props.onChangeText('NewPassword1');
      inputs[3]?.props.onChangeText('NewPassword1');
    });

    const updatedSubmitButton = root.findAllByType('Button')[0];

    await renderer.act(async () => {
      await updatedSubmitButton?.props.onPress();
    });

    expect(mockConfirmPasswordReset).toHaveBeenCalledWith({
      email: 'user@example.com',
      code: '123456',
      newPassword: 'NewPassword1',
      locale: 'en',
    });
  });

  it('navigates back to sign in', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<ResetPasswordScreen />);
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
