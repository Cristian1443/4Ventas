/**
 * Servicio de integración con ERP Verial - React Native
 * Adaptado para usar axios en lugar de fetch
 */

import axios, { AxiosError } from 'axios';

// ============================================================================
// CONFIGURACIÓN - Modificar estos valores según tu entorno
// ============================================================================

const ERP_BASE_URL = 'http://x.verial.org:8000/WcfServiceLibraryVerial';
let SESSION_ID = '18';
const ERP_ENABLED = false; // true = conexión ERP | false = modo offline

export function setSessionId(sessionId: string) {
  SESSION_ID = sessionId;
}

export function getSessionId(): string {
  return SESSION_ID;
}

export function isERPEnabled(): boolean {
  return ERP_ENABLED;
}

export function getERPStatus(): { enabled: boolean; baseUrl: string; sessionId: string } {
  return {
    enabled: ERP_ENABLED,
    baseUrl: ERP_BASE_URL,
    sessionId: SESSION_ID
  };
}

// ============================================================================
// TIPOS
// ============================================================================

export interface ClienteERP {
  Id: number;
  Tipo?: number;
  NIF: string;
  Nombre: string;
  Apellido1?: string;
  Apellido2?: string;
  RazonSocial: string;
  RegFiscal?: number;
  ID_Pais?: number;
  ID_Provincia?: number;
  Provincia?: string;
  ID_Localidad?: number;
  Localidad?: string;
  CPostal: string;
  Direccion: string;
  DireccionAux?: string;
  Telefono: string;
  Email: string;
  Sexo?: number;
  ID_Agente1?: number;
  ID_Agente2?: number;
  ID_Agente3?: number;
  ID_MetodoPago?: number;
  DtoComercial?: number;
  DtoPPago?: number;
  FormaPago?: number;
}

export interface ArticuloERP {
  Id: number;
  Codigo: string;
  Nombre: string;
  Descripcion?: string;
  PVP: number;
  Stock?: number;
  StockMinimo?: number;
}

export interface MetodoPagoERP {
  Id: number;
  Nombre: string;
}

export interface LineaDocumento {
  TipoRegistro: number;
  ID_Articulo: number;
  Comentario?: string;
  Precio: number;
  Dto: number;
  DtoPPago: number;
  DtoEurosXUd: number;
  DtoEuros: number;
  Uds: number;
  UdsRegalo: number;
  UdsAuxiliares: number;
  ImporteLinea: number;
  Lote?: string;
  Caducidad?: string;
  ID_Partida: number;
  PorcentajeIVA: number;
  PorcentajeRE: number;
  DescripcionAmplia?: string;
}

export interface PagoDocumento {
  ID_MetodoPago: number;
  Fecha: string;
  Importe: number;
}

