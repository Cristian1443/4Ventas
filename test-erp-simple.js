const axios = require('axios');
const fs = require('fs');

const ERP_BASE_URL = 'http://80.58.154.71:8000/WcfServiceLibraryVerial';
const SESSION_ID = '39';

async function testERPConnection() {
  const resultados = {
    timestamp: new Date().toISOString(),
    baseUrl: ERP_BASE_URL,
    sessionId: SESSION_ID,
    tests: {}
  };

  console.log('Iniciando pruebas de conexion ERP...\n');

  // Test 1: Clientes
  console.log('Test 1: Obteniendo clientes...');
  const fecha = new Date().toISOString().split('T')[0];
  const urlClientes = `${ERP_BASE_URL}/GetClientesWS?x=${SESSION_ID}&id_cliente=0&fecha=${fecha}&hora=12:00`;
  
  try {
    const response = await axios.get(urlClientes, { timeout: 15000 });
    let clientes = [];
    
    if (Array.isArray(response.data)) {
      clientes = response.data;
    } else if (response.data?.Clientes) {
      clientes = Array.isArray(response.data.Clientes) ? response.data.Clientes : [response.data.Clientes];
    }
    
    resultados.tests.clientes = {
      exito: true,
      total: clientes.length,
      muestra: clientes.slice(0, 3).map(c => ({
        Id: c.Id,
        Nombre: c.Nombre || c.NombreComercial,
        NIF: c.NIF,
        Telefono: c.Telefono
      })),
      error: response.data?.InfoError
    };
    
    console.log(`  ✓ Exito: ${clientes.length} clientes encontrados`);
  } catch (error) {
    resultados.tests.clientes = {
      exito: false,
      error: error.message,
      code: error.code
    };
    console.log(`  × Error: ${error.message}`);
  }

  // Test 2: Artículos
  console.log('\nTest 2: Obteniendo articulos...');
  const urlArticulos = `${ERP_BASE_URL}/GetArticulosWS?x=${SESSION_ID}`;
  
  try {
    const response = await axios.get(urlArticulos, { timeout: 15000 });
    let articulos = [];
    
    if (Array.isArray(response.data)) {
      articulos = response.data;
    } else if (response.data?.Articulos) {
      articulos = Array.isArray(response.data.Articulos) ? response.data.Articulos : [response.data.Articulos];
    }
    
    resultados.tests.articulos = {
      exito: true,
      total: articulos.length,
      muestra: articulos.slice(0, 3).map(a => ({
        Id: a.Id,
        Codigo: a.Codigo,
        Nombre: a.Nombre || a.Descripcion,
        PVP: a.PVP,
        Stock: a.Stock
      })),
      error: response.data?.InfoError
    };
    
    console.log(`  ✓ Exito: ${articulos.length} articulos encontrados`);
  } catch (error) {
    resultados.tests.articulos = {
      exito: false,
      error: error.message,
      code: error.code
    };
    console.log(`  × Error: ${error.message}`);
  }

  // Guardar resultados
  const outputFile = 'test-erp-results.json';
  fs.writeFileSync(outputFile, JSON.stringify(resultados, null, 2));
  console.log(`\nResultados guardados en: ${outputFile}`);
  
  // Resumen
  console.log('\n' + '='.repeat(50));
  console.log('RESUMEN');
  console.log('='.repeat(50));
  console.log(`Clientes: ${resultados.tests.clientes.exito ? '✓ EXITO' : '× FALLO'}`);
  console.log(`Articulos: ${resultados.tests.articulos.exito ? '✓ EXITO' : '× FALLO'}`);
  
  if (resultados.tests.clientes.exito) {
    console.log(`  - ${resultados.tests.clientes.total} clientes encontrados`);
  }
  if (resultados.tests.articulos.exito) {
    console.log(`  - ${resultados.tests.articulos.total} articulos encontrados`);
  }
}

testERPConnection().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
