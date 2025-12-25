import { useState, useCallback, useEffect } from 'react';
import { SyncStatus } from '../models/app-config.model';
import { syncService } from '../services/sync.service';

export const useSync = (erpEnabled: boolean, autoSyncInterval: number) => {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        clientes: 'idle', articulos: 'idle', ultimaSync: null, error: null, operacionesPendientes: 0
    });

    const sincronizar = useCallback(async () => {
        try {
            setSyncStatus(p => ({ ...p, clientes: 'syncing', articulos: 'syncing' }));

            if (!erpEnabled) {
                setTimeout(() => {
                    setSyncStatus(p => ({ ...p, clientes: 'success', articulos: 'success', ultimaSync: new Date().toISOString() }));
                }, 1000);
                return;
            }

            const status = await syncService.syncAll();
            setSyncStatus(status);

            if (status.error || status.clientes === 'error' || status.articulos === 'error') {
                console.error('❌ [useSync] Error en sincronización:', status.error);
            }
        } catch (error: any) {
            console.error('❌ [useSync] Error crítico:', error);
            setSyncStatus(p => ({ ...p, error: error.message, clientes: 'error', articulos: 'error' }));
        }
    }, [erpEnabled]);

    // Auto-sync effect
    useEffect(() => {
        if (!erpEnabled || autoSyncInterval <= 0) return;
        const interval = setInterval(sincronizar, autoSyncInterval);
        return () => clearInterval(interval);
    }, [erpEnabled, autoSyncInterval, sincronizar]);

    return {
        syncStatus,
        setSyncStatus,
        sincronizar
    };
};
