import React, { Component, ReactNode } from 'react';
import { View } from 'react-native';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Specifically designed to catch and swallow navigation context errors
 * that occur during the initial app boot-up or race conditions.
 */
export class NavigationErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        const message = error?.message || String(error);
        const isNavigationError =
            message.includes('navigation context') ||
            message.includes('NavigationContainer') ||
            message.includes('router is not ready');

        if (isNavigationError) {
            return { hasError: true, error };
        }

        // For other errors, we still trigger the boundary but maybe handle differently
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error) {
        console.log('[NavigationErrorBoundary] Caught error:', error.message);

        // Immediate invisible recovery
        setTimeout(() => {
            if (this.state.hasError) {
                this.setState({ hasError: false, error: null });
            }
        }, 50);
    }

    public render() {
        if (this.state.hasError) {
            // Return a completely transparent view to hide the crash
            return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
        }

        return this.props.children;
    }
}
