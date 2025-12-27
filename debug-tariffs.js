const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://80.58.154.71:8000/WcfServiceLibraryVerial';
const SESSION_ID = '39';

async function debugTariffs() {
    const logData = { tariffs: null, error: null };
    
    try {
        console.log('🔌 Testing GetCondicionesTarifaWS (Bulk)...');
        // id_articulo=0 usually implies "ALL" in this API style
        const url = `${BASE_URL}/GetCondicionesTarifaWS?x=${SESSION_ID}&id_articulo=0&id_cliente=0&fecha=${new Date().toISOString().split('T')[0]}`;
        console.log(`GET ${url}`);
        
        const res = await axios.get(url);
        
        let tarifas = [];
        if (Array.isArray(res.data)) tarifas = res.data;
        else if (res.data?.CondicionesTarifa) tarifas = res.data.CondicionesTarifa; // Guessing property name
        else if (res.data?.Tarifas) tarifas = res.data.Tarifas;
        else tarifas = [res.data]; // Fallback

        logData.tariffs = {
            count: tarifas.length,
            sample: tarifas.length > 0 ? tarifas[0] : null,
            rawResponseKeys: Object.keys(res.data)
        };
        console.log(`✅ Received ${tarifas.length} tariff entries.`);

    } catch (e) {
        logData.error = { message: e.message };
        console.error('❌ Error:', e.message);
    }

    fs.writeFileSync('debug_tariffs.json', JSON.stringify(logData, null, 2), 'utf8');
}

debugTariffs();
