import { cacheDirectory, downloadAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { showToast } from './toast';

const ensureFileExtension = (fileName: string, url: string) => {
    // If caller already provided an extension, keep it.
    if (/\.[a-z0-9]{1,10}$/i.test(fileName)) return fileName;

    // Try to infer from the URL path.
    try {
        const u = new URL(url);
        const last = (u.pathname.split('/').pop() || '').trim();
        const extMatch = last.match(/\.[a-z0-9]{1,10}$/i);
        if (extMatch?.[0]) return `${fileName}${extMatch[0]}`;
    } catch {
        // URL may be relative or invalid; ignore.
    }

    // Reasonable default for typical evidence uploads.
    return `${fileName}.pdf`;
};

export const downloadAndShareFile = async (url: string, fileName: string) => {
    try {
        showToast.info('Preparing document...', 'Please wait');

        const safeName = ensureFileExtension(fileName, url);
        const baseDir = cacheDirectory || '';
        const fileUri = `${baseDir}${safeName}`;

        const downloadRes = await downloadAsync(url, fileUri);

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
