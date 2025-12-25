import { useState } from 'react';
import { Cobro } from '../models';
import { storageService } from '../services/storage.service';
import { syncService } from '../services/sync.service';

export const useCobros = (erpEnabled: boolean) => {
    const [cobros, setCobros] = useState<Cobro[]>([]);

    const formatFecha = (fecha: Date): string => {
        const day = String(fecha.getDate()).padStart(2, '0');
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const year = fecha.getFullYear();
        const hours = String(fecha.getHours()).padStart(2, '0');
        return `${day}/${month}/${year}, ${hours}:${String(fecha.getMinutes()).padStart(2, '0')}`;
    };

    const addCobro = async (cobro: Cobro) => {
        setCobros(prev => {
            const updated = [cobro, ...prev];
            storageService.setItem('cobros', updated);
            return updated;
        });
        if (erpEnabled) syncService.addToQueue('pago', cobro);
    };

    const updateCobro = async (id: string, estado: 'pendiente' | 'pagado', metadata?: { formaPago: string, fecha: Date }) => {
        const cobroOriginal = cobros.find(c => c.id === id);

        setCobros(prev => {
            const updated = prev.map(c => {
                if (c.id === id) {
                    return {
                        ...c,
                        estado,
                        formaPago: metadata?.formaPago || c.formaPago,
                        fecha: metadata?.fecha ? formatFecha(metadata.fecha) : c.fecha
                    };
                }
                return c;
            });
            storageService.setItem('cobros', updated).catch(e => console.error(e));
            return updated;
        });

        if (estado === 'pagado' && cobroOriginal && erpEnabled) {
            const datosPago = {
                id: cobroOriginal.id,
                clienteId: cobroOriginal.clienteId,
                cliente: cobroOriginal.cliente,
                monto: cobroOriginal.monto,
                fecha: metadata?.fecha ? formatFecha(metadata.fecha) : cobroOriginal.fecha,
                estado: 'pagado',
                notaVentaId: cobroOriginal.notaVentaId,
                formaPago: metadata?.formaPago || cobroOriginal.formaPago || 'Efectivo',
                fechaRegistro: new Date().toISOString()
            };
            syncService.addToQueue('pago', datosPago);
        }
    };

    return { cobros, setCobros, addCobro, updateCobro };
};
