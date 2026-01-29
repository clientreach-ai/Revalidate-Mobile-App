import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { showToast } from './toast';

export const downloadAndShareFile = async (url: string, fileName: string) => {
    try {
        showToast.info('Preparing document...', 'Please wait');

        const fileUri = `${(FileSystem as any).cacheDirectory}${fileName}`;

        const downloadRes = await FileSystem.downloadAsync(url, fileUri);

        if (downloadRes.status !== 200) {
            showToast.error('Failed to download file', 'Error');
            return;
        }

        if (Platform.OS === 'ios' || await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(downloadRes.uri);
        } else {
            showToast.error('Sharing is not available on this device', 'Error');
        }
    } catch (error) {
        console.error('Download error:', error);
        showToast.error('An error occurred while downloading the file', 'Error');
    }
};

export const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
};
