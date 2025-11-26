/**
 * Tipos Globales de la Aplicación
 * Actualizado con VISITAS
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

// NUEVA INTERFAZ
export interface Visita {
  id: string;
  clienteId?: string;
  clienteNombre: string;
  direccion: string;
  fecha: string; // Formato YYYY-MM-DD
  hora: string;  // Formato HH:MM
  tipo: 'visita' | 'entrega' | 'cobro';
  completado: boolean;
  observaciones?: string;
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

// CONTEXTO GLOBAL TIPADO (incluye deleteNotaVenta)
export interface AppContextType {
  userSession: UserSession;
  setUserSession: (session: UserSession) => void;
  
  gastos: Gasto[];
  notasVenta: NotaVenta[];
  cobros: Cobro[];
  documentos: Documento[];
  articulos: Articulo[];
  clientes: Cliente[];
  notasAlmacen: NotaAlmacen[];
  visitas: Visita[];
  
  syncStatus: SyncStatus;
  modoOffline: boolean;
  
  addArticulo: (articulo: Articulo) => Promise<void>;
  addCliente: (cliente: Cliente) => Promise<void>;
  addGasto: (gasto: Gasto) => Promise<void>;
  deleteGasto: (id: string) => Promise<void>;
  
  addNotaVenta: (nota: NotaVenta) => Promise<void>;
  updateNotaVenta: (id: string, estado: 'pendiente' | 'cerrada' | 'anulada' | 'abierta') => Promise<void>;
  deleteNotaVenta: (id: string) => Promise<void>;
  
  addCobro: (cobro: Cobro) => Promise<void>;
  updateCobro: (id: string, estado: 'pendiente' | 'pagado', metadata?: { formaPago: string; fecha: Date }) => Promise<void>;
  
  addDocumento: (doc: Documento) => Promise<void>;
  deleteDocumento: (id: string) => Promise<void>;
  
  updateArticulo: (id: string, cantidad: number) => Promise<void>;
  addNotaAlmacen: (nota: NotaAlmacen) => Promise<void>;
  
  addVisita: (visita: Visita) => Promise<void>;
  toggleVisita: (id: string) => Promise<void>;
  
  sincronizar: () => Promise<void>;
  forzarSincronizacion: () => Promise<void>;
  
  config: AppConfig;
  updateConfig: (config: Partial<AppConfig>) => Promise<void>;
  updateAppConfig: (config: Partial<AppConfig>) => Promise<void>;
  updateSyncStatus: (status: Partial<SyncStatus>) => void;
  login: (username: string) => void;
  logout: () => void;
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