import axios from 'axios';

/**
 * Servicio de integración con ERP Verial - PRODUCCIÓN
 * Actualizado con gestión de AGENDA
 */

const ERP_BASE_URL = 'http://x.verial.org:8000/WcfServiceLibraryVerial';
let SESSION_ID = '39';
let ERP_ENABLED = true;

export function setSessionId(sessionId: string) { SESSION_ID = sessionId; }
export function getSessionId(): string { return SESSION_ID; }
export function isERPEnabled(): boolean { return ERP_ENABLED; }
export function setERPEnabled(enabled: boolean) { ERP_ENABLED = enabled; }

export interface ClienteERP {
  Id: number;
  Tipo?: number;
  NIF: string;
  Nombre: string;
  RazonSocial: string;
  Provincia?: string;
  Localidad?: string;
  CPostal: string;
  Direccion: string;
  Telefono: string;
  Email: string;
  FormaPago?: number;
  DtoComercial?: number;
  DtoPPago?: number;
}

export interface ArticuloERP {
  Id: number;
  Codigo: string;
  Nombre: string;
  PVP: number;
  Stock?: number;
  StockMinimo?: number;
}

export interface MetodoPagoERP {
  Id: number;
  Nombre: string;
}

export interface GastoERP {
  Id: number;
  Concepto: string;
  Tipo: string;
  Importe: number;
  Fecha: string;
  Imagen?: string;
}

export interface DocumentoERP {
  Id: number;
  Nombre: string;
  Categoria: string; // 'Factura', 'Presupuesto', 'Otros'
  Fecha: string;
  Tamano: string;    // Ej: "1.2 MB"
  Tipo: string;      // 'pdf', 'image', 'doc'
  Url?: string;      // Link de descarga
}

export interface CobroERP {
  Id: number;
  IdCliente: number;
  NombreCliente: string;
  Importe: number;
  Fecha: string;
  IdNotaVenta?: number; // Referencia a la nota si existe
  Estado: string; // 'Pendiente'
}

export interface NotaAlmacenERP {
  Id: number;
  Tipo: string; // 'Carga Camion', 'Inventario', etc.
  Fecha: string;
  Usuario: string;
  NumArticulos: number;
  Observaciones: string;
}

export interface VisitaERP {
  Id: number;
  IdCliente?: number;
  NombreCliente: string;
  Direccion: string;
  Fecha: string; // YYYY-MM-DDT...
  Tipo: string;  // 'Visita', 'Entrega', 'Cobro'
  Completado: boolean;
  Observaciones?: string;
}

export interface LineaDocumento {
  TipoRegistro: number;
  ID_Articulo: number;
  Precio: number;
  Dto: number;
  DtoPPago: number;
  DtoEurosXUd: number;
  DtoEuros: number;
  Uds: number;
  UdsRegalo: number;
  UdsAuxiliares: number;
  ImporteLinea: number;
  PorcentajeIVA: number;
  PorcentajeRE: number;
  Lote: string | null;
  Caducidad: string | null;
  ID_Partida: number;
  DescripcionAmplia: string | null;
  Comentario: string | null;
}

export interface PagoDocumento {
  ID_MetodoPago: number;
  Fecha: string;
  Importe: number;
}

export interface DocumentoCliente {
  Id: number;
  Tipo: number;
  Numero: number;
  Referencia: string;
  Fecha: string;
  ID_Cliente: number;
  PreciosImpIncluidos: boolean;
  BaseImponible: number;
  TotalImporte: number;
  Comentario: string;
  Contenido: LineaDocumento[];
  Pagos: PagoDocumento[];
}

export interface NuevoPago {
  ID_DocCli: number;
  ID_MetodoPago: number;
  Fecha: string;
  Importe: number;
}

// ============================================================================
// CLIENTES
// ============================================================================

