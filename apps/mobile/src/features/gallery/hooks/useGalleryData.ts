import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeNavigate } from '@/utils/navigation';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import { Category, RecentFile, Document, ApiDocument } from '../gallery.types';
import { MaterialIcons } from '@expo/vector-icons';

const categoryDefinitions: Array<Omit<Category, 'documentCount' | 'updated'>> = [
    {
        id: '1',
        title: 'Working Hours',
        icon: 'schedule',
        iconBgColor: 'bg-blue-100',
        iconColor: '#2563EB',
        dotColor: '#3B82F6',
        route: '/(tabs)/workinghours',
    },
    {
        id: '2',
        title: 'CPD Hours',
        icon: 'school',
        iconBgColor: 'bg-amber-100',
        iconColor: '#F59E0B',
        dotColor: '#F59E0B',
        route: '/(tabs)/cpdhourstracking',
    },
    {
        id: '3',
        title: 'Feedback Log',
        icon: 'forum',
        iconBgColor: 'bg-emerald-100',
        iconColor: '#10B981',
        dotColor: '#10B981',
        route: '/(tabs)/feedback',
    },
    {
        id: '4',
        title: 'Reflective Accounts',
        icon: 'edit-note',
        iconBgColor: 'bg-purple-100',
        iconColor: '#9333EA',
        dotColor: '#9333EA',
        route: '/(tabs)/reflections',
    },
    {
        id: '5',
        title: 'Appraisal',
        icon: 'verified',
        iconBgColor: 'bg-rose-100',
        iconColor: '#E11D48',
        dotColor: '#E11D48',
        route: '/(tabs)/appraisal',
    },
    {
        id: '6',
        title: 'General Gallery',
        icon: 'folder',
        iconBgColor: 'bg-slate-100',
        iconColor: '#64748B',
        dotColor: '#94A3B8',
        route: '/(tabs)/gallery/general',
    },
];

const categoryMap: Record<string, string> = {
    'cpd': 'CPD Hours',
    'cpdhours': 'CPD Hours',
    'cpd_hours': 'CPD Hours',
    'working': 'Working Hours',
    'work': 'Working Hours',
    'workhours': 'Working Hours',
    'workinghours': 'Working Hours',
    'work_hours': 'Working Hours',
    'feedback': 'Feedback Log',
    'feedbacklog': 'Feedback Log',
    'feedback_log': 'Feedback Log',
    'reflection': 'Reflective Accounts',
    'reflections': 'Reflective Accounts',
    'reflective': 'Reflective Accounts',
    'reflectiveaccounts': 'Reflective Accounts',
    'reflective_accounts': 'Reflective Accounts',
    'appraisal': 'Appraisal',
    'appraisals': 'Appraisal',
    'gallery': 'General Gallery',
    'personal': 'General Gallery',
    'general': 'General Gallery',
    'uncategorized': 'General Gallery',
    'profilepicture': 'General Gallery',
    'discussion': 'Feedback Log',
};

const normalize = (v?: string | number | null) => {
    if (v === null || v === undefined) return '';
    return String(v).toLowerCase().replace(/[^a-z0-9]/g, '');
};

const mapToTitle = (docCat?: string | null) => {
    if (!docCat) return '';
    const key = normalize(docCat);
    return categoryMap[key] || docCat;
};

