const { articulosService } = require('./src/services/erp/articulos.service');

// Mock Dependencies
const axios = require('axios');
const BASE_URL = 'http://80.58.154.71:8000/WcfServiceLibraryVerial';
const SESSION_ID = '39';

// Monkey Patching for Node execution context
const erpClient = {
    get: async (url) => {
        const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
        console.log(`[MOCK] GET ${fullUrl}`);
        const res = await axios.get(fullUrl);
        return res;
    }
};

const getCommonParams = () => `x=${SESSION_ID}`;

// Re-implement Service Logic purely for testing (to avoid TS compilation issues)
// This mirrors exactly the structure I just wrote to `articulos.service.ts`
async function testRobustMerge() {
    console.log('🧬 Testing Robust Merge Logic...');

    try {
        // 1. Base
        const resBase = await axios.get(`${BASE_URL}/GetArticulosWS?x=${SESSION_ID}`);
        let articulos = resBase.data.Articulos || resBase.data || [];
        if (!Array.isArray(articulos)) articulos = [articulos];
        console.log(`📦 Articles: ${articulos.length}`);

        // 2. Stock
        const resStock = await axios.get(`${BASE_URL}/GetStockArticulosWS?x=${SESSION_ID}&id_articulo=0`);
        let stockList = resStock.data.Stock || resStock.data || [];
        if (!Array.isArray(stockList)) stockList = Object.values(resStock.data).find(v => Array.isArray(v)) || [];
        console.log(`📦 Stock: ${stockList.length}`);

        // 3. Tariffs
        const resTariff = await axios.get(`${BASE_URL}/GetCondicionesTarifaWS?x=${SESSION_ID}&id_articulo=0&id_cliente=0&fecha=2024-02-05`);
        let tariffList = resTariff.data.CondicionesTarifa || resTariff.data || [];
        console.log(`📦 Tariffs: ${tariffList.length}`);

        // 4. Merge
        const stockMap = new Map();
        stockList.forEach(item => stockMap.set(String(item.ID_Articulo || item.Id), item));

        const tariffMap = new Map();
        tariffList.forEach(item => tariffMap.set(String(item.ID_Articulo || item.Id), item));

        const merged = articulos.map(art => {
            const id = String(art.Id || art.ID_Articulo);
            const stock = stockMap.get(id);
            const tariff = tariffMap.get(id);
            
            return {
                Id: id,
                Nombre: art.Nombre,
                StockOriginal: art.Stock,
                StockMerged: stock?.Stock,
                PrecioOriginal: art.Precio,
                PrecioTarifa: tariff?.Precio
            };
        });

        const abeto = merged.find(a => a.Id === '1');
        console.log('\n--- VERIFICATION (Abeto ID 1) ---');
        console.log(JSON.stringify(abeto, null, 2));

        if (abeto.StockMerged > 0) console.log('✅ Stock Merged Correctly');
        else console.error('❌ Stock Merge Failed');

    } catch (e) {
        console.error('❌ Test Failed:', e.message);
    }
}

testRobustMerge();
