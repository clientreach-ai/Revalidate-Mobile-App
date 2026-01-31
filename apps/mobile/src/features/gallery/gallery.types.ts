import { MaterialIcons } from '@expo/vector-icons';

export interface Category {
    id: string;
    title: string;
    documentCount: string;
    updated: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    iconBgColor: string;
    iconColor: string;
    dotColor: string;
    route?: string;
}

export interface RecentFile {
    id: string;
    name: string;
    category: string;
    size: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    iconBgColor: string;
    iconColor: string;
    dotColor?: string;
}

export interface Document {
    id: number;
    filename: string;
    originalFilename: string;
    fileSize: number;
    mimeType: string;
    category?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ApiDocument {
    id: number;
    name: string;
    category?: string;
    size?: string;
    type?: string;
    document?: string;
    created_at: string;
    updated_at: string;
}