const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}M AGO`;
    if (diffHours < 24) return `${diffHours}H AGO`;
    if (diffDays < 7) return `${diffDays}D AGO`;
    return `${Math.floor(diffDays / 7)}W AGO`;
};

export const useGalleryData = (category?: string) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
    const [allDocuments, setAllDocuments] = useState<Document[]>([]);

    const loadDocuments = useCallback(async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                safeNavigate.replace('/(auth)/login');
                return;
            }

            const response = await apiService.get<{
                success: boolean;
                data: ApiDocument[];
            }>(`${API_ENDPOINTS.DOCUMENTS.LIST}?limit=1000`, token);

            if (response.success && response.data) {
                const mappedDocuments: Document[] = response.data.map((apiDoc) => {
                    let fileSize = 0;
                    if (apiDoc.size) {
                        const sizeMatch = apiDoc.size.match(/([\d.]+)\s*(KB|MB|GB)/i);
                        if (sizeMatch?.[1] && sizeMatch?.[2]) {
                            const value = parseFloat(sizeMatch[1]);
                            const unit = sizeMatch[2].toUpperCase();
                            if (unit === 'KB') fileSize = value * 1024;
                            else if (unit === 'MB') fileSize = value * 1024 * 1024;
                            else if (unit === 'GB') fileSize = value * 1024 * 1024 * 1024;
                        }
                    }

                    let mimeType = 'application/octet-stream';
                    if (apiDoc.type === 'text') mimeType = 'text/plain';
                    else if (apiDoc.type === 'file') mimeType = 'application/pdf';
                    else if (apiDoc.name) {
                        const ext = apiDoc.name.split('.').pop()?.toLowerCase();
                        if (ext === 'pdf') mimeType = 'application/pdf';
                        else if (ext && ['jpg', 'jpeg', 'png', 'gif'].includes(ext)) mimeType = `image/${ext}`;
                    }

                    return {
                        id: apiDoc.id,
                        filename: apiDoc.name,
                        originalFilename: apiDoc.name,
                        fileSize: fileSize || 0,
                        mimeType: mimeType,
                        category: apiDoc.category,
                        createdAt: apiDoc.created_at,
                        updatedAt: apiDoc.updated_at,
                    };
                });

                setAllDocuments(mappedDocuments);

                const updatedCategories = categoryDefinitions.map(cat => {
                    const catKey = normalize(cat.title);

                    const categoryDocs = mappedDocuments.filter(doc => {
                        const mappedTitle = mapToTitle(doc.category);
                        const mappedKey = normalize(mappedTitle);

                        if (mappedKey && mappedKey === catKey) return true;

                        if (cat.id === '6') {
                            const hasNoCategory = !doc.category || normalize(doc.category) === '';
                            if (hasNoCategory) return true;

                            const matchesAnyOther = categoryDefinitions
                                .filter(c => c.id !== '6')
                                .some(c => normalize(c.title) === mappedKey);

                            return !matchesAnyOther;
                        }

                        return false;
                    });

                    const count = categoryDocs.length;
                    const latestDoc = [...categoryDocs].sort((a, b) =>
                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    )[0];

                    const updated = latestDoc
                        ? getTimeAgo(new Date(latestDoc.updatedAt))
                        : 'NO DOCUMENTS';

                    return {
                        ...cat,
                        documentCount: `${count} Document${count !== 1 ? 's' : ''}`,
                        updated: updated.toUpperCase(),
                    };
                });
                setCategories(updatedCategories);

                const recent = mappedDocuments
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map(doc => {
                        const isPdf = doc.mimeType === 'application/pdf';
                        const sizeStr = doc.fileSize && doc.fileSize > 0
                            ? `${(doc.fileSize / (1024 * 1024)).toFixed(1)} MB`
                            : 'Unknown';
                        return {
                            id: String(doc.id),
                            name: doc.originalFilename || doc.filename,
                            category: doc.category || 'General Gallery',
                            size: sizeStr,
                            icon: (isPdf ? 'picture-as-pdf' : 'image') as keyof typeof MaterialIcons.glyphMap,
                            iconBgColor: isPdf ? 'bg-red-100' : 'bg-blue-100',
                            iconColor: isPdf ? '#DC2626' : '#2563EB',
                        };
                    });
                setRecentFiles(recent);
            }
        } catch (error: any) {
            console.error('Error loading documents:', error);
            if (!error.message?.includes('500')) {
                showToast.error(error.message || 'Failed to load documents', 'Error');
            }
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
        categories,
        recentFiles,
        allDocuments,
        loadDocuments,
        onRefresh,
    };
};
