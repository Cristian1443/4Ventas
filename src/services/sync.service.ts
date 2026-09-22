/**
 * Servicio de Sincronización Offline-First para React Native
 * Actualizado para soportar AGENDA
 * - Funciona offline con datos locales si el ERP no está disponible
 * - Sincronización automática cada hora
 * - Cola de sincronización para operaciones offline
 * - No bloquea la app si falla la conexión
 * - Sincronización bidireccional de cobros (bajada de deudas) y pagos (subida)
 * - Mezcla inteligente de clientes para preservar los creados offline
 */

import { storageService } from './storage.service';
import * as erpService from './erp.service';
import { vendorService } from './vendor.service';
import { equivalenciaPctFromIvaArticulo } from '../utils/fiscal.helpers';
import { campoContadorPorTipoNota, reservarNumeroRecibo } from './documentCounter.service';
import { setLiquidacionSesionCheckpointNow } from './liquidacion-sesion.service';

export interface SyncOperation {
  id: string;
  type: 'venta' | 'pago' | 'cliente' | 'gasto' | 'gasto_delete' | 'documento' | 'documento_delete' | 'visita' | 'visita_update' | 'nota_almacen';
  data: any;
  timestamp: number;
  retries: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'success' | 'error';
  vendorId?: string;
}

export interface SyncError {
  codigo: number;
  descripcion: string;
  timestamp: number;
  operation: SyncOperation;
}

export interface SyncAuditEntry {
  id: string;
  vendorId: string;
  operationId: string;
  type: SyncOperation['type'];
  status: 'success' | 'error' | 'dropped';
  timestamp: number;
  message: string;
}

export interface SyncStatus {
  clientes: 'idle' | 'syncing' | 'success' | 'error';
  articulos: 'idle' | 'syncing' | 'success' | 'error';
  ultimaSync: string | null;
  error: string | null;
  operacionesPendientes: number;
}

class SyncService {
  private queue: SyncOperation[] = [];
  private errors: SyncError[] = [];
  private isSyncing: boolean = false;
  private maxRetries: number = 3;
  private syncInterval: any = null;
  private currentVendorId: string | null = null;
  /** ID de almacén explícito (furgón) configurado en el vendedor */
  private currentAlmacenId: string | null = null;
  /** Código de agente (ej. "902"); si no hay almacén explícito, se usa como id_almacén si es numérico */
  private currentVendorCodigo: string | null = null;
  /** Código del vendedor propietario de la operación en curso dentro de processOperation (puede diferir del vendedor activo). */
  private activeOperationVendorCodigo: string | null = null;

  constructor() {
    this.loadQueue();
    this.loadErrors();
  }

  /**
   * Guarda la última fecha de sincronización para el vendedor actual.
   */
  async setLastSync(dateIso: string): Promise<void> {
    await storageService.setItem(this.vendorKey('ultimaSync'), dateIso);
  }

  /**
   * Obtiene la última fecha de sincronización para el vendedor actual.
   */
  async getLastSync(): Promise<string | null> {
    return (await storageService.getItem<string>(this.vendorKey('ultimaSync'))) || null;
  }

  async setVendor(vendorId: string | null, almacenId?: string | null, vendorCodigo?: string | null): Promise<void> {
    this.currentVendorId = vendorId || null;
    if (!vendorId) {
      this.currentAlmacenId = null;
      this.currentVendorCodigo = null;
      await this.loadQueue();
      await this.loadErrors();
      return;
    }

    let mergedAlmacen =
      almacenId != null && String(almacenId).trim() !== '' ? String(almacenId).trim() : null;
    let mergedCodigo =
      vendorCodigo != null && String(vendorCodigo).trim() !== '' ? String(vendorCodigo).trim() : null;

    try {
      const v = await vendorService.getVendedorById(vendorId);
      if (v) {
        if (mergedAlmacen == null && v.almacenId != null && String(v.almacenId).trim() !== '') {
          mergedAlmacen = String(v.almacenId).trim();
        }
        if (mergedCodigo == null && v.codigo != null && String(v.codigo).trim() !== '') {
          mergedCodigo = String(v.codigo).trim();
        }
      }
    } catch {
      // ignorar lectura storage
    }

    this.currentAlmacenId = mergedAlmacen;
    this.currentVendorCodigo = mergedCodigo;
    await this.loadQueue();
    await this.loadErrors();
  }

  /** Almacén con el que se consulta stock en ERP: configurado explícito o código numérico de agente (ej. 902 → almacén 902). */
  getEffectiveStockAlmacenId(): string | undefined {
    if (this.currentAlmacenId?.trim()) return this.currentAlmacenId.trim();
    const cod = this.currentVendorCodigo?.trim();
    if (cod && /^\d+$/.test(cod)) return cod;
    return undefined;
  }

  private vendorKey(base: string): string {
    return this.currentVendorId ? `${base}__${this.currentVendorId}` : base;
  }

  // ============================================================================
  // INICIALIZACIÓN
  // ============================================================================

  async initialize(): Promise<void> {
    console.log('🔄 Inicializando servicio de sincronización...');
    await this.loadQueue();
    await this.loadErrors();

    // Intentar sincronización inicial
    await this.syncAll();

    // Configurar sincronización automática cada hora
    this.startAutoSync();
  }

  startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sincronizar cada hora (3600000 ms)
    this.syncInterval = setInterval(() => {
      console.log('⏰ Sincronización automática programada');
      this.syncAll();
    }, 3600000);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // ============================================================================
  // SINCRONIZACIÓN COMPLETA
  // ============================================================================

  async syncAll(): Promise<SyncStatus> {
    console.log('🔄 Iniciando sincronización completa...');

    const status: SyncStatus = {
      clientes: 'syncing',
      articulos: 'syncing',
      ultimaSync: null,
      error: null,
      operacionesPendientes: this.getPendingCount()
    };

    try {
      // 1. Procesar cola (Subida) - Envuelta en try-catch para no bloquear bajada
      try {
        await this.processQueue();
      } catch (queueError) {
        console.error('⚠️ [syncAll] Error procesando cola de subida (continuando con bajada):', queueError);
      }

      // 2. Descargar datos (Nota: syncCobros se hace de forma manual)
      await Promise.all([
        this.syncClientes().catch((err) => {
          console.error('❌ [syncAll] Error en syncClientes:', err);
          status.clientes = 'error';
        }),
        this.syncArticulos().catch((err) => {
          console.error('❌ [syncAll] Error en syncArticulos:', err);
          status.articulos = 'error';
        }),
        this.syncGastos(),
        this.syncDocumentos(),
        this.syncNotasAlmacen(),
        this.syncAgenda() 
      ]);

      status.clientes = status.clientes === 'error' ? 'error' : 'success';
      status.articulos = status.articulos === 'error' ? 'error' : 'success';
      status.ultimaSync = new Date().toISOString();
      status.operacionesPendientes = this.getPendingCount();

      return status;
    } catch (error: any) {
      console.error('Error Sync:', error);
      status.error = error.message;
      return status;
    }
  }

  // ============================================================================
  // SINCRONIZACIÓN DE CLIENTES
  // ============================================================================

  // ============================================================================
  // SINCRONIZACIÓN DE CLIENTES (Bajada Inteligente)
  // ============================================================================

