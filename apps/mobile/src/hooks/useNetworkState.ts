import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { NetworkState } from '../types/network';

export function useNetworkState(): NetworkState {
  const [isOnline, setIsOnline] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [connectionType, setConnectionType] = useState<string>('wifi');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? null);
      setConnectionType(state.type);
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, isInternetReachable, connectionType };
}
