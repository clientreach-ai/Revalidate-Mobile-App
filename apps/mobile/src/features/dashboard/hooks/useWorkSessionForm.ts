import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { apiService, API_ENDPOINTS } from '@/services/api';
import { showToast } from '@/utils/toast';
import { SelectionOption, Hospital, ActiveSession } from '../dashboard.types';

export const useWorkSessionForm = (activeSession: ActiveSession | null, onSuccess: () => void) => {
    const isMounted = useRef(true);

    const [showWorkForm, setShowWorkForm] = useState(false);
    const [isSavingWork, setIsSavingWork] = useState(false);
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [workSettingsOptions, setWorkSettingsOptions] = useState<SelectionOption[]>([]);
    const [scopeOptions, setScopeOptions] = useState<SelectionOption[]>([]);
    const [hospitalSearch, setHospitalSearch] = useState('');

    // Form Fields
    const [workingMode, setWorkingMode] = useState<'Full time' | 'Part time'>('Full time');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
    const [hours, setHours] = useState('');
    const [rate, setRate] = useState('');
    const [workSetting, setWorkSetting] = useState('');
    const [scope, setScope] = useState('');
    const [description, setDescription] = useState('');
    const [documents, setDocuments] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    const loadFormOptions = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            const cachedHospitals = await AsyncStorage.getItem('cached_hospitals');
            if (cachedHospitals && isMounted.current) {
                setHospitals(JSON.parse(cachedHospitals));
            }

            const [hospResp, workResp, scopeResp] = await Promise.all([
                apiService.get<any>(API_ENDPOINTS.HOSPITALS.LIST, token).catch(() => null),
                apiService.get<any>('/api/v1/profile/work', token).catch(() => null),
                apiService.get<any>('/api/v1/profile/scope', token).catch(() => null),
            ]);

            if (hospResp?.data && isMounted.current) {
                setHospitals(hospResp.data);
                await AsyncStorage.setItem('cached_hospitals', JSON.stringify(hospResp.data));
            }
            if ((workResp?.data || Array.isArray(workResp)) && isMounted.current) {
                const items = Array.isArray(workResp) ? workResp : workResp.data;
                setWorkSettingsOptions(items.filter((i: any) => i.status === 'one' || i.status === 1));
            }
            if ((scopeResp?.data || Array.isArray(scopeResp)) && isMounted.current) {
                const items = Array.isArray(scopeResp) ? scopeResp : scopeResp.data;
                setScopeOptions(items.filter((i: any) => i.status === 'one' || i.status === 1));
            }
        } catch (error) {
            console.error('Error loading form options:', error);
        }
    }, []);

    const handleCopySchedule = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;
            const res = await apiService.get<any>(API_ENDPOINTS.WORK_HOURS.LIST + '?limit=1', token);
            if (res?.data?.[0]) {
                const last = res.data[0];
                if (isMounted.current) {
                    setWorkSetting(last.workSetting || '');
                    setScope(last.scopeOfPractice || '');
                    setRate(String(last.hourlyRate || rate));
                    if (last.location) {
                        const hosp = hospitals.find((h) => h.name === last.location);
                        if (hosp) setSelectedHospital(hosp);
                        else setSelectedHospital({ name: last.location });
                    }
                }
                showToast.success('Details copied from last session');
            } else {
                showToast.info('No previous session found');
            }
        } catch (e) {
            showToast.error('Failed to copy schedule');
        }
    }, [hospitals, rate]);

    const handleDocumentPick = useCallback(async (source: 'gallery' | 'camera') => {
        try {
            const permission = source === 'camera'
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                showToast.error(`${source} permission required`);
                return;
            }

            const result = await (source === 'camera'
                ? ImagePicker.launchCameraAsync({ quality: 0.5 })
                : ImagePicker.launchImageLibraryAsync({ quality: 0.5 }));

            if (!result.canceled && result.assets[0]) {
                if (isMounted.current) setIsUploading(true);
                const token = await AsyncStorage.getItem('authToken');
                if (!token) return;

                const uploadResp = await apiService.uploadFile(
                    API_ENDPOINTS.DOCUMENTS.UPLOAD,
                    {
                        uri: result.assets[0].uri,
                        type: 'image/jpeg',
                        name: `evidence_${Date.now()}.jpg`,
                    },
                    token,
                    { category: 'work_hours' }
                );

                if (uploadResp?.data && isMounted.current) {
                    setDocuments((prev) => [...prev, uploadResp.data]);
                    showToast.success('Document uploaded');
                }
            }
        } catch (error) {
            showToast.error('Upload failed');
        } finally {
            if (isMounted.current) setIsUploading(false);
        }
    }, []);

    const handleSaveWorkSession = useCallback(async () => {
        if (!selectedHospital || !workSetting || !scope || !rate) {
            showToast.error('Please fill all required fields');
            return;
        }

        const hoursTrimmed = hours.trim();
        let durationMinutes = 0;

        if (hoursTrimmed.includes(':')) {
            const [hStr, mStr] = hoursTrimmed.split(':');
            const h = Number(hStr);
            const m = Number(mStr);
            durationMinutes = Math.round((Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0));
        } else {
            const h = parseFloat(hoursTrimmed);
            durationMinutes = Math.round((Number.isFinite(h) ? h : 0) * 60);
        }

        try {
            if (isMounted.current) setIsSavingWork(true);
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            const endTime = new Date().toISOString();
            const startTimeDate = new Date(activeSession!.startTime);
            startTimeDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

            const payload: any = {
                end_time: endTime,
                start_time: startTimeDate.toISOString(),
                location: selectedHospital.name,
                shift_type: workingMode,
                hourly_rate: parseFloat(rate),
                work_description: description,
                work_setting: workSetting,
                scope_of_practice: scope,
                document_ids: documents.map((d) => d.id),
            };

            if (durationMinutes > 0) {
                payload.duration_minutes = durationMinutes;
            }

            await apiService.put(`${API_ENDPOINTS.WORK_HOURS.UPDATE}/${activeSession!.id}`, payload, token);

            if (isMounted.current) {
                setShowWorkForm(false);
                // Reset form
                setHours('');
                setDocuments([]);
                setDescription('');
            }
            showToast.success('Work session saved successfully');
            onSuccess();
        } catch (error: any) {
            showToast.error(error?.message || 'Failed to save session');
        } finally {
            if (isMounted.current) setIsSavingWork(false);
        }
    }, [selectedHospital, hours, workSetting, scope, rate, activeSession, selectedDate, workingMode, description, documents, onSuccess]);

    const openFormWithDefaults = useCallback((timerHours: string) => {
        if (timerHours.includes(':')) {
            const parts = timerHours.split(':').map((p) => Number(p));
            if (parts.length >= 2) {
                const [hRaw, mRaw, sRaw] = parts;
                const h = Number.isFinite(hRaw) ? hRaw : 0;
                const m = Number.isFinite(mRaw) ? mRaw : 0;
                const s = Number.isFinite(sRaw) ? sRaw : 0;
                const totalSeconds = Math.floor(h * 3600 + m * 60 + s);
                const outH = Math.floor(totalSeconds / 3600);
                const outM = Math.floor((totalSeconds % 3600) / 60);
                const outS = totalSeconds % 60;
                setHours(`${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}:${String(outS).padStart(2, '0')}`);
            } else {
                setHours(`${timerHours}:00`);
            }
        } else {
            const val = parseFloat(timerHours);
            if (Number.isFinite(val)) {
                const totalMinutes = Math.round(val * 60);
                const outH = Math.floor(totalMinutes / 60);
                const outM = totalMinutes % 60;
                setHours(`${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}:00`);
            } else {
                setHours(timerHours);
            }
        }
        setWorkingMode('Full time');
        setSelectedDate(new Date());
        setShowWorkForm(true);
    }, []);

    return {
        showWorkForm,
        setShowWorkForm,
        isSavingWork,
        hospitals,
        workSettingsOptions,
        scopeOptions,
        hospitalSearch,
        setHospitalSearch,
        workingMode,
        setWorkingMode,
        selectedDate,
        setSelectedDate,
        selectedHospital,
        setSelectedHospital,
        hours,
        setHours,
        rate,
        setRate,
        workSetting,
        setWorkSetting,
        scope,
        setScope,
        description,
        setDescription,
        documents,
        setDocuments,
        isUploading,
        loadFormOptions,
        handleCopySchedule,
        handleDocumentPick,
        handleSaveWorkSession,
        openFormWithDefaults,
    };
};
