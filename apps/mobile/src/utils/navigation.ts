import { router } from 'expo-router';

/**
 * Safe navigation utility that attempts to catch errors when the
 * navigation tree is not yet fully initialized.
 */
export const safeNavigate = {
    replace: (route: string | { pathname: string; params?: any }) => {
        try {
            router.replace(route as any);
        } catch (e: any) {
            const message = e?.message || String(e);
            if (message.includes('navigation context') || message.includes('router is not ready')) {
                console.warn('[SafeNavigation] router not ready, deferred replace to:', route);
                // We could queue this if needed, but usually it's better to just log
            } else {
                throw e;
            }
        }
    },

    push: (route: string | { pathname: string; params?: any }) => {
        try {
            router.push(route as any);
        } catch (e: any) {
            const message = e?.message || String(e);
            if (message.includes('navigation context') || message.includes('router is not ready')) {
                console.warn('[SafeNavigation] router not ready, deferred push to:', route);
            } else {
                throw e;
            }
        }
    },

    back: () => {
        try {
            router.back();
        } catch (e: any) {
            console.warn('[SafeNavigation] router.back() failed');
        }
    }
};
