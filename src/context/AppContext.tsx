/**
 * Contexto Global de la Aplicación - ACTUALIZADO
 * - Incluye lógica de descuento de stock al crear venta
 */

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import {
  Gasto,
  NotaVenta,
  Cobro,
  Documento,
  Articulo,
  Cliente,
  NotaAlmacen,
  AppConfig,
  UserSession,
  SyncStatus
} from '../types';
import { syncService } from '../services/sync.service';
import { storageService } from '../services/storage.service';

// ============================================================================
// TIPOS DEL CONTEXTO
// ============================================================================

interface AppContextType {
  // Estado de autenticación
  userSession: UserSession;
  setUserSession: (session: UserSession) => void;
  
  // Estado de datos
  gastos: Gasto[];
  notasVenta: NotaVenta[];
  cobros: Cobro[];
  documentos: Documento[];
  articulos: Articulo[];
  clientes: Cliente[];
  notasAlmacen: NotaAlmacen[];
  
  // Estado de sincronización
  syncStatus: SyncStatus;
  modoOffline: boolean;
  
  // Funciones para Gastos
  addGasto: (gasto: Gasto) => Promise<void>;
  deleteGasto: (id: string) => Promise<void>;
  
  // Funciones para Ventas
  addNotaVenta: (nota: NotaVenta) => Promise<void>;
  updateNotaVenta: (id: string, estado: 'pendiente' | 'cerrada' | 'anulada') => Promise<void>;
  
  // Funciones para Cobros
  addCobro: (cobro: Cobro) => Promise<void>;
  updateCobro: (id: string, estado: 'pendiente' | 'pagado') => Promise<void>;
  
  // Funciones para Documentos
  addDocumento: (doc: Documento) => Promise<void>;
  deleteDocumento: (id: string) => Promise<void>;
  
  // Funciones para Artículos
  updateArticulo: (id: string, cantidad: number) => Promise<void>;
  
  // Funciones para Notas de Almacén
  addNotaAlmacen: (nota: NotaAlmacen) => Promise<void>;
  
  // Funciones de sincronización
  sincronizar: () => Promise<void>;
  forzarSincronizacion: () => Promise<void>;
  
  // Configuración
  config: AppConfig;
  updateConfig: (config: Partial<AppConfig>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Estado de autenticación
  const [userSession, setUserSession] = useState<UserSession>({
    isLoggedIn: false
  });
  
  // Estado de datos
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [notasVenta, setNotasVenta] = useState<NotaVenta[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [notasAlmacen, setNotasAlmacen] = useState<NotaAlmacen[]>([]);
  
  // Estado de sincronización
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    clientes: 'idle',
    articulos: 'idle',
    ultimaSync: null,
    error: null,
    operacionesPendientes: 0
  });
  const [modoOffline, setModoOffline] = useState(false);
  
  // Configuración
  const [config, setConfig] = useState<AppConfig>({
    erpEnabled: false,
    autoSyncEnabled: true,
    syncInterval: 3600000, // 1 hora
    modoOffline: false
  });

  // ============================================================================
  // DATOS INICIALES
  // ============================================================================

  const initialClientes: Cliente[] = [
    {
      id: 'c1',
      codigo: '430001',
      nombre: 'Floristería El Jardín',
      nombreComercial: 'El Jardín del Centro',
      empresa: 'Floristería El Jardín S.L.',
      telefono: '600123456',
      email: 'contacto@eljardin.com',
      direccion: 'Calle Mayor 123, Madrid',
      codigoPostal: '28001',
      provincia: 'Madrid'
    },
    {
      id: 'c2',
      codigo: '430005',
      nombre: 'Eventos y Bodas SL',
      empresa: 'Eventos y Bodas SL',
      telefono: '600999888',
      email: 'info@eventosbodas.com',
      direccion: 'Av. América 45, Madrid',
      codigoPostal: '28028',
      provincia: 'Madrid'
    },
    {
      id: 'c3',
      codigo: '430010',
      nombre: 'Distribuciones Rivera S.L.',
      empresa: 'Distribuciones Rivera S.L.',
      telefono: '985123456',
      email: 'info@rivera.com',
      direccion: 'Calle Industrial 12, Oviedo',
      codigoPostal: '33001',
      provincia: 'Asturias'
    },
    {
      id: 'c4',
      codigo: '430015',
      nombre: 'Almacenes López S.A.',
      empresa: 'Almacenes López S.A.',
      telefono: '985234567',
      email: 'ventas@lopez.com',
      direccion: 'Av. Principal 8, Gijón',
      codigoPostal: '33201',
      provincia: 'Asturias'
    }
  ];

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    console.log('🚀 Inicializando aplicación...');
    
    // Cargar configuración
    const savedConfig = await storageService.getItem<AppConfig>('appConfig');
    if (savedConfig) {
      setConfig(savedConfig);
    }
    
    // Cargar datos locales
    await loadLocalData();
    
    // Inicializar servicio de sincronización
    await syncService.initialize();
    
