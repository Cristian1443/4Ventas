export interface DocumentoDrive {
    id: string;
    nombre: string;
    url: string;
    categoria?: string;
}

export interface AppConfig {
    erpEnabled: boolean;
    autoSyncEnabled: boolean;
    syncInterval: number;
    modoOffline: boolean;
    /** @deprecated usar documentosDrive */
    catalogoPdfUrl?: string;
    /** Repositorio compartido de Google Drive: lista de carpetas/archivos visibles para los vendedores. */
    documentosDrive?: DocumentoDrive[];
}

export interface UserSession {
    isLoggedIn: boolean;
    username?: string;
    email?: string;
    sessionId?: string;
}

export interface SyncStatus {
    clientes: 'idle' | 'syncing' | 'success' | 'error';
    articulos: 'idle' | 'syncing' | 'success' | 'error';
    ultimaSync: string | null;
    error: string | null;
    operacionesPendientes?: number;
}
