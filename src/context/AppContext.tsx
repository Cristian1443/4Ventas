/**
 * Contexto Global de la Aplicación
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
import { vendorService, Vendedor } from '../services/vendor.service';
import { setSessionId } from '../services/erp.service';

// ============================================================================
// TIPOS DEL CONTEXTO
// ============================================================================

interface AppContextType {
  userSession: UserSession;
  setUserSession: (session: UserSession) => void;
  currentVendor: Vendedor | null;
  setCurrentVendor: (vendor: Vendedor | null) => void;

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
  login: (vendorId: string) => Promise<boolean>;
  logout: () => Promise<void>;
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
  const [currentVendor, setCurrentVendor] = useState<Vendedor | null>(null);

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
    erpEnabled: true, // MODO PRUEBA: false para usar datos locales/mock
    autoSyncEnabled: true,
    syncInterval: 3600000,
    modoOffline: false,
    catalogoPdfUrl: 'https://docs.google.com/spreadsheets/d/1KEeYssoGwAa_oEvHjfINP24cjTEZsHng8jik4Qs8hf8/edit?usp=sharing'
  });


  const withVendorKey = (key: string, vendorId?: string | null) => vendorId ? `${key}__${vendorId}` : key;
  const resolveVendorId = async (): Promise<string | null> => {
    if (currentVendor?.id) return currentVendor.id;
    const stored = await vendorService.getVendedorActual();
    return stored?.id || null;
  };
  const updatePendingFromQueue = () => {
    setSyncStatus(prev => ({ ...prev, operacionesPendientes: syncService.getPendingCount() }));
  };

  // INICIALIZACIÓN
  useEffect(() => { initializeApp(); }, []);

  // Cuando cambia el vendedor activo, asegurar sesión ERP, cola y datos cargados
  useEffect(() => {
    const applyVendorChange = async () => {
      if (currentVendor) {
        setSessionId(currentVendor.sessionId);
        await syncService.setVendor(currentVendor.id);
        await loadLocalData(config.erpEnabled, currentVendor);
        updatePendingFromQueue();
      } else {
        await syncService.setVendor(null);
        setSessionId('');
        setSyncStatus(p => ({ ...p, operacionesPendientes: 0 }));
      }
    };
    applyVendorChange();
  }, [currentVendor?.id]);

  const initializeApp = async () => {
    const savedConfig = await storageService.getItem<AppConfig>('appConfig');
    const finalConfig = { ...(savedConfig || config), erpEnabled: true }; // Forzar ERP habilitado
    setConfig(finalConfig);
    try { setERPEnabled(true); } catch {}

    // 0. Cargar Vendedor Actual
    const vendor = await vendorService.getVendedorActual();
    if (vendor) {
      setCurrentVendor(vendor);
      setUserSession({ isLoggedIn: true, username: vendor.nombre });
      setSessionId(vendor.sessionId);
      await syncService.setVendor(vendor.id);
    } else {
      await syncService.setVendor(null);
    }

    // 1. Cargar datos locales (usar finalConfig para saber si ERP está habilitado)
    // Pasamos el vendor explícitamente para asegurar que filtre bien en el primer load
    await loadLocalData(finalConfig.erpEnabled, vendor);

    // 2. Intentar sincronizar si está habilitado el ERP
    if (finalConfig.erpEnabled) {
      syncService.initialize().then(() => {
        refreshLocalDataFromSync();
      }).catch(err => console.log("Inicio offline o error de sync:", err));
    }
  };

  const loadLocalData = async (erpEnabled: boolean = false, specificVendor?: Vendedor | null) => {
    // Usamos el vendor pasado o el del estado
    const vendorToFilter = specificVendor !== undefined ? specificVendor : currentVendor;
    const vendorId = vendorToFilter?.id;

    try {
      console.log(`📂 [AppContext] Cargando datos locales (Vendor: ${vendorId || 'Ninguno'})...`);
      const [sGastos, sNotas, sCobros, sDocs, sArts, sCli, sAlm, sVisitas] = await Promise.all([
        storageService.getItem<Gasto[]>(withVendorKey('gastos', vendorId)),
        storageService.getItem<NotaVenta[]>(withVendorKey('notasVenta', vendorId)),
        storageService.getItem<Cobro[]>(withVendorKey('cobros', vendorId)),
        storageService.getItem<Documento[]>(withVendorKey('documentos', vendorId)),
        storageService.getItem<Articulo[]>('articulos'),
        storageService.getItem<Cliente[]>('clientes'),
        storageService.getItem<NotaAlmacen[]>(withVendorKey('notasAlmacen', vendorId)),
        storageService.getItem<Visita[]>(withVendorKey('visitas', vendorId))
      ]);

      console.log(`📊 [AppContext] Datos cargados desde storage:`);
      console.log(`   Clientes: ${sCli?.length || 0}`);
      console.log(`   Artículos: ${sArts?.length || 0}`);
      if (sCli && sCli.length > 0) {
        console.log(`   Primer cliente:`, sCli[0]);
      }

      // FILTRADO POR VENDEDOR
      // Gastos y Cobros ya vienen en storage namespaced por vendedor, no es necesario filtrar
      if (vendorId) {
        setGastos(sGastos || []);
        setCobros(sCobros || []);
        // Ventas sí se filtran por vendedor para evitar legacy sin vendorId
        setNotasVenta((sNotas || []).filter(n => n.vendedorId === vendorId));
      } else {
        setGastos([]);
        setNotasVenta([]);
        setCobros([]);
      }

      setDocumentos(sDocs || []);
      setArticulos(sArts || []);
      setClientes(sCli || []);

      setNotasAlmacen(sAlm || []);
      setVisitas(sVisitas || []);

      console.log('✅ [AppContext] Estado actualizado con datos locales');
    } catch (error) {
      console.error('❌ Error cargando datos locales:', error);
    }
  };

  const refreshLocalDataFromSync = async () => {
    console.log('🔄 [AppContext] refreshLocalDataFromSync - Iniciando...');

    const [cliSync, artSync, gasSync, docSync, cobSync, almSync, visitasSync] = await Promise.all([
      syncService.getClientesLocal(),
      syncService.getArticulosLocal(),
      syncService.getGastosLocal(),
      syncService.getDocumentosLocal(),
      syncService.getCobrosLocal(),
      syncService.getNotasAlmacenLocal(),
      syncService.getAgendaLocal()
    ]);

    console.log('🔄 [AppContext] refreshLocalDataFromSync - Datos leídos:');
    console.log(`   Clientes: ${cliSync?.length || 0}`);
    console.log(`   Artículos: ${artSync?.length || 0}`);
    console.log(`   Gastos: ${gasSync?.length || 0}`);
    console.log(`   Documentos: ${docSync?.length || 0}`);
    console.log(`   Cobros: ${cobSync?.length || 0}`);
    console.log(`   Notas Almacén: ${almSync?.length || 0}`);
    console.log(`   Visitas: ${visitasSync?.length || 0}`);

    // Actualizar clientes - SIEMPRE actualizar si hay datos
    if (cliSync !== undefined && cliSync !== null) {
      if (cliSync.length > 0) {
        console.log(`✅ [AppContext] Refrescando ${cliSync.length} clientes en el estado`);
      } else {
        console.log(`⚠️ [AppContext] Clientes array vacío, pero actualizando estado`);
      }
      setClientes(cliSync);
    } else {
      console.log(`❌ [AppContext] Clientes es undefined/null, no se actualiza`);
    }

    // Actualizar artículos - SIEMPRE actualizar si hay datos del ERP
    if (artSync !== undefined && artSync !== null) {
      if (artSync.length > 0) {
        console.log(`✅ [AppContext] Refrescando ${artSync.length} artículos en el estado`);
        setArticulos(artSync);
      } else {
        console.log(`⚠️ [AppContext] Artículos vacío del ERP, manteniendo estado actual`);
      }
    } else {
      console.log(`❌ [AppContext] Artículos es undefined/null, no se actualiza`);
    }

    const vendorId = currentVendor?.id;

    // Actualizar el resto (CON FILTRO)
    if (gasSync !== undefined && gasSync !== null) {
      console.log(`✅ [AppContext] Actualizando gastos`);
      setGastos(gasSync);
    }
    if (docSync !== undefined && docSync !== null) {
      console.log(`✅ [AppContext] Actualizando ${docSync.length} documentos`);
      setDocumentos(docSync);
    }
    if (cobSync !== undefined && cobSync !== null) {
      console.log(`✅ [AppContext] Actualizando cobros`);
      setCobros(cobSync);
    }
    if (almSync !== undefined && almSync !== null) {
      console.log(`✅ [AppContext] Actualizando ${almSync.length} notas de almacén`);
      setNotasAlmacen(almSync);
    }
    if (visitasSync !== undefined && visitasSync !== null) {
      console.log(`✅ [AppContext] Actualizando ${visitasSync.length} visitas`);
      setVisitas(visitasSync);
    }

    console.log('✅ [AppContext] refreshLocalDataFromSync - Completado');
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

      console.log('🔄 [AppContext] Actualizando estado después de sincronización...');
      console.log(`   Clientes: ${cliSync?.length || 0}`);
      console.log(`   Artículos: ${artSync?.length || 0}`);
      console.log(`   Gastos: ${gasSync?.length || 0}`);
      console.log(`   Documentos: ${docSync?.length || 0}`);
      console.log(`   Cobros: ${cobSync?.length || 0}`);
      console.log(`   Notas Almacén: ${almSync?.length || 0}`);
      console.log(`   Visitas: ${visitasSync?.length || 0}`);

      // Actualizar clientes - SIEMPRE actualizar, incluso si está vacío
      if (cliSync !== undefined && cliSync !== null) {
        if (cliSync.length > 0) {
          console.log(`✅ [AppContext] Actualizando ${cliSync.length} clientes en el estado`);
        } else {
          console.log(`⚠️ [AppContext] Clientes vacío, pero actualizando estado de todas formas`);
        }
        setClientes(cliSync);
      } else {
        console.log(`❌ [AppContext] No se recibieron clientes del sync service (undefined/null)`);
      }

      // Actualizar artículos - SIEMPRE actualizar, incluso si está vacío
      if (artSync !== undefined && artSync !== null) {
        if (artSync.length > 0) {
          console.log(`✅ [AppContext] Actualizando ${artSync.length} artículos en el estado`);
        } else {
          console.log(`⚠️ [AppContext] Artículos vacío del ERP, pero actualizando estado de todas formas`);
        }
        setArticulos(artSync);
      } else {
        console.log(`❌ [AppContext] No se recibieron artículos del sync service (undefined/null)`);
      }

      // Actualizar el resto de datos
      if (gasSync !== undefined && gasSync !== null) {
        console.log(`✅ [AppContext] Actualizando ${gasSync.length} gastos en el estado`);
        setGastos(gasSync);
      }
      if (docSync !== undefined && docSync !== null) {
        console.log(`✅ [AppContext] Actualizando ${docSync.length} documentos en el estado`);
        setDocumentos(docSync);
      }
      if (cobSync !== undefined && cobSync !== null) {
        console.log(`✅ [AppContext] Actualizando ${cobSync.length} cobros en el estado`);
        setCobros(cobSync);
      }
      if (almSync !== undefined && almSync !== null) {
        console.log(`✅ [AppContext] Actualizando ${almSync.length} notas de almacén en el estado`);
        setNotasAlmacen(almSync);
      }
      if (visitasSync !== undefined && visitasSync !== null) {
        console.log(`✅ [AppContext] Actualizando ${visitasSync.length} visitas en el estado`);
        setVisitas(visitasSync);
      }

      // Re-aplicar filtro solo para notasVenta si llegaran vía sync (gas/cob ya están namespaced)
      if (currentVendor?.id && sNotas) {
        setNotasVenta(sNotas => (sNotas || []).filter(n => n.vendedorId === currentVendor.id));
      }

      setSyncStatus(status);
      setModoOffline(status.clientes === 'error' && status.articulos === 'error');

      // Mostrar alerta si hay errores
      if (status.error || status.clientes === 'error' || status.articulos === 'error') {
        console.error('❌ [AppContext] Error en sincronización:', status.error);
        console.error(`   Clientes: ${status.clientes}, Artículos: ${status.articulos}`);
      }

      // Mostrar advertencia si no hay datos
      if ((cliSync?.length === 0 || artSync?.length === 0) && status.clientes !== 'error' && status.articulos !== 'error') {
        console.warn('⚠️ [AppContext] Sincronización completada pero sin datos:');
        console.warn(`   Clientes: ${cliSync?.length || 0}, Artículos: ${artSync?.length || 0}`);
      }
    } catch (error: any) {
      console.error('❌ [AppContext] Error crítico en sincronización:', error);
      console.error('   Stack:', error.stack);
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
    if (config.erpEnabled) {
      syncService.addToQueue('cliente', cliente);
      updatePendingFromQueue();
    }
  };

  const addGasto = async (gasto: Gasto) => {
    const vId = await resolveVendorId();
    if (!vId) {
      console.error('❌ [addGasto] No hay vendedor activo. No se puede guardar.');
      alert('Error: No hay sesión de vendedor activa');
      return;
    }

    const gastoConVendor = { ...gasto, vendedorId: vId };
    const storageKey = withVendorKey('gastos', vId);

    const allGastos = await storageService.getItem<Gasto[]>(storageKey) || [];
    const updatedAll = [gastoConVendor, ...allGastos];
    await storageService.setItem(storageKey, updatedAll);

    setGastos(prev => [gastoConVendor, ...prev]);

    if (config.erpEnabled) {
      syncService.addToQueue('gasto', gastoConVendor);
      updatePendingFromQueue();
    }
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

      const storageKey = withVendorKey('gastos', currentVendor?.id);
      storageService.setItem(storageKey, updated).catch(err => {
        console.error('❌ Error guardando gastos en storage:', err);
      });

      return updated;
    });

    // 2. Encolar la eliminación para que se procese en el ERP cuando haya red
    // Esto evita que el gasto "reviva" en la próxima sincronización
    try {
      syncService.addToQueue('gasto_delete', { id: gastoId });
      updatePendingFromQueue();
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



    const vId = await resolveVendorId();
    const notaConVendor = { ...nota, vendedorId: vId };
    const storageKey = withVendorKey('notasVenta', vId);

    const allNotas = await storageService.getItem<NotaVenta[]>(storageKey) || [];

    // 2. Actualizar o Agregar en Storage
    const existsIndexStorage = allNotas.findIndex(n => n.id === nota.id);
    let updatedAll;
    if (existsIndexStorage > -1) {
      updatedAll = [...allNotas];
      updatedAll[existsIndexStorage] = notaConVendor;
    } else {
      updatedAll = [notaConVendor, ...allNotas];
    }
    await storageService.setItem(storageKey, updatedAll);

    // 3. Actualizar Estado Local (Solo del vendor)
    setNotasVenta(prev => {
      const existsIndex = prev.findIndex(n => n.id === nota.id);
      if (existsIndex > -1) {
        const updated = [...prev];
        updated[existsIndex] = notaConVendor;
        return updated;
      } else {
        return [notaConVendor, ...prev];
      }
    });

    if (config.erpEnabled) {
      syncService.addOrReplaceInQueue('venta', notaConVendor, 'id');
      updatePendingFromQueue();
    }
  };

  const deleteNotaVenta = async (id: string) => {
    const notaId = String(id).trim();
    const vId = await resolveVendorId();
    const storageKey = withVendorKey('notasVenta', vId);

    setNotasVenta(prev => {
      const updated = prev.filter(n => String(n.id).trim() !== notaId);
      storageService.setItem(storageKey, updated);
      return updated;
    });

    // Si se requiere borrar también en ERP, aquí se podría encolar una operación específica.
    // De momento no existe tipo 'venta_delete' en la cola tipada, así que solo borramos localmente.
  };

  const updateNotaVenta = async (id: string, estado: 'pendiente' | 'cerrada' | 'anulada' | 'abierta') => {
    const vId = await resolveVendorId();
    const storageKey = withVendorKey('notasVenta', vId);

    setNotasVenta(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, estado } : n);
      storageService.setItem(storageKey, updated);
      return updated;
    });
  };

  const addCobro = async (cobro: Cobro) => {
    const vId = await resolveVendorId();
    const cobroConVendor = { ...cobro, vendedorId: vId };
    const storageKey = withVendorKey('cobros', vId);

    const allCobros = await storageService.getItem<Cobro[]>(storageKey) || [];
    await storageService.setItem(storageKey, [cobroConVendor, ...allCobros]);

    setCobros(prev => [cobroConVendor, ...prev]);

    if (config.erpEnabled) {
      syncService.addOrReplaceInQueue('pago', cobroConVendor, 'id');
      updatePendingFromQueue();
    }
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

      const storageKey = withVendorKey('cobros', currentVendor?.id);
      storageService.setItem(storageKey, cobrosActualizados).catch(err => {
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

      if (config.erpEnabled) {
        console.log('💸 Encolando pago para sync:', datosPago.id);
        syncService.addToQueue('pago', datosPago);
        updatePendingFromQueue();
      }
    }
  };

  const addDocumento = async (doc: Documento) => {
    const vId = await resolveVendorId();
    const storageKey = withVendorKey('documentos', vId);

    setDocumentos(prev => {
      const updated = [doc, ...prev];
      storageService.setItem(storageKey, updated);
      return updated;
    });
    // Encolar subida
    if (config.erpEnabled) {
      syncService.addToQueue('documento', doc);
      updatePendingFromQueue();
    }
  };

  const deleteDocumento = async (id: string) => {
    const docId = String(id).trim(); // Normalizar el ID
    const vId = await resolveVendorId();
    const storageKey = withVendorKey('documentos', vId);

    setDocumentos(prev => {
      const updated = prev.filter(d => String(d.id).trim() !== docId);
      storageService.setItem(storageKey, updated);
      return updated;
    });
    // Encolar borrado
    syncService.addToQueue('documento_delete', { id: docId });
    updatePendingFromQueue();
  };

  const updateArticulo = async (id: string, cantidad: number) => {
    setArticulos(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, cantidad } : a);
      storageService.setItem('articulos', updated);
      return updated;
    });
    if (config.erpEnabled) await syncService.updateArticuloStock(id, cantidad);
  };

  const addNotaAlmacen = async (nota: NotaAlmacen) => {
    const vId = await resolveVendorId();
    const storageKey = withVendorKey('notasAlmacen', vId);

    setNotasAlmacen(prev => {
      const updated = [nota, ...prev];
      storageService.setItem(storageKey, updated);
      return updated;
    });
  };

  const addVisita = async (visita: Visita) => {
    const vId = await resolveVendorId();
    const storageKey = withVendorKey('visitas', vId);

    setVisitas(prev => {
      const updated = [...prev, visita];
      storageService.setItem(storageKey, updated);
      return updated;
    });
    if (config.erpEnabled) {
      syncService.addToQueue('visita', visita);
      updatePendingFromQueue();
    }
  };

  const toggleVisita = async (id: string) => {
    const vId = await resolveVendorId();
    const storageKey = withVendorKey('visitas', vId);
    let nuevoEstado = false;
    setVisitas(prev => {
      const updated = prev.map(v => {
        if (v.id === id) {
          nuevoEstado = !v.completado;
          return { ...v, completado: !v.completado };
        }
        return v;
      });
      storageService.setItem(storageKey, updated);
      return updated;
    });

    if (config.erpEnabled) {
      syncService.addToQueue('visita_update', { id, completado: nuevoEstado });
      updatePendingFromQueue();
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

    login: async (vendorId: string) => {
      const vendor = await vendorService.iniciarSesion(vendorId);
      if (vendor) {
        setCurrentVendor(vendor);

        setUserSession({ isLoggedIn: true, username: vendor.nombre });
        setSessionId(vendor.sessionId);
        await syncService.setVendor(vendor.id);
        await loadLocalData(config.erpEnabled, vendor); // Recargar datos para este vendedor
        return true;
      }
      return false;
    },
    logout: async () => {
      console.log('🚪 Cerrando sesión...');
      await vendorService.cerrarSesion();
      await syncService.setVendor(null);
      setSessionId('');
      setCurrentVendor(null);
      setUserSession({ isLoggedIn: false });
      // Limpiar datos sensibles de la vista
      setGastos([]);
      setNotasVenta([]);
      setCobros([]);
    },
    currentVendor,
    setCurrentVendor,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp debe ser usado dentro de un AppProvider');
  return context;
};