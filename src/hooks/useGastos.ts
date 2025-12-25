import { useState } from 'react';
import { Gasto } from '../models';
import { storageService } from '../services/storage.service';
import { syncService } from '../services/sync.service';

export const useGastos = (erpEnabled: boolean) => {
    const [gastos, setGastos] = useState<Gasto[]>([]);

    const addGasto = async (gasto: Gasto) => {
        setGastos(prev => {
            const updated = [gasto, ...prev];
            storageService.setItem('gastos', updated);
            return updated;
        });
        if (erpEnabled) syncService.addToQueue('gasto', gasto);
    };

    const deleteGasto = async (id: string) => {
        const gastoId = String(id).trim();
        setGastos(prev => {
            const updated = prev.filter(g => String(g.id).trim() !== gastoId);
            storageService.setItem('gastos', updated).catch(console.error);
            return updated;
        });
        syncService.addToQueue('gasto_delete', { id: gastoId });
    };

    return { gastos, setGastos, addGasto, deleteGasto };
};
