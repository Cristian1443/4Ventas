import axios, { AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// En web, CORS bloquea las peticiones directas al ERP. Usar proxy local (npm run proxy).
const PROXY_WEB_URL = 'http://localhost:3001/WcfServiceLibraryVerial';

// Configuración Base (se puede sobrescribir vía extra.erpBaseUrl en app.json)
const manifest: any = (Constants as any).manifest ?? (Constants as any).expoConfig ?? {};
const extra = manifest.extra || {};
const DEFAULT_BASE_URL = 'http://80.58.154.71:8000/WcfServiceLibraryVerial';
let BASE_URL = extra.erpBaseUrl || DEFAULT_BASE_URL;

if (Platform.OS === 'web') {
    BASE_URL = extra.erpBaseUrl || PROXY_WEB_URL;
}
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

// Interceptor de request (logging opcional)
erpClient.interceptors.request.use(request => {
    return request;
});

// Interceptor de respuesta: convierte errores de red/timeout en mensajes legibles
erpClient.interceptors.response.use(
    response => response,
    error => {
        if (!error.response) {
            // Sin respuesta del servidor: apagado, sin red o firewall
            const code = error.code || '';
            let mensaje = 'No se puede conectar con el servidor ERP.';
            if (code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                mensaje = 'El servidor ERP no responde (timeout). Comprueba la conexión o que el servidor esté encendido.';
            } else if (code === 'ERR_NETWORK' || code === 'ECONNREFUSED') {
                mensaje = 'Servidor ERP apagado o inaccesible. Los datos se guardarán localmente.';
            }
            const enriched = new Error(mensaje) as any;
            enriched.code = code || 'ERR_NETWORK';
            enriched.isNetworkError = true;
            return Promise.reject(enriched);
        }
        return Promise.reject(error);
    }
);

// Gestión de Sesión y Configuración
export const erpConfig = {
    setSessionId: (id: string) => { SESSION_ID = id; },
    getSessionId: () => SESSION_ID,

    setEnabled: (enabled: boolean) => { ERP_ENABLED = enabled; },
    isEnabled: () => ERP_ENABLED,

    getBaseUrl: () => BASE_URL,
    setBaseUrl: (url: string) => { if (url) BASE_URL = url; }
};

// Helper para params comunes
export const getCommonParams = () => `x=${SESSION_ID}`;
