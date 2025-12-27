const axios = require('axios');

const BASE_URL = 'http://80.58.154.71:8000/WcfServiceLibraryVerial';
const SESSION_ID = '39';

async function testConnection() {
    console.log(`🔌 Probando conexión FINAL a ${BASE_URL} (Sesión: ${SESSION_ID})`);
    
    // Prueba GetClientesWS (El que fallaba con error de fichero INI)
    try {
        console.log('\n[TEST] GetClientesWS...');
        const params = `x=${SESSION_ID}&id_cliente=0&fecha=2024-02-05&hora=12:00`;
        const url = `${BASE_URL}/GetClientesWS?${params}`;
        console.log(`📡 GET ${url}`);
        
        const resClientes = await axios.get(url);
        
        console.log('📡 Status:', resClientes.status);
        
        if (resClientes.data?.InfoError) {
             if (resClientes.data.InfoError.Codigo !== 0) {
                console.error('❌ [SIGUE FALLANDO] InfoError:', resClientes.data.InfoError);
             } else {
                 console.log('⚠️ InfoError (Codigo 0 - OK):', resClientes.data.InfoError);
             }
        }
        
        if (Array.isArray(resClientes.data)) {
             console.log(`✅ ÉXITO: Recibidos ${resClientes.data.length} clientes.`);
             if (resClientes.data.length > 0) {
                 console.log('   Ejemplo:', JSON.stringify(resClientes.data[0]).substring(0, 100) + '...');
             }
        } else if (resClientes.data?.Clientes) {
             const count = Array.isArray(resClientes.data.Clientes) ? resClientes.data.Clientes.length : 1;
             console.log(`✅ ÉXITO: Recibidos ${count} clientes (Wrapper).`);
        } else {
             console.log('ℹ️ Respuesta:', JSON.stringify(resClientes.data).substring(0, 200));
        }

    } catch (error) {
        console.error('❌ Error de Red/Http:', error.message);
        if(error.response) console.error('   Data:', JSON.stringify(error.response.data));
    }
}

testConnection();
