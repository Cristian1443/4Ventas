import { erpClient, erpConfig } from './api.client';

export const mascotasService = {
    async getMascotas(id_cliente = 0): Promise<any[]> {
        try {
            const response = await erpClient.get(`/GetMascotasWS?x=${erpConfig.getSessionId()}&id_cliente=${id_cliente}`);
            return Array.isArray(response.data) ? response.data : (response.data?.Mascotas || []);
        } catch { return []; }
    },

    async crearMascota(mascota: any): Promise<any> {
        const body = {
            sesionwcf: parseInt(erpConfig.getSessionId(), 10),
            ...mascota
        };
        const response = await erpClient.post('/NuevaMascotaWS', body);
        return response.data;
    },

    async borrarMascota(id: number, id_cliente: number): Promise<any> {
        const body = {
            sesionwcf: parseInt(erpConfig.getSessionId(), 10),
            Id: id,
            ID_Cliente: id_cliente
        };
        const response = await erpClient.post('/BorrarMascotaWS', body);
        return response.data;
    }
};
