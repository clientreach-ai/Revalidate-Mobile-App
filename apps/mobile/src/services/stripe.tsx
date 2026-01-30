import { useStripe as useStripeNative } from '@stripe/stripe-react-native';

export const useStripe = useStripeNative;
export { StripeProvider } from '@stripe/stripe-react-native';
