import { erpClient, getCommonParams, erpConfig } from './api.client';
import { VisitaERP, NotaAlmacenERP } from '../../dtos/erp.dtos';

export const agendaService = {
    async getAgenda(from?: string, to?: string): Promise<VisitaERP[]> {
        console.log('ℹ️ GetAgendaWS no disponible. Local mode only.');
        return [];
    },

    async crearVisita(visita: Partial<VisitaERP>): Promise<any> {
        const body = {
            sesionwcf: parseInt(erpConfig.getSessionId(), 10),
            Visita: visita
        };
        const response = await erpClient.post('/NuevaVisitaWS', body);
        return response.data;
    },

    async actualizarVisita(id: number, completado: boolean): Promise<any> {
        const body = {
            sesionwcf: parseInt(erpConfig.getSessionId(), 10),
            Id: id,
            Completado: completado
        };
        const response = await erpClient.post('/ActualizarVisitaWS', body);
        return response.data;
    }
};

export const almacenService = {
    async getNotasAlmacen(): Promise<NotaAlmacenERP[]> {
        console.log('ℹ️ GetNotasAlmacenWS no disponible. Local mode only.');
        return [];
    }
};