    // Sincronizar datos
    await sincronizar();
  };

  const loadLocalData = async () => {
    console.log('📂 Cargando datos locales...');
    
    try {
      const [
        savedGastos,
        savedNotasVenta,
        savedCobros,
        savedDocumentos,
        savedArticulos,
        savedClientes,
        savedNotasAlmacen
      ] = await Promise.all([
        storageService.getItem<Gasto[]>('gastos'),
        storageService.getItem<NotaVenta[]>('notasVenta'),
        storageService.getItem<Cobro[]>('cobros'),
        storageService.getItem<Documento[]>('documentos'),
        storageService.getItem<Articulo[]>('articulos'),
        storageService.getItem<Cliente[]>('clientes'),
        storageService.getItem<NotaAlmacen[]>('notasAlmacen')
      ]);
      
      if (savedGastos) setGastos(savedGastos);
      if (savedNotasVenta) setNotasVenta(savedNotasVenta);
      if (savedCobros) setCobros(savedCobros);
      if (savedDocumentos) setDocumentos(savedDocumentos);
      if (savedArticulos) setArticulos(savedArticulos);
      if (savedClientes) {
        setClientes(savedClientes);
      } else {
        // Si no hay clientes guardados, usar los iniciales
        setClientes(initialClientes);
        await storageService.setItem('clientes', initialClientes);
      }
      if (savedNotasAlmacen) setNotasAlmacen(savedNotasAlmacen);
      
      console.log('✅ Datos locales cargados');
    } catch (error) {
      console.error('❌ Error cargando datos locales:', error);
      // Usar datos mock por defecto
      loadMockData();
    }
  };

  const loadMockData = () => {
    console.log('💾 Cargando datos mock...');
    
    setGastos([
      { id: 'G001', nombre: 'Combustible', categoria: 'Combustible', precio: '45,00 €', fecha: '08:30' },
      { id: 'G002', nombre: 'Comida mediodía', categoria: 'Comida', precio: '12,50 €', fecha: '14:15' },
      { id: 'G003', nombre: 'Peaje autopista', categoria: 'Otros', precio: '8,90 €', fecha: '09:45' }
    ]);
    
    setNotasVenta([
      {
        id: 'P001',
        cliente: 'Distribuciones Rivera S.L.',
        clienteId: '150',
        precio: '450,00 €',
        fecha: '08:45',
        estado: 'cerrada',
        generoCobro: true,
        cobroId: 'C001',
        formaPago: 'Transferencia Bancaria'
      },
      {
        id: 'P002',
        cliente: 'Almacenes López S.A.',
        clienteId: '200',
        precio: '320,50 €',
        fecha: '10:20',
        estado: 'cerrada',
        generoCobro: false,
        formaPago: 'Efectivo'
      }
    ]);
    
    setCobros([
      {
        id: 'C001',
        cliente: 'Distribuciones Rivera S.L.',
        clienteId: '150',
        monto: '450,00 €',
        fecha: 'Hoy',
        estado: 'pagado',
        notaVentaId: 'P001',
        formaPago: 'Transferencia Bancaria'
      }
    ]);
    
    setDocumentos([
      { id: 'DOC001', nombre: 'Catálogo Alimentación 2024.pdf', categoria: 'Catálogos', fecha: '15/10/2024', tamano: '2.4 MB', tipo: 'pdf' }
    ]);
    
    // Cargar clientes iniciales
    setClientes(initialClientes);
  };

  // ============================================================================
  // FUNCIONES DE SINCRONIZACIÓN
  // ============================================================================

  const sincronizar = useCallback(async () => {
    try {
      console.log('🔄 Iniciando sincronización...');
      
      setSyncStatus(prev => ({
        ...prev,
        clientes: 'syncing',
        articulos: 'syncing'
      }));
      
      // Sincronizar con el ERP
      const status = await syncService.syncAll();
      
      // Actualizar clientes y artículos desde el almacenamiento local
      const clientesSincronizados = await syncService.getClientesLocal();
      const articulosSincronizados = await syncService.getArticulosLocal();
      
      if (clientesSincronizados.length > 0) {
        setClientes(clientesSincronizados);
        await storageService.setItem('clientes', clientesSincronizados);
      }
      
      if (articulosSincronizados.length > 0) {
        setArticulos(articulosSincronizados);
        await storageService.setItem('articulos', articulosSincronizados);
      }
      
      setSyncStatus(status);
      setModoOffline(status.clientes === 'error' && status.articulos === 'error');
      
      console.log('✅ Sincronización completada');
    } catch (error: any) {
      console.error('❌ Error en sincronización:', error);
      setSyncStatus(prev => ({
        ...prev,
        error: error.message,
        clientes: 'error',
        articulos: 'error'
      }));
      setModoOffline(true);
    }
  }, []);

  const forzarSincronizacion = useCallback(async () => {
    console.log('🔄 Forzando sincronización completa...');
    await sincronizar();
  }, [sincronizar]);

  // ============================================================================
  // FUNCIONES PARA GASTOS
  // ============================================================================

  const addGasto = async (gasto: Gasto) => {
    const nuevosGastos = [gasto, ...gastos];
    setGastos(nuevosGastos);
    await storageService.setItem('gastos', nuevosGastos);
    
    // Agregar a cola de sincronización
    syncService.addToQueue('gasto', gasto);
  };

  const deleteGasto = async (id: string) => {
    const nuevosGastos = gastos.filter(g => g.id !== id);
    setGastos(nuevosGastos);
    await storageService.setItem('gastos', nuevosGastos);
  };

  // ============================================================================
  // FUNCIONES PARA VENTAS (ACTUALIZADA CON DESCUENTO DE STOCK)
  // ============================================================================

  const addNotaVenta = async (nota: NotaVenta) => {
    // 1. Guardar la venta
    const nuevasNotas = [nota, ...notasVenta];
    setNotasVenta(nuevasNotas);
    await storageService.setItem('notasVenta', nuevasNotas);
    
    // Agregar a cola de sincronización
    syncService.addToQueue('venta', nota);

    // 2. Descontar stock de los artículos
    if (nota.items && nota.items.length > 0) {
      // Usamos el estado actual 'articulos'
      const nuevosArticulos = articulos.map(articulo => {
        // Buscar si este artículo del inventario está en los items vendidos
        // Nota: Ajusta 'articuloId' según la estructura real de tu objeto item en venta
        const itemVendido = nota.items?.find((i: any) => i.articuloId === articulo.id || i.id === articulo.id);
        
        if (itemVendido) {
          const cantidadVendida = parseFloat(itemVendido.cantidad) || 0;
          // Retornar artículo con cantidad reducida
          return {
            ...articulo,
            cantidad: Math.max(0, articulo.cantidad - cantidadVendida) // Evitar negativos
          };
        }
        return articulo;
      });

      // Actualizar estado y persistencia
      setArticulos(nuevosArticulos);
      await storageService.setItem('articulos', nuevosArticulos);
      console.log('✅ Stock actualizado para', nota.items.length, 'productos');
    }
  };

  const updateNotaVenta = async (id: string, estado: 'pendiente' | 'cerrada' | 'anulada') => {
    const nuevasNotas = notasVenta.map(n => n.id === id ? { ...n, estado } : n);
    setNotasVenta(nuevasNotas);
    await storageService.setItem('notasVenta', nuevasNotas);
  };

  // ============================================================================
  // FUNCIONES PARA COBROS
  // ============================================================================

  const addCobro = async (cobro: Cobro) => {
    const nuevosCobros = [cobro, ...cobros];
    setCobros(nuevosCobros);
    await storageService.setItem('cobros', nuevosCobros);
    
    // Agregar a cola de sincronización
    syncService.addToQueue('pago', cobro);
  };

  const updateCobro = async (id: string, estado: 'pendiente' | 'pagado') => {
    const nuevosCobros = cobros.map(c => c.id === id ? { ...c, estado } : c);
    setCobros(nuevosCobros);
    await storageService.setItem('cobros', nuevosCobros);
  };

  // ============================================================================
  // FUNCIONES PARA DOCUMENTOS
  // ============================================================================

  const addDocumento = async (doc: Documento) => {
    const nuevosDocumentos = [doc, ...documentos];
    setDocumentos(nuevosDocumentos);
    await storageService.setItem('documentos', nuevosDocumentos);
  };

  const deleteDocumento = async (id: string) => {
    const nuevosDocumentos = documentos.filter(d => d.id !== id);
    setDocumentos(nuevosDocumentos);
    await storageService.setItem('documentos', nuevosDocumentos);
  };

  // ============================================================================
  // FUNCIONES PARA ARTÍCULOS
  // ============================================================================

  const updateArticulo = async (id: string, cantidad: number) => {
    const nuevosArticulos = articulos.map(a => a.id === id ? { ...a, cantidad } : a);
    setArticulos(nuevosArticulos);
    await storageService.setItem('articulos', nuevosArticulos);
    await syncService.updateArticuloStock(id, cantidad);
  };

  // ============================================================================
  // FUNCIONES PARA NOTAS DE ALMACÉN
  // ============================================================================

  const addNotaAlmacen = async (nota: NotaAlmacen) => {
    const nuevasNotas = [nota, ...notasAlmacen];
    setNotasAlmacen(nuevasNotas);
    await storageService.setItem('notasAlmacen', nuevasNotas);
  };

  // ============================================================================
  // FUNCIONES DE CONFIGURACIÓN
  // ============================================================================

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    await storageService.setItem('appConfig', updatedConfig);
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: AppContextType = {
    userSession,
    setUserSession,
    gastos,
    notasVenta,
    cobros,
    documentos,
    articulos,
    clientes,
    notasAlmacen,
    syncStatus,
    modoOffline,
    addGasto,
    deleteGasto,
    addNotaVenta,
    updateNotaVenta,
    addCobro,
    updateCobro,
    addDocumento,
    deleteDocumento,
    updateArticulo,
    addNotaAlmacen,
    sincronizar,
    forzarSincronizacion,
    config,
    updateConfig
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ============================================================================
// HOOK
// ============================================================================

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
};