import { erpClient, getCommonParams } from './api.client';

export const catalogosService = {
    async getPaises(): Promise<any[]> {
        try { const r = await erpClient.get(`/GetPaisesWS?${getCommonParams()}`); return Array.isArray(r.data) ? r.data : (r.data?.Paises || []); } catch { return []; }
    },
    async getProvincias(): Promise<any[]> {
        try { const r = await erpClient.get(`/GetProvinciasWS?${getCommonParams()}`); return Array.isArray(r.data) ? r.data : (r.data?.Provincias || []); } catch { return []; }
    },
    async getLocalidades(): Promise<any[]> {
        try { const r = await erpClient.get(`/GetLocalidadesWS?${getCommonParams()}`); return Array.isArray(r.data) ? r.data : (r.data?.Localidades || []); } catch { return []; }
    },
    async getAgentes(): Promise<any[]> {
        try { const r = await erpClient.get(`/GetAgentesWS?${getCommonParams()}`); return Array.isArray(r.data) ? r.data : (r.data?.Agentes || []); } catch { return []; }
    },
    async getMetodosPago(): Promise<any[]> {
        try { const r = await erpClient.get(`/GetMetodosPagoWS?${getCommonParams()}`); return Array.isArray(r.data) ? r.data : (r.data?.MetodosPago || []); } catch { return []; }
    },
    async getFormasEnvio(): Promise<any[]> {
        try { const r = await erpClient.get(`/GetFormasEnvioWS?${getCommonParams()}`); return Array.isArray(r.data) ? r.data : (r.data?.FormasEnvio || []); } catch { return []; }
    },
    async getCursos(): Promise<any[]> {
        try { const r = await erpClient.get(`/GetCursosWS?${getCommonParams()}`); return Array.isArray(r.data) ? r.data : (r.data?.Cursos || []); } catch { return []; }
    },
    async getAsignaturas(): Promise<any[]> {
        try { const r = await erpClient.get(`/GetAsignaturasWS?${getCommonParams()}`); return Array.isArray(r.data) ? r.data : (r.data?.Asignaturas || []); } catch { return []; }
    },
    async getColecciones(): Promise<any[]> {
        try { const r = await erpClient.get(`/GetColeccionesWS?${getCommonParams()}`); return Array.isArray(r.data) ? r.data : (r.data?.Colecciones || []); } catch { return []; }
    },
    async getFabricantes(): Promise<any[]> {
        try { const r = await erpClient.get(`/GetFabricantesWS?${getCommonParams()}`); return Array.isArray(r.data) ? r.data : (r.data?.Fabricantes || []); } catch { return []; }
    },
    async getCategorias(): Promise<any[]> {
        try { const r = await erpClient.get(`/GetCategoriasWS?${getCommonParams()}`); return Array.isArray(r.data) ? r.data : (r.data?.Categorias || []); } catch { return []; }
    },
    async getCategoriasWeb(): Promise<any[]> {
        try { const r = await erpClient.get(`/GetCategoriasWebWS?${getCommonParams()}`); return Array.isArray(r.data) ? r.data : (r.data?.CategoriasWeb || []); } catch { return []; }
    },
    async getCondicionesTarifa(id_articulo = 0, id_cliente = 0, fecha?: string): Promise<any[]> {
        try {
            let url = `/GetCondicionesTarifaWS?${getCommonParams()}&id_articulo=${id_articulo}&id_cliente=${id_cliente}`;
            if (fecha) url += `&fecha=${fecha}`;
            const r = await erpClient.get(url);
            return Array.isArray(r.data) ? r.data : (r.data?.Condiciones || []);
        } catch { return []; }
    }
};
