export interface Appraisal {
    id: string;
    appraisal_date: string;
    notes?: string;
    documentIds: number[];
    hospital_id?: number;
    hospital_name?: string;
    appraisal_type?: string;
    discussion_with?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Hospital {
    id: number;
    name: string;
    address?: string;
}

export interface ApiAppraisal {
    id: number;
    appraisal_date: string;
    notes?: string;
    documentIds: number[];
    hospital_id?: number;
    hospital_name?: string;
    appraisal_type?: string;
    discussion_with?: string;
    createdAt: string;
    updatedAt: string;
}