  async syncClientes(): Promise<any[]> {
    try {
      console.log('👥 [syncClientes] Iniciando sync de clientes...');

      // Descargar clientes y catálogo de localidades en paralelo.
      // El ERP Verial guarda la localidad como ID_Localidad (número), por lo que
      // necesitamos la tabla de localidades para resolver el nombre textual.
      const [clientesERP, localidadesERP] = await Promise.all([
        erpService.getClientes(),
        erpService.getLocalidades().catch(() => [] as any[])
      ]);

      console.log(`📥 [syncClientes] Clientes recibidos: ${clientesERP.length}, Localidades: ${localidadesERP.length}`);

      // Construir mapa ID_Localidad → NombreLocalidad para resolución rápida
      const localidadesMap = new Map<number, string>();
      for (const loc of localidadesERP) {
        const id = Number(loc.Id ?? loc.ID_Localidad ?? loc.id ?? 0);
        const nombre = String(loc.Nombre ?? loc.NombreLocalidad ?? loc.Descripcion ?? '').trim();
        if (id && nombre) localidadesMap.set(id, nombre);
      }

      if (localidadesMap.size > 0) {
        console.log(`🗺️ [syncClientes] ${localidadesMap.size} localidades en catálogo`);
      }

      if (clientesERP.length === 0) {
        console.warn('⚠️ [syncClientes] No se recibieron clientes del ERP, usando locales.');
        const clientesLocales = (await storageService.getItem<any[]>('clientes')) || [];
        if (clientesLocales.length > 0) return clientesLocales;
      }

      const clientesServer = clientesERP.map((cliente: any) => {
        try {
          const mapped = erpService.mapearClienteERPaLocal(cliente);

          // Si el adaptador no encontró la localidad como texto, resolverla
          // desde el catálogo usando ID_Localidad que devuelve el ERP.
          if (!mapped.localidad && localidadesMap.size > 0) {
            const idLoc = Number(
              cliente.ID_Localidad ?? cliente.id_localidad ??
              cliente.IDLocalidad ?? cliente.IdLocalidad ?? 0
            );
            if (idLoc && localidadesMap.has(idLoc)) {
              mapped.localidad = localidadesMap.get(idLoc) || '';
            }
          }

          return mapped;
        } catch (error: any) {
          return null;
        }
      }).filter((c: any) => c !== null);

      console.log(`📊 [syncClientes] Clientes mapeados: ${clientesServer.length}`);

      const clientesLocales = (await storageService.getItem<any[]>('clientes')) || [];
      const clientesNuevosOffline = clientesLocales.filter(c => c.id && isNaN(Number(c.id)));
      const listaFinal = [...clientesServer, ...clientesNuevosOffline];

      await storageService.setItem('clientes', listaFinal);

      const conRE = listaFinal.filter((c: any) => c.recargoEquivalencia === true).length;
      const sinRE = listaFinal.filter((c: any) => c.recargoEquivalencia === false).length;
      const sinDato = listaFinal.filter((c: any) => c.recargoEquivalencia === undefined).length;
      console.log(`✅ [syncClientes] ${listaFinal.length} clientes guardados`);
      console.log(`📊 [syncClientes] Régimen fiscal: ${conRE} con R.E. · ${sinRE} sin R.E. · ${sinDato} sin dato fiscal`);

      if (sinDato > 0) {
        console.warn(`⚠️ [syncClientes] ${sinDato} clientes sin campo RegFiscal en respuesta ERP. Verificar campo en API.`);
      }

      return listaFinal;
    } catch (error: any) {
      console.error('❌ [syncClientes] Error:', error.message);
      return (await storageService.getItem<any[]>('clientes')) || [];
    }
  }

  async getClientesLocal(): Promise<any[]> {
    return (await storageService.getItem<any[]>('clientes')) || [];
  }

  // ============================================================================
  // SINCRONIZACIÓN DE ARTÍCULOS
  // ============================================================================

  async syncArticulos(): Promise<any[]> {
    try {
      const almacenStock = this.getEffectiveStockAlmacenId();
      if (almacenStock) {
        const origen =
          this.currentAlmacenId?.trim()
            ? 'almacén configurado en el vendedor'
            : 'código de agente numérico (mismo número que id de almacén furgón)';
        console.log(`📦 [syncArticulos] Stock por almacén ${almacenStock} (${origen})`);
      } else {
        console.warn(
          '⚠️ [syncArticulos] Sin almacén ni código numérico de agente: se usa stock general del artículo. Configura «Almacén» en el vendedor o un código de agente solo numérico (902, 903…).'
        );
      }

      // Descargar artículos, catálogo de categorías en paralelo
      const [articulosERP, categoriasERP] = await Promise.all([
        erpService.getArticulos(undefined, undefined, almacenStock),
        erpService.getCategorias().catch(() => [] as any[])
      ]);

      console.log(`📥 [syncArticulos] Artículos: ${articulosERP.length} · Categorías: ${categoriasERP.length}`);

      // Mapa ID_Categoria → NombreCategoria para resolver nombres
      const categoriasMap = new Map<number, string>();
      for (const cat of categoriasERP) {
        const id = Number(cat.Id ?? cat.ID_Categoria ?? cat.id ?? 0);
        const nombre = String(cat.Nombre ?? cat.NombreCategoria ?? cat.Descripcion ?? '').trim();
        if (id && nombre) categoriasMap.set(id, nombre);
      }
      if (categoriasMap.size > 0) {
        console.log(`🗂️ [syncArticulos] ${categoriasMap.size} categorías en catálogo`);
      }

      if (articulosERP.length === 0) {
        console.warn('⚠️ [syncArticulos] No se recibieron artículos del ERP, usando locales.');
        const articulosLocales = (await storageService.getItem<any[]>('articulos')) || [];
        if (articulosLocales.length > 0) return articulosLocales;
      }

      const articulosMapeados = articulosERP.map((art: any) => {
        const mapped = erpService.mapearArticuloERPaLocal(art);
        // Si la categoría mapeada es un número o genérica, resolver del catálogo
        const idCat = Number(art.ID_Categoria ?? art.id_categoria ?? 0);
        if (idCat && categoriasMap.has(idCat)) {
          (mapped as any).categoria = categoriasMap.get(idCat)!;
          (mapped as any).categoriaId = String(idCat);
        }
        return mapped;
      });

      console.log(`📊 [syncArticulos] Artículos mapeados: ${articulosMapeados.length}`);

      await storageService.setItem('articulos', articulosMapeados);
      console.log(`✅ [syncArticulos] ${articulosMapeados.length} artículos guardados`);

      return articulosMapeados;
    } catch (error: any) {
      console.error('❌ [syncArticulos] Error:', error.message);
      return (await storageService.getItem<any[]>('articulos')) || [];
    }
  }

  async getArticulosLocal(): Promise<any[]> {
    return (await storageService.getItem<any[]>('articulos')) || [];
  }

  async updateArticuloStock(id: string, cantidad: number): Promise<void> {
    const articulos = await this.getArticulosLocal();
    const index = articulos.findIndex(a => a.id === id);

    if (index !== -1) {
      articulos[index].cantidad = cantidad;
      await storageService.setItem('articulos', articulos);
    }
  }

