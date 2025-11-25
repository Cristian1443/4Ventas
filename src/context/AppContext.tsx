/**
 * Contexto Global de la Aplicación - CORREGIDO PARA ACTUALIZACIONES MÚLTIPLES
 * - Soluciona el bug donde "solo se cobra uno" al seleccionar varios.
 * - Usa actualizaciones funcionales para garantizar integridad de datos.
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
  
  addGasto: (gasto: Gasto) => Promise<void>;
  deleteGasto: (id: string) => Promise<void>;
  
  addNotaVenta: (nota: NotaVenta) => Promise<void>;
  updateNotaVenta: (id: string, estado: 'pendiente' | 'cerrada' | 'anulada') => Promise<void>;
  
  addCobro: (cobro: Cobro) => Promise<void>;
  updateCobro: (id: string, estado: 'pendiente' | 'pagado') => Promise<void>;
  
  addDocumento: (doc: Documento) => Promise<void>;
  deleteDocumento: (id: string) => Promise<void>;
  
  updateArticulo: (id: string, cantidad: number) => Promise<void>;
  addNotaAlmacen: (nota: NotaAlmacen) => Promise<void>;
  
  sincronizar: () => Promise<void>;
  forzarSincronizacion: () => Promise<void>;
  
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

  // DATOS INICIALES DE EJEMPLO
  const initialClientes: Cliente[] = [
    { id: 'c1', codigo: '430001', nombre: 'Floristería El Jardín', empresa: 'Floristería El Jardín S.L.', direccion: 'Calle Mayor 123, Madrid', telefono: '600123456', email: 'contacto@eljardin.com' },
    { id: 'c2', codigo: '430005', nombre: 'Eventos y Bodas SL', empresa: 'Eventos y Bodas SL', direccion: 'Av. América 45, Madrid', telefono: '600999888', email: 'info@eventosbodas.com' }
  ];

  // INICIALIZACIÓN
  useEffect(() => { initializeApp(); }, []);

  const initializeApp = async () => {
    const savedConfig = await storageService.getItem<AppConfig>('appConfig');
    if (savedConfig) setConfig(savedConfig);
    await loadLocalData();
    await syncService.initialize();
    await sincronizar();
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
      
      if (sGastos) setGastos(sGastos);
      if (sNotas) setNotasVenta(sNotas);
      if (sCobros) setCobros(sCobros);
      if (sDocs) setDocumentos(sDocs);
      if (sArts) setArticulos(sArts);
      if (sCli) setClientes(sCli); else { setClientes(initialClientes); storageService.setItem('clientes', initialClientes); }
      if (sAlm) setNotasAlmacen(sAlm);
    } catch (error) {
      console.error('Error cargando datos locales:', error);
    }
  };

  // SINCRONIZACIÓN
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
  // FUNCIONES BLINDADAS (CORRECCIÓN DEL ERROR DE BUCLE)
  // Usamos "prev => ..." para asegurar que siempre actualizamos sobre la última versión
  // --------------------------------------------------------------------------

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
  };

  const addNotaVenta = async (nota: NotaVenta) => {
    // 1. Guardar Venta
    setNotasVenta(prev => {
      const updated = [nota, ...prev];
      storageService.setItem('notasVenta', updated);
      return updated;
    });
    syncService.addToQueue('venta', nota);

    // 2. Descontar Stock (Usando estado previo para seguridad)
    if (nota.items && nota.items.length > 0) {
      setArticulos(prevArticulos => {
        const updatedArticulos = prevArticulos.map(art => {
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
  };

  // [CRÍTICO] Actualización segura para bucles
  const updateNotaVenta = async (id: string, estado: 'pendiente' | 'cerrada' | 'anulada') => {
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

  // [CRÍTICO] Actualización segura para bucles
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

  const value: AppContextType = {
    userSession, setUserSession,
    gastos, notasVenta, cobros, documentos, articulos, clientes, notasAlmacen,
    syncStatus, modoOffline,
    addGasto, deleteGasto,
    addNotaVenta, updateNotaVenta,
    addCobro, updateCobro,
    addDocumento, deleteDocumento,
    updateArticulo, addNotaAlmacen,
    sincronizar, forzarSincronizacion,
    config, updateConfig
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp debe ser usado dentro de un AppProvider');
  return context;
};