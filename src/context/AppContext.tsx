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
  Visita,
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
  visitas: Visita[];
  
  syncStatus: SyncStatus;
  modoOffline: boolean;
  
  // CRUD y Stock
  addArticulo: (articulo: Articulo) => Promise<void>;
  addCliente: (cliente: Cliente) => Promise<void>;
  addGasto: (gasto: Gasto) => Promise<void>;
  deleteGasto: (id: string) => Promise<void>;
  
  addNotaVenta: (nota: NotaVenta) => Promise<void>;
  updateNotaVenta: (id: string, estado: 'pendiente' | 'cerrada' | 'anulada' | 'abierta') => Promise<void>;
  deleteNotaVenta: (id: string) => Promise<void>;
  
  addCobro: (cobro: Cobro) => Promise<void>;
  updateCobro: (id: string, estado: 'pendiente' | 'pagado', metadata?: { formaPago: string, fecha: Date }) => Promise<void>;
  
  addDocumento: (doc: Documento) => Promise<void>;
  deleteDocumento: (id: string) => Promise<void>;
  
  updateArticulo: (id: string, cantidad: number) => Promise<void>;
  addNotaAlmacen: (nota: NotaAlmacen) => Promise<void>;
  
  addVisita: (visita: Visita) => Promise<void>;
  toggleVisita: (id: string) => Promise<void>;
  
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
  const [visitas, setVisitas] = useState<Visita[]>([]);
  
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

  // ACTUALIZADO: Productos reales de la tienda con Código Corto global
  const initialArticulos: Articulo[] = [
    { 
      id: '20001', 
      nombre: 'Abaca Natural Rojo 50cm x 5m', 
      cantidad: 45, 
      categoria: 'Textil / Cintas', 
      precio: '15,50 €', 
      stockMinimo: 10, 
      codigoCorto: 'ABA-001' 
    },
    { 
      id: '20002', 
      nombre: 'Agave Slices Naranja', 
      cantidad: 30, 
      categoria: 'Naturales / Secos', 
      precio: '8,20 €', 
      stockMinimo: 5, 
      codigoCorto: 'AGA-002' 
    }
  ];
  // -----------------------------------------------------------

  // INICIALIZACIÓN
  useEffect(() => { initializeApp(); }, []);

  const initializeApp = async () => {
    const savedConfig = await storageService.getItem<AppConfig>('appConfig');
    const finalConfig = savedConfig || config;
    if (savedConfig) setConfig(savedConfig);
    
    // 1. Cargar datos locales (usar finalConfig para saber si ERP está habilitado)
    await loadLocalData(finalConfig.erpEnabled);
    
    // 2. Intentar sincronizar si está habilitado el ERP
    if (finalConfig.erpEnabled) {
        syncService.initialize().then(() => {
           refreshLocalDataFromSync();
        }).catch(err => console.log("Inicio offline o error de sync:", err));
    }
  };

  const loadLocalData = async (erpEnabled: boolean = false) => {
    try {
      const [sGastos, sNotas, sCobros, sDocs, sArts, sCli, sAlm, sVisitas] = await Promise.all([
        storageService.getItem<Gasto[]>('gastos'),
        storageService.getItem<NotaVenta[]>('notasVenta'),
        storageService.getItem<Cobro[]>('cobros'),
        storageService.getItem<Documento[]>('documentos'),
        storageService.getItem<Articulo[]>('articulos'),
        storageService.getItem<Cliente[]>('clientes'),
        storageService.getItem<NotaAlmacen[]>('notasAlmacen'),
        storageService.getItem<Visita[]>('visitas')
      ]);
      
      setGastos(sGastos || []);
      setNotasVenta(sNotas || []);
      setCobros(sCobros || []);
      setDocumentos(sDocs || []);
      
      // SIEMPRE usar initialArticulos cuando el ERP está deshabilitado (modo prueba)
      // Esto asegura que los productos de la tienda siempre estén disponibles
      // y reemplaza cualquier artículo antiguo que pueda estar guardado
      if (!erpEnabled) {
        setArticulos(initialArticulos);
        await storageService.setItem('articulos', initialArticulos);
      } else {
        // Si el ERP está habilitado, usar datos locales si existen, sino usar initialArticulos
        if (sArts && sArts.length > 0) {
          setArticulos(sArts);
        } else {
          setArticulos(initialArticulos);
          await storageService.setItem('articulos', initialArticulos);
        }
      }

      if (sCli && sCli.length > 0) {
        setClientes(sCli);
      } else {
        setClientes(initialClientes);
        storageService.setItem('clientes', initialClientes);
      }
      
      setNotasAlmacen(sAlm || []);
      setVisitas(sVisitas || []);
    } catch (error) {
      console.error('Error cargando datos locales:', error);
    }
  };

  const refreshLocalDataFromSync = async () => {
    const [cliSync, artSync, gasSync, docSync, cobSync, almSync, visitasSync] = await Promise.all([
      syncService.getClientesLocal(),
      syncService.getArticulosLocal(),
      syncService.getGastosLocal(),
      syncService.getDocumentosLocal(),
      syncService.getCobrosLocal(),
      syncService.getNotasAlmacenLocal(),
      syncService.getAgendaLocal()
    ]);

    if (cliSync) setClientes(cliSync);
    // Solo reemplazamos artículos si el ERP trae alguno; si viene vacío, mantenemos el catálogo local/tienda
    if (artSync && artSync.length > 0) setArticulos(artSync);
    if (gasSync) setGastos(gasSync);
    if (docSync) setDocumentos(docSync);
    if (cobSync) setCobros(cobSync);
    if (almSync) setNotasAlmacen(almSync);
    if (visitasSync) setVisitas(visitasSync);
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
      
      // Refrescar todo desde local
      const [cliSync, artSync, gasSync, docSync, cobSync, almSync, visitasSync] = await Promise.all([
          syncService.getClientesLocal(),
          syncService.getArticulosLocal(),
          syncService.getGastosLocal(),
          syncService.getDocumentosLocal(),
          syncService.getCobrosLocal(),
          syncService.getNotasAlmacenLocal(),
          syncService.getAgendaLocal()
      ]);
      
      if (cliSync) setClientes(cliSync);
      // Igual que en refreshLocalDataFromSync: solo pisamos si hay artículos reales del ERP
      if (artSync && artSync.length > 0) setArticulos(artSync);
      if (gasSync) setGastos(gasSync);
      if (docSync) setDocumentos(docSync);
      if (cobSync) setCobros(cobSync);
      if (almSync) setNotasAlmacen(almSync);
      if (visitasSync) setVisitas(visitasSync);
      
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
    // 1. Guardar localmente con ID temporal
    setClientes(prev => {
        const updated = [cliente, ...prev];
        storageService.setItem('clientes', updated);
        return updated;
    });

    // 2. Encolar para subir al ERP
    if(config.erpEnabled) {
        syncService.addToQueue('cliente', cliente);
    }
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

  const deleteNotaVenta = async (id: string) => {
    const notaId = String(id).trim();
    setNotasVenta(prev => {
      const updated = prev.filter(n => String(n.id).trim() !== notaId);
      storageService.setItem('notasVenta', updated);
      return updated;
    });

    // Si se requiere borrar también en ERP, aquí se podría encolar una operación específica.
    // De momento no existe tipo 'venta_delete' en la cola tipada, así que solo borramos localmente.
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

  // Helper para formatear fecha de forma consistente
  const formatFechaConsistente = (fecha: Date): string => {
    const day = String(fecha.getDate()).padStart(2, '0');
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const year = fecha.getFullYear();
    const hours = String(fecha.getHours()).padStart(2, '0');
    const minutes = String(fecha.getMinutes()).padStart(2, '0');
    const seconds = String(fecha.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
  };

  // FUNCIÓN MEJORADA: Ahora acepta metadatos opcionales para registrar el pago
  // Usa forma funcional de setState para evitar problemas con múltiples actualizaciones
  const updateCobro = async (id: string, estado: 'pendiente' | 'pagado', metadata?: { formaPago: string, fecha: Date }) => {
    
    // 1. Buscar el cobro original antes de actualizar
    const cobroOriginal = cobros.find(c => c.id === id);
    
    // 2. Actualizar estado local usando forma funcional para evitar problemas de estado obsoleto
    setCobros(prev => {
      const cobrosActualizados = prev.map(c => {
        if (c.id === id) {
          return { 
            ...c, 
            estado, 
            // Si nos pasan metadatos (al pagar), actualizamos el cobro local
            formaPago: metadata?.formaPago || c.formaPago,
            fecha: metadata?.fecha ? formatFechaConsistente(metadata.fecha) : c.fecha
          };
        }
        return c;
      });
      
      // Guardar en storage de forma asíncrona
      storageService.setItem('cobros', cobrosActualizados).catch(err => {
        console.error('Error guardando cobros en storage:', err);
      });
      
      return cobrosActualizados;
    });

    // 3. Si se está pagando, encolar operación de pago para el ERP
    if (estado === 'pagado' && cobroOriginal) {
      // Aseguramos que tenga la info actualizada
      const datosPago: any = {
          id: cobroOriginal.id,
          clienteId: cobroOriginal.clienteId,
          cliente: cobroOriginal.cliente,
          monto: cobroOriginal.monto,
          fecha: metadata?.fecha ? formatFechaConsistente(metadata.fecha) : cobroOriginal.fecha,
          estado: 'pagado',
          notaVentaId: cobroOriginal.notaVentaId,
          formaPago: metadata?.formaPago || cobroOriginal.formaPago || 'Efectivo',
          fechaRegistro: new Date().toISOString()
      };
      
      if(config.erpEnabled) {
          console.log('💸 Encolando pago para sync:', datosPago.id);
          syncService.addToQueue('pago', datosPago);
      }
    }
  };

  const addDocumento = async (doc: Documento) => {
    setDocumentos(prev => {
      const updated = [doc, ...prev];
      storageService.setItem('documentos', updated);
      return updated;
    });
    // Encolar subida
    if(config.erpEnabled) syncService.addToQueue('documento', doc);
  };

  const deleteDocumento = async (id: string) => {
    const docId = String(id).trim(); // Normalizar el ID
    
    setDocumentos(prev => {
      const updated = prev.filter(d => String(d.id).trim() !== docId);
      storageService.setItem('documentos', updated);
      return updated;
    });
    // Encolar borrado
    syncService.addToQueue('documento_delete', { id: docId });
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

  const addVisita = async (visita: Visita) => {
    setVisitas(prev => {
      const updated = [...prev, visita];
      storageService.setItem('visitas', updated);
      return updated;
    });
    if(config.erpEnabled) syncService.addToQueue('visita', visita);
  };

  const toggleVisita = async (id: string) => {
    let nuevoEstado = false;
    setVisitas(prev => {
      const updated = prev.map(v => {
        if (v.id === id) {
          nuevoEstado = !v.completado;
          return { ...v, completado: !v.completado };
        }
        return v;
      });
      storageService.setItem('visitas', updated);
      return updated;
    });
    
    if(config.erpEnabled) {
        syncService.addToQueue('visita_update', { id, completado: nuevoEstado });
    }
  };

  const updateConfig = async (newConfig: Partial<AppConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    await storageService.setItem('appConfig', updatedConfig);
  };

  const updateAppConfig = updateConfig;

  const value: AppContextType = {
    userSession, setUserSession,
    gastos, notasVenta, cobros, documentos, articulos, clientes, notasAlmacen, visitas,
    syncStatus, modoOffline,
    addArticulo, addCliente, 
    addGasto, deleteGasto,
    addNotaVenta, updateNotaVenta, deleteNotaVenta,
    addCobro, updateCobro,
    addDocumento, deleteDocumento,
    updateArticulo, addNotaAlmacen,
    addVisita, toggleVisita,
    sincronizar, forzarSincronizacion,
    config, updateConfig, updateAppConfig,
    updateSyncStatus: (status) => setSyncStatus(prev => ({ ...prev, ...status })),
    login: (username) => setUserSession({ isLoggedIn: true, username }),
    logout: () => {
      console.log('🚪 Cerrando sesión...');
      setUserSession({ isLoggedIn: false });
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp debe ser usado dentro de un AppProvider');
  return context;
};