  // ============================================================================
  // SINCRONIZACIÓN DE GASTOS
  // ============================================================================

  async syncGastos(): Promise<any[]> {
    try {
      // No hay endpoint GetGastosWS en el ERP, mantenemos solo datos locales
      const gastosLocales = (await storageService.getItem<any[]>(this.vendorKey('gastos'))) || [];

      // Filtrar borrados pendientes
      const pendingDeletes = this.queue
        .filter(op => op.type === 'gasto_delete')
        .map(op => op.data.id);

      const gastosFiltrados = gastosLocales.filter(g => !pendingDeletes.includes(g.id));

      // Guardar lista filtrada
      await storageService.setItem(this.vendorKey('gastos'), gastosFiltrados);

      console.log(`✅ Gastos locales mantenidos: ${gastosFiltrados.length} gastos`);
      return gastosFiltrados;
    } catch (error) {
      console.warn('⚠️ Error sync gastos, manteniendo locales');
      return (await storageService.getItem<any[]>('gastos')) || [];
    }
  }

  async getGastosLocal(): Promise<any[]> {
    return (await storageService.getItem<any[]>(this.vendorKey('gastos'))) || [];
  }

  // ============================================================================
  // SINCRONIZACIÓN DE DOCUMENTOS (Bajada Inteligente)
  // ============================================================================

  async syncDocumentos(): Promise<any[]> {
    try {
      // No hay endpoint GetDocumentosWS en el ERP, mantenemos solo datos locales
      const docsLocales = (await storageService.getItem<any[]>(this.vendorKey('documentos'))) || [];

      // Filtrar borrados pendientes
      const pendingDeletes = this.queue
        .filter(op => op.type === 'documento_delete')
        .map(op => op.data.id);

      const docsFiltrados = docsLocales.filter(d => !pendingDeletes.includes(d.id));

      await storageService.setItem(this.vendorKey('documentos'), docsFiltrados);
      console.log(`✅ Documentos locales mantenidos: ${docsFiltrados.length} documentos`);
      return docsFiltrados;
    } catch (error) {
      console.warn('⚠️ Error sync documentos, manteniendo locales');
      return (await storageService.getItem<any[]>('documentos')) || [];
    }
  }

  async getDocumentosLocal(): Promise<any[]> {
    return (await storageService.getItem<any[]>(this.vendorKey('documentos'))) || [];
  }

  // ============================================================================
  // SINCRONIZACIÓN DE COBROS (Bajada de Deudas)
  // ============================================================================

  async syncCobros(): Promise<any[]> {
    try {
      console.log('💰 Descargando cobros pendientes del ERP...');
      const cobrosERP = await erpService.getCobrosPendientes();
      const cobrosServer = cobrosERP.map(erpService.mapearCobroERPaLocal);

      // Obtener locales
      const cobrosLocales = (await storageService.getItem<any[]>(this.vendorKey('cobros'))) || [];

      // ESTRATEGIA DE MEZCLA:
      // 1. Mantenemos los cobros que hemos marcado como "pagados" localmente pero que aún no se han sincronizado
      //    (para que no reaparezcan como pendientes si la cola de subida falla o no ha corrido aún).
      // 2. Mantenemos los cobros nuevos creados localmente (ventas offline).

      // IDs de cobros que están en la cola de subida como 'pago'
      const pagosEnColaIds = this.queue
        .filter(op => op.type === 'pago')
        .map(op => op.data.id || op.data.cobroId || op.data.notaVentaId); // Ajustar según estructura de data

      // Filtramos los del servidor: Si un cobro del servidor está en nuestra cola de pagos pendientes, NO lo mostramos como pendiente (ya lo pagamos localmente)
      const cobrosServerFiltrados = cobrosServer.filter(c => !pagosEnColaIds.includes(c.id));

      // Filtramos los locales: Mantenemos los que son locales nuevos (ID temporal 'C...') O los que ya están pagados (histórico local del día)
      // Filtramos los locales: Mantenemos los que son locales nuevos (ID no numérico) O los que ya están pagados
      const cobrosLocalesMantener = cobrosLocales.filter(c =>
        (c.id && isNaN(Number(c.id))) || c.estado === 'pagado'
      );

      // Combinar: Servidor (Pendientes reales) + Locales (Nuevos o Histórico Pagado)
      // Usamos un Map para evitar duplicados por ID
      const cobrosMap = new Map();
      [...cobrosLocalesMantener, ...cobrosServerFiltrados].forEach(c => cobrosMap.set(c.id, c));

      const listaFinal = Array.from(cobrosMap.values());

      await storageService.setItem(this.vendorKey('cobros'), listaFinal);
      console.log(`✅ Cobros sincronizados: ${listaFinal.length}`);
      return listaFinal;
    } catch (error: any) {
      console.warn('⚠️ Error sync cobros:', error?.message || error);
      // Si es un error de red (servidor apagado), relanzar para que la UI muestre error
      if (error?.isNetworkError || error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED' || error?.code === 'ECONNREFUSED') {
        throw error;
      }
      return (await storageService.getItem<any[]>(this.vendorKey('cobros'))) || [];
    }
  }

  async getCobrosLocal(): Promise<any[]> {
    return (await storageService.getItem<any[]>(this.vendorKey('cobros'))) || [];
  }

  // ============================================================================
  // SINCRONIZACIÓN DE NOTAS ALMACÉN
  // ============================================================================

  async syncNotasAlmacen(): Promise<any[]> {
    try {
      // No hay endpoint GetNotasAlmacenWS en el ERP, mantenemos solo datos locales
      const notasLocales = (await storageService.getItem<any[]>(this.vendorKey('notasAlmacen'))) || [];

      await storageService.setItem(this.vendorKey('notasAlmacen'), notasLocales);

      console.log(`✅ Notas almacén locales mantenidas: ${notasLocales.length} notas`);
      return notasLocales;
    } catch (error) {
      console.warn('⚠️ Error sync notas almacén, manteniendo locales');
      return (await storageService.getItem<any[]>('notasAlmacen')) || [];
    }
  }

  async getNotasAlmacenLocal(): Promise<any[]> {
    return (await storageService.getItem<any[]>(this.vendorKey('notasAlmacen'))) || [];
  }

  // ============================================================================
  // SINCRONIZACIÓN DE AGENDA
  // ============================================================================

  async syncAgenda(): Promise<any[]> {
    try {
      // No hay endpoint GetAgendaWS en el ERP, mantenemos solo datos locales
      const agendaLocal = (await storageService.getItem<any[]>(this.vendorKey('visitas'))) || [];

      // Filtrar actualizaciones pendientes de la cola
      const pendientesUpdate = this.queue
        .filter(op => op.type === 'visita_update')
        .map(op => op.data.id);

      // Aplicar actualizaciones pendientes a las visitas locales
      const agendaActualizada = agendaLocal.map(v => {
        const updatePendiente = this.queue.find(
          op => op.type === 'visita_update' && op.data.id === v.id
        );
        if (updatePendiente) {
          return { ...v, completado: updatePendiente.data.completado };
        }
        return v;
      });

      await storageService.setItem(this.vendorKey('visitas'), agendaActualizada);
      console.log(`✅ Agenda local mantenida: ${agendaActualizada.length} visitas`);
      return agendaActualizada;

    } catch (error) {
      console.warn('⚠️ Error sync agenda, manteniendo locales');
      return (await storageService.getItem<any[]>('visitas')) || [];
    }
  }

