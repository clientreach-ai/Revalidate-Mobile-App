import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import { ApiDocument } from '../gallery.types';
import { isImageFile } from '@/utils/document';
import { MaterialIcons } from '@expo/vector-icons';

export const useGeneralGalleryData = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [documents, setDocuments] = useState<any[]>([]);

    const normalize = (v?: string | number | null) => {
        if (v === null || v === undefined) return '';
        return String(v).toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    const categoryMap: Record<string, string> = {
        'cpd': 'CPD Hours',
        'cpdhours': 'CPD Hours',
        'working': 'Working Hours',
        'work': 'Working Hours',
        'workinghours': 'Working Hours',
        'feedback': 'Feedback Log',
        'feedbacklog': 'Feedback Log',
        'reflection': 'Reflective Accounts',
        'reflections': 'Reflective Accounts',
        'reflective': 'Reflective Accounts',
        'appraisal': 'Appraisal',
        'gallery': 'General Gallery',
        'personal': 'General Gallery',
        'general': 'General Gallery',
        'uncategorized': 'General Gallery',
        'profilepicture': 'General Gallery',
        'discussion': 'Feedback Log',
    };

    const getFullUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
            return url;
        }
        const pathPart = url.startsWith('http')
            ? url.replace(/^https?:\/\/[^\/]+/, '')
            : url;
        const apiBase = apiService.baseUrl;
        return `${apiBase}${pathPart.startsWith('/') ? '' : '/'}${pathPart}`;
    };

    const loadDocuments = useCallback(async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            const response = await apiService.get<{
                success: boolean;
                data: ApiDocument[];
            }>(`${API_ENDPOINTS.DOCUMENTS.LIST}?limit=1000`, token);

            if (response.success && response.data) {
                const mapped = response.data.map((apiDoc) => {
                    const fullUrl = apiDoc.document ? getFullUrl(apiDoc.document) : '';
                    const isImg = isImageFile(fullUrl || apiDoc.name) ||
                        apiDoc.type === 'image' ||
                        apiDoc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) !== null;
                    const isPdf = (apiDoc.type === 'file' || apiDoc.name.toLowerCase().endsWith('.pdf'));

                    const docCat = apiDoc.category || '';
                    const normCat = normalize(docCat);
                    const mappedTitleToken = categoryMap[normCat] || docCat;
                    const normMapped = normalize(mappedTitleToken);
                    const isGeneral = normCat === '' || normMapped === normalize('General Gallery');

                    return {
                        id: String(apiDoc.id),
                        name: apiDoc.name,
                        category: apiDoc.category || 'General',
                        size: apiDoc.size || '0.0 MB',
                        document: apiDoc.document,
                        fullUrl: fullUrl,
                        isImage: isImg,
                        isGeneral: isGeneral,
                        icon: (isPdf ? 'picture-as-pdf' : 'insert-drive-file') as keyof typeof MaterialIcons.glyphMap,
                        created_at: apiDoc.created_at
                    };
                });

                const filtered = mapped.filter(doc => doc.isImage || doc.isGeneral);
                filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                setDocuments(filtered);
            }
        } catch (error: any) {
            console.error('Error loading documents:', error);
            showToast.error('Failed to load documents', 'Error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [router]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadDocuments();
    }, [loadDocuments]);

    return {
        loading,
        refreshing,
        documents,
        loadDocuments,
        onRefresh
    };
};
