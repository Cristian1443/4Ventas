import { useState } from 'react';
import { Articulo } from '../models';
import { storageService } from '../services/storage.service';
import { syncService } from '../services/sync.service';

export const useArticulos = (erpEnabled: boolean) => {
    const [articulos, setArticulos] = useState<Articulo[]>([]);

    const addArticulo = async (articulo: Articulo) => {
        setArticulos(prev => {
            const updated = [articulo, ...prev];
            storageService.setItem('articulos', updated);
            return updated;
        });
    };

    const updateArticulo = async (id: string, cantidad: number) => {
        setArticulos(prev => {
            const updated = prev.map(a => a.id === id ? { ...a, cantidad } : a);
            storageService.setItem('articulos', updated);
            return updated;
        });
        if (erpEnabled) await syncService.updateArticuloStock(id, cantidad);
    };

    return { articulos, setArticulos, addArticulo, updateArticulo };
};