export async function getClientes(id_cliente = 0, fecha?: string, hora?: string): Promise<any[]> {
  try {
    // Intentar diferentes variaciones de parámetros basadas en el Postman collection
    // El Postman muestra: x=18&id_cliente=0&fecha=2024-02-05&hora=12:00
    const fechaHoy = new Date().toISOString().split('T')[0];
    const fechaAyer = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fechaPostman = '2024-02-05'; // Fecha del ejemplo en Postman
    
    console.log(`🔑 [getClientes] SESSION_ID actual: ${SESSION_ID}`);
    console.log(`📅 [getClientes] Fecha hoy: ${fechaHoy}, Fecha ayer: ${fechaAyer}, Fecha Postman: ${fechaPostman}`);
    console.log(`💡 [getClientes] NOTA: El Postman usa sesión 18, pero estamos usando sesión ${SESSION_ID}`);
    console.log(`💡 [getClientes] Si no funciona, verifica que la sesión ${SESSION_ID} tenga clientes en el ERP`);
    
    const variaciones = [
      // 1. Exactamente como en Postman (pero con nuestra sesión)
      { params: `x=${SESSION_ID}&id_cliente=0&fecha=${fechaPostman}&hora=12:00`, desc: 'formato Postman (fecha ejemplo)' },
      // 2. Con fecha de hoy (formato Postman)
      { params: `x=${SESSION_ID}&id_cliente=0&fecha=${fechaHoy}&hora=12:00`, desc: 'formato Postman (fecha hoy)' },
      // 3. Con fecha de ayer
      { params: `x=${SESSION_ID}&id_cliente=0&fecha=${fechaAyer}&hora=12:00`, desc: 'formato Postman (fecha ayer)' },
      // 4. Con parámetros proporcionados
      { params: `x=${SESSION_ID}&id_cliente=${id_cliente}&fecha=${fecha || fechaHoy}&hora=${hora || '12:00'}`, desc: 'con parámetros proporcionados' },
      // 5. Sin id_cliente (solo sesión, fecha y hora)
      { params: `x=${SESSION_ID}&fecha=${fechaHoy}&hora=12:00`, desc: 'sin id_cliente' },
      // 6. Solo sesión y fecha
      { params: `x=${SESSION_ID}&fecha=${fechaHoy}`, desc: 'solo sesión y fecha' },
      // 7. Solo sesión
      { params: `x=${SESSION_ID}`, desc: 'solo sesión' },
    ];
    
    for (const variacion of variaciones) {
      const url = `${ERP_BASE_URL}/GetClientesWS?${variacion.params}`;
      
      console.log(`🔄 [getClientes] Intentando obtener clientes (${variacion.desc})...`);
      console.log('🔗 [getClientes] URL:', url);
      
      try {
    const response = await axios.get(url);
    
        console.log('📥 [getClientes] Respuesta recibida del servidor');
        console.log('📥 [getClientes] Status:', response.status);
        
        // La respuesta puede venir como array directo o como objeto con array dentro
        let clientes: any[] = [];
        
        if (Array.isArray(response.data)) {
          clientes = response.data;
        } else if (response.data && Array.isArray(response.data.Clientes)) {
          clientes = response.data.Clientes;
        } else if (response.data && Array.isArray(response.data.clientes)) {
          clientes = response.data.clientes;
        } else if (response.data && typeof response.data === 'object') {
          // Buscar cualquier propiedad que sea un array
          const keys = Object.keys(response.data);
          for (const key of keys) {
            if (Array.isArray(response.data[key]) && key !== 'InfoError') {
              clientes = response.data[key];
              break;
            }
          }
        }
        
        // Si encontramos clientes, retornamos
        if (clientes.length > 0) {
          console.log(`✅ [getClientes] ${clientes.length} clientes encontrados con parámetros: ${variacion.desc}`);
          console.log('👤 [getClientes] Primer cliente:', JSON.stringify(clientes[0], null, 2).substring(0, 500));
          return clientes;
        } else {
          console.log(`⚠️ [getClientes] Array vacío con parámetros: ${variacion.desc}`);
          // Verificar si hay un error en InfoError
          if (response.data?.InfoError) {
            const error = response.data.InfoError;
            console.log(`   InfoError: Codigo=${error.Codigo}, Descripcion=${error.Descripcion || 'null'}`);
            // Si el código no es 0, puede ser un error real
            if (error.Codigo !== 0 && error.Codigo !== undefined) {
              console.warn(`   ⚠️ Error del ERP: ${error.Descripcion || 'Error desconocido'}`);
            }
          }
        }
      } catch (error: any) {
        console.warn(`⚠️ [getClientes] Error con parámetros ${variacion.desc}:`, error.message);
        // Continuar con la siguiente variación
        continue;
      }
    }
    
    // Si llegamos aquí, ninguna variación funcionó
    console.error('❌ [getClientes] Ninguna variación de parámetros devolvió clientes');
    console.error('⚠️ [getClientes] El ERP está devolviendo arrays vacíos para todas las combinaciones de parámetros');
    console.error('💡 [getClientes] Posibles causas:');
    console.error('   1. La sesión no tiene permisos para ver clientes');
    console.error('   2. No hay clientes asociados a esta sesión en el ERP');
    console.error('   3. El endpoint requiere parámetros adicionales o diferentes');
    console.error('   4. El endpoint necesita autenticación adicional');
    
    return [];
  } catch (error: any) {
    console.error('❌ [getClientes] Error conectando con ERP (Clientes):', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Status Text:', error.response.statusText);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
      console.error('   Headers:', error.response.headers);
    } else if (error.request) {
      console.error('   No se recibió respuesta del servidor');
      console.error('   Request:', error.request);
    } else {
      console.error('   Error al configurar la petición:', error.message);
    }
    console.error('   Stack:', error.stack);
    return [];
  }
}