  async getAgendaLocal(): Promise<any[]> {
    return (await storageService.getItem<any[]>(this.vendorKey('visitas'))) || [];
  }

  // ============================================================================
  // COLA DE OPERACIONES
  // ============================================================================

  addToQueue(type: SyncOperation['type'], data: any): string {
    const operation: SyncOperation = {
      id: this.generateId(),
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
      vendorId: this.currentVendorId || undefined
    };

    this.queue.push(operation);
    this.saveQueue();

    console.log(`📝 Operación agregada a la cola: ${type} (${operation.id})`);

    return operation.id;
  }

  /**
   * Agrega o reemplaza en la cola una operación del mismo tipo y con la misma clave (por defecto, data.id).
   * Evita duplicar pendientes cuando se actualiza una venta/cobro existente.
   */
  addOrReplaceInQueue(type: SyncOperation['type'], data: any, keyField: string = 'id'): string {
    const keyVal = data?.[keyField];
    if (!keyVal) {
      return this.addToQueue(type, data);
    }

    // Eliminar pendientes del mismo tipo y misma clave
    this.queue = this.queue.filter(
      op => !(op.status === 'pending' && op.type === type && op.data?.[keyField] === keyVal)
    );

    return this.addToQueue(type, data);
  }

  async processQueue(forceRetry: boolean = false): Promise<void> {
    if (this.isSyncing) {
      console.log('⏳ Sincronización ya en progreso');
      return;
    }

    const pendingOps = this.queue.filter(
      op => op.status === 'pending' || op.status === 'error'
    );

    if (pendingOps.length === 0) {
      console.log('✓ No hay operaciones pendientes en la cola');
      return;
    }

    console.log(`🔄 Procesando ${pendingOps.length} operaciones pendientes... (Force: ${forceRetry})`);

    this.isSyncing = true;

    try {
      for (const operation of pendingOps) {
        if (forceRetry) {
          operation.retries = 0;
          operation.status = 'pending';
        }

        if (operation.retries >= this.maxRetries && !forceRetry) {
          console.error(`❌ Operación ${operation.id} excedió reintentos máximos`);
          operation.status = 'error';
          continue;
        }

        await this.processOperation(operation);
      }
      await this.checkAndAdvanceLiquidacionSesion(pendingOps);
    } finally {
      this.isSyncing = false;
      await this.saveQueue();
    }
  }

  /**
   * Ata el corte de "liquidación por sesión" a la sincronización real con el ERP: si el vendedor
   * activo tenía operaciones pendientes y ya no le queda ninguna pendiente/en error tras este
   * ciclo, fija el checkpoint automáticamente (sin depender de que el usuario pulse un botón).
   */
  private async checkAndAdvanceLiquidacionSesion(procesadas: SyncOperation[]): Promise<void> {
    const vendorId = this.currentVendorId;
    if (!vendorId) return;
    const teniaPendientesDeEsteVendedor = procesadas.some(op => (op.vendorId || vendorId) === vendorId);
    if (!teniaPendientesDeEsteVendedor) return;

    const siguenPendientes = this.queue.some(
      op => (op.status === 'pending' || op.status === 'error') && (op.vendorId || vendorId) === vendorId
    );
    if (!siguenPendientes) {
      await setLiquidacionSesionCheckpointNow(vendorId);
    }
  }

