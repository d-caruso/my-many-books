import React from 'react';
import renderer from 'react-test-renderer';
import { router } from 'expo-router';
import AccountScreen from '../../app/account';
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
const mockRouter = router as {
  push: jest.Mock;
  replace: jest.Mock;
  back: jest.Mock;
};

describe('Account Screen', () => {
  const mockChangePassword = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'user@example.com',
        name: 'Test',
        surname: 'User',
        role: 'user',
        isActive: true,
      },
      loading: false,
      changePassword: mockChangePassword,
    } as ReturnType<typeof useAuth>);
  });

  it('redirects to auth when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      changePassword: mockChangePassword,
    } as ReturnType<typeof useAuth>);

    renderer.act(() => {
      renderer.create(<AccountScreen />);
    });

    expect(mockRouter.replace).toHaveBeenCalledWith('/auth');
  });

  it('submits change password request with locale', async () => {
    mockChangePassword.mockResolvedValue(undefined);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<AccountScreen />);
    });

    const root = (tree as renderer.ReactTestRenderer).root;
    const inputs = root.findAllByType('TextInput');
    const buttons = root.findAllByType('Button');
    const submitButton = buttons[0];

    expect(inputs).toHaveLength(4);
    expect(submitButton).toBeTruthy();

    await renderer.act(async () => {
      inputs[1]?.props.onChangeText('CurrentPass1');
      inputs[2]?.props.onChangeText('NewPassword1');
      inputs[3]?.props.onChangeText('NewPassword1');
    });

    const updatedSubmitButton = root.findAllByType('Button')[0];

    await renderer.act(async () => {
      await updatedSubmitButton?.props.onPress();
    });

    expect(mockChangePassword).toHaveBeenCalledWith({
      currentPassword: 'CurrentPass1',
      newPassword: 'NewPassword1',
      locale: 'en',
    });
  });

  it('does not submit when current password is missing', async () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<AccountScreen />);
    });

    const root = (tree as renderer.ReactTestRenderer).root;
    const inputs = root.findAllByType('TextInput');
    const buttons = root.findAllByType('Button');
    const submitButton = buttons[0];

    await renderer.act(async () => {
      inputs[2]?.props.onChangeText('NewPassword1');
      inputs[3]?.props.onChangeText('NewPassword1');
      await submitButton?.props.onPress();
    });

    expect(mockChangePassword).not.toHaveBeenCalled();
  });
});
