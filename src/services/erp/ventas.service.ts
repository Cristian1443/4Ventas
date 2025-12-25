import { erpClient, getCommonParams, erpConfig } from './api.client';

export const ventasService = {
    async crearDocumentoVenta(documento: any): Promise<any> {
        const body = {
            sesionwcf: parseInt(erpConfig.getSessionId(), 10),
            ...documento
        };
        console.log('📤 Enviando venta al ERP...');
        const response = await erpClient.post('/NuevoDocClienteWS', body);
        return response.data;
    },

    async pedidoModificable(id_pedido: number): Promise<boolean> {
        try {
            const response = await erpClient.get(`/PedidoModificableWS?${getCommonParams()}&id_pedido=${id_pedido}`);
            if (typeof response.data === 'boolean') return response.data;
            return response.data?.Modificable ?? response.data?.modificable ?? false;
        } catch { return false; }
    },

    async updateDocCliente(id: number, aux1?: string, aux2?: string, aux3?: string): Promise<any> {
        const body: any = { sesionwcf: parseInt(erpConfig.getSessionId(), 10), Id: id };
        if (aux1 !== undefined) body.Aux1 = aux1;
        if (aux2 !== undefined) body.Aux2 = aux2;
        if (aux3 !== undefined) body.Aux3 = aux3;
        const response = await erpClient.post('/UpdateDocClienteWS', body);
        return response.data;
    },

    async getNextNumDocs(): Promise<any> {
        try {
            const response = await erpClient.get(`/GetNextNumDocsWS?${getCommonParams()}`);
            return response.data;
        } catch { return null; }
    },

    async estadoPedidos(pedidos: Array<{ Id: number; Referencia?: string | null }>): Promise<any[]> {
        try {
            const body = { sesionwcf: parseInt(erpConfig.getSessionId(), 10), Pedidos: pedidos };
            const response = await erpClient.post('/EstadoPedidosWS', body);
            return Array.isArray(response.data) ? response.data : (response.data?.Pedidos || []);
        } catch { return []; }
    },

    async getHistorialPedidos(id_cliente: number, fechaDesde: string, fechaHasta: string, allareasventa = false): Promise<any[]> {
        try {
            let url = `/GetHistorialPedidosWS?${getCommonParams()}&id_cliente=${id_cliente}&fechadesde=${fechaDesde}&fechahasta=${fechaHasta}`;
            if (allareasventa) url += `&allareasventa=true`;
            const response = await erpClient.get(url);
            return Array.isArray(response.data) ? response.data : (response.data?.Pedidos || []);
        } catch { return []; }
    }
};
