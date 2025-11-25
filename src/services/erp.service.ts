import axios from 'axios';

/**
 * Servicio de integración con ERP Verial - PRODUCCIÓN
 * Actualizado con gestión de GASTOS
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

export async function getClientes(id_cliente = 0, fecha?: string, hora?: string): Promise<any[]> {
  if (!ERP_ENABLED) {
    console.log('💾 [ERP] Usando datos MOCK de clientes');
    return getMockClientes();
  }
  try {
    const fechaParam = fecha || '2000-01-01';
    const horaParam = hora || '00:00';
    const url = `${ERP_BASE_URL}/GetClientesWS?x=${SESSION_ID}&id_cliente=${id_cliente}&fecha=${fechaParam}&hora=${horaParam}`;
    console.log('🔄 Sincronizando clientes del ERP...');
    const response = await axios.get(url);
    if (response.data && Array.isArray(response.data)) return response.data;
    return [];
  } catch (error) {
    console.warn('⚠️ Error conectando con ERP (Clientes).');
    return [];
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
    return { InfoError: { Codigo: 0, Descripcion: 'OK - Pago Local (Mock)' } };
  }
  try {
    const response = await axios.post(`${ERP_BASE_URL}/NuevoPagoWS`, { sesionwcf: SESSION_ID, ...pago });
    return response.data;
  } catch (error) {
    console.error('❌ Error enviando pago a ERP');
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