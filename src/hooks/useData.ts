import { useState } from 'react';
import { Documento, NotaAlmacen, Visita } from '../models';
import { storageService } from '../services/storage.service';
import { syncService } from '../services/sync.service';
import { vendorService } from '../services/vendor.service';

export const useData = (erpEnabled: boolean) => {
    const [documentos, setDocumentos] = useState<Documento[]>([]);
    const [notasAlmacen, setNotasAlmacen] = useState<NotaAlmacen[]>([]);
    const [visitas, setVisitas] = useState<Visita[]>([]);

    const buildKey = async (base: string) => {
        const vendor = await vendorService.getVendedorActual();
        return vendor?.id ? `${base}__${vendor.id}` : base;
    };

    const addDocumento = async (doc: Documento) => {
        const storageKey = await buildKey('documentos');
        setDocumentos(prev => {
            const updated = [doc, ...prev];
            storageService.setItem(storageKey, updated);
            return updated;
        });
        if (erpEnabled) syncService.addToQueue('documento', doc);
    };

    const deleteDocumento = async (id: string) => {
        const docId = String(id).trim();
        const storageKey = await buildKey('documentos');
        setDocumentos(prev => {
            const updated = prev.filter(d => String(d.id).trim() !== docId);
            storageService.setItem(storageKey, updated);
            return updated;
        });
        syncService.addToQueue('documento_delete', { id: docId });
    };

    const addNotaAlmacen = async (nota: NotaAlmacen) => {
        const storageKey = await buildKey('notasAlmacen');
        setNotasAlmacen(prev => {
            const updated = [nota, ...prev];
            storageService.setItem(storageKey, updated);
            return updated;
        });
    };

    const addVisita = async (visita: Visita) => {
        const storageKey = await buildKey('visitas');
        setVisitas(prev => {
            const updated = [...prev, visita];
            storageService.setItem(storageKey, updated);
            return updated;
        });
        if (erpEnabled) syncService.addToQueue('visita', visita);
    };

    const toggleVisita = async (id: string) => {
        const storageKey = await buildKey('visitas');
        let nuevoEstado = false;
        setVisitas(prev => {
            const updated = prev.map(v => {
                if (v.id === id) {
                    nuevoEstado = !v.completado;
                    return { ...v, completado: !v.completado };
                }
                return v;
            });
            storageService.setItem(storageKey, updated);
            return updated;
        });

        if (erpEnabled) syncService.addToQueue('visita_update', { id, completado: nuevoEstado });
    };

    return {
        documentos, setDocumentos, addDocumento, deleteDocumento,
        notasAlmacen, setNotasAlmacen, addNotaAlmacen,
        visitas, setVisitas, addVisita, toggleVisita
    };
};
