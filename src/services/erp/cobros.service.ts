import { erpClient, getCommonParams, erpConfig } from './api.client';
import { ventasService } from './ventas.service';
import { CobroERP } from '../../dtos/erp.dtos';

export const cobrosService = {
    async getCobrosPendientes(): Promise<CobroERP[]> {
        try {
            const fechaHoy = new Date().toISOString().split('T')[0];
            const fechaHaceUnAno = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Usar historial de todos los clientes (id=0) para buscar pendientes
            const historial = await ventasService.getHistorialPedidos(0, fechaHaceUnAno, fechaHoy, false);

            const cobrosPendientes: CobroERP[] = [];
            for (const pedido of historial) {
                const totalPedido = pedido.TotalImporte || pedido.Total || pedido.Importe || 0;
                const totalPagado = pedido.TotalPagado || pedido.Pagado || 0;
                const saldoPendiente = totalPedido - totalPagado;

                if (saldoPendiente > 0.01) {
                    cobrosPendientes.push({
                        Id: pedido.Id || pedido.ID_DocCli || 0,
                        IdCliente: pedido.ID_Cliente || pedido.IdCliente || 0,
                        NombreCliente: pedido.NombreCliente || pedido.Cliente || 'Cliente Desconocido',
                        Importe: saldoPendiente,
                        Fecha: pedido.Fecha || fechaHoy,
                        IdNotaVenta: pedido.Id || pedido.ID_DocCli || undefined,
                        Estado: 'Pendiente'
                    });
                }
            }
            return cobrosPendientes;
        } catch { return []; }
    },

    async registrarPago(pago: any): Promise<any> {
        const body = {
            sesionwcf: parseInt(erpConfig.getSessionId(), 10),
            ID_DocCli: pago.ID_DocCli || 0,
            ID_MetodoPago: pago.ID_MetodoPago || 0,
            Fecha: pago.Fecha || new Date().toISOString().split('T')[0],
            Importe: pago.Importe || 0
        };
        const response = await erpClient.post('/NuevoPagoWS', body);
        return response.data;
    }
};
