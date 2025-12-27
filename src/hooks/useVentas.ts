import { useState } from 'react';
import { NotaVenta } from '../models';
import { storageService } from '../services/storage.service';
import { syncService } from '../services/sync.service';
import { vendorService } from '../services/vendor.service';

export const useVentas = (erpEnabled: boolean, updateArticulosStock: (items: any[]) => void) => {
    const [notasVenta, setNotasVenta] = useState<NotaVenta[]>([]);

    const buildKey = async () => {
        const vendor = await vendorService.getVendedorActual();
        return vendor?.id ? `notasVenta__${vendor.id}` : 'notasVenta';
    };

    const addNotaVenta = async (nota: NotaVenta) => {
        // 1. Descontar stock localmente en UI
        if (nota.items && nota.items.length > 0) {
            updateArticulosStock(nota.items);
        }

        const storageKey = await buildKey();
        const vendor = await vendorService.getVendedorActual();
        const notaConVendor = { ...nota, vendedorId: vendor?.id };

        // 2. Guardar nota
        setNotasVenta(prev => {
            const existsIndex = prev.findIndex(n => n.id === nota.id);
            let updated;
            if (existsIndex > -1) {
                updated = [...prev];
                updated[existsIndex] = notaConVendor;
            } else {
                updated = [notaConVendor, ...prev];
            }
            storageService.setItem(storageKey, updated);
            return updated;
        });

        if (erpEnabled) syncService.addToQueue('venta', notaConVendor);
    };

    const deleteNotaVenta = async (id: string, shouldSync = false) => {
        const storageKey = await buildKey();
        const notaId = String(id).trim();
        setNotasVenta(prev => {
            const updated = prev.filter(n => String(n.id).trim() !== notaId);
            storageService.setItem(storageKey, updated);
            return updated;
        });
        // TODO: Implementar delete remoto si es necesario
    };

    const updateNotaVenta = async (id: string, estado: 'pendiente' | 'cerrada' | 'anulada' | 'abierta') => {
        const storageKey = await buildKey();
        setNotasVenta(prev => {
            const updated = prev.map(n => n.id === id ? { ...n, estado } : n);
            storageService.setItem(storageKey, updated);
            return updated;
        });
    };

    return { notasVenta, setNotasVenta, addNotaVenta, deleteNotaVenta, updateNotaVenta };
};
