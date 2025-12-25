/**
 * Script de Prueba de Conexión ERP Teixido - PRODUCCIÓN
 * 
 * IP: 80.58.154.71
 * Puerto: 8000
 * Sesión: 39
 * 
 * Este script prueba la conexión al ERP de producción y descarga clientes y artículos
 */

const axios = require('axios');

const ERP_BASE_URL = 'http://80.58.154.71:8000/WcfServiceLibraryVerial';
const SESSION_ID = '39';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(emoji, color, message) {
  console.log(`${emoji} ${color}${message}${colors.reset}`);
}

async function testConexion() {
  log('🚀', colors.bright, '='.repeat(60));
  log('🚀', colors.cyan, 'TEST DE CONEXIÓN ERP TEIXIDO - PRODUCCIÓN');
  log('🚀', colors.bright, '='.repeat(60));
  console.log('');
  
  log('🔧', colors.blue, `URL Base: ${ERP_BASE_URL}`);
  log('🔧', colors.blue, `Sesión ID: ${SESSION_ID}`);
  console.log('');
  
  // Test 1: Obtener Clientes
  await testClientes();
  
  console.log('');
  
  // Test 2: Obtener Artículos
  await testArticulos();
  
  console.log('');
  log('✅', colors.green, 'Pruebas completadas');
}

async function testClientes() {
  log('👥', colors.cyan, '='.repeat(60));
  log('👥', colors.cyan, 'TEST 1: OBTENER CLIENTES');
  log('👥', colors.cyan, '='.repeat(60));
  
  const fecha = new Date().toISOString().split('T')[0];
  const url = `${ERP_BASE_URL}/GetClientesWS?x=${SESSION_ID}&id_cliente=0&fecha=${fecha}&hora=12:00`;
  
  log('🔗', colors.blue, `URL: ${url}`);
  
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    log('✅', colors.green, `Respuesta recibida - Status: ${response.status}`);
    
    // Verificar si hay error del servidor
    if (response.data?.InfoError) {
      const error = response.data.InfoError;
      if (error.Codigo !== 0 && error.Codigo !== undefined && error.Codigo !== null) {
        log('⚠️', colors.yellow, `Advertencia del servidor: Código ${error.Codigo} - ${error.Descripcion || 'Error desconocido'}`);
      }
    }
    
    // Extraer clientes
    let clientes = [];
    
    if (Array.isArray(response.data)) {
      clientes = response.data;
    } else if (response.data?.Clientes) {
      clientes = Array.isArray(response.data.Clientes) ? response.data.Clientes : [response.data.Clientes];
    } else if (response.data?.clientes) {
      clientes = Array.isArray(response.data.clientes) ? response.data.clientes : [response.data.clientes];
    }
    
    if (clientes.length > 0) {
      log('🎉', colors.green, `¡ÉXITO! Se encontraron ${clientes.length} clientes`);
      console.log('');
      log('📋', colors.cyan, 'Primeros 3 clientes:');
      clientes.slice(0, 3).forEach((cliente, i) => {
        console.log(`   ${i + 1}. ${cliente.Nombre || cliente.NombreComercial || 'Sin nombre'} (ID: ${cliente.Id})`);
        if (cliente.NIF) console.log(`      NIF: ${cliente.NIF}`);
        if (cliente.Telefono) console.log(`      Tel: ${cliente.Telefono}`);
      });
    } else {
      log('⚠️', colors.yellow, 'No se encontraron clientes (array vacío)');
      log('💡', colors.yellow, 'Verifica que la sesión 39 tenga clientes asignados en el ERP');
    }
    
  } catch (error) {
    log('❌', colors.red, `Error: ${error.message}`);
    
    if (error.response) {
      log('📥', colors.red, `Status: ${error.response.status} - ${error.response.statusText}`);
      log('📄', colors.red, `Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    } else if (error.request) {
      log('🔌', colors.red, 'No se recibió respuesta del servidor');
      log('💡', colors.yellow, 'Posibles causas:');
      console.log('     - El servidor está caído');
      console.log('     - El puerto 8000 está bloqueado');
      console.log('     - Problemas de red/firewall');
    } else {
      log('⚙️', colors.red, `Error de configuración: ${error.message}`);
    }
    
    if (error.code) {
      log('🔍', colors.yellow, `Código de error: ${error.code}`);
    }
  }
}

async function testArticulos() {
  log('📦', colors.cyan, '='.repeat(60));
  log('📦', colors.cyan, 'TEST 2: OBTENER ARTÍCULOS');
  log('📦', colors.cyan, '='.repeat(60));
  
  const url = `${ERP_BASE_URL}/GetArticulosWS?x=${SESSION_ID}`;
  
  log('🔗', colors.blue, `URL: ${url}`);
  
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    log('✅', colors.green, `Respuesta recibida - Status: ${response.status}`);
    
    // Verificar si hay error del servidor
    if (response.data?.InfoError) {
      const error = response.data.InfoError;
      if (error.Codigo !== 0 && error.Codigo !== undefined && error.Codigo !== null) {
        log('⚠️', colors.yellow, `Advertencia del servidor: Código ${error.Codigo} - ${error.Descripcion || 'Error desconocido'}`);
      }
    }
    
    // Extraer artículos
    let articulos = [];
    
    if (Array.isArray(response.data)) {
      articulos = response.data;
    } else if (response.data?.Articulos) {
      articulos = Array.isArray(response.data.Articulos) ? response.data.Articulos : [response.data.Articulos];
    } else if (response.data?.articulos) {
      articulos = Array.isArray(response.data.articulos) ? response.data.articulos : [response.data.articulos];
    }
    
    if (articulos.length > 0) {
      log('🎉', colors.green, `¡ÉXITO! Se encontraron ${articulos.length} artículos`);
      console.log('');
      log('📋', colors.cyan, 'Primeros 3 artículos:');
      articulos.slice(0, 3).forEach((art, i) => {
        console.log(`   ${i + 1}. ${art.Nombre || art.Descripcion || 'Sin nombre'} (ID: ${art.Id})`);
        if (art.Codigo) console.log(`      Código: ${art.Codigo}`);
        if (art.PVP !== undefined) console.log(`      PVP: €${art.PVP}`);
        if (art.Stock !== undefined) console.log(`      Stock: ${art.Stock}`);
      });
    } else {
      log('⚠️', colors.yellow, 'No se encontraron artículos (array vacío)');
      log('💡', colors.yellow, 'Verifica que la sesión 39 tenga artículos asignados en el ERP');
    }
    
  } catch (error) {
    log('❌', colors.red, `Error: ${error.message}`);
    
    if (error.response) {
      log('📥', colors.red, `Status: ${error.response.status} - ${error.response.statusText}`);
      log('📄', colors.red, `Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    } else if (error.request) {
      log('🔌', colors.red, 'No se recibió respuesta del servidor');
      log('💡', colors.yellow, 'Posibles causas:');
      console.log('     - El servidor está caído');
      console.log('     - El puerto 8000 está bloqueado');
      console.log('     - Problemas de red/firewall');
    } else {
      log('⚙️', colors.red, `Error de configuración: ${error.message}`);
    }
    
    if (error.code) {
      log('🔍', colors.yellow, `Código de error: ${error.code}`);
    }
  }
}

// Ejecutar prueba
testConexion().catch(error => {
  log('💥', colors.red, `Error fatal: ${error.message}`);
  process.exit(1);
});
