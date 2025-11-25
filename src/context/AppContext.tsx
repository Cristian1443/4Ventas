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

  // DATOS INICIALES DE EJEMPLO
  const initialClientes: Cliente[] = [
    { id: 'c1', codigo: '430001', nombre: 'Floristería El Jardín', empresa: 'Floristería El Jardín S.L.', direccion: 'Calle Mayor 123, Madrid', telefono: '600123456', email: 'contacto@eljardin.com' },
    { id: 'c2', codigo: '430005', nombre: 'Eventos y Bodas SL', empresa: 'Eventos y Bodas SL', direccion: 'Av. América 45, Madrid', telefono: '600999888', email: 'info@eventosbodas.com' }
  ];

  const generateMockData = () => {
    const mockArticulos: Articulo[] = [
      { id: '10001', nombre: 'Monitor Curvo 27"', cantidad: 50, categoria: 'Electrónica', precio: '250,00 €', stockMinimo: 10, codigoCorto: 'MON27' },
      { id: '10002', nombre: 'Teclado Mecánico RGB', cantidad: 12, categoria: 'Accesorios', precio: '75,50 €', stockMinimo: 5, codigoCorto: 'TECME' },
      { id: '10003', nombre: 'Mouse Inalámbrico Ergonómico', cantidad: 8, categoria: 'Accesorios', precio: '30,00 €', stockMinimo: 15, codigoCorto: 'MOUWI' },
      { id: '10004', nombre: 'Disco Duro SSD 1TB', cantidad: 3, categoria: 'Componentes', precio: '90,00 €', stockMinimo: 5, codigoCorto: 'SSD1T' },
      { id: '10005', nombre: 'Webcam Full HD con Micrófono', cantidad: 25, categoria: 'Periféricos', precio: '45,99 €', stockMinimo: 10, codigoCorto: 'WEBHD' },
    ];

    const mockClientes: Cliente[] = [
      { id: 'C001', codigo: 'C1', nombre: 'Juan Pérez', empresa: 'Soft Solutions S.L.', direccion: 'C/ Mayor, 10', nif: 'B12345678', ultimaVisita: '15/09/2025' },
      { id: 'C002', codigo: 'C2', nombre: 'Ana García', empresa: 'Tecno Innova, SA', direccion: 'Av. Libertad, 25', nif: 'A87654321', ultimaVisita: '18/09/2025' },
      { id: 'C003', codigo: 'C3', nombre: 'Pedro López', empresa: 'Electro Hogar', direccion: 'Plaza Central, 5', nif: 'X98765432', ultimaVisita: '20/09/2025' },
      { id: 'C004', codigo: 'C4', nombre: 'María Rodríguez', empresa: 'Soft Solutions S.L.', direccion: 'C/ Menor, 20', nif: 'B12345679', ultimaVisita: '16/09/2025' },
    ];

    const mockNotasVenta: NotaVenta[] = [
      { id: 'N1234', cliente: 'Juan Pérez', precio: '325,50 €', fecha: '20/09/2025, 10:30:00', estado: 'cerrada', clienteId: 'C001', formaPago: 'Tarjeta', tipoNota: 'Serie P', items: [{ nombre: 'Monitor', cantidad: 1, precioUnitario: 250, descuento: 0 }, { nombre: 'Mouse', cantidad: 1, precioUnitario: 30, descuento: 0 }] },
      { id: 'N1235', cliente: 'Ana García', precio: '75,50 €', fecha: '20/09/2025, 11:00:00', estado: 'pendiente', clienteId: 'C002', formaPago: 'Crédito', tipoNota: 'Pedido', items: [{ nombre: 'Teclado', cantidad: 1, precioUnitario: 75.5, descuento: 0 }] },
      { id: 'N1236', cliente: 'Pedro López', precio: '45,99 €', fecha: '20/09/2025, 12:45:00', estado: 'abierta', clienteId: 'C003', formaPago: 'Efectivo', tipoNota: 'Pedido', items: [{ nombre: 'Webcam', cantidad: 1, precioUnitario: 45.99, descuento: 0 }] },
    ];

    const mockGastos: Gasto[] = [
      { id: 'G001', nombre: 'Gasolina Repostaje', categoria: 'Transporte', precio: '50,00 €', fecha: '20/09/2025, 09:00:00' },
      { id: 'G002', nombre: 'Almuerzo comercial', categoria: 'Comida', precio: '12,50 €', fecha: '20/09/2025, 13:00:00' },
    ];

    const mockCobros: Cobro[] = [
      { id: 'C900', cliente: 'Ana García', monto: '150,00 €', fecha: '20/09/2025, 14:30:00', estado: 'pagado', notaVentaId: 'N1235', clienteId: 'C002', formaPago: 'Efectivo' },
    ];

    return {
      articulos: mockArticulos,
      clientes: mockClientes,
      notasVenta: mockNotasVenta,
      gastos: mockGastos,
      cobros: mockCobros,
      notasAlmacen: [] as NotaAlmacen[]
    };
  };

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

      const mockData = generateMockData();
      
      if (sGastos && sGastos.length) {
        setGastos(sGastos);
      } else {
        setGastos(mockData.gastos);
        await storageService.setItem('gastos', mockData.gastos);
      }

      if (sNotas && sNotas.length) {
        setNotasVenta(sNotas);
      } else {
        setNotasVenta(mockData.notasVenta);
        await storageService.setItem('notasVenta', mockData.notasVenta);
      }

      if (sCobros && sCobros.length) {
        setCobros(sCobros);
      } else {
        setCobros(mockData.cobros);
        await storageService.setItem('cobros', mockData.cobros);
      }

      if (sDocs && sDocs.length) {
        setDocumentos(sDocs);
      } else {
        setDocumentos([]);
        await storageService.setItem('documentos', []);
      }

      if (sArts && sArts.length) {
        setArticulos(sArts);
      } else {
        setArticulos(mockData.articulos);
        await storageService.setItem('articulos', mockData.articulos);
      }

      if (sCli && sCli.length) {
        setClientes(sCli);
      } else {
        setClientes(mockData.clientes.length ? mockData.clientes : initialClientes);
        await storageService.setItem('clientes', mockData.clientes.length ? mockData.clientes : initialClientes);
      }

      if (sAlm && sAlm.length) {
        setNotasAlmacen(sAlm);
      } else {
        setNotasAlmacen(mockData.notasAlmacen);
        await storageService.setItem('notasAlmacen', mockData.notasAlmacen);
      }
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

  const updateAppConfig = async (newConfig: Partial<AppConfig>) => {
    await updateConfig(newConfig);
  };

  const updateSyncStatus = (status: Partial<SyncStatus>) => {
    setSyncStatus(prev => ({ ...prev, ...status }));
  };

  const login = (username: string) => {
    setUserSession({ isLoggedIn: true, username });
  };

  const logout = () => {
    setUserSession({ isLoggedIn: false });
  };

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
    config, updateConfig,
    updateAppConfig, updateSyncStatus,
    login, logout
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp debe ser usado dentro de un AppProvider');
  return context;
};