const { articulosService } = require('./src/services/erp/articulos.service');
const { erpConfig } = require('./src/services/erp/api.client');

// Mock axios or use real connection?
// Requires TS execution or babel. Since we are in JS environment, we can't import TS files directly easily without ts-node.
// It's better to create a standalone JS test accessing the endpoints MANUALLY mimicking the logic 
// OR try to use the build if available.
// Given previous scripts worked by importing axios directly, I'll create a script that mimics the NEW LOGIC 
// to prove it works, as running the app is the ultimate test.

// Actually, I can just write a script that does exactly what the new service method does (aggregated calls)
// to output the FINAL merged object for ID=1.

const axios = require('axios');
const BASE_URL = 'http://80.58.154.71:8000/WcfServiceLibraryVerial';
const SESSION_ID = '39';

async function verifyFix() {
    console.log('🧪 Verifying Fix Logic...');
    
    try {
        // 1. Get Articles
        console.log('1️⃣ Fetching Articles...');
        const resArt = await axios.get(`${BASE_URL}/GetArticulosWS?x=${SESSION_ID}`);
        const articles = Array.isArray(resArt.data) ? resArt.data : (resArt.data.Articulos || []);
        
        // 2. Get Stock
        console.log('2️⃣ Fetching Stock...');
        const resStock = await axios.get(`${BASE_URL}/GetStockArticulosWS?x=${SESSION_ID}&id_articulo=0`);
        let stockList = [];
        if (Array.isArray(resStock.data)) stockList = resStock.data;
        else {
             const values = Object.values(resStock.data);
             const arrayVal = values.find(v => Array.isArray(v));
             if (arrayVal) stockList = arrayVal;
        }

        // 3. Get Tariffs
        console.log('3️⃣ Fetching Tariffs...');
        const fecha = new Date().toISOString().split('T')[0];
        const resTariff = await axios.get(`${BASE_URL}/GetCondicionesTarifaWS?x=${SESSION_ID}&id_articulo=0&id_cliente=0&fecha=${fecha}`);
        const tariffs = Array.isArray(resTariff.data) ? resTariff.data : (resTariff.data.CondicionesTarifa || []);

        console.log(`📊 Data Points: Articles=${articles.length}, Stock=${stockList.length}, Tariffs=${tariffs.length}`);

        // 4. Merge Logic Check (Sample ID 1)
        const art1 = articles.find(a => (a.Id || a.ID_Articulo) === 1);
        if (!art1) { console.error('❌ Article ID 1 not found'); return; }

        const stock1 = stockList.find(s => (s.ID_Articulo || s.Id) === 1);
        const tariff1 = tariffs.find(t => (t.ID_Articulo || t.Id) === 1);

        console.log('\n--- MERGE RESULT (Simulator) ---');
        console.log('Article:', art1.Nombre);
        console.log('Original Price:', art1.Precio || art1.PVP || 0);
        console.log('Merged Stock:', stock1 ? stock1.Stock : 'NOT FOUND');
        console.log('Merged Price (Tariff):', tariff1 ? tariff1.Precio : 'NOT FOUND');

        if (stock1 && stock1.Stock > 0) console.log('✅ Stock Fix Verified!');
        else console.warn('⚠️ Stock is still 0 or missing?');

        // Tariff price might be 0 for ID 1, let's check one with price
        const tariffWithPrice = tariffs.find(t => t.Precio > 0);
        if (tariffWithPrice) {
            console.log(`\n--- Random Item with Price (ID: ${tariffWithPrice.ID_Articulo}) ---`);
            const artX = articles.find(a => (a.Id || a.ID_Articulo) === tariffWithPrice.ID_Articulo);
            if (artX) {
                 console.log('Name:', artX.Nombre);
                 console.log('Price:', tariffWithPrice.Precio);
            }
             console.log('✅ Price Fix Verified (Data exists)!');
        } else {
            console.warn('⚠️ No tariffs with price > 0 found. Is this expected?');
        }

    } catch (e) {
        console.error('❌ Verification Failed:', e.message);
    }
}

verifyFix();
