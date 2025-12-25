import { erpClient, getCommonParams, erpConfig } from './api.client';

export const articulosService = {
    async getArticulos(fecha?: string, hora?: string): Promise<any[]> {
        console.log('🚀 [getArticulos] Iniciando solicitud');
        const params = getCommonParams();
        const fechaHoy = new Date().toISOString().split('T')[0];

        const variaciones = [
            { params: `${params}`, desc: 'solo sesión' },
            { params: `${params}&fecha=${fechaHoy}`, desc: 'fecha hoy' },
            { params: `${params}&fecha=${fecha || fechaHoy}&hora=${hora || '12:00'}`, desc: 'con parámetros' },
        ];

        for (const variacion of variaciones) {
            try {
                console.log(`🔄 [getArticulos] Intentando (${variacion.desc})...`);
                const response = await erpClient.get(`/GetArticulosWS?${variacion.params}`);

                let articulos: any[] = [];
                if (Array.isArray(response.data)) articulos = response.data;
                else if (Array.isArray(response.data?.Articulos)) articulos = response.data.Articulos;
                else if (response.data?.Articulos) articulos = [response.data.Articulos];

                if (articulos.length > 0) {
                    // Enriquecer con Stock si es posible
                    try {
                        const stockData = await articulosService.getStockArticulos(0);
                        const stockMap = new Map();
                        if (Array.isArray(stockData)) {
                            stockData.forEach((item: any) => stockMap.set(item.ID_Articulo || item.Id, item));
                        }
                        return articulos.map(art => ({
                            ...art,
                            Stock: stockMap.get(art.Id || art.ID_Articulo)?.Stock || art.Stock || 0,
                            StockMinimo: stockMap.get(art.Id || art.ID_Articulo)?.StockMinimo || art.StockMinimo || 0
                        }));
                    } catch (e) {
                        return articulos;
                    }
                }
            } catch (error) { /* continue */ }
        }
        return [];
    },

    async getStockArticulos(id_articulo = 0): Promise<any[]> {
        try {
            const response = await erpClient.get(`/GetStockArticulosWS?${getCommonParams()}&id_articulo=${id_articulo}`);
            if (Array.isArray(response.data)) return response.data;
            // Buscar propiedad array
            return Object.values(response.data).find(v => Array.isArray(v)) as any[] || [];
        } catch (e) { return []; }
    },

    async getImagenesArticulos(id_articulo = 0, numpixels = 300): Promise<any[]> {
        try {
            const response = await erpClient.get(`/GetImagenesArticulosWS?${getCommonParams()}&id_articulo=${id_articulo}&numpixelsladomenor=${numpixels}`);
            return Array.isArray(response.data) ? response.data : (response.data?.Imagenes || []);
        } catch (e) { return []; }
    },

    async getCamposConfigurables(): Promise<any[]> {
        try {
            const response = await erpClient.get(`/GetCamposConfigurablesArticulosWS?${getCommonParams()}`);
            return Array.isArray(response.data) ? response.data : (response.data?.Campos || []);
        } catch (e) { return []; }
    }
};
