/**
 * Tipos Globales de la Aplicación
 */

// ============================================================================
// TIPOS DE PANTALLAS
// ============================================================================

export type ScreenType =
  | 'login'
  | 'loginEmail'
  | 'dashboard'
  | 'ventasMenu'
  | 'ventas'
  | 'nuevaVenta'
  | 'verNota'
  | 'resumenDia'
  | 'cobros'
  | 'cobrosList'
  | 'cobrosConfirmacion'
  | 'gastos'
  | 'documentos'
  | 'clientes'
  | 'articulos'
  | 'comunicacion'
  | 'almacen'
  | 'notasAlmacen'
  | 'resumenStock'
  | 'configuracion'
  | 'agenda';

// ============================================================================
// TIPOS DE DATOS
// ============================================================================

export interface Gasto {
  id: string;
  nombre: string;
  categoria: string;
  precio: string;
  fecha: string;
  imagen?: string;
}

export interface NotaVenta {
  id: string;
  cliente: string;
  precio: string;
  fecha: string;
  items?: any[];
  estado?: 'pendiente' | 'cerrada' | 'anulada';
  clienteId?: string;
  generoCobro?: boolean;
  cobroId?: string;
  formaPago?: string;
}

export interface Cobro {
  id: string;
  cliente: string;
  monto: string;
  fecha: string;
  estado: 'pendiente' | 'pagado';
  notaVentaId?: string;
  clienteId?: string;
  formaPago?: string;
}

export interface Documento {
  id: string;
  nombre: string;
  categoria: string;
  fecha: string;
  tamano: string;
  tipo: 'pdf' | 'image' | 'doc';
}

export interface Articulo {
  id: string;
  nombre: string;
  cantidad: number;
  categoria: string;
  precio?: string;
  stockMinimo?: number;
  proveedor?: string;
  imagen?: string;
  codigoCorto?: string;
}

export interface Cliente {
  id: string;
  codigo?: string;
  nombre: string;
  nombreComercial?: string;
  empresa: string;
  direccion: string;
  telefono?: string;
  email?: string;
  ultimaVisita?: string;
  nif?: string;
  codigoPostal?: string;
  provincia?: string;
}

export interface NotaAlmacen {
  id: string;
  tipo: 'Carga Camion' | 'Descarga Camion' | 'Inventario Camion' | 'Intercambio Entrada' | 'Intercambio Salida';
  fecha: string;
  usuario: string;
  articulos: number;
  observaciones?: string;
}

// ============================================================================
// TIPOS DE CONFIGURACIÓN
// ============================================================================

export interface AppConfig {
  erpEnabled: boolean;
  autoSyncEnabled: boolean;
  syncInterval: number; // en milisegundos
  modoOffline: boolean;
}

export interface UserSession {
  isLoggedIn: boolean;
  username?: string;
  email?: string;
  sessionId?: string;
}

// ============================================================================
// TIPOS DE SINCRONIZACIÓN
// ============================================================================

export interface SyncStatus {
  clientes: 'idle' | 'syncing' | 'success' | 'error';
  articulos: 'idle' | 'syncing' | 'success' | 'error';
  ultimaSync: string | null;
  error: string | null;
  operacionesPendientes?: number;
}

// ============================================================================
// TIPOS DE NAVEGACIÓN
// ============================================================================

export type RootStackParamList = {
  Login: undefined;
  LoginEmail: undefined;
  Main: undefined;
  Dashboard: undefined;
  VentasMenu: undefined;
  Ventas: undefined;
  NuevaVenta: { clienteSeleccionado?: Cliente };
  VerNota: { ventaData: any };
  ResumenDia: undefined;
  CobrosList: undefined;
  Cobros: { clienteSeleccionado?: Cliente };
  CobrosConfirmacion: { cobranzaActual: any };
  Gastos: undefined;
  Documentos: undefined;
  Clientes: undefined;
  Articulos: undefined;
  Comunicacion: undefined;
  Almacen: undefined;
  NotasAlmacen: undefined;
  ResumenStock: undefined;
  Configuracion: undefined;
  Agenda: undefined;
};
