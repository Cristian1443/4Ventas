/**
 * Contexto Global de la Aplicación
 * - Incluye datos iniciales para pruebas (MOCK) mientras se conecta el ERP.
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
    erpEnabled: false, // MODO PRUEBA: false para usar datos locales/mock
    autoSyncEnabled: true, 
    syncInterval: 3600000, 
    modoOffline: false
  });

  // --- DATOS INICIALES PARA PRUEBAS (MOCK) ---
  const initialClientes: Cliente[] = [
    { id: 'c1', codigo: '430001', nombre: 'Floristería El Jardín', empresa: 'Floristería El Jardín S.L.', direccion: 'Calle Mayor 123, Madrid', telefono: '600123456', email: 'contacto@eljardin.com', nif: 'B12345678', codigoPostal: '28001', provincia: 'Madrid' },
    { id: 'c2', codigo: '430005', nombre: 'Eventos y Bodas SL', empresa: 'Eventos y Bodas SL', direccion: 'Av. América 45, Madrid', telefono: '600999888', email: 'info@eventosbodas.com', nif: 'B98765432', codigoPostal: '28002', provincia: 'Madrid' }
  ];

  const initialArticulos: Articulo[] = [
    { id: '10001', nombre: 'Monitor Curvo 27"', cantidad: 50, categoria: 'Electrónica', precio: '250,00 €', stockMinimo: 10, codigoCorto: 'MON27' },
    { id: '10002', nombre: 'Teclado Mecánico RGB', cantidad: 12, categoria: 'Accesorios', precio: '75,50 €', stockMinimo: 5, codigoCorto: 'TECME' },
    { id: '10003', nombre: 'Mouse Inalámbrico Ergonómico', cantidad: 8, categoria: 'Accesorios', precio: '30,00 €', stockMinimo: 15, codigoCorto: 'MOUWI' },
    { id: '10004', nombre: 'Silla Gamer Pro', cantidad: 5, categoria: 'Mobiliario', precio: '199,99 €', stockMinimo: 5, codigoCorto: 'SIGAM' },
    { id: '10005', nombre: 'Auriculares Noise Cancel', cantidad: 20, categoria: 'Audio', precio: '120,00 €', stockMinimo: 8, codigoCorto: 'AUNC' }
  ];
  // -----------------------------------------------------------

  // INICIALIZACIÓN
  useEffect(() => { initializeApp(); }, []);

  const initializeApp = async () => {
    const savedConfig = await storageService.getItem<AppConfig>('appConfig');
    if (savedConfig) setConfig(savedConfig);
    
    // 1. Cargar datos locales
    await loadLocalData();
    
    // 2. Intentar sincronizar si está habilitado el ERP
    if (config.erpEnabled) {
        syncService.initialize().then(() => {
           refreshLocalDataFromSync();
        }).catch(err => console.log("Inicio offline o error de sync:", err));
    }
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
      setNotasVenta(sNotas || []);
      setCobros(sCobros || []);
      setDocumentos(sDocs || []);
      
      // Si no hay datos locales (primera vez), usar MOCKS para pruebas
      if (sArts && sArts.length > 0) {
        setArticulos(sArts);
      } else {
        setArticulos(initialArticulos);
        storageService.setItem('articulos', initialArticulos);
      }

      if (sCli && sCli.length > 0) {
        setClientes(sCli);
      } else {
        setClientes(initialClientes);
        storageService.setItem('clientes', initialClientes);
      }
      
      setNotasAlmacen(sAlm || []);
    } catch (error) {
      console.error('Error cargando datos locales:', error);
    }
  };

  const refreshLocalDataFromSync = async () => {
    const [cliSync, artSync, gasSync] = await Promise.all([
      syncService.getClientesLocal(),
      syncService.getArticulosLocal(),
      syncService.getGastosLocal()
    ]);

    if (cliSync) setClientes(cliSync);
    if (artSync) setArticulos(artSync);
    if (gasSync) setGastos(gasSync);
  };

  // SINCRONIZACIÓN
  const sincronizar = useCallback(async () => {
    try {
      setSyncStatus(p => ({ ...p, clientes: 'syncing', articulos: 'syncing' }));
      
      // Si ERP está deshabilitado, simulamos éxito para pruebas
      if (!config.erpEnabled) {
          setTimeout(() => {
              setSyncStatus(p => ({ ...p, clientes: 'success', articulos: 'success', ultimaSync: new Date().toISOString() }));
          }, 1000);
          return;
      }

      const status = await syncService.syncAll();
      await refreshLocalDataFromSync();
      setSyncStatus(status);
      setModoOffline(status.clientes === 'error' && status.articulos === 'error');
    } catch (error: any) {
      setSyncStatus(p => ({ ...p, error: error.message, clientes: 'error', articulos: 'error' }));
      setModoOffline(true);
    }
  }, [config.erpEnabled]);

  const forzarSincronizacion = useCallback(async () => { await sincronizar(); }, [sincronizar]);

  // FUNCIONES DE NEGOCIO (Igual que antes)
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
    if(config.erpEnabled) syncService.addToQueue('gasto', gasto);
  };

  const deleteGasto = async (id: string) => {
    const gastoId = String(id).trim(); // Normalizar el ID
    console.log('🔧 [AppContext] deleteGasto llamado con ID:', gastoId);
    console.log('📋 [AppContext] Gastos actuales:', gastos.length);
    
    // 1. Eliminar visualmente y de almacenamiento local inmediatamente
    setGastos(prev => {
      console.log('📋 [AppContext] Gastos antes de eliminar:', prev.length);
      console.log('🔍 [AppContext] Buscando gasto con ID:', gastoId);
      console.log('📋 [AppContext] IDs de gastos actuales:', prev.map(g => ({ id: String(g.id).trim(), nombre: g.nombre })));
      
      const updated = prev.filter(g => {
        const gId = String(g.id).trim();
        const shouldKeep = gId !== gastoId;
        if (!shouldKeep) {
          console.log('✅ [AppContext] Gasto encontrado y será eliminado:', { id: gId, nombre: g.nombre });
        }
        return shouldKeep;
      });
      
      console.log('📋 [AppContext] Gastos después de eliminar:', updated.length);
      
      // Guardar en storage de forma asíncrona pero no bloquear
      storageService.setItem('gastos', updated).catch(err => {
        console.error('❌ Error guardando gastos en storage:', err);
      });
      
      return updated;
    });

    // 2. Encolar la eliminación para que se procese en el ERP cuando haya red
    // Esto evita que el gasto "reviva" en la próxima sincronización
    try {
      syncService.addToQueue('gasto_delete', { id: gastoId });
      console.log('✅ [AppContext] Gasto encolado para eliminación en ERP');
    } catch (error) {
      console.error('❌ Error encolando eliminación:', error);
    }
  };

  const addNotaVenta = async (nota: NotaVenta) => {
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
    
    setNotasVenta(prev => {
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
    
    if(config.erpEnabled) syncService.addToQueue('venta', nota);
  };

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
    if(config.erpEnabled) syncService.addToQueue('pago', cobro);
  };

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
    if(config.erpEnabled) await syncService.updateArticuloStock(id, cantidad);
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

  const updateAppConfig = updateConfig;

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