export async function crearCliente(cliente: Partial<ClienteERP>): Promise<any> {
  try {
    // Formato según Postman: campos directamente en el body, no envueltos en "Cliente"
    const body = {
      sesionwcf: parseInt(SESSION_ID, 10),
      Id: cliente.Id || 0,
      Tipo: cliente.Tipo || 1,
      NIF: cliente.NIF || '',
      Nombre: cliente.Nombre || '',
      Apellido1: '',
      Apellido2: '',
      RazonSocial: cliente.RazonSocial || cliente.Nombre || '',
      RegFiscal: 1,
      ID_Pais: 1,
      ID_Provincia: 0,
      Provincia: cliente.Provincia || '',
      ID_Localidad: 0,
      Localidad: cliente.Localidad || '',
      CPostal: cliente.CPostal || '',
      Direccion: cliente.Direccion || '',
      DireccionAux: '',
      Telefono: cliente.Telefono || '',
      Email: cliente.Email || '',
      Sexo: 1,
      ID_Agente1: 0,
      ID_Agente2: 0,
      ID_Agente3: 0,
      ID_MetodoPago: cliente.FormaPago || 0,
      WebUserOld: null,
      WebUser: null,
      WebPassword: null,
      EnviarAnuncios: false,
      DireccionesEnvio: []
    };
    
    console.log('📤 Enviando cliente al ERP...');
    const response = await axios.post(`${ERP_BASE_URL}/NuevoClienteWS`, body);
    return response.data;
  } catch (error) {
    console.error('❌ Error creando cliente en ERP:', error);
    throw error;
  }
}

