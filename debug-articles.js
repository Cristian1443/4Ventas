const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://80.58.154.71:8000/WcfServiceLibraryVerial';
const SESSION_ID = '39';

async function debugArticles() {
    const logData = {
        meta: { url: BASE_URL, session: SESSION_ID, time: new Date().toISOString() },
        articles: null,
        stock: null,
        error: null
    };

    try {
        // 1. GetArticulosWS
        const res = await axios.get(`${BASE_URL}/GetArticulosWS?x=${SESSION_ID}`);
        
        let articles = [];
        if (Array.isArray(res.data)) articles = res.data;
        else if (res.data?.Articulos) articles = res.data.Articulos;
        else articles = [res.data];

        logData.articles = {
            count: articles.length,
            sample: articles.length > 0 ? articles[0] : null,
            rawKeys: Object.keys(res.data)
        };

    } catch (e) {
        logData.error = { step: 'GetArticulosWS', message: e.message };
    }

    try {
        // 2. GetStockArticulosWS
        const resStock = await axios.get(`${BASE_URL}/GetStockArticulosWS?x=${SESSION_ID}&id_articulo=0`);
        
        let stockList = [];
        if (Array.isArray(resStock.data)) stockList = resStock.data;
        else {
             const values = Object.values(resStock.data);
             const arrayVal = values.find(v => Array.isArray(v));
             if (arrayVal) stockList = arrayVal;
        }

        logData.stock = {
            count: stockList.length,
            sample: stockList.length > 0 ? stockList[0] : null,
            rawResponse: resStock.data
        };

    } catch (e) {
        if (!logData.error) logData.error = { step: 'GetStockArticulosWS', message: e.message };
    }

    fs.writeFileSync('debug_result.json', JSON.stringify(logData, null, 2), 'utf8');
    console.log('Done writing debug_result.json');
}

debugArticles();
