import { erpClient, getCommonParams, erpConfig } from './api.client';
import { GastoERP } from '../../dtos/erp.dtos';

export const gastosService = {
    async getGastos(fecha?: string): Promise<GastoERP[]> {
        console.log('ℹ️ GetGastosWS no disponible. Local mode only.');
        return [];
    },

    async crearGasto(gasto: Partial<GastoERP>): Promise<any> {
        const body = {
            sesionwcf: parseInt(erpConfig.getSessionId(), 10),
            Gasto: gasto
        };
        const response = await erpClient.post('/NuevoGastoWS', body);
        return response.data;
    },

    async eliminarGasto(id: number): Promise<boolean> {
        try {
            const response = await erpClient.get(`/BorrarGastoWS?${getCommonParams()}&id_gasto=${id}`);
            return response.data && (!response.data.InfoError || response.data.InfoError.Codigo === 0);
        } catch { return false; }
    }
};