  /**
   * Devuelve conteos de pendientes por tipo.
   */
  getPendingCountsByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.queue
      .filter(op => op.status === 'pending')
      .forEach(op => {
        counts[op.type] = (counts[op.type] || 0) + 1;
      });
    return counts;
  }

  /**
   * Procesa únicamente las operaciones de los tipos indicados.
   * Útil para subir solo ventas o solo gastos desde la UI.
   */
  async processQueueByTypes(types: SyncOperation['type'][]): Promise<void> {
    if (this.isSyncing) {
      console.log('⏳ Sincronización ya en progreso');
      return;
    }

    const pendingOps = this.queue.filter(
      op => op.status === 'pending' && types.includes(op.type)
    );

    if (pendingOps.length === 0) {
      console.log('✓ No hay operaciones pendientes de los tipos solicitados');
      return;
    }

    console.log(`🔄 Procesando ${pendingOps.length} operaciones filtradas...`);

    this.isSyncing = true;

    try {
      for (const operation of pendingOps) {
        if (operation.retries >= this.maxRetries) {
          console.error(`❌ Operación ${operation.id} excedió reintentos máximos`);
          operation.status = 'error';
          continue;
        }

        await this.processOperation(operation);
      }
      await this.checkAndAdvanceLiquidacionSesion(pendingOps);
    } finally {
      this.isSyncing = false;
      await this.saveQueue();
    }
  }

  private async processOperation(operation: SyncOperation): Promise<void> {
    operation.status = 'syncing';
    operation.retries++;
    const vendorId = operation.vendorId || this.currentVendorId || 'global';

    // Cada operación debe sincronizarse con la sesión ERP del vendedor que la generó,
    // no con la que esté activa en el momento de procesar la cola (evita mezclar
    // documentos entre vendedores si hubo un cambio de sesión con operaciones pendientes).
    const previousSessionId = erpService.getSessionId();
    const previousOperationVendorCodigo = this.activeOperationVendorCodigo;
    if (operation.vendorId) {
      const ownerVendor = await vendorService.getVendedorById(operation.vendorId);
      if (ownerVendor?.sessionId) {
        erpService.setSessionId(ownerVendor.sessionId);
      }
      this.activeOperationVendorCodigo = ownerVendor?.codigo || null;
    }

    try {
      let result: any;

      switch (operation.type) {
        case 'venta':
          result = await this.syncVenta(operation.data);
          break;
        case 'pago':
          result = await this.syncPago(operation.data);
          break;
        case 'cliente':
          result = await this.syncCliente(operation.data);
          break;
        case 'gasto':
          result = await this.syncGasto(operation.data);
          break;
        case 'gasto_delete':
          result = await this.syncGastoDelete(operation.data);
          break;
        case 'documento':
          result = await this.syncDocumento(operation.data);
          break;
        case 'documento_delete':
          result = await this.syncDocumentoDelete(operation.data);
          break;
        case 'visita':
          result = await this.syncNuevaVisita(operation.data);
          break;
        case 'visita_update':
          result = await this.syncVisitaUpdate(operation.data);
          break;
        case 'nota_almacen':
          result = await this.syncNotaAlmacen(operation.data);
          break;
        default:
          throw new Error(`Tipo de operación desconocido: ${operation.type}`);
      }

      if (result.success) {
        operation.status = 'success';
        this.removeFromQueue(operation.id);
        console.log(`✅ Operación ${operation.id} sincronizada correctamente`);
        await this.appendAudit({
          id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          vendorId,
          operationId: operation.id,
          type: operation.type,
          status: 'success',
          timestamp: Date.now(),
          message: 'Sincronizada correctamente'
        });
      } else {
        // Si la respuesta es 404, asumimos que el recurso no existe en ERP y limpiamos la cola
        if (this.shouldDropOperation(result.error)) {
          console.warn(`⚠️ Operación ${operation.id} descartada por 404/No encontrado`);
          this.removeFromQueue(operation.id);
          await this.appendAudit({
            id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            vendorId,
            operationId: operation.id,
            type: operation.type,
            status: 'dropped',
            timestamp: Date.now(),
            message: result?.error?.descripcion || 'Descartada por recurso no encontrado'
          });
        } else {
          this.handleSyncError(operation, result.error);
          await this.appendAudit({
            id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            vendorId,
            operationId: operation.id,
            type: operation.type,
            status: 'error',
            timestamp: Date.now(),
            message: result?.error?.descripcion || 'Error desconocido'
          });
        }
      }
    } catch (error: any) {
      // Si el error es 404, limpiar de la cola para no bloquear
      const errObj = {
        codigo: error?.codigo || -1,
        descripcion: error?.message || 'Error de conexión'
      };

      if (this.shouldDropOperation(errObj)) {
        console.warn(`⚠️ Operación ${operation.id} descartada por 404/No encontrado (catch)`);
        this.removeFromQueue(operation.id);
        await this.appendAudit({
          id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          vendorId,
          operationId: operation.id,
          type: operation.type,
          status: 'dropped',
          timestamp: Date.now(),
          message: errObj.descripcion || 'Descartada por recurso no encontrado'
        });
      } else {
        this.handleSyncError(operation, {
          codigo: errObj.codigo,
          descripcion: errObj.descripcion
        });
        await this.appendAudit({
          id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          vendorId,
          operationId: operation.id,
          type: operation.type,
          status: 'error',
          timestamp: Date.now(),
          message: errObj.descripcion || 'Error de conexión'
        });
      }
    } finally {
      // Restaurar la sesión del vendedor activo para que llamadas en foreground
      // (fuera de la cola) no queden usando la sesión del propietario de esta operación.
      if (operation.vendorId && erpService.getSessionId() !== previousSessionId) {
        erpService.setSessionId(previousSessionId);
      }
      this.activeOperationVendorCodigo = previousOperationVendorCodigo;
    }
  }

  private shouldDropOperation(error: any): boolean {
    if (!error) return false;
    const code = error.codigo || error.status || error.statusCode;
    const desc = (error.descripcion || error.message || '').toString().toLowerCase();
    return code === 404 || desc.includes('404') || desc.includes('not found');
  }

  private async appendAudit(entry: SyncAuditEntry): Promise<void> {
    try {
      const key = `syncAudit__${entry.vendorId}`;
      const current = (await storageService.getItem<SyncAuditEntry[]>(key)) || [];
      const next = [entry, ...current].slice(0, 200);
      await storageService.setItem(key, next);
    } catch (e) {
      console.warn('⚠️ [syncAudit] No se pudo guardar auditoría:', e);
    }
  }

  // ============================================================================
  // SINCRONIZACIÓN DE OPERACIONES ESPECÍFICAS
  // ============================================================================

  private async syncVenta(ventaData: any): Promise<any> {
    try {
      const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
      const clienteId = this.parseClienteId(
        ventaData.clienteId ??
        ventaData.ID_Cliente ??
        ventaData.cliente?.id
      );

      if (!clienteId || clienteId <= 0) {
        return {
          success: false,
          error: {
            codigo: -1,
            descripcion: 'La nota no tiene cliente ERP válido (clienteId).'
          }
        };
      }

      const lineasOrigen = Array.isArray(ventaData.items)
        ? ventaData.items
        : (Array.isArray(ventaData.articulos) ? ventaData.articulos : []);

      // Descuento global (si aplica) se distribuye proporcionalmente en cada línea
      const globalDiscountPct = ventaData.aplicarDescGlobal
        ? round2(parseFloat(String(ventaData.descGlobal || '0').replace(',', '.')) || 0)
        : 0;

      // ¿El cliente tiene Recargo de Equivalencia?
      const aplicaRE = !!(ventaData.recargoEquivalencia ||
        (ventaData.totalesNumericos?.re && ventaData.totalesNumericos.re > 0));

      // Adicional/Presupuesto no llevan impuestos por defecto (a falta de un selector por
      // documento, Verial pidió dejarlos como "no aplicables" en estos dos tipos).
      const tipoNotaPrevia = ventaData.tipoNota || '';
      const sinImpuestosPorTipo = tipoNotaPrevia === 'Serie X' || tipoNotaPrevia === 'Adicional' || tipoNotaPrevia === 'Presupuesto';

      const contenido = lineasOrigen.map((art: any) => {
        const precioUnitario = round2(parseFloat(art.precioUnitario) || 0);
        const cantidad = round2(parseFloat(art.cantidad) || 0);
        const dtoLinea = round2(parseFloat(art.descuento) || 0);

        // Dto combinado: (1-(1-dtoLinea/100)*(1-globalDisc/100))*100
        const dtoCombinado = globalDiscountPct > 0
          ? round2(100 - (100 - dtoLinea) * (100 - globalDiscountPct) / 100)
          : dtoLinea;

        // ImporteLinea debe reflejar el precio neto ya descontado
        const importeLinea = round2(precioUnitario * cantidad * (1 - dtoCombinado / 100));

        const pctIva = round2(parseFloat(String(art.porcentajeIva ?? art.iva ?? 10).replace(',', '.')) || 10);
        const porcentajeIVAEF = sinImpuestosPorTipo ? 0 : (pctIva > 0 ? pctIva : 10);
        const porcentajeRELinea =
          (aplicaRE && !sinImpuestosPorTipo) ? equivalenciaPctFromIvaArticulo(porcentajeIVAEF) : 0;

        return {
          TipoRegistro: 1,
          ID_Articulo: this.parseArticuloId(art.articuloId ?? art.id),
          Precio: precioUnitario,
          Dto: dtoCombinado,
          DtoPPago: 0,
          DtoEurosXUd: 0,
          DtoEuros: 0,
          Uds: cantidad,
          UdsRegalo: 0,
          UdsAuxiliares: 0,
          ImporteLinea: importeLinea,
          PorcentajeIVA: porcentajeIVAEF,
          PorcentajeRE: porcentajeRELinea,
          Lote: null,
          Caducidad: null,
          ID_Partida: 0,
          DescripcionAmplia: art.nota || null,
          Comentario: art.nota || null
        };
      });

      // En ERP validan importes con 2 decimales. Si llega 0.022 esperan 0.02.
      // Priorizamos los totales ya calculados en UI, pero redondeados estrictamente.
      const baseFromUi = this.parseMonto(
        ventaData.totales?.base ??
        ventaData.totalesNumericos?.base ??
        ventaData.totales?.subtotal ??
        ventaData.totalesNumericos?.subtotal
      );
      const totalFromUi = this.parseMonto(
        ventaData.totales?.total ??
        ventaData.totalesNumericos?.total ??
        ventaData.totales?.base ??
        ventaData.totalesNumericos?.base
      );
      const lineasSum = round2(contenido.reduce((sum: number, l: any) => sum + (Number(l.ImporteLinea) || 0), 0));
      const baseDocumento = round2(baseFromUi > 0 ? baseFromUi : lineasSum);
      // Verial valida el total del documento contra el total de líneas desglosado.
      // Estando los precios sin impuestos (PreciosImpIncluidos: false), 
      // TotalImporte debe incluir el IVA, por lo que recogemos el total de la app directamente.
      // Si el tipo no lleva impuestos (Adicional/Presupuesto), el total no puede llevar IVA
      // aunque la UI lo hubiera calculado, o Verial rechaza el documento por descuadre con las líneas.
      const totalDocumento = sinImpuestosPorTipo ? baseDocumento : round2(totalFromUi > 0 ? totalFromUi : baseDocumento);

      // Determinar ID_Agente a partir del vendedor asociado a la nota
      let idAgente = 0;
      if (ventaData.vendedorId) {
        const vendorObj = await vendorService.getVendedorById(ventaData.vendedorId);
        if (vendorObj && vendorObj.codigo) {
           idAgente = parseInt(vendorObj.codigo, 10);
        }
      }

      /** Serie fiscal Verial típica: P02 = albarán agente 902 · X02 = adicional agente 902 */
      const serieConCodigoAgente = (serieBase: string): string => {
        if (!serieBase) return '';
        if (!Number.isFinite(idAgente) || idAgente <= 0) return serieBase;
        const suf = String(Math.abs(Math.trunc(idAgente)) % 100).padStart(2, '0');
        return `${serieBase}${suf}`;
      };

      // Mapeo de tipo de documento al código correcto del ERP Verial (confirmado por Verial):
      // 1=Factura  3=Albarán de venta  4=Factura simplificada  5=Pedido  6=Presupuesto
      // (2 es un documento interno de Verial, no se usa desde la app)
      const tipoNota = ventaData.tipoNota || '';
      let tipoDocERP = 3; // Albarán por defecto
      let serieDoc = serieConCodigoAgente('P');

      if (tipoNota === 'Serie P' || tipoNota === 'Albarán') {
        tipoDocERP = 3;
        serieDoc = serieConCodigoAgente('P');
      } else if (tipoNota === 'Serie X' || tipoNota === 'Adicional') {
        // A efectos de Verial, "Adicional" es un Presupuesto (mismo tratamiento que "Presupuesto").
        tipoDocERP = 6; serieDoc = '';
      } else if (tipoNota === 'Pedido') {
        tipoDocERP = 5; serieDoc = '';
      } else if (tipoNota === 'Presupuesto') {
        tipoDocERP = 6; serieDoc = '';
      }

      // Número documento: correlativo reservado al crear la nota (tablet) o lectura legacy del contador
      const correlativoNota = Number((ventaData as any).numeroCorrelativo);
      const tieneCorrelativoReservado =
        Number.isFinite(correlativoNota) && correlativoNota > 0;

      let numeroDoc = 0;
      if (tieneCorrelativoReservado) {
        numeroDoc = correlativoNota;
      } else {
        try {
          const tabletCfg = await storageService.getItem<any>('tabletConfig');
          if (tabletCfg) {
            // El contador local se elige por tipoNota (no por el código Tipo del ERP,
            // que ya no coincide 1:1 con la serie local desde el fix de mapeo Verial).
            const campoContador = campoContadorPorTipoNota(tipoNota);
            numeroDoc = Number(tabletCfg[campoContador]) || 0;
          }
        } catch (_e) { /* usa 0 si no hay config */ }
      }

      const comentarioHumano =
        typeof ventaData.observaciones === 'string'
          ? String(ventaData.observaciones).trim().slice(0, 240)
          : '';

      // Verial bloquea el acceso a los albaranes ya facturados, así que el control de qué
      // está cobrado se lleva con los mismos campos auxiliares que usaban en el Verial viejo:
      // Aux1=Agente de Venta, Aux2=Cobrado (SI/NO), Aux3=Fecha de Cobro. Contado se marca
      // cobrado desde ya con la fecha de creación; Crédito queda NO hasta que se cobre luego.
      const estaPagadaAlContado = this.ventaEstaPagadaAlContado(ventaData);
      const fechaDocumento = ventaData.fecha || new Date().toISOString().split('T')[0];

      const documento: any = {
        Id: 0,
        Tipo: tipoDocERP,
        Serie: serieDoc || undefined,
        ID_Agente: idAgente || 0,
        Numero: numeroDoc,
        Referencia: ventaData.id || '',
        Fecha: fechaDocumento,
        ID_Cliente: clienteId,
        PreciosImpIncluidos: false,
        BaseImponible: baseDocumento,
        TotalImporte: totalDocumento,
        // No usar tipoNota (ej. «Serie P») como comentario: en Verial acaba como texto en observaciones sin fijar la serie fiscal.
        Comentario: comentarioHumano,
        Contenido: contenido,
        Pagos: this.buildPagos(ventaData),
        Aux1: String(idAgente || ''),
        Aux2: estaPagadaAlContado ? 'SI' : 'NO',
        Aux3: estaPagadaAlContado ? fechaDocumento : ''
      };

      // Eliminar Serie si está vacío para no confundir al ERP
      if (!serieDoc) delete documento.Serie;

      console.log(
        `📤 [syncVenta] ERP Tipo=${tipoDocERP} Serie=${documento.Serie ?? '—'} Numero=${documento.Numero} AgenteERP=${idAgente} Referencia=${documento.Referencia}`
      );

      const response = await erpService.crearDocumentoVenta(documento);

      // Éxito si:
      // 1. InfoError.Codigo === 0 (respuesta explícita de éxito del ERP)
      // 2. InfoError no está presente pero el documento tiene Id válido (ERP devuelve solo el doc)
      // 3. InfoError no está presente y no hay campo Error (respuesta vacía de éxito)
      const infoError = response?.InfoError;
      const docId = response?.Id ?? response?.id ?? response?.ID_DocCli ?? 0;
      const esExito =
        (infoError && infoError.Codigo === 0) ||
        (!infoError && Number(docId) > 0) ||
        (!infoError && !response?.Error && response !== null && response !== undefined);

      console.log(`📤 [syncVenta] Respuesta ERP: InfoError=${JSON.stringify(infoError)} Id=${docId} → éxito=${esExito}`);

      if (esExito) {
        // Solo avanzar contador en sync si no venía ya reservado al crear la nota local
        try {
          const tabletCfg = await storageService.getItem<any>('tabletConfig');
          if (tabletCfg && numeroDoc > 0 && !tieneCorrelativoReservado) {
            const campoContador = campoContadorPorTipoNota(tipoNota);
            tabletCfg[campoContador] = numeroDoc + 1;
            await storageService.setItem('tabletConfig', tabletCfg);
          }
        } catch (_e) { /* no bloquear si falla el contador */ }
        return { success: true, data: response };
      } else {
        const codigoError = infoError?.Codigo ?? response?.Error?.Codigo ?? -1;
        const descripError = infoError?.Descripcion ?? response?.Error?.Descripcion ?? response?.Mensaje ?? 'Error desconocido del ERP';
        console.error(`❌ [syncVenta] Error ERP: [${codigoError}] ${descripError}`);
        return {
          success: false,
          error: { codigo: codigoError, descripcion: descripError }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          codigo: -1,
          descripcion: error.message || 'Error de conexión'
        }
      };
    }
  }

  private async syncPago(pagoData: any): Promise<any> {
    try {
      // Convertir monto a número limpio
      const importe = parseFloat(pagoData.monto.replace(/[€\s]/g, '').replace(',', '.'));

      const pagoERP = {
        ID_DocCli: this.parseDocumentoId(pagoData.notaVentaId || pagoData.idDocCli || 0),
        ID_Cliente: this.parseClienteId(pagoData.clienteId || pagoData.idCliente || 0),
        ID_MetodoPago: this.getMetodoPagoId(pagoData.formaPago),
        Fecha: pagoData.fechaIso || new Date().toISOString(),
        Importe: isNaN(importe) ? 0 : importe,
        Referencia: pagoData.id || pagoData.referencia || ''
      };

      const response = await erpService.registrarPago(pagoERP);

      if (response && (!response.InfoError || response.InfoError.Codigo === 0)) {
        // Verial bloquea el acceso a los albaranes ya facturados: se marca el cobro real
        // (documento que nació a Crédito y ahora se cobra) en los mismos campos auxiliares
        // que usaban en el Verial viejo: Aux2=Cobrado SI, Aux3=fecha real de cobro,
        // Aux4=Recibo (secuencial que genera la app). Best-effort: si falla, el pago ya
        // quedó registrado en Verial y no debe reintentarse solo por esto.
        try {
          const [aux1, aux2, aux3, aux4] = await this.buildCobroAuxFields(pagoData);
          await erpService.updateDocCliente(pagoERP.ID_DocCli, aux1, aux2, aux3, aux4);
        } catch (auxError) {
          console.warn('⚠️ No se pudieron guardar los campos auxiliares del cobro:', auxError);
        }
        return { success: true, data: response };
      } else {
        return {
          success: false,
          error: {
            codigo: response?.InfoError?.Codigo || -1,
            descripcion: response?.InfoError?.Descripcion || 'Error desconocido'
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          codigo: -1,
          descripcion: error.message || 'Error de conexión'
        }
      };
    }
  }

  /**
   * Mismo esquema de campos auxiliares que usaban en el Verial viejo, para poder seguir
   * identificando en el ERP qué documentos están cobrados sin depender de acceder a
   * albaranes ya facturados (Verial los bloquea):
   * Aux1 = Agente de Venta, Aux2 = Cobrado (SI/NO), Aux3 = Fecha de Cobro,
   * Aux4 = Recibo (secuencial que genera la propia app, uno por cada cobro real).
   * Este helper cubre el cobro real de un documento nacido a Crédito: Cobrado pasa a SI,
   * con la fecha real del cobro y un nuevo número de recibo.
   */
  private async buildCobroAuxFields(pagoData: any): Promise<[string, string, string, string]> {
    const aux1 = String(this.activeOperationVendorCodigo || pagoData.vendedorCodigo || this.currentVendorCodigo || '');
    const aux2 = 'SI';
    const aux3 = String(pagoData.fechaIso || new Date().toISOString());
    const aux4 = await reservarNumeroRecibo();
    return [aux1, aux2, aux3, aux4];
  }

  // ============================================================================
  // SUBIDA DE CLIENTE
  // ============================================================================

  private async syncCliente(clienteData: any): Promise<any> {
    try {
      const clienteERP: Partial<erpService.ClienteERP> = {
        Nombre: clienteData.nombre,
        RazonSocial: clienteData.empresa || clienteData.nombre,
        NIF: clienteData.nif || '',
        Direccion: clienteData.direccion || '',
        Telefono: clienteData.telefono || '',
        Email: clienteData.email || '',
        CPostal: clienteData.codigoPostal || '',
        Provincia: clienteData.provincia || '',
        // Mapear otros campos necesarios
      };

      const response = await erpService.crearCliente(clienteERP);

      if (response && (!response.InfoError || response.InfoError.Codigo === 0)) {
        // Opcional: Actualizar el ID local con el ID real devuelto por el ERP
        // Esto requeriría actualizar storage y referencias en otras tablas, 
        // por simplicidad en este paso solo confirmamos éxito.
        return { success: true, data: response };
      }
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  // ============================================================================
  // OPERACIONES AGENDA
  // ============================================================================

  private async syncNuevaVisita(visitaData: any): Promise<any> {
    try {
      const visitaERP: Partial<erpService.VisitaERP> = {
        NombreCliente: visitaData.clienteNombre,
        Direccion: visitaData.direccion,
        Fecha: `${visitaData.fecha}T${visitaData.hora}:00`,
        Tipo: capitalizeFirstLetter(visitaData.tipo),
        Completado: visitaData.completado,
        Observaciones: visitaData.observaciones
      };

      const response = await erpService.crearVisita(visitaERP);
      if (response && (!response.InfoError || response.InfoError.Codigo === 0)) {
        return { success: true };
      }
      return { success: false };
    } catch (error) { return { success: false }; }
  }

  private async syncVisitaUpdate(data: { id: string, completado: boolean }): Promise<any> {
    try {
      if (data.id.startsWith('V')) return { success: true }; // Es local, no existe en ERP aún

      const idNumerico = parseInt(data.id);
      if (isNaN(idNumerico)) return { success: true };

      const response = await erpService.actualizarVisita(idNumerico, data.completado);
      if (response && (!response.InfoError || response.InfoError.Codigo === 0)) {
        return { success: true };
      }
      return { success: false };
    } catch (error) { return { success: false }; }
  }

  private async syncGasto(gastoData: any): Promise<any> {
    try {
      const precioNumerico = parseFloat(gastoData.precio.replace(/[€\s]/g, '').replace(',', '.'));

      // Convertir fecha local "DD/MM/YYYY, HH:MM" a ISO para el ERP
      // Ojo: Asumimos que el ERP acepta string ISO.
      const [fechaPart, horaPart] = gastoData.fecha.split(',');
      // Un parsing robusto dependerá del formato exacto guardado en pantalla

      const gastoERP: Partial<erpService.GastoERP> = {
        Concepto: gastoData.nombre,
        Tipo: gastoData.categoria,
        Importe: isNaN(precioNumerico) ? 0 : precioNumerico,
        Fecha: new Date().toISOString(), // Enviamos fecha actual de sincronización o parseamos la original
        Imagen: gastoData.imagen // Base64 o URI
      };

      const response = await erpService.crearGasto(gastoERP);

      if (response && (!response.InfoError || response.InfoError.Codigo === 0)) {
        return { success: true, data: response };
      } else {
        return {
          success: false,
          error: {
            codigo: response.InfoError?.Codigo || -1,
            descripcion: response.InfoError?.Descripcion || 'Error en ERP'
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          codigo: -1,
          descripcion: error.message || 'Error de conexión'
        }
      };
    }
  }

  // NUEVO: Procesar borrado en servidor
  private async syncGastoDelete(data: { id: string }): Promise<any> {
    try {
      // Si es un ID temporal (local), no hace falta borrar en servidor, solo éxito
      if (data.id.startsWith('G')) return { success: true };

      const idNumerico = parseInt(data.id);
      if (isNaN(idNumerico)) return { success: true }; // ID inválido, asumimos ya borrado

      const success = await erpService.eliminarGasto(idNumerico);
      return { success };
    } catch (error) {
      return { success: false };
    }
  }

  private async syncDocumento(docData: any): Promise<any> {
    try {
      const docERP: Partial<erpService.DocumentoERP> = {
        Nombre: docData.nombre,
        Categoria: docData.categoria,
        Fecha: new Date().toISOString(),
        Tamano: docData.tamano,
        Tipo: docData.tipo
      };

      const response = await erpService.subirDocumento(docERP);

      if (response && (!response.InfoError || response.InfoError.Codigo === 0)) {
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  }

  private async syncDocumentoDelete(data: { id: string }): Promise<any> {
    try {
      // Si es un ID temporal (local), no hace falta borrar en servidor, solo éxito
      if (data.id.startsWith('DOC')) return { success: true };

      const idNumerico = parseInt(data.id);
      if (isNaN(idNumerico)) return { success: true }; // ID inválido, asumimos ya borrado

      const success = await erpService.eliminarDocumento(idNumerico);
      return { success };
    } catch (error) {
      return { success: false };
    }
  }

  private async syncNotaAlmacen(nota: any): Promise<any> {
    try {
      console.log('🔄 Sincronizando nota de almacén:', nota.id, nota.tipo);
      // ERP endpoint is currently not available, simulation of status "synchronized" locally
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  // ============================================================================
  // MANEJO DE ERRORES
  // ============================================================================

  private handleSyncError(operation: SyncOperation, error: any): void {
    const syncError: SyncError = {
      codigo: error.codigo || -1,
      descripcion: error.descripcion || 'Error desconocido',
      timestamp: Date.now(),
      operation: { ...operation }
    };

    this.errors.push(syncError);

    operation.status = 'error';
    operation.lastError = syncError.descripcion;

    console.error(`❌ Error en operación ${operation.id}:`, syncError.descripcion);

    this.saveErrors();
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  private parseClienteId(id: any): number {
    if (!id) return 0;
    if (typeof id === 'number') return id;
    if (typeof id === 'string') {
      // Extraer solo dígitos (maneja C123, 456, etc.)
      const match = id.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    }
    return 0;
  }

  private parseArticuloId(id: any): number {
    if (!id) return 0;
    if (typeof id === 'number') return id;
    if (typeof id === 'string') {
      const match = id.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    }
    return 0;
  }

  private parseDocumentoId(id: any): number {
    if (!id) return 0;
    if (typeof id === 'number') return id;
    if (typeof id === 'string') {
        const match = id.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    }
    return 0;
  }

  private parseMonto(monto: any): number {
    if (typeof monto === 'number') return monto;
    if (typeof monto === 'string') {
      const cleaned = monto.replace(/[€\s]/g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private getMetodoPagoId(formaPago: string): number {
    const mapeo: Record<string, number> = {
      'Efectivo': 1,
      'Tarjeta': 2,
      'Tarjeta de Débito': 2,
      'Tarjeta de Crédito': 3,
      'Transferencia': 5,
      'Transferencia Bancaria': 5,
      'Bizum': 8
    };
    return mapeo[formaPago] || 1;
  }

  /** El campo puede llamarse 'estadoPago' (nuevo) o deducirse de 'estado': 'cerrada' = contado pagado; 'pendiente' = crédito pendiente. */
  private ventaEstaPagadaAlContado(ventaData: any): boolean {
    return ventaData.estadoPago === 'pagado' || ventaData.estado === 'cerrada';
  }

  private buildPagos(ventaData: any): erpService.PagoDocumento[] {
    const estaPagado = this.ventaEstaPagadaAlContado(ventaData);

    if (estaPagado) {
      const importe = this.parseMonto(
        ventaData.totalesNumericos?.total ??
        ventaData.totales?.total ??
        ventaData.precio
      );
      return [{
        ID_MetodoPago: this.getMetodoPagoId(ventaData.formaPago || 'Efectivo'),
        Fecha: ventaData.fecha || new Date().toISOString().split('T')[0],
        Importe: importe
      }];
    }
    return [];
  }

  private generateId(): string {
    return `SYNC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /** Elimina de la cola los `pago` asociados a cobros locales que ya no existen. */
  removeQueuedPagosByCobroIds(cobroIds: string[]): void {
    if (!cobroIds?.length) return;
    const set = new Set(cobroIds.map(id => String(id)));
    const beforeLen = this.queue.length;
    this.queue = this.queue.filter(
      op => op.type !== 'pago' || !set.has(String(op.data?.id ?? ''))
    );
    if (this.queue.length !== beforeLen) {
      void this.saveQueue();
    }
  }

  private removeFromQueue(id: string): void {
    this.queue = this.queue.filter(op => op.id !== id);
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  getQueue(): SyncOperation[] {
    return [...this.queue];
  }

  getErrors(): SyncError[] {
    return [...this.errors];
  }

  getPendingCount(): number {
    return this.queue.filter(op => op.status === 'pending' || op.status === 'error').length;
  }

  // Limpiar cola (por vendedor actual). Útil para descartar operaciones atascadas.
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
    console.log('🗑️ Cola de sincronización vaciada');
  }

  async clearErrors(): Promise<void> {
    this.errors = [];
    await this.saveErrors();
    console.log('🗑️ Historial de errores vaciado');
  }

  // ============================================================================
  // PERSISTENCIA
  // ============================================================================

  private async saveQueue(): Promise<void> {
    try {
      await storageService.setItem(this.vendorKey('syncQueue'), this.queue);
    } catch (error) {
      console.error('Error guardando cola de sincronización:', error);
    }
  }

  private async loadQueue(): Promise<void> {
    try {
      const filterForVendor = (ops: SyncOperation[] = []) =>
        !this.currentVendorId
          ? []
          : ops.filter(op => op.vendorId === this.currentVendorId);

      const stored = await storageService.getItem<SyncOperation[]>(this.vendorKey('syncQueue'));
      if (stored) {
        this.queue = filterForVendor(stored);
        return;
      }

      // Fallback para instalaciones previas sin namespacing: cargamos la cola global solo si no hay cola propia
      if (this.currentVendorId) {
        const legacy = await storageService.getItem<SyncOperation[]>('syncQueue');
        this.queue = filterForVendor(legacy || []);
      } else {
        this.queue = [];
      }
    } catch (error) {
      console.error('Error cargando cola de sincronización:', error);
      this.queue = [];
    }
  }

  private async saveErrors(): Promise<void> {
    try {
      await storageService.setItem(this.vendorKey('syncErrors'), this.errors);
    } catch (error) {
      console.error('Error guardando errores de sincronización:', error);
    }
  }

  private async loadErrors(): Promise<void> {
    try {
      const filterForVendor = (errs: SyncError[] = []) =>
        !this.currentVendorId
          ? []
          : errs.filter(e => e.operation.vendorId === this.currentVendorId);

      const stored = await storageService.getItem<SyncError[]>(this.vendorKey('syncErrors'));
      if (stored) {
        this.errors = filterForVendor(stored);
        return;
      }

      if (this.currentVendorId) {
        const legacy = await storageService.getItem<SyncError[]>('syncErrors');
        this.errors = filterForVendor(legacy || []);
      } else {
        this.errors = [];
      }
    } catch (error) {
      console.error('Error cargando errores de sincronización:', error);
      this.errors = [];
    }
  }
}

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export const syncService = new SyncService();