export async function getArticulos(fecha?: string, hora?: string): Promise<any[]> {
  try {
    let url = `${ERP_BASE_URL}/GetArticulosWS?x=${SESSION_ID}`;
    if (fecha) url += `&fecha=${fecha}`;
    if (hora) url += `&hora=${hora}`;
    console.log('🔄 Sincronizando artículos del ERP...', url);
    const response = await axios.get(url);
    
    console.log('📥 Respuesta de artículos:', response.data);
    
    // La respuesta puede venir como array directo o como objeto con array dentro
    let articulos: any[] = [];
    
    if (Array.isArray(response.data)) {
      articulos = response.data;
    } else if (response.data && Array.isArray(response.data.articulos)) {
      articulos = response.data.articulos;
    } else if (response.data && typeof response.data === 'object') {
      // Intentar encontrar cualquier propiedad que sea un array
      const keys = Object.keys(response.data);
      for (const key of keys) {
        if (Array.isArray(response.data[key]) && key !== 'InfoError') {
          articulos = response.data[key];
          break;
        }
      }
    }
    
    if (articulos.length > 0) {
      console.log(`✅ ${articulos.length} artículos recibidos del ERP`);
      console.log('📦 Primer artículo de ejemplo:', articulos[0]);
      
      // Obtener stock para cada artículo
      try {
        const stockData = await getStockArticulos(0);
        const stockMap = new Map();
        if (Array.isArray(stockData) && stockData.length > 0) {
          stockData.forEach((item: any) => {
            const articuloId = item.ID_Articulo || item.Id;
            if (articuloId) {
              stockMap.set(articuloId, item);
            }
          });
          console.log(`📊 Stock obtenido para ${stockMap.size} artículos`);
        }
        
        // Combinar artículos con stock
        return articulos.map(art => {
          const articuloId = art.Id || art.ID_Articulo;
          const stockInfo = stockMap.get(articuloId);
          return {
            ...art,
            Stock: stockInfo?.Stock || stockInfo?.Cantidad || art.Stock || 0,
            StockMinimo: stockInfo?.StockMinimo || art.StockMinimo || 0
          };
        });
      } catch (stockError) {
        console.warn('⚠️ Error obteniendo stock, continuando sin stock:', stockError);
        return articulos;
      }
    }
    
    console.log('⚠️ No se encontraron artículos en la respuesta');
    return [];
  } catch (error: any) {
    console.error('❌ Error conectando con ERP (Artículos):', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    return [];
  }
}

export async function getStockArticulos(id_articulo = 0): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetStockArticulosWS?x=${SESSION_ID}&id_articulo=${id_articulo}`;
    console.log('🔄 Obteniendo stock de artículos del ERP...');
    const response = await axios.get(url);
    
    // La respuesta puede venir como array directo o como objeto con array dentro
    let stock: any[] = [];
    
    if (Array.isArray(response.data)) {
      stock = response.data;
    } else if (response.data && typeof response.data === 'object') {
      // Intentar encontrar cualquier propiedad que sea un array
      const keys = Object.keys(response.data);
      for (const key of keys) {
        if (Array.isArray(response.data[key]) && key !== 'InfoError') {
          stock = response.data[key];
          break;
        }
      }
    }
    
    return stock;
  } catch (error) {
    console.warn('⚠️ Error obteniendo stock de artículos del ERP.');
    return [];
  }
}

export async function getGastos(fecha?: string): Promise<GastoERP[]> {
  // NOTA: Este endpoint no existe en la colección Postman proporcionada
  // Los gastos se mantienen solo localmente en la app
  // Se pueden crear/editar/eliminar localmente y se sincronizan al ERP cuando se crean
  console.log('ℹ️ GetGastosWS no está disponible. Los gastos se mantienen solo localmente.');
  return [];
}

export async function crearGasto(gasto: Partial<GastoERP>): Promise<any> {
  try {
    // Formato según Postman: sesionwcf debe ser número
    const body = { 
      sesionwcf: parseInt(SESSION_ID, 10), 
      Gasto: gasto 
    };
    console.log('📤 Enviando gasto al ERP...');
    const response = await axios.post(`${ERP_BASE_URL}/NuevoGastoWS`, body);
    return response.data;
  } catch (error) {
    console.error('❌ Error enviando gasto a ERP:', error);
    throw error;
  }
}

export async function eliminarGasto(id: number): Promise<boolean> {
  try {
    // Asumiendo endpoint estándar, ajustar si es diferente
    const url = `${ERP_BASE_URL}/BorrarGastoWS?x=${SESSION_ID}&id_gasto=${id}`;
    console.log('🗑️ Eliminando gasto en ERP:', id);
    
    // Si es POST o GET depende de tu API, usaremos POST por seguridad o GET si es estilo RPC
    // const response = await axios.post(url); 
    // Para este ejemplo asumo estructura similar a Get
    const response = await axios.get(url);
    
    return response.data && (!response.data.InfoError || response.data.InfoError.Codigo === 0);
  } catch (error) {
    console.error('❌ Error eliminando gasto en ERP:', error);
    return false;
  }
}

// ============================================================================
// DOCUMENTOS
// ============================================================================

export async function getDocumentos(): Promise<DocumentoERP[]> {
  // NOTA: Este endpoint no existe en la colección Postman proporcionada
  // Los documentos se mantienen solo localmente en la app
  // Se pueden crear/editar/eliminar localmente
  console.log('ℹ️ GetDocumentosWS no está disponible. Los documentos se mantienen solo localmente.');
    return [];
}

export async function subirDocumento(doc: Partial<DocumentoERP>): Promise<any> {
  try {
    // En una implementación real, aquí se enviaría FormData si hay archivo binario
    // Formato según Postman: sesionwcf debe ser número
    const body = {
      sesionwcf: parseInt(SESSION_ID, 10),
      Documento: doc
    };
    
    console.log('📤 Subiendo documento al ERP...');
    const response = await axios.post(`${ERP_BASE_URL}/SubirDocumentoWS`, body);
    return response.data;
  } catch (error) {
    console.error('❌ Error subiendo documento:', error);
    throw error;
  }
}

export async function eliminarDocumento(id: number): Promise<boolean> {
  try {
    const url = `${ERP_BASE_URL}/BorrarDocumentoWS?x=${SESSION_ID}&id_doc=${id}`;
    console.log('🗑️ Eliminando documento en ERP:', id);
    const response = await axios.get(url);
    return response.data && (!response.data.InfoError || response.data.InfoError.Codigo === 0);
  } catch (error) {
    console.error('❌ Error eliminando documento:', error);
    return false;
  }
}

// ============================================================================
// COBROS (DEUDAS)
// ============================================================================

export async function getCobrosPendientes(): Promise<CobroERP[]> {
  try {
    // Usar GetHistorialPedidosWS para obtener pedidos y filtrar los que tienen saldo pendiente
    const fechaHoy = new Date().toISOString().split('T')[0];
    const fechaHaceUnAno = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log('💰 Obteniendo cobros pendientes desde historial de pedidos...');
    
    // Obtener historial de pedidos de todos los clientes (id_cliente=0 significa todos)
    const historial = await getHistorialPedidos(0, fechaHaceUnAno, fechaHoy, false);
    
    // Filtrar pedidos con saldo pendiente y convertir a formato CobroERP
    const cobrosPendientes: CobroERP[] = [];
    
    for (const pedido of historial) {
      // Verificar si el pedido tiene saldo pendiente
      const totalPedido = pedido.TotalImporte || pedido.Total || pedido.Importe || 0;
      const totalPagado = pedido.TotalPagado || pedido.Pagado || 0;
      const saldoPendiente = totalPedido - totalPagado;
      
      if (saldoPendiente > 0.01) { // Tolerancia para errores de redondeo
        cobrosPendientes.push({
          Id: pedido.Id || pedido.ID_DocCli || 0,
          IdCliente: pedido.ID_Cliente || pedido.IdCliente || 0,
          NombreCliente: pedido.NombreCliente || pedido.Cliente || 'Cliente Desconocido',
          Importe: saldoPendiente,
          Fecha: pedido.Fecha || fechaHoy,
          IdNotaVenta: pedido.Id || pedido.ID_DocCli || undefined,
          Estado: 'Pendiente'
        });
      }
    }
    
    console.log(`✅ ${cobrosPendientes.length} cobros pendientes encontrados en historial de pedidos`);
    return cobrosPendientes;
  } catch (error: any) {
    console.error('❌ Error obteniendo cobros pendientes desde historial:', error.message);
    return [];
  }
}

// ============================================================================
// NOTAS DE ALMACÉN (Historial)
// ============================================================================

export async function getNotasAlmacen(): Promise<NotaAlmacenERP[]> {
  // NOTA: Este endpoint no existe en la colección Postman proporcionada
  // Las notas de almacén se mantienen solo localmente en la app
  // Se pueden crear/editar localmente
  console.log('ℹ️ GetNotasAlmacenWS no está disponible. Las notas de almacén se mantienen solo localmente.');
  return [];
}

// ============================================================================
// AGENDA
// ============================================================================

export async function getAgenda(fechaDesde?: string, fechaHasta?: string): Promise<VisitaERP[]> {
  // NOTA: Este endpoint no existe en la colección Postman proporcionada
  // La agenda se mantiene solo localmente en la app
  // Se pueden crear/editar visitas localmente y se sincronizan al ERP cuando se crean
  console.log('ℹ️ GetAgendaWS no está disponible. La agenda se mantiene solo localmente.');
  return [];
}

export async function crearVisita(visita: Partial<VisitaERP>): Promise<any> {
  try {
    // Formato según Postman: sesionwcf debe ser número
    const body = { 
      sesionwcf: parseInt(SESSION_ID, 10), 
      Visita: visita 
    };
    const response = await axios.post(`${ERP_BASE_URL}/NuevaVisitaWS`, body);
    return response.data;
  } catch (error) { throw error; }
}

export async function actualizarVisita(id: number, completado: boolean): Promise<any> {
  try {
    // Formato según Postman: sesionwcf debe ser número
    const body = { 
      sesionwcf: parseInt(SESSION_ID, 10), 
      Id: id, 
      Completado: completado 
    };
    const response = await axios.post(`${ERP_BASE_URL}/ActualizarVisitaWS`, body);
        return response.data;
  } catch (error) { throw error; }
}

export async function crearDocumentoVenta(documento: any): Promise<any> {
  try {
    // Formato según Postman: sesionwcf debe ser número
    const body = {
      sesionwcf: parseInt(SESSION_ID, 10),
      ...documento
    };
    console.log('📤 Enviando documento de venta al ERP...');
    const response = await axios.post(`${ERP_BASE_URL}/NuevoDocClienteWS`, body);
    return response.data;
  } catch (error) {
    console.error('❌ Error enviando venta a ERP');
    throw error;
  }
}

export async function registrarPago(pago: any): Promise<any> {
  try {
    // Formato según Postman: sesionwcf debe ser número
    const body = {
      sesionwcf: parseInt(SESSION_ID, 10),
      ID_DocCli: pago.ID_DocCli || 0,
      ID_MetodoPago: pago.ID_MetodoPago || 0,
      Fecha: pago.Fecha || new Date().toISOString().split('T')[0],
      Importe: pago.Importe || 0
    };
    
    console.log('💰 Enviando pago al ERP...', body);
    const response = await axios.post(`${ERP_BASE_URL}/NuevoPagoWS`, body);
    return response.data;
  } catch (error) {
    console.error('❌ Error registrando pago en ERP:', error);
    throw error;
  }
}

// ============================================================================
// CATÁLOGOS BÁSICOS
// ============================================================================

export async function getPaises(): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetPaisesWS?x=${SESSION_ID}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Paises || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo países:', error.message);
    return [];
  }
}

export async function getProvincias(): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetProvinciasWS?x=${SESSION_ID}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Provincias || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo provincias:', error.message);
    return [];
  }
}

export async function crearProvincia(provincia: { Nombre: string; ID_Pais: number; CodigoNuts?: string }): Promise<any> {
  try {
    const body = {
      sesionwcf: parseInt(SESSION_ID, 10),
      ...provincia
    };
    const response = await axios.post(`${ERP_BASE_URL}/NuevaProvinciaWS`, body);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error creando provincia:', error.message);
    throw error;
  }
}

export async function getLocalidades(): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetLocalidadesWS?x=${SESSION_ID}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Localidades || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo localidades:', error.message);
    return [];
  }
}

export async function crearLocalidad(localidad: { Nombre: string; ID_Pais: number; ID_Provincia: number; CodigoNuts?: string }): Promise<any> {
  try {
    const body = {
      sesionwcf: parseInt(SESSION_ID, 10),
      ...localidad
    };
    const response = await axios.post(`${ERP_BASE_URL}/NuevaLocalidadWS`, body);
        return response.data;
  } catch (error: any) {
    console.error('❌ Error creando localidad:', error.message);
    throw error;
  }
}

export async function getAgentes(): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetAgentesWS?x=${SESSION_ID}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Agentes || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo agentes:', error.message);
    return [];
  }
}

export async function getMetodosPago(): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetMetodosPagoWS?x=${SESSION_ID}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.MetodosPago || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo métodos de pago:', error.message);
    return [];
  }
}

export async function getFormasEnvio(): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetFormasEnvioWS?x=${SESSION_ID}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.FormasEnvio || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo formas de envío:', error.message);
    return [];
  }
}

// ============================================================================
// DIRECCIONES DE ENVÍO Y MASCOTAS
// ============================================================================

export async function crearDireccionEnvio(direccion: {
  ID_Cliente: number;
  Id?: number;
  Nombre: string;
  Apellido1: string;
  Apellido2?: string;
  ID_Pais: number;
  ID_Provincia?: number;
  Provincia?: string;
  ID_Localidad?: number;
  Localidad?: string;
  CPostal: string;
  Direccion: string;
  DireccionAux?: string;
  Telefono?: string;
}): Promise<any> {
  try {
    const body = {
      sesionwcf: parseInt(SESSION_ID, 10),
      ...direccion
    };
    const response = await axios.post(`${ERP_BASE_URL}/NuevaDireccionEnvioWS`, body);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error creando dirección de envío:', error.message);
    throw error;
  }
}

export async function getMascotas(id_cliente = 0): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetMascotasWS?x=${SESSION_ID}&id_cliente=${id_cliente}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Mascotas || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo mascotas:', error.message);
    return [];
  }
}

export async function crearMascota(mascota: {
  Id?: number;
  ID_Cliente: number;
  Nombre: string;
  TipoAnimal: string;
  Raza?: string;
  FechaNacimiento?: string;
  Peso?: number;
  SituacionPeso?: number;
  Actividad?: number;
  HayPatologias?: boolean;
  Patologias?: string;
  Alimentacion?: number;
  AlimentacionOtros?: string;
}): Promise<any> {
  try {
    const body = {
      sesionwcf: parseInt(SESSION_ID, 10),
      ...mascota
    };
    const response = await axios.post(`${ERP_BASE_URL}/NuevaMascotaWS`, body);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error creando mascota:', error.message);
    throw error;
  }
}

export async function borrarMascota(id: number, id_cliente: number): Promise<any> {
  try {
    const body = {
      sesionwcf: parseInt(SESSION_ID, 10),
      Id: id, 
      ID_Cliente: id_cliente
    };
    const response = await axios.post(`${ERP_BASE_URL}/BorrarMascotaWS`, body);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error borrando mascota:', error.message);
    throw error;
  }
}

// ============================================================================
// ARTÍCULOS AVANZADOS
// ============================================================================

export async function getImagenesArticulos(id_articulo = 0, numpixelsladomenor = 300, fecha?: string, hora?: string): Promise<any[]> {
  try {
    let url = `${ERP_BASE_URL}/GetImagenesArticulosWS?x=${SESSION_ID}&id_articulo=${id_articulo}&numpixelsladomenor=${numpixelsladomenor}`;
    if (fecha) url += `&fecha=${fecha}`;
    if (hora) url += `&hora=${hora}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Imagenes || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo imágenes de artículos:', error.message);
    return [];
  }
}

