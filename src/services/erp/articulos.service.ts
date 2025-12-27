import { erpClient, getCommonParams, erpConfig } from './api.client';

export const articulosService = {
    async getArticulos(fecha?: string, hora?: string): Promise<any[]> {
        console.log('🚀 [getArticulos] Iniciando solicitud');
        const params = getCommonParams();

        try {
            // 1. Obtener Lista Base
            console.log(`🔄 [getArticulos] Solicitando lista base...`);
            const response = await erpClient.get(`/GetArticulosWS?${params}`);

            let articulos: any[] = [];
            if (Array.isArray(response.data)) articulos = response.data;
            else if (Array.isArray(response.data?.Articulos)) articulos = response.data.Articulos;
            else if (response.data?.Articulos) articulos = [response.data.Articulos];

            if (articulos.length > 0) {
                console.log(`✅ [getArticulos] ${articulos.length} artículos base recibidos.`);

                // 2. Obtener Stock y Tarifas (Independientemente)
                let stockMap = new Map();
                let tarifaMap = new Map();

                try {
                    console.log('🔄 [getArticulos] Obteniendo Stock...');
                    const stockData = await articulosService.getStockArticulos(0);
                    if (Array.isArray(stockData)) {
                        stockData.forEach((item: any) => {
                            const key = item.ID_Articulo || item.Id;
                            if (key) stockMap.set(String(key), item); // Normalizar Key a String
                        });
                        console.log(`✅ [getArticulos] Stock cargado: ${stockData.length} items`);
                    }
                } catch (e) {
                    console.warn('⚠️ [getArticulos] Falló la carga de Stock:', e);
                }

                try {
                    console.log('🔄 [getArticulos] Obteniendo Tarifas...');
                    const tarifaData = await articulosService.getCondicionesTarifa(0);
                    if (Array.isArray(tarifaData)) {
                        tarifaData.forEach((item: any) => {
                            const key = item.ID_Articulo || item.Id;
                            if (key) tarifaMap.set(String(key), item); // Normalizar Key a String
                        });
                        console.log(`✅ [getArticulos] Tarifas cargadas: ${tarifaData.length} items`);
                    }
                } catch (e) {
                    console.warn('⚠️ [getArticulos] Falló la carga de Tarifas:', e);
                }

                // 3. Merge Final
                return articulos.map(art => {
                    const id = String(art.Id || art.ID_Articulo); // Normalizar búsqueda a String
                    const stockInfo = stockMap.get(id);
                    const tarifaInfo = tarifaMap.get(id);

                    // Lógica de Prioridad de Precios: Tarifa > Artículo Base > 0
                    const precioTarifa = tarifaInfo?.Precio;
                    const precioBase = art.Precio || art.PVP;
                    const precioFinal = (precioTarifa !== undefined && precioTarifa !== null) ? precioTarifa : (precioBase || 0);

                    return {
                        ...art,
                        // Unificar campos de Stock
                        Stock: stockInfo?.Stock ?? art.Stock ?? 0,
                        StockMinimo: stockInfo?.StockMinimo ?? art.StockMinimo ?? 0,

                        // Unificar campos de Precio
                        Precio: precioFinal,
                        PVP: precioFinal
                    };
                });
            } else {
                console.warn('⚠️ [getArticulos] No se encontraron artículos en la respuesta base.');
            }
        } catch (error) {
            console.error('❌ [getArticulos] Error Crítico:', error);
            // Si falla todo, intentamos devolver error o array vacío
        }

        return [];
    },

    async getStockArticulos(id_articulo = 0): Promise<any[]> {
        try {
            const response = await erpClient.get(`/GetStockArticulosWS?${getCommonParams()}&id_articulo=${id_articulo}`);
            if (Array.isArray(response.data)) return response.data;
            if (response.data?.Stock && Array.isArray(response.data.Stock)) return response.data.Stock;

            const values = Object.values(response.data);
            const foundArray = values.find(v => Array.isArray(v));
            return (foundArray as any[]) || [];
        } catch (e) { return []; }
    },

    async getCondicionesTarifa(id_articulo = 0): Promise<any[]> {
        try {
            const fecha = new Date().toISOString().split('T')[0];
            const url = `/GetCondicionesTarifaWS?${getCommonParams()}&id_articulo=${id_articulo}&id_cliente=0&fecha=${fecha}`;
            const response = await erpClient.get(url);

            if (Array.isArray(response.data)) return response.data;
            if (response.data?.CondicionesTarifa && Array.isArray(response.data.CondicionesTarifa)) return response.data.CondicionesTarifa;

            const values = Object.values(response.data);
            const foundArray = values.find(v => Array.isArray(v));
            return (foundArray as any[]) || [];
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
