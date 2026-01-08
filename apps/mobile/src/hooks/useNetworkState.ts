import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { NetworkState } from '../types/network';
import { networkService } from '../services/network/NetworkService';

export function useNetworkState(): NetworkState {
  const [isOnline, setIsOnline] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [connectionType, setConnectionType] = useState<string>('wifi');

  useEffect(() => {
    // Start network monitoring with hookey integration
    networkService.startMonitoring();

    // Keep the original NetInfo listener for local state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? null);
      setConnectionType(state.type);
    });

    return () => {
      unsubscribe();
      // Note: We don't stop the service here as other components might be using it
      // The service lifecycle is managed globally
    };
  }, []);

  return { isOnline, isInternetReachable, connectionType };
}