export async function getCamposConfigurablesArticulos(): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetCamposConfigurablesArticulosWS?x=${SESSION_ID}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Campos || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo campos configurables:', error.message);
    return [];
  }
}

export async function getArbolCamposConfigurablesArticulos(id_campo: number, id_familiacamposconfigurables = 0): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetArbolCamposConfigurablesArticulosWS?x=${SESSION_ID}&id_campo=${id_campo}&id_familiacamposconfigurables=${id_familiacamposconfigurables}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Arbol || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo árbol de campos configurables:', error.message);
    return [];
  }
}

export async function getValoresValidadosCampoConfigurableArticulos(id_campo: number, id_familiacamposconfigurables = 0): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetValoresValidadosCampoConfigurableArticulosWS?x=${SESSION_ID}&id_campo=${id_campo}&id_familiacamposconfigurables=${id_familiacamposconfigurables}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Valores || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo valores validados:', error.message);
    return [];
  }
}

// ============================================================================
// CATÁLOGOS ADICIONALES
// ============================================================================

export async function getCursos(): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetCursosWS?x=${SESSION_ID}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Cursos || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo cursos:', error.message);
    return [];
  }
}

export async function getAsignaturas(): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetAsignaturasWS?x=${SESSION_ID}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Asignaturas || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo asignaturas:', error.message);
    return [];
  }
}

