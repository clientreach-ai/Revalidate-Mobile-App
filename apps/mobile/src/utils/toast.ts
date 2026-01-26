import Toast from 'react-native-toast-message';

/**
 * Toast notification utility
 * Provides a modern, non-intrusive way to show messages
 */
export const showToast = {
  /**
   * Show success toast
   */
  success: (message: string, title?: string) => {
    Toast.show({
      type: 'success',
      text1: title || 'Success',
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  },

  /**
   * Show error toast
   */
  error: (message: string, title?: string) => {
    Toast.show({
      type: 'error',
      text1: title || 'Error',
      text2: message,
      position: 'top',
      visibilityTime: 4000,
    });
  },

  /**
   * Show info toast
   */
  info: (message: string, title?: string) => {
    Toast.show({
      type: 'info',
      text1: title || 'Info',
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  },

  /**
   * Show warning toast
   */
  warning: (message: string, title?: string) => {
    Toast.show({
      type: 'info',
      text1: title || 'Warning',
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      props: {
        style: { backgroundColor: '#F59E0B' },
      },
    });
  },
};
