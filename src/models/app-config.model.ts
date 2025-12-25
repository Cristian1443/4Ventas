export interface AppConfig {
    erpEnabled: boolean;
    autoSyncEnabled: boolean;
    syncInterval: number;
    modoOffline: boolean;
    catalogoPdfUrl?: string;
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
