import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubscriptionInfo {
    subscriptionTier: 'free' | 'premium' | 'premium_yearly';
    subscriptionStatus: 'active' | 'trial' | 'expired' | 'cancelled';
    isPremium: boolean;
    canUseOffline: boolean;
}

interface SubscriptionState extends SubscriptionInfo {
    setSubscriptionInfo: (info: SubscriptionInfo) => void;
    setTier: (tier: 'free' | 'premium' | 'premium_yearly') => void;
    reset: () => void;
}

const initialState: SubscriptionInfo = {
    subscriptionTier: 'free',
    subscriptionStatus: 'active',
    isPremium: false,
    canUseOffline: false,
};

export const useSubscriptionStore = create<SubscriptionState>()(
    persist(
        (set) => ({
            ...initialState,
            setSubscriptionInfo: (info) => set((state) => ({ ...state, ...info })),
            setTier: (tier) =>
                set((state) => ({
                    ...state,
                    subscriptionTier: tier,
                    isPremium: tier === 'premium' || tier === 'premium_yearly',
                    canUseOffline: tier === 'premium' || tier === 'premium_yearly',
                })),
            reset: () => set(initialState),
        }),
        {
            name: 'subscription-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