export async function getColecciones(): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetColeccionesWS?x=${SESSION_ID}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Colecciones || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo colecciones:', error.message);
    return [];
  }
}

export async function getFabricantes(): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetFabricantesWS?x=${SESSION_ID}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Fabricantes || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo fabricantes:', error.message);
    return [];
  }
}

export async function getCategorias(): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetCategoriasWS?x=${SESSION_ID}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Categorias || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo categorías:', error.message);
    return [];
  }
}

export async function getCategoriasWeb(): Promise<any[]> {
  try {
    const url = `${ERP_BASE_URL}/GetCategoriasWebWS?x=${SESSION_ID}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.CategoriasWeb || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo categorías web:', error.message);
    return [];
  }
}

export async function getCondicionesTarifa(id_articulo = 0, id_cliente = 0, fecha?: string): Promise<any[]> {
  try {
    let url = `${ERP_BASE_URL}/GetCondicionesTarifaWS?x=${SESSION_ID}&id_articulo=${id_articulo}&id_cliente=${id_cliente}`;
    if (fecha) url += `&fecha=${fecha}`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Condiciones || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo condiciones de tarifa:', error.message);
    return [];
  }
}

// ============================================================================
// PEDIDOS Y DOCUMENTOS
// ============================================================================

export async function pedidoModificable(id_pedido: number): Promise<boolean> {
  try {
    const url = `${ERP_BASE_URL}/PedidoModificableWS?x=${SESSION_ID}&id_pedido=${id_pedido}`;
    const response = await axios.get(url);
    // Asumimos que devuelve un booleano o un objeto con una propiedad booleana
    if (typeof response.data === 'boolean') return response.data;
    return response.data?.Modificable ?? response.data?.modificable ?? false;
  } catch (error: any) {
    console.error('❌ Error verificando si pedido es modificable:', error.message);
    return false;
  }
}

export async function updateDocCliente(id: number, aux1?: string, aux2?: string, aux3?: string): Promise<any> {
  try {
    const body: any = {
      sesionwcf: parseInt(SESSION_ID, 10),
      Id: id
    };
    if (aux1 !== undefined) body.Aux1 = aux1;
    if (aux2 !== undefined) body.Aux2 = aux2;
    if (aux3 !== undefined) body.Aux3 = aux3;
    
    const response = await axios.post(`${ERP_BASE_URL}/UpdateDocClienteWS`, body);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error actualizando documento cliente:', error.message);
    throw error;
  }
}

export async function getNextNumDocs(): Promise<any> {
  try {
    const url = `${ERP_BASE_URL}/GetNextNumDocsWS?x=${SESSION_ID}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error obteniendo siguiente número de documento:', error.message);
    return null;
  }
}

