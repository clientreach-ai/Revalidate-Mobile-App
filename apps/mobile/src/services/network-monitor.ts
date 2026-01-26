import NetInfo from '@react-native-community/netinfo';
import { useState, useEffect } from 'react';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

export function useNetworkStatus() {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type,
      });
    });

    NetInfo.fetch().then(state => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return networkState;
}

export async function checkNetworkStatus(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
}

export function subscribeToNetworkChanges(callback: (isConnected: boolean) => void) {
  return NetInfo.addEventListener(state => {
    callback(state.isConnected ?? false);
  });
}
