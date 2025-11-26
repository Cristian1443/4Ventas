import axios from 'axios';

/**
 * Servicio de integración con ERP Verial - PRODUCCIÓN
 * Actualizado con gestión de AGENDA
 */

const ERP_BASE_URL = 'http://x.verial.org:8000/WcfServiceLibraryVerial';
let SESSION_ID = '18';
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
  if (!ERP_ENABLED) return getMockClientes();

  try {
    const fechaParam = fecha || '2000-01-01';
    const horaParam = hora || '00:00';
    const url = `${ERP_BASE_URL}/GetClientesWS?x=${SESSION_ID}&id_cliente=${id_cliente}&fecha=${fechaParam}&hora=${horaParam}`;
    
    console.log('🔄 Sincronizando clientes del ERP...');
    const response = await axios.get(url);
    
    if (response.data && Array.isArray(response.data)) {
        return response.data;
    }
    return [];
  } catch (error) {
    console.warn('⚠️ Error conectando con ERP (Clientes).');
    return [];
  }
}

export async function crearCliente(cliente: Partial<ClienteERP>): Promise<any> {
  if (!ERP_ENABLED) {
    return { InfoError: { Codigo: 0, Descripcion: 'OK - Mock Cliente' }, Id: Math.floor(Math.random() * 10000) };
  }

  try {
    const body = {
      sesionwcf: SESSION_ID,
      Cliente: cliente
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
  if (!ERP_ENABLED) {
    console.log('💾 [ERP] Usando datos MOCK de artículos');
    return getMockArticulos();
  }
  try {
    let url = `${ERP_BASE_URL}/GetArticulosWS?x=${SESSION_ID}`;
    if (fecha) url += `&fecha=${fecha}`;
    if (hora) url += `&hora=${hora}`;
    console.log('🔄 Sincronizando artículos del ERP...');
    const response = await axios.get(url);
    if (response.data && Array.isArray(response.data)) return response.data;
    return [];
  } catch (error) {
    console.warn('⚠️ Error conectando con ERP (Artículos).');
    return [];
  }
}

export async function getGastos(fecha?: string): Promise<GastoERP[]> {
  if (!ERP_ENABLED) {
    console.log('💾 [ERP] Usando datos MOCK de gastos');
    return getMockGastos();
  }
  try {
    let url = `${ERP_BASE_URL}/GetGastosWS?x=${SESSION_ID}`;
    if (fecha) url += `&fecha=${fecha}`;
    console.log('🔄 Sincronizando gastos del ERP:', url);
    const response = await axios.get(url);
    if (response.data && Array.isArray(response.data)) return response.data;
    return [];
  } catch (error) {
    console.warn('⚠️ Error conectando con ERP (Gastos).');
    return [];
  }
}

export async function crearGasto(gasto: Partial<GastoERP>): Promise<any> {
  if (!ERP_ENABLED) {
    return { InfoError: { Codigo: 0, Descripcion: 'OK - Mock' }, Id: Math.floor(Math.random() * 10000) };
  }
  try {
    const body = { sesionwcf: SESSION_ID, Gasto: gasto };
    console.log('📤 Enviando gasto al ERP...');
    const response = await axios.post(`${ERP_BASE_URL}/NuevoGastoWS`, body);
    return response.data;
  } catch (error) {
    console.error('❌ Error enviando gasto a ERP:', error);
    throw error;
  }
}

export async function eliminarGasto(id: number): Promise<boolean> {
  if (!ERP_ENABLED) return true; // Mock éxito

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
  if (!ERP_ENABLED) {
    console.log('💾 [ERP] Usando datos MOCK de documentos');
    return getMockDocumentos();
  }

  try {
    const url = `${ERP_BASE_URL}/GetDocumentosWS?x=${SESSION_ID}`;
    console.log('🔄 Sincronizando documentos del ERP...');
    const response = await axios.get(url);
    
    if (response.data && Array.isArray(response.data)) {
        return response.data;
    }
    return [];
  } catch (error) {
    console.warn('⚠️ Error conectando con ERP (Documentos).');
    return [];
  }
}

export async function subirDocumento(doc: Partial<DocumentoERP>): Promise<any> {
  if (!ERP_ENABLED) {
    return { InfoError: { Codigo: 0 }, Id: Math.floor(Math.random() * 10000) };
  }

  try {
    // En una implementación real, aquí se enviaría FormData si hay archivo binario
    const body = {
      sesionwcf: SESSION_ID,
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
  if (!ERP_ENABLED) return true;

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
  if (!ERP_ENABLED) {
    console.log('💾 [ERP] Usando datos MOCK de cobros');
    return getMockCobros();
  }

  try {
    // Endpoint para obtener todas las deudas pendientes
    const url = `${ERP_BASE_URL}/GetCobrosPendientesWS?x=${SESSION_ID}`;
    console.log('🔄 Sincronizando cobros pendientes del ERP...');
    const response = await axios.get(url);
    
    if (response.data && Array.isArray(response.data)) {
        return response.data;
    }
    return [];
  } catch (error) {
    console.warn('⚠️ Error conectando con ERP (Cobros).');
    return [];
  }
}

// ============================================================================
// NOTAS DE ALMACÉN (Historial)
// ============================================================================

export async function getNotasAlmacen(): Promise<NotaAlmacenERP[]> {
  if (!ERP_ENABLED) return getMockNotasAlmacen();

  try {
    const url = `${ERP_BASE_URL}/GetNotasAlmacenWS?x=${SESSION_ID}`;
    console.log('🔄 Sincronizando notas de almacén del ERP...');
    const response = await axios.get(url);
    
    if (response.data && Array.isArray(response.data)) {
        return response.data;
    }
    return [];
  } catch (error) {
    console.warn('⚠️ Error conectando con ERP (Notas Almacén).');
    return [];
  }
}

// ============================================================================
// AGENDA
// ============================================================================

export async function getAgenda(fechaDesde?: string, fechaHasta?: string): Promise<VisitaERP[]> {
  if (!ERP_ENABLED) return getMockAgenda();

  try {
    // Por defecto traemos la agenda del mes actual si no se especifica
    const hoy = new Date();
    const desde = fechaDesde || new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const hasta = fechaHasta || new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];

    const url = `${ERP_BASE_URL}/GetAgendaWS?x=${SESSION_ID}&desde=${desde}&hasta=${hasta}`;
    console.log('🔄 Sincronizando agenda del ERP...');
    const response = await axios.get(url);
    
    if (response.data && Array.isArray(response.data)) {
        return response.data;
    }
    return [];
  } catch (error) {
    console.warn('⚠️ Error conectando con ERP (Agenda).');
    return [];
  }
}

export async function crearVisita(visita: Partial<VisitaERP>): Promise<any> {
  if (!ERP_ENABLED) return { InfoError: { Codigo: 0 }, Id: Math.floor(Math.random() * 10000) };
  
  try {
    const response = await axios.post(`${ERP_BASE_URL}/NuevaVisitaWS`, { sesionwcf: SESSION_ID, Visita: visita });
    return response.data;
  } catch (error) { throw error; }
}

export async function actualizarVisita(id: number, completado: boolean): Promise<any> {
  if (!ERP_ENABLED) return { InfoError: { Codigo: 0 } };

  try {
    const response = await axios.post(`${ERP_BASE_URL}/ActualizarVisitaWS`, { 
      sesionwcf: SESSION_ID, 
      Id: id, 
      Completado: completado 
    });
    return response.data;
  } catch (error) { throw error; }
}

export async function crearDocumentoVenta(documento: any): Promise<any> {
  if (!ERP_ENABLED) {
    return { InfoError: { Codigo: 0, Descripcion: 'OK - Guardado Local (Mock)' }, Id: Math.floor(Math.random() * 10000) };
  }
  try {
    const response = await axios.post(`${ERP_BASE_URL}/NuevoDocClienteWS`, { sesionwcf: SESSION_ID, ...documento });
    return response.data;
  } catch (error) {
    console.error('❌ Error enviando venta a ERP');
    throw error;
  }
}

export async function registrarPago(pago: any): Promise<any> {
  if (!ERP_ENABLED) {
    return { InfoError: { Codigo: 0, Descripcion: 'OK - Mock Pago' } };
  }

  try {
    const body = {
      sesionwcf: SESSION_ID,
      ...pago
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
// MAPPERS
// ============================================================================

export function mapearClienteERPaLocal(clienteERP: ClienteERP) {
  return {
    id: clienteERP.Id.toString(),
    codigo: clienteERP.Id.toString(),
    nombre: clienteERP.Nombre || '',
    empresa: clienteERP.RazonSocial || clienteERP.Nombre,
    direccion: `${clienteERP.Direccion || ''} ${clienteERP.Localidad || ''}`.trim(),
    telefono: clienteERP.Telefono || '',
    email: clienteERP.Email || '',
    ultimaVisita: 'Sin registrar',
    nif: clienteERP.NIF,
    codigoPostal: clienteERP.CPostal,
    provincia: clienteERP.Provincia
  };
}

export function mapearArticuloERPaLocal(articuloERP: ArticuloERP) {
  return {
    id: articuloERP.Id.toString(),
    nombre: articuloERP.Nombre,
    cantidad: articuloERP.Stock ?? 0,
    categoria: 'General',
    precio: `${articuloERP.PVP.toFixed(2)} €`,
    stockMinimo: articuloERP.StockMinimo ?? 0,
    codigoCorto: articuloERP.Codigo
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

// ============================================================================
// MOCKS PARA DESARROLLO (Se usan sólo cuando ERP_ENABLED = false)
// ============================================================================

function getMockClientes(): ClienteERP[] {
  return [
    {
      Id: 1001,
      Nombre: 'Cliente Demo',
      RazonSocial: 'Cliente Demo S.L.',
      Direccion: 'Calle Principal 123',
      Localidad: 'Madrid',
      CPostal: '28001',
      Provincia: 'Madrid',
      Telefono: '600123123',
      Email: 'demo@cliente.com',
      NIF: 'B12345678'
    }
  ];
}

function getMockArticulos(): ArticuloERP[] {
  return [
    { Id: 1, Codigo: 'ART001', Nombre: 'Producto Demo', PVP: 10.5, Stock: 100, StockMinimo: 10 }
  ];
}

function getMockGastos(): GastoERP[] {
  return [
    { Id: 1, Concepto: 'Gasolina', Tipo: 'Transporte', Importe: 50, Fecha: new Date().toISOString() }
  ];
}

function getMockDocumentos(): DocumentoERP[] {
  return [
    { Id: 1, Nombre: 'Catálogo 2024.pdf', Categoria: 'Catálogos', Fecha: new Date().toISOString(), Tamano: '2.5 MB', Tipo: 'pdf' }
  ];
}

function getMockCobros(): CobroERP[] {
  // Sin datos mock - los cobros se crean solo cuando se realizan ventas reales
  return [];
}

function getMockNotasAlmacen(): NotaAlmacenERP[] {
  return [
    { Id: 101, Tipo: 'Carga Camion', Fecha: new Date().toISOString(), Usuario: 'Juan Perez', NumArticulos: 15, Observaciones: 'Carga matutina' },
    { Id: 102, Tipo: 'Inventario Camion', Fecha: new Date(Date.now() - 86400000).toISOString(), Usuario: 'Juan Perez', NumArticulos: 50, Observaciones: 'Revisión semanal' }
  ];
}

function getMockAgenda(): VisitaERP[] {
  const hoy = new Date();
  return [
    { Id: 901, NombreCliente: 'Cliente Demo Agenda', Direccion: 'Calle Test 1', Fecha: hoy.toISOString(), Tipo: 'Visita', Completado: false },
    { Id: 902, NombreCliente: 'Entrega Urgente', Direccion: 'Av. Principal 20', Fecha: hoy.toISOString(), Tipo: 'Entrega', Completado: true }
  ];
}