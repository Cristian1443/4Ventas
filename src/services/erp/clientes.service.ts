import { erpClient, getCommonParams, erpConfig } from './api.client';
import { ClienteERP } from '../../dtos/erp.dtos';

export const clientesService = {
    async getClientes(id_cliente = 0, fecha?: string, hora?: string): Promise<any[]> {
        console.log('🚀 [getClientes] Iniciando solicitud');
        const params = getCommonParams(); // x=SESSION_ID

        // Variaciones de intento (copiado de lógica original)
        const fechaHoy = new Date().toISOString().split('T')[0];
        const fechaAyer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const variaciones = [
            { params: `${params}&id_cliente=0&fecha=2024-02-05&hora=12:00`, desc: 'formato Postman (fecha ejemplo)' },
            { params: `${params}&id_cliente=0&fecha=${fechaHoy}&hora=12:00`, desc: 'formato Postman (fecha hoy)' },
            { params: `${params}&id_cliente=0&fecha=${fechaAyer}&hora=12:00`, desc: 'formato Postman (fecha ayer)' },
            { params: `${params}&id_cliente=${id_cliente}&fecha=${fecha || fechaHoy}&hora=${hora || '12:00'}`, desc: 'con parámetros' },
            { params: `${params}&fecha=${fechaHoy}&hora=12:00`, desc: 'sin id_cliente' },
            { params: `${params}&fecha=${fechaHoy}`, desc: 'solo fecha' },
            { params: `${params}`, desc: 'solo sesión' },
        ];

        for (const variacion of variaciones) {
            try {
                console.log(`🔄 [getClientes] Intentando (${variacion.desc})...`);
                const response = await erpClient.get(`/GetClientesWS?${variacion.params}`);

                // Manejo de error de servidor (ej: archivo INI)
                if (response.data?.InfoError?.Codigo !== 0 && response.data?.InfoError?.Codigo != null) {
                    console.warn(`⚠️ Error Servidor (${response.data.InfoError.Codigo}): ${response.data.InfoError.Descripcion}`);
                }

                let clientes: any[] = [];
                if (Array.isArray(response.data)) clientes = response.data;
                else if (Array.isArray(response.data?.Clientes)) clientes = response.data.Clientes;
                else if (response.data?.Clientes) clientes = [response.data.Clientes];
                else if (Array.isArray(response.data?.clientes)) clientes = response.data.clientes;
                else if (response.data?.clientes) clientes = [response.data.clientes];

                if (clientes.length > 0) return clientes;
            } catch (error) {
                console.warn(`⚠️ Falló variación ${variacion.desc}`);
            }
        }

        return [];
    },

    async crearCliente(cliente: Partial<ClienteERP>): Promise<any> {
        const body = {
            sesionwcf: parseInt(erpConfig.getSessionId(), 10),
            Id: cliente.Id || 0,
            Tipo: cliente.Tipo || 1,
            NIF: cliente.NIF || '',
            Nombre: cliente.Nombre || '',
            Apellido1: '',
            Apellido2: '',
            RazonSocial: cliente.RazonSocial || cliente.Nombre || '',
            RegFiscal: 1,
            ID_Pais: 1,
            ID_Provincia: 0,
            Provincia: cliente.Provincia || '',
            ID_Localidad: 0,
            Localidad: cliente.Localidad || '',
            CPostal: cliente.CPostal || '',
            Direccion: cliente.Direccion || '',
            DireccionAux: '',
            Telefono: cliente.Telefono || '',
            Email: cliente.Email || '',
            Sexo: 1,
            ID_Agente1: 0,
            ID_Agente2: 0,
            ID_Agente3: 0,
            ID_MetodoPago: cliente.FormaPago || 0,
            WebUserOld: null,
            WebUser: null,
            WebPassword: null,
            EnviarAnuncios: false,
            DireccionesEnvio: []
        };
        const response = await erpClient.post('/NuevoClienteWS', body);
        return response.data;
    },

    async getDireccionesEnvio(idCliente: number): Promise<any[]> {
        // Implementar si es necesario
        return [];
    },

    async crearDireccionEnvio(direccion: any): Promise<any> {
        const body = {
            sesionwcf: parseInt(erpConfig.getSessionId(), 10),
            ...direccion
        };
        const response = await erpClient.post('/NuevaDireccionEnvioWS', body);
        return response.data;
    }
};
