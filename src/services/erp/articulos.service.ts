import { erpClient, getCommonParams, erpConfig } from './api.client';

const toNumberSafe = (value: any): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value !== 'string') return 0;

    const cleaned = value.replace(/[^\d,.-]/g, '').trim();
    if (!cleaned) return 0;

    let normalized = cleaned;
    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');
    if (hasComma && hasDot) {
        if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
            normalized = normalized.replace(/\./g, '').replace(',', '.');
        } else {
            normalized = normalized.replace(/,/g, '');
        }
    } else if (hasComma) {
        normalized = normalized.replace(',', '.');
    }

    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeImage = (value: any): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const raw = value.trim();
    if (!raw) return undefined;
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:image/')) return raw;
    // Si llega base64 "crudo", normalizar para que RN/Web lo rendericen.
    if (/^[A-Za-z0-9+/=\r\n]+$/.test(raw) && raw.length > 100) {
        return `data:image/jpeg;base64,${raw.replace(/\s/g, '')}`;
    }
    return undefined;
};

export const articulosService = {
    async getArticulos(fecha?: string, hora?: string, almacenId?: string): Promise<any[]> {
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

                // 2. Obtener Stock, Tarifas e Imágenes (Independientemente)
                let stockMap = new Map();
                let tarifaMap = new Map();
                let imagenMap = new Map<string, string>();

                try {
                    console.log(`🔄 [getArticulos] Obteniendo Stock${almacenId ? ` (Almacén: ${almacenId})` : ''}...`);
                    const stockData = await articulosService.getStockArticulos(0, almacenId);
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

                try {
                    console.log('🔄 [getArticulos] Obteniendo Imágenes...');
                    const imagenesData = await articulosService.getImagenesArticulos(0);
                    if (Array.isArray(imagenesData)) {
                        imagenesData.forEach((item: any) => {
                            const key = item.ID_Articulo || item.IdArticulo || item.id_articulo || item.Id || item.ID;
                            const imageValue = normalizeImage(
                                item.Imagen ??
                                item.imagen ??
                                item.UrlImagen ??
                                item.URLImagen ??
                                item.Url ??
                                item.URL ??
                                item.Image ??
                                item.Base64 ??
                                item.ImagenBase64
                            );
                            if (key && imageValue && !imagenMap.has(String(key))) {
                                imagenMap.set(String(key), imageValue);
                            }
                        });
                        console.log(`✅ [getArticulos] Imágenes cargadas: ${imagenMap.size} items`);
                    }
                } catch (e) {
                    console.warn('⚠️ [getArticulos] Falló la carga de Imágenes:', e);
                }

                // 3. Merge Final
                const usarStockPorAlmacen = !!(almacenId && String(almacenId).trim());
                return articulos.map(art => {
                    const id = String(art.Id || art.ID_Articulo); // Normalizar búsqueda a String
                    const stockInfo = stockMap.get(id);
                    const tarifaInfo = tarifaMap.get(id);
                    const imagenInfo = imagenMap.get(id);

                    // Lógica de Prioridad de Precios: Tarifa > Artículo Base > 0
                    const precioTarifa = toNumberSafe(tarifaInfo?.Precio ?? tarifaInfo?.PVP ?? tarifaInfo?.PrecioTarifa);
                    const precioBase = toNumberSafe(art.Precio ?? art.PVP ?? art.PrecioVenta ?? art.PrecioBase);
                    const precioFinal = precioTarifa > 0 ? precioTarifa : precioBase;

                    // Stock: si hay almacén, NO usar art.Stock del maestro (suele ser total general).
                    let stockMerged: number;
                    let stockMinMerged: number;
                    if (usarStockPorAlmacen) {
                        stockMerged = stockInfo != null ? toNumberSafe(stockInfo?.Stock ?? 0) : 0;
                        stockMinMerged =
                            stockInfo != null
                                ? toNumberSafe(stockInfo?.StockMinimo ?? art.StockMinimo ?? 0)
                                : toNumberSafe(art.StockMinimo ?? 0);
                    } else {
                        stockMerged = toNumberSafe(stockInfo?.Stock ?? art.Stock ?? 0);
                        stockMinMerged = toNumberSafe(stockInfo?.StockMinimo ?? art.StockMinimo ?? 0);
                    }

                    return {
                        ...art,
                        // Unificar campos de Stock
                        Stock: stockMerged,
                        StockMinimo: stockMinMerged,

                        // Unificar campos de Precio
                        Precio: precioFinal,
                        PVP: precioFinal,
                        Imagen: imagenInfo ?? art.Imagen ?? art.imagen ?? art.UrlImagen
                    };
                });
            } else {
                console.warn('⚠️ [getArticulos] No se encontraron artículos en la respuesta base.');
            }
        } catch (error) {
            const status = (error as any)?.response?.status;
            if (status === 403) {
                console.error('⛔ [getArticulos] ERP bloqueado (403). Revisa política de red/firewall (FortiGuard/proxy corporativo).');
            } else {
                console.error('❌ [getArticulos] Error Crítico:', error);
            }
            // Si falla todo, intentamos devolver error o array vacío
        }

        return [];
    },

    async getStockArticulos(id_articulo = 0, id_almacen?: string): Promise<any[]> {
        try {
            let url = `/GetStockArticulosWS?${getCommonParams()}&id_articulo=${id_articulo}`;
            if (id_almacen) {
                url += `&id_almacen=${id_almacen}`;
            }
            console.log(`📦 [getStockArticulos] URL: ${url}`);
            const response = await erpClient.get(url);
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
