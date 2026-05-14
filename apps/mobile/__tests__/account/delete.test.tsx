import React from 'react';
import { act } from 'react-test-renderer';
import renderer from 'react-test-renderer';
import DeleteAccountScreen from '../../app/account/delete';
import { userAPI } from '@/services/api';

const mockLogout = jest.fn();

jest.mock('@my-many-books/shared-auth', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (userAPI.deleteAccount as jest.Mock).mockResolvedValue(undefined);
});

describe('DeleteAccountScreen', () => {
  it('renders without crashing', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DeleteAccountScreen />);
    });
    expect(tree!.toJSON()).toBeTruthy();
  });

  it('disables the delete button until DELETE is typed', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DeleteAccountScreen />);
    });

    const findButton = () =>
      tree!.root.findAll((node) => node.props.disabled !== undefined && node.props.onPress !== undefined)[0];

    expect(findButton().props.disabled).toBe(true);

    act(() => {
      tree!.root
        .findAll((node) => node.props.onChangeText !== undefined)[0]
        .props.onChangeText('DELETE');
    });

    expect(findButton().props.disabled).toBe(false);
  });

  it('calls deleteAccount and logout on confirm', async () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<DeleteAccountScreen />);
    });

    act(() => {
      tree!.root
        .findAll((node) => node.props.onChangeText !== undefined)[0]
        .props.onChangeText('DELETE');
    });

    await act(async () => {
      tree!.root
        .findAll((node) => node.props.disabled === false && node.props.onPress !== undefined)[0]
        .props.onPress();
    });

    expect(userAPI.deleteAccount).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
  });
});
