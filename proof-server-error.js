const axios = require('axios');

const ERP_BASE_URL = 'http://80.58.154.71:8000/WcfServiceLibraryVerial';

async function pruebaForense() {
  console.log('🕵️ INICIANDO PRUEBA FORENSE PARA DESCARTAR ERROR DE CODIGO\n');

  // CASO 1: Petición "Correcta" (La que debería funcionar)
  console.log('1️⃣  CASO 1: Enviando petición CORRECTA (Sesión 39)');
  await probarPeticion(`x=39&id_cliente=0`);

  // CASO 2: Petición con Sesión FALSA
  console.log('\n2️⃣  CASO 2: Enviando petición con SESIÓN FALSA (Sesión 99999)');
  // Si el servidor funcionara, debería decir "Sesión no válida" o devolver vacío, NO "Falta INI"
  await probarPeticion(`x=99999&id_cliente=0`);

  // CASO 3: Petición SIN Parámetros
  console.log('\n3️⃣  CASO 3: Enviando petición SIN PARÁMETROS');
  await probarPeticion(``);

  console.log('\n⚖️  CONCLUSIÓN DEL DIAGNÓSTICO:');
}

async function probarPeticion(params) {
  const url = `${ERP_BASE_URL}/GetClientesWS?${params}`;
  try {
    console.log(`   Enviando a: .../GetClientesWS?${params}`);
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data?.InfoError) {
      console.log(`   ❌ RESPUESTA DEL SERVIDOR: [Código ${response.data.InfoError.Codigo}] "${response.data.InfoError.Descripcion}"`);
      return response.data.InfoError.Descripcion;
    } else {
      console.log('   ✅ RESPUESTA OK (Datos recibidos)');
      return 'OK';
    }
  } catch (error) {
    console.log(`   ⚠️ Error de red: ${error.message}`);
    return 'ERROR';
  }
}

pruebaForense();
