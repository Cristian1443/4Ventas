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

// NUEVA INTERFAZ PARA TOTALES NUMÉRICOS
export interface TotalesVenta {
  subtotal: number;
  descuentos: number;
  base: number;
  iva: number;
  total: number;
}

export interface NotaVenta {
  id: string;
  cliente: string;
  precio: string;
  fecha: string;
  items?: any[];
  // AÑADIDO 'abierta'
  estado?: 'pendiente' | 'cerrada' | 'anulada' | 'abierta';
  clienteId?: string;
  generoCobro?: boolean;
  cobroId?: string;
  formaPago?: string;
  tipoNota?: string;
  totalesNumericos?: TotalesVenta;
  aplicarDescGlobal?: boolean;
  descGlobal?: string;
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

// ... (El resto del archivo se mantiene idéntico: Documento, Articulo, Cliente, etc.)
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

// ... (AppConfig, UserSession, SyncStatus, RootStackParamList igual que antes)
export interface AppConfig {
  erpEnabled: boolean;
  autoSyncEnabled: boolean;
  syncInterval: number;
  modoOffline: boolean;
}

export interface UserSession {
  isLoggedIn: boolean;
  username?: string;
  email?: string;
  sessionId?: string;
}

export interface SyncStatus {
  clientes: 'idle' | 'syncing' | 'success' | 'error';
  articulos: 'idle' | 'syncing' | 'success' | 'error';
  ultimaSync: string | null;
  error: string | null;
  operacionesPendientes?: number;
}

export type RootStackParamList = {
  Login: undefined;
  LoginEmail: undefined;
  Main: undefined;
  Dashboard: undefined;
  VentasMenu: undefined;
  Ventas: undefined;
  NuevaVenta: { clienteSeleccionado?: Cliente; ventaData?: any }; // Actualizado para permitir editar
  VerNota: { ventaData: any; notaId?: string }; // Actualizado
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