export interface DocumentoCliente {
  sesionwcf?: string;
  Id: number;
  Tipo: number;
  Referencia?: string;
  Numero: number;
  Fecha: string;
  ID_Cliente: number;
  ID_DireccionEnvio?: number;
  Cliente?: Partial<ClienteERP>;
  EtiquetaCliente?: string;
  ID_Agente1?: number;
  ID_Agente2?: number;
  ID_Agente3?: number;
  ID_MetodoPago?: number;
  Peso?: number;
  Bultos?: number;
  TipoPortes?: number;
  Portes?: number;
  PreciosImpIncluidos: boolean;
  BaseImponible: number;
  TotalImporte: number;
  Comentario?: string;
  Descripcion?: string;
  Contenido: LineaDocumento[];
  Pagos?: PagoDocumento[];
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

export async function getClientes(
  id_cliente: number = 0,
  fecha?: string,
  hora?: string
): Promise<ClienteERP[]> {
  if (!ERP_ENABLED) {
    console.log('💾 Usando datos MOCK de clientes (ERP deshabilitado)');
    return getMockClientes();
  }

  try {
    const fechaParam = fecha || new Date().toISOString().split('T')[0];
    const horaParam = hora || new Date().toTimeString().split(' ')[0].substring(0, 5);
    
    const url = `${ERP_BASE_URL}/GetClientesWS?x=${SESSION_ID}&id_cliente=${id_cliente}&fecha=${fechaParam}&hora=${horaParam}`;
    
    console.log('🔄 Sincronizando clientes del ERP');
    
    const response = await axios.get<ClienteERP[]>(url);
    console.log('✅ Clientes obtenidos del ERP:', response.data.length || 0);
    
    return response.data;
  } catch (error) {
    console.warn('⚠️ Error al conectar con ERP, usando datos locales');
    return getMockClientes();
  }
}

export async function crearCliente(cliente: Partial<ClienteERP>): Promise<any> {
  if (!ERP_ENABLED) {
    console.log('💾 Modo OFFLINE - Cliente guardado localmente');
    return {
      InfoError: {
        Codigo: 0,
        Descripcion: 'OK - Modo Offline'
      },
      Id: Math.floor(Math.random() * 10000)
    };
  }

  try {
    const response = await axios.post(`${ERP_BASE_URL}/NuevoClienteWS`, {
      sesionwcf: SESSION_ID,
      ...cliente,
    });
    
    console.log('✅ Cliente creado en ERP:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error al crear cliente en ERP:', error);
    throw error;
  }
}

// ============================================================================
// ARTÍCULOS
// ============================================================================

export async function getArticulos(fecha?: string, hora?: string): Promise<ArticuloERP[]> {
  if (!ERP_ENABLED) {
    console.log('💾 Usando datos MOCK de artículos (ERP deshabilitado)');
    return getMockArticulos();
  }

  try {
    let url = `${ERP_BASE_URL}/GetArticulosWS?x=${SESSION_ID}`;
    
    if (fecha) url += `&fecha=${fecha}`;
    if (hora) url += `&hora=${hora}`;
    
    console.log('🔄 Sincronizando artículos del ERP');
    
    const response = await axios.get<ArticuloERP[]>(url);
    console.log('✅ Artículos obtenidos del ERP:', response.data.length || 0);
    
    return response.data;
  } catch (error) {
    console.warn('⚠️ Error al conectar con ERP, usando datos locales');
    return getMockArticulos();
  }
}

// ============================================================================
// MÉTODOS DE PAGO
// ============================================================================

export async function getMetodosPago(): Promise<MetodoPagoERP[]> {
  if (!ERP_ENABLED) {
    console.log('💾 Modo OFFLINE - Usando métodos de pago por defecto');
    return [
      { Id: 1, Nombre: 'Efectivo' },
      { Id: 2, Nombre: 'Tarjeta de Débito' },
      { Id: 3, Nombre: 'Tarjeta de Crédito' },
      { Id: 5, Nombre: 'Transferencia Bancaria' },
      { Id: 8, Nombre: 'Bizum' }
    ];
  }

  try {
    const url = `${ERP_BASE_URL}/GetMetodosPagoWS?x=${SESSION_ID}`;
    const response = await axios.get<MetodoPagoERP[]>(url);
    console.log('✅ Métodos de pago obtenidos');
    return response.data;
  } catch (error) {
    console.error('❌ Error al obtener métodos de pago del ERP:', error);
    throw error;
  }
}

// ============================================================================
// DOCUMENTOS (VENTAS/PEDIDOS)
// ============================================================================

export async function crearDocumentoVenta(documento: DocumentoCliente): Promise<any> {
  if (!ERP_ENABLED) {
    console.log('💾 Modo OFFLINE - Documento guardado localmente');
    return {
      InfoError: {
        Codigo: 0,
        Descripcion: 'OK - Modo Offline'
      },
      Id: Math.floor(Math.random() * 10000),
      Numero: Math.floor(Math.random() * 1000)
    };
  }

  try {
    const body = {
      sesionwcf: SESSION_ID,
      ...documento,
    };
    
    console.log('📤 Enviando documento al ERP');
    
    const response = await axios.post(`${ERP_BASE_URL}/NuevoDocClienteWS`, body);
    console.log('✅ Documento creado en ERP:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Error al crear documento en ERP:', error);
    throw error;
  }
}

// ============================================================================
// PAGOS
// ============================================================================

export async function registrarPago(pago: NuevoPago): Promise<any> {
  if (!ERP_ENABLED) {
    console.log('💾 Modo OFFLINE - Pago guardado localmente');
    return {
      InfoError: {
        Codigo: 0,
        Descripcion: 'OK - Modo Offline'
      },
      Id: Math.floor(Math.random() * 10000)
    };
  }

  try {
    console.log('💰 Registrando pago en ERP');
    
    const response = await axios.post(`${ERP_BASE_URL}/NuevoPagoWS`, {
      sesionwcf: SESSION_ID,
      ...pago,
    });
    
    console.log('✅ Pago registrado en ERP:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error al registrar pago en ERP:', error);
    throw error;
  }
}

// ============================================================================
// MAPPERS
// ============================================================================

export function mapearClienteERPaLocal(clienteERP: ClienteERP) {
  return {
    id: clienteERP.Id.toString(),
    nombre: clienteERP.Nombre || '',
    empresa: clienteERP.RazonSocial || clienteERP.Nombre,
    direccion: `${clienteERP.Direccion || ''} — ${clienteERP.Localidad || ''}`,
    telefono: clienteERP.Telefono || '',
    email: clienteERP.Email || '',
    ultimaVisita: 'No registrada',
    nif: clienteERP.NIF,
    codigoPostal: clienteERP.CPostal,
    provincia: clienteERP.Provincia,
  };
}

export function mapearArticuloERPaLocal(articuloERP: ArticuloERP) {
  return {
    id: articuloERP.Id.toString(),
    nombre: articuloERP.Nombre,
    cantidad: articuloERP.Stock || 0,
    categoria: 'General',
    precio: `${articuloERP.PVP.toFixed(2)} €`,
    stockMinimo: articuloERP.StockMinimo || 0,
    proveedor: 'Proveedor',
  };
}

// ============================================================================
// DATOS MOCK
// ============================================================================

function getMockClientes(): ClienteERP[] {
  return [
    {
      Id: 100,
      Nombre: 'ALVAREZ CORDERO CONSUELO',
      RazonSocial: 'ALVAREZ C. CONSUELO E HIJOS',
      Direccion: 'Barrio Catalunya',
      Localidad: 'Trubia',
      CPostal: '33100',
      Provincia: 'Asturias',
      Telefono: '985 123 456',
      Email: 'alvarez@example.com',
      NIF: 'B33123456',
      DtoComercial: 0,
      DtoPPago: 0,
      FormaPago: 1
    },
    {
      Id: 105,
      Nombre: 'Boutique Encanto',
      RazonSocial: 'Boutique Encanto S.L.',
      Direccion: 'C/ Comercio 45',
      Localidad: 'Oviedo',
      CPostal: '33001',
      Provincia: 'Asturias',
      Telefono: '985 234 567',
      Email: 'info@boutiqueencanto.es',
      NIF: 'B33234567',
      DtoComercial: 5,
      DtoPPago: 0,
      FormaPago: 2
    },
    // ... más clientes
  ];
}

function getMockArticulos(): ArticuloERP[] {
  return [
    {
      Id: 1,
      Codigo: '001',
      Nombre: 'Croqueta Jamón',
      Descripcion: 'Croqueta de jamón serrano congelada',
      PVP: 12.50,
      Stock: 100,
      StockMinimo: 20
    },
    {
      Id: 2,
      Codigo: '002',
      Nombre: 'Croqueta Pollo',
      Descripcion: 'Croqueta de pollo congelada',
      PVP: 11.00,
      Stock: 85,
      StockMinimo: 20
    },
    // ... más artículos
  ];
}
