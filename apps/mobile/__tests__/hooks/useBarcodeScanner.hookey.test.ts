import { renderHook, act } from '@testing-library/react-hooks';
import { Camera } from 'expo-camera';

import { useBarcodeScanner } from '../../src/hooks/useBarcodeScanner';
import { mobileHooks, MOBILE_EVENTS } from '@/services/hooks/mobileHooks';
import { HOOK_PAYLOAD_SOURCES } from '@/services/hooks/hookPayloadConstants';

jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(),
  },
}));

jest.mock('@/services/hooks/mobileHooks', () => {
  const actual = jest.requireActual('../../src/services/hooks/eventsSchema');
  return {
    mobileHooks: {
      emit: jest.fn().mockResolvedValue(undefined),
    },
    MOBILE_EVENTS: actual.MOBILE_EVENTS,
  };
});

const mockRequestCameraPermissionsAsync = Camera.requestCameraPermissionsAsync as jest.Mock;

describe('useBarcodeScanner hookey emits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits permission request and granted events', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true });

    const { result } = renderHook(() => useBarcodeScanner());

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.SCANNER.PERMISSION.REQUEST,
      expect.objectContaining({
        source: HOOK_PAYLOAD_SOURCES.USE_BARCODE_SCANNER_REQUEST_PERMISSION,
      })
    );
    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.SCANNER.PERMISSION.GRANTED,
      expect.objectContaining({
        source: HOOK_PAYLOAD_SOURCES.USE_BARCODE_SCANNER_REQUEST_PERMISSION,
      })
    );
  });

  it('emits permission denied events', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({ status: 'denied', granted: false });

    const { result } = renderHook(() => useBarcodeScanner());

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.SCANNER.PERMISSION.REQUEST,
      expect.any(Object)
    );
    expect(mobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.SCANNER.PERMISSION.DENIED,
      expect.objectContaining({
        status: 'denied',
      })
    );
  });
});
