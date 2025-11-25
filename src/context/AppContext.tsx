/**
 * Contexto Global de la Aplicación
 * - Centraliza el estado de la aplicación.
 * - Maneja la persistencia local (storageService) y la cola de sincronización (syncService).
 * - NOTA: Se eliminaron las ventas, cobros y gastos hardcodeados para un entorno limpio.
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
// Los servicios de sincronización y almacenamiento deben estar definidos
// en el proyecto para que esto funcione correctamente.
import { syncService } from '../services/sync.service';
import { storageService } from '../services/storage.service';

// ============================================================================
// TIPOS DEL CONTEXTO
// ============================================================================

interface AppContextType {
  userSession: UserSession;
  setUserSession: (session: UserSession) => void;
  
  gastos: Gasto[];
  notasVenta: NotaVenta[];
  cobros: Cobro[];
  documentos: Documento[];
  articulos: Articulo[];
  clientes: Cliente[];
  notasAlmacen: NotaAlmacen[];
  
  syncStatus: SyncStatus;
  modoOffline: boolean;
  
  // CRUD y Stock
  addArticulo: (articulo: Articulo) => Promise<void>;
  addCliente: (cliente: Cliente) => Promise<void>;
  addGasto: (gasto: Gasto) => Promise<void>;
  deleteGasto: (id: string) => Promise<void>;
  
  addNotaVenta: (nota: NotaVenta) => Promise<void>;
  updateNotaVenta: (id: string, estado: 'pendiente' | 'cerrada' | 'anulada' | 'abierta') => Promise<void>;
  
  addCobro: (cobro: Cobro) => Promise<void>;
  updateCobro: (id: string, estado: 'pendiente' | 'pagado') => Promise<void>;
  
  addDocumento: (doc: Documento) => Promise<void>;
  deleteDocumento: (id: string) => Promise<void>;
  
  updateArticulo: (id: string, cantidad: number) => Promise<void>;
  addNotaAlmacen: (nota: NotaAlmacen) => Promise<void>;
  
  // Sincronización y Configuración
  sincronizar: () => Promise<void>;
  forzarSincronizacion: () => Promise<void>;
  
  config: AppConfig;
  updateConfig: (config: Partial<AppConfig>) => Promise<void>;
  updateAppConfig: (config: Partial<AppConfig>) => Promise<void>;
  updateSyncStatus: (status: Partial<SyncStatus>) => void;
  login: (username: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [userSession, setUserSession] = useState<UserSession>({ isLoggedIn: false });
  
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [notasVenta, setNotasVenta] = useState<NotaVenta[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [notasAlmacen, setNotasAlmacen] = useState<NotaAlmacen[]>([]);
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    clientes: 'idle', articulos: 'idle', ultimaSync: null, error: null, operacionesPendientes: 0
  });
  const [modoOffline, setModoOffline] = useState(false);
  
  const [config, setConfig] = useState<AppConfig>({
    erpEnabled: false, autoSyncEnabled: true, syncInterval: 3600000, modoOffline: false
  });

  // --- DATOS INICIALES MÍNIMOS PARA DEMOSTRACIÓN DE FLUJO ---
  const initialClientes: Cliente[] = [
    { id: 'c1', codigo: '430001', nombre: 'Floristería El Jardín', empresa: 'Floristería El Jardín S.L.', direccion: 'Calle Mayor 123, Madrid', telefono: '600123456', email: 'contacto@eljardin.com', nif: 'B12345678', codigoPostal: '28001', provincia: 'Madrid' },
    { id: 'c2', codigo: '430005', nombre: 'Eventos y Bodas SL', empresa: 'Eventos y Bodas SL', direccion: 'Av. América 45, Madrid', telefono: '600999888', email: 'info@eventosbodas.com', nif: 'B98765432', codigoPostal: '28002', provincia: 'Madrid' }
  ];

  const initialArticulos: Articulo[] = [
    { id: '10001', nombre: 'Monitor Curvo 27"', cantidad: 50, categoria: 'Electrónica', precio: '250,00 €', stockMinimo: 10, codigoCorto: 'MON27' },
    { id: '10002', nombre: 'Teclado Mecánico RGB', cantidad: 12, categoria: 'Accesorios', precio: '75,50 €', stockMinimo: 5, codigoCorto: 'TECME' },
    { id: '10003', nombre: 'Mouse Inalámbrico Ergonómico', cantidad: 8, categoria: 'Accesorios', precio: '30,00 €', stockMinimo: 15, codigoCorto: 'MOUWI' },
  ];
  // -----------------------------------------------------------


  // INICIALIZACIÓN
  useEffect(() => { initializeApp(); }, []);

  const initializeApp = async () => {
    const savedConfig = await storageService.getItem<AppConfig>('appConfig');
    if (savedConfig) setConfig(savedConfig);
    await loadLocalData();
    // await syncService.initialize(); // Descomentar al conectar ERP
    // await sincronizar(); 
  };

  const loadLocalData = async () => {
    try {
      const [sGastos, sNotas, sCobros, sDocs, sArts, sCli, sAlm] = await Promise.all([
        storageService.getItem<Gasto[]>('gastos'),
        storageService.getItem<NotaVenta[]>('notasVenta'),
        storageService.getItem<Cobro[]>('cobros'),
        storageService.getItem<Documento[]>('documentos'),
        storageService.getItem<Articulo[]>('articulos'),
        storageService.getItem<Cliente[]>('clientes'),
        storageService.getItem<NotaAlmacen[]>('notasAlmacen')
      ]);
      
      setGastos(sGastos || []);
      if (!sGastos) storageService.setItem('gastos', []);

      setNotasVenta(sNotas || []);
      if (!sNotas) storageService.setItem('notasVenta', []);

      setCobros(sCobros || []);
      if (!sCobros) storageService.setItem('cobros', []);

      setDocumentos(sDocs || []);
      if (!sDocs) storageService.setItem('documentos', []);
      
      if (sArts && sArts.length) {
        setArticulos(sArts);
      } else {
        setArticulos(initialArticulos);
        storageService.setItem('articulos', initialArticulos);
      }

      if (sCli && sCli.length) {
        setClientes(sCli);
      } else {
        setClientes(initialClientes);
        storageService.setItem('clientes', initialClientes);
      }
      
      setNotasAlmacen(sAlm || []);
      if (!sAlm) storageService.setItem('notasAlmacen', []);
    } catch (error) {
      console.error('Error cargando datos locales:', error);
    }
  };

  // SINCRONIZACIÓN (Funciones de sincronización mantenidas para futuro)
  const sincronizar = useCallback(async () => {
    try {
      setSyncStatus(p => ({ ...p, clientes: 'syncing', articulos: 'syncing' }));
      const status = await syncService.syncAll();
      const cliSync = await syncService.getClientesLocal();
      const artSync = await syncService.getArticulosLocal();
      
      if (cliSync.length > 0) { setClientes(cliSync); storageService.setItem('clientes', cliSync); }
      if (artSync.length > 0) { setArticulos(artSync); storageService.setItem('articulos', artSync); }
      
      setSyncStatus(status);
      setModoOffline(status.clientes === 'error' && status.articulos === 'error');
    } catch (error: any) {
      setSyncStatus(p => ({ ...p, error: error.message, clientes: 'error', articulos: 'error' }));
      setModoOffline(true);
    }
  }, []);

  const forzarSincronizacion = useCallback(async () => { await sincronizar(); }, [sincronizar]);

  // --------------------------------------------------------------------------
  // FUNCIONES BLINDADAS (ACTUALIZACIÓN DE DATOS)
  // --------------------------------------------------------------------------

  const addArticulo = async (articulo: Articulo) => {
    setArticulos(prev => {
        const updated = [articulo, ...prev];
        storageService.setItem('articulos', updated);
        return updated;
    });
  };
  
  const addCliente = async (cliente: Cliente) => {
    setClientes(prev => {
        const updated = [cliente, ...prev];
        storageService.setItem('clientes', updated);
        return updated;
    });
  };


  const addGasto = async (gasto: Gasto) => {
    setGastos(prev => {
      const updated = [gasto, ...prev];
      storageService.setItem('gastos', updated);
      return updated;
    });
    syncService.addToQueue('gasto', gasto);
  };

  const deleteGasto = async (id: string) => {
    setGastos(prev => {
      const updated = prev.filter(g => g.id !== id);
      storageService.setItem('gastos', updated);
      return updated;
    });
    // syncService.addToQueue('gasto_delete', { id }); // Descomentar para enviar eliminación al ERP
  };

  const addNotaVenta = async (nota: NotaVenta) => {
    // 1. Descontar Stock (Usando estado previo para seguridad)
    if (nota.items && nota.items.length > 0) {
      setArticulos(prevArticulos => {
        const updatedArticulos = prevArticulos.map(art => {
          // Busca por articuloId o id (compatibilidad)
          const itemVendido = nota.items?.find((i: any) => i.articuloId === art.id || i.id === art.id); 
          if (itemVendido) {
            return { ...art, cantidad: Math.max(0, art.cantidad - (parseFloat(itemVendido.cantidad) || 0)) };
          }
          return art;
        });
        storageService.setItem('articulos', updatedArticulos);
        return updatedArticulos;
      });
    }
    
    // 2. Guardar Venta
    setNotasVenta(prev => {
      // Si la nota existe (es un borrador TEMP), la reemplazamos en su posición
      const existsIndex = prev.findIndex(n => n.id === nota.id);
      let updated;
      if (existsIndex > -1) {
        updated = [...prev];
        updated[existsIndex] = nota;
      } else {
        updated = [nota, ...prev];
      }

      storageService.setItem('notasVenta', updated);
      return updated;
    });
    
    syncService.addToQueue('venta', nota);
  };

  // Actualización segura para bucles
  const updateNotaVenta = async (id: string, estado: 'pendiente' | 'cerrada' | 'anulada' | 'abierta') => {
    setNotasVenta(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, estado } : n);
      storageService.setItem('notasVenta', updated);
      return updated;
    });
  };

  const addCobro = async (cobro: Cobro) => {
    setCobros(prev => {
      const updated = [cobro, ...prev];
      storageService.setItem('cobros', updated);
      return updated;
    });
    syncService.addToQueue('pago', cobro);
  };

  // Actualización segura para bucles
  const updateCobro = async (id: string, estado: 'pendiente' | 'pagado') => {
    setCobros(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, estado } : c);
      storageService.setItem('cobros', updated);
      return updated;
    });
  };

  const addDocumento = async (doc: Documento) => {
    setDocumentos(prev => {
      const updated = [doc, ...prev];
      storageService.setItem('documentos', updated);
      return updated;
    });
  };

  const deleteDocumento = async (id: string) => {
    setDocumentos(prev => {
      const updated = prev.filter(d => d.id !== id);
      storageService.setItem('documentos', updated);
      return updated;
    });
  };

  const updateArticulo = async (id: string, cantidad: number) => {
    setArticulos(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, cantidad } : a);
      storageService.setItem('articulos', updated);
      return updated;
    });
    await syncService.updateArticuloStock(id, cantidad);
  };

  const addNotaAlmacen = async (nota: NotaAlmacen) => {
    setNotasAlmacen(prev => {
      const updated = [nota, ...prev];
      storageService.setItem('notasAlmacen', updated);
      return updated;
    });
  };

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    await storageService.setItem('appConfig', updatedConfig);
  };

  const updateAppConfig = updateConfig; // Alias para compatibilidad

  const value: AppContextType = {
    userSession, setUserSession,
    gastos, notasVenta, cobros, documentos, articulos, clientes, notasAlmacen,
    syncStatus, modoOffline,
    addArticulo, addCliente, 
    addGasto, deleteGasto,
    addNotaVenta, updateNotaVenta,
    addCobro, updateCobro,
    addDocumento, deleteDocumento,
    updateArticulo, addNotaAlmacen,
    sincronizar, forzarSincronizacion,
    config, updateConfig, updateAppConfig,
    updateSyncStatus: (status) => setSyncStatus(prev => ({ ...prev, ...status })),
    login: (username) => setUserSession({ isLoggedIn: true, username }),
    logout: () => setUserSession({ isLoggedIn: false }),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp debe ser usado dentro de un AppProvider');
  return context;
};