export async function estadoPedidos(pedidos: Array<{ Id: number; Referencia?: string | null }>): Promise<any[]> {
  try {
    const body = {
      sesionwcf: parseInt(SESSION_ID, 10),
      Pedidos: pedidos
    };
    const response = await axios.post(`${ERP_BASE_URL}/EstadoPedidosWS`, body);
    return Array.isArray(response.data) ? response.data : (response.data?.Pedidos || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo estado de pedidos:', error.message);
    return [];
  }
}

export async function getHistorialPedidos(id_cliente: number, fechaDesde: string, fechaHasta: string, allareasventa = false): Promise<any[]> {
  try {
    let url = `${ERP_BASE_URL}/GetHistorialPedidosWS?x=${SESSION_ID}&id_cliente=${id_cliente}&fechadesde=${fechaDesde}&fechahasta=${fechaHasta}`;
    if (allareasventa) url += `&allareasventa=true`;
    const response = await axios.get(url);
    return Array.isArray(response.data) ? response.data : (response.data?.Pedidos || []);
  } catch (error: any) {
    console.error('❌ Error obteniendo historial de pedidos:', error.message);
    return [];
  }
}

export async function getVersion(): Promise<string | null> {
  try {
    const url = `${ERP_BASE_URL}/GetVersionWS?x=${SESSION_ID}`;
    const response = await axios.get(url);
    return response.data?.Version || response.data?.version || response.data || null;
  } catch (error: any) {
    console.error('❌ Error obteniendo versión:', error.message);
    return null;
  }
}

// ============================================================================
// MAPPERS
// ============================================================================

export function mapearClienteERPaLocal(clienteERP: any) {
  // El ERP devuelve campos diferentes, adaptamos el mapper para ser más flexible
  const id = clienteERP.Id || clienteERP.ID_Cliente || clienteERP.id || '';
  const nombre = clienteERP.Nombre || clienteERP.nombre || '';
  const razonSocial = clienteERP.RazonSocial || clienteERP.razonSocial || nombre;
  const direccion = clienteERP.Direccion || clienteERP.direccion || '';
  const localidad = clienteERP.Localidad || clienteERP.localidad || '';
  const telefono = clienteERP.Telefono || clienteERP.telefono || '';
  const email = clienteERP.Email || clienteERP.email || '';
  const nif = clienteERP.NIF || clienteERP.nif || '';
  const codigoPostal = clienteERP.CPostal || clienteERP.codigoPostal || clienteERP.CPostal || '';
  const provincia = clienteERP.Provincia || clienteERP.provincia || '';
  
  return {
    id: id.toString(),
    codigo: id.toString(),
    nombre: nombre,
    empresa: razonSocial || nombre,
    direccion: `${direccion} ${localidad}`.trim() || 'Sin dirección',
    telefono: telefono,
    email: email,
    ultimaVisita: 'Sin registrar',
    nif: nif,
    codigoPostal: codigoPostal,
    provincia: provincia
  };
}

export function mapearArticuloERPaLocal(articuloERP: any) {
  // El ERP devuelve campos diferentes, adaptamos el mapper
  const stock = articuloERP.Stock ?? articuloERP.Cantidad ?? 0;
  const stockMinimo = articuloERP.StockMinimo ?? 0;
  const precio = articuloERP.PVP ?? articuloERP.Precio ?? 0;
  const codigo = articuloERP.Codigo ?? articuloERP.ReferenciaBarras ?? '';
  
  // Obtener categoría del ID_Categoria si existe
  let categoria = 'General';
  if (articuloERP.ID_Categoria) {
    // Podríamos mapear categorías aquí si tenemos la lista
    categoria = `Categoría ${articuloERP.ID_Categoria}`;
  }
  
  return {
    id: articuloERP.Id?.toString() || articuloERP.ID_Articulo?.toString() || '',
    nombre: articuloERP.Nombre || '',
    cantidad: stock,
    categoria: categoria,
    precio: precio > 0 ? `${precio.toFixed(2).replace('.', ',')} €` : '0,00 €',
    stockMinimo: stockMinimo,
    codigoCorto: codigo
  };
}

export function mapearGastoERPaLocal(gastoERP: GastoERP) {
  const date = new Date(gastoERP.Fecha);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const time = date.toTimeString().split(' ')[0];

  return {
    id: gastoERP.Id.toString(),
    nombre: gastoERP.Concepto || 'Gasto vario',
    categoria: gastoERP.Tipo || 'Otros',
    precio: `${gastoERP.Importe.toFixed(2).replace('.', ',')} €`,
    fecha: `${day}/${month}/${year}, ${time}`,
    imagen: gastoERP.Imagen
  };
}

export function mapearDocumentoERPaLocal(docERP: DocumentoERP) {
  return {
    id: docERP.Id.toString(),
    nombre: docERP.Nombre,
    categoria: docERP.Categoria || 'Otros',
    fecha: docERP.Fecha ? new Date(docERP.Fecha).toLocaleDateString('es-ES') : '',
    tamano: docERP.Tamano || '0 KB',
    tipo: (docERP.Tipo as 'pdf' | 'image' | 'doc') || 'doc'
  };
}

export function mapearCobroERPaLocal(cobroERP: CobroERP) {
  return {
    id: cobroERP.Id.toString(),
    clienteId: cobroERP.IdCliente.toString(),
    cliente: cobroERP.NombreCliente || 'Cliente Desconocido',
    monto: `${cobroERP.Importe.toFixed(2).replace('.', ',')} €`,
    fecha: cobroERP.Fecha ? new Date(cobroERP.Fecha).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES'),
    estado: 'pendiente', // Al bajar del endpoint de pendientes, siempre es pendiente
    notaVentaId: cobroERP.IdNotaVenta ? cobroERP.IdNotaVenta.toString() : undefined
  };
}

export function mapearNotaAlmacenERPaLocal(notaERP: NotaAlmacenERP) {
  // Formato de fecha consistente DD/MM/YYYY, HH:MM
  const date = new Date(notaERP.Fecha);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const time = date.toTimeString().split(' ')[0].substring(0, 5);

  return {
    id: notaERP.Id.toString(),
    tipo: notaERP.Tipo,
    fecha: `${day}/${month}/${year}, ${time}`,
    usuario: notaERP.Usuario || 'Sistema',
    articulos: notaERP.NumArticulos || 0,
    observaciones: notaERP.Observaciones || ''
  };
}

export function mapearVisitaERPaLocal(visitaERP: VisitaERP) {
  const fechaObj = new Date(visitaERP.Fecha);
  const fecha = fechaObj.toISOString().split('T')[0]; // YYYY-MM-DD
  const hora = fechaObj.toTimeString().substring(0, 5); // HH:MM

  let tipo: 'visita' | 'entrega' | 'cobro' = 'visita';
  const tipoLower = (visitaERP.Tipo || '').toLowerCase();
  if (tipoLower.includes('entrega')) tipo = 'entrega';
  else if (tipoLower.includes('cobro')) tipo = 'cobro';

  return {
    id: visitaERP.Id.toString(),
    clienteId: visitaERP.IdCliente?.toString(),
    clienteNombre: visitaERP.NombreCliente || 'Cliente',
    direccion: visitaERP.Direccion || '',
    fecha: fecha,
    hora: hora,
    tipo: tipo,
    completado: visitaERP.Completado,
    observaciones: visitaERP.Observaciones
  };
}
