import { useState } from 'react';
import { Documento, NotaAlmacen, Visita } from '../models';
import { storageService } from '../services/storage.service';
import { syncService } from '../services/sync.service';

export const useData = (erpEnabled: boolean) => {
    const [documentos, setDocumentos] = useState<Documento[]>([]);
    const [notasAlmacen, setNotasAlmacen] = useState<NotaAlmacen[]>([]);
    const [visitas, setVisitas] = useState<Visita[]>([]);

    const addDocumento = async (doc: Documento) => {
        setDocumentos(prev => {
            const updated = [doc, ...prev];
            storageService.setItem('documentos', updated);
            return updated;
        });
        if (erpEnabled) syncService.addToQueue('documento', doc);
    };

    const deleteDocumento = async (id: string) => {
        const docId = String(id).trim();
        setDocumentos(prev => {
            const updated = prev.filter(d => String(d.id).trim() !== docId);
            storageService.setItem('documentos', updated);
            return updated;
        });
        syncService.addToQueue('documento_delete', { id: docId });
    };

    const addNotaAlmacen = async (nota: NotaAlmacen) => {
        setNotasAlmacen(prev => {
            const updated = [nota, ...prev];
            storageService.setItem('notasAlmacen', updated);
            return updated;
        });
    };

    const addVisita = async (visita: Visita) => {
        setVisitas(prev => {
            const updated = [...prev, visita];
            storageService.setItem('visitas', updated);
            return updated;
        });
        if (erpEnabled) syncService.addToQueue('visita', visita);
    };

    const toggleVisita = async (id: string) => {
        let nuevoEstado = false;
        setVisitas(prev => {
            const updated = prev.map(v => {
                if (v.id === id) {
                    nuevoEstado = !v.completado;
                    return { ...v, completado: !v.completado };
                }
                return v;
            });
            storageService.setItem('visitas', updated);
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
