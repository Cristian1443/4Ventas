import axios, { AxiosInstance } from 'axios';

// Configuración Base
const BASE_URL = 'http://80.58.154.71:8000/WcfServiceLibraryVerial';
let SESSION_ID = '39';
let ERP_ENABLED = true;

// Crear instancia de Axios
export const erpClient: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
});

// Interceptor para logging (Opcional, para debug)
erpClient.interceptors.request.use(request => {
    // console.log('🚀 [ERP Request]', request.url);
    return request;
});

// Gestión de Sesión y Configuración
export const erpConfig = {
    setSessionId: (id: string) => { SESSION_ID = id; },
    getSessionId: () => SESSION_ID,

    setEnabled: (enabled: boolean) => { ERP_ENABLED = enabled; },
    isEnabled: () => ERP_ENABLED,

    getBaseUrl: () => BASE_URL
};

// Helper para params comunes
export const getCommonParams = () => `x=${SESSION_ID}`;
