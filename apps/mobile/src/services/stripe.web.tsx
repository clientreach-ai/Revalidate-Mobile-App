import React from 'react';

export const useStripe = () => ({
    initPaymentSheet: async () => ({ error: { message: "Stripe not available on web" } }),
    presentPaymentSheet: async () => ({ error: { message: "Stripe not available on web" } }),
    confirmPayment: async () => ({ error: { message: "Stripe not available on web" } }),
    handleURLCallback: async () => Promise.resolve(true),
});

export const StripeProvider = ({ children }: { children: React.ReactNode }) => <>{ children } </>;
