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

export interface SyncOperation {
  id: string;
  type: 'venta' | 'pago' | 'cliente' | 'gasto' | 'gasto_delete' | 'documento' | 'documento_delete' | 'visita' | 'visita_update';
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

  constructor() {
    this.loadQueue();
    this.loadErrors();
  }

  async setVendor(vendorId: string | null): Promise<void> {
    this.currentVendorId = vendorId || null;
    await this.loadQueue();
    await this.loadErrors();
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

      // 2. Descargar datos
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
        this.syncCobros(),
        this.syncNotasAlmacen(),
        this.syncAgenda() // NUEVO
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
      console.log('👥 [syncClientes] ============================================');
      console.log('👥 [syncClientes] INICIANDO SINCRONIZACIÓN DE CLIENTES');
      console.log('👥 [syncClientes] URL Base:', erpService.getERPBaseUrl ? erpService.getERPBaseUrl() : 'N/A');
      console.log('👥 [syncClientes] Sesión:', erpService.getSessionId ? erpService.getSessionId() : 'N/A');
      console.log('👥 [syncClientes] ============================================');

      const clientesERP = await erpService.getClientes();

      console.log(`📥 [syncClientes] Clientes recibidos del ERP (raw): ${clientesERP.length}`);

      if (clientesERP.length === 0) {
        console.warn('⚠️ [syncClientes] ⚠️⚠️⚠️ NO SE RECIBIERON CLIENTES DEL ERP ⚠️⚠️⚠️');
        console.warn('⚠️ [syncClientes] Abortando actualización para preservar datos locales.');
        const clientesLocales = (await storageService.getItem<any[]>('clientes')) || [];
        // Si hay locales, retornamos esos. Si no, retornamos vacío (no hay otra opción)
        if (clientesLocales.length > 0) return clientesLocales;
        // Si no hay locales, quizás es la primera carga. Dejamos pasar array vacío.
      }

      if (clientesERP.length > 0) {
        console.log('📋 [syncClientes] Primer cliente raw:', JSON.stringify(clientesERP[0], null, 2).substring(0, 300));
      }

      const clientesServer = clientesERP.map((cliente: any) => {
        try {
          const mapeado = erpService.mapearClienteERPaLocal(cliente);
          console.log(`✅ [syncClientes] Cliente mapeado: ${mapeado.nombre} (ID: ${mapeado.id})`);
          return mapeado;
        } catch (error: any) {
          console.error(`❌ [syncClientes] Error mapeando cliente:`, error.message, cliente);
          return null;
        }
      }).filter((c: any) => c !== null);

      console.log(`📊 [syncClientes] Clientes mapeados exitosamente: ${clientesServer.length}`);

      // Obtener locales actuales
      const clientesLocales = (await storageService.getItem<any[]>('clientes')) || [];
      console.log(`📂 [syncClientes] Clientes locales actuales: ${clientesLocales.length}`);

      // 1. PRESERVAR NUEVOS CLIENTES LOCALES
      // Asumimos que los creados offline tienen un ID temporal que empieza por "CLI-" o timestamp
      // o simplemente aquellos que no están en el servidor aún (pero la ID temporal es más segura)
      // 1. PRESERVAR NUEVOS CLIENTES LOCALES
      // Asumimos que los creados offline tienen un ID no numérico (String temporal, e.g. "CLI-..." o UUID)
      const clientesNuevosOffline = clientesLocales.filter(c => c.id && isNaN(Number(c.id)));
      console.log(`💾 [syncClientes] Clientes nuevos offline a preservar: ${clientesNuevosOffline.length}`);

      // 2. MEZCLAR
      // Los del servidor tienen prioridad para actualizaciones, pero añadimos los nuevos locales
      // Filtramos los del server para no duplicar si por casualidad el ID colisionara (improbable con CLI-)
      const listaFinal = [...clientesServer, ...clientesNuevosOffline];

      console.log(`💾 [syncClientes] Guardando ${listaFinal.length} clientes en storage...`);
      await storageService.setItem('clientes', listaFinal);

      // Verificar que se guardó correctamente
      const verificacion = await storageService.getItem<any[]>('clientes');
      console.log(`✅ [syncClientes] Verificación: ${verificacion?.length || 0} clientes guardados en storage`);

      if (verificacion && Array.isArray(verificacion) && verificacion.length > 0) {
        console.log(`✅ [syncClientes] Primer cliente guardado:`, verificacion[0]?.nombre || verificacion[0]?.id);
        console.log(`✅ [syncClientes] Estructura del primer cliente:`, JSON.stringify(verificacion[0], null, 2).substring(0, 200));
      } else {
        console.log(`ℹ️ [syncClientes] No hay clientes guardados (esto es normal si el servidor no devuelve datos)`);
      }

      console.log(`✅ [syncClientes] Clientes sincronizados: ${clientesServer.length} (Server) + ${clientesNuevosOffline.length} (Locales) = ${listaFinal.length} total`);

      // Retornar la lista final (no la verificación, por si hay algún problema de timing)
      return listaFinal;
    } catch (error: any) {
      console.error('❌ [syncClientes] Error sync clientes:', error.message);
      console.error('❌ [syncClientes] Stack:', error.stack);
      const clientesLocales = (await storageService.getItem<any[]>('clientes')) || [];
      console.log(`📂 [syncClientes] Retornando ${clientesLocales.length} clientes locales debido al error`);
      return clientesLocales;
    }
  }

  async getClientesLocal(): Promise<any[]> {
    const clientes = (await storageService.getItem<any[]>('clientes')) || [];
    console.log(`📂 [getClientesLocal] Leyendo clientes de storage: ${clientes.length} encontrados`);
    if (clientes.length > 0) {
      console.log(`📂 [getClientesLocal] Primer cliente en storage:`, clientes[0]?.nombre || clientes[0]?.id);
    }
    return clientes;
  }

  // ============================================================================
  // SINCRONIZACIÓN DE ARTÍCULOS
  // ============================================================================

  async syncArticulos(): Promise<any[]> {
    try {
      console.log('📦 [syncArticulos] ============================================');
      console.log('📦 [syncArticulos] INICIANDO SINCRONIZACIÓN DE ARTÍCULOS');
      console.log('📦 [syncArticulos] URL Base:', erpService.getERPBaseUrl ? erpService.getERPBaseUrl() : 'N/A');
      console.log('📦 [syncArticulos] Sesión:', erpService.getSessionId ? erpService.getSessionId() : 'N/A');
      console.log('📦 [syncArticulos] ============================================');

      const articulosERP = await erpService.getArticulos();

      console.log(`📥 [syncArticulos] Artículos recibidos del ERP (raw): ${articulosERP.length}`);

      if (articulosERP.length === 0) {
        console.warn('⚠️ [syncArticulos] ⚠️⚠️⚠️ NO SE RECIBIERON ARTÍCULOS DEL ERP ⚠️⚠️⚠️');
        console.warn('⚠️ [syncArticulos] Abortando actualización para preservar datos locales.');
        const articulosLocales = (await storageService.getItem<any[]>('articulos')) || [];
        if (articulosLocales.length > 0) return articulosLocales;
      } else if (articulosERP.length > 0) {
        console.log('📋 [syncArticulos] Primer artículo raw:', JSON.stringify(articulosERP[0], null, 2).substring(0, 300));
      }

      const articulosMapeados = articulosERP.map(erpService.mapearArticuloERPaLocal);

      console.log(`📊 [syncArticulos] Artículos mapeados exitosamente: ${articulosMapeados.length}`);

      // Guardar en almacenamiento local
      console.log(`💾 [syncArticulos] Guardando ${articulosMapeados.length} artículos en storage...`);
      await storageService.setItem('articulos', articulosMapeados);

      // Verificar que se guardó correctamente
      const verificacion = await storageService.getItem<any[]>('articulos');
      console.log(`✅ [syncArticulos] Verificación: ${verificacion?.length || 0} artículos guardados en storage`);

      if (verificacion && Array.isArray(verificacion) && verificacion.length > 0) {
        console.log(`✅ [syncArticulos] Primer artículo guardado:`, verificacion[0]?.nombre || verificacion[0]?.id);
        console.log(`✅ [syncArticulos] Estructura del primer artículo:`, JSON.stringify(verificacion[0], null, 2).substring(0, 200));
      } else {
        console.log(`ℹ️ [syncArticulos] No hay artículos guardados (esto es normal si el servidor no devuelve datos)`);
      }

      console.log(`✅ [syncArticulos] ${articulosMapeados.length} artículos sincronizados`);
      return articulosMapeados;
    } catch (error: any) {
      console.error('❌ [syncArticulos] Error sincronizando artículos:', error.message);
      console.error('❌ [syncArticulos] Stack:', error.stack);
      // Cargar datos locales si hay
      const articulosLocales = await storageService.getItem<any[]>('articulos') || [];
      console.log(`📂 [syncArticulos] Retornando ${articulosLocales.length} artículos locales debido al error`);
      return articulosLocales;
    }
  }

  async getArticulosLocal(): Promise<any[]> {
    const articulos = (await storageService.getItem<any[]>('articulos')) || [];
    console.log(`📂 [getArticulosLocal] Leyendo artículos de storage: ${articulos.length} encontrados`);
    if (articulos.length > 0) {
      console.log(`📂 [getArticulosLocal] Primer artículo en storage:`, articulos[0]?.nombre || articulos[0]?.id);
    }
    return articulos;
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
    } catch (error) {
      console.warn('⚠️ Error sync cobros, manteniendo locales');
      return (await storageService.getItem<any[]>('cobros')) || [];
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

  async processQueue(): Promise<void> {
    if (this.isSyncing) {
      console.log('⏳ Sincronización ya en progreso');
      return;
    }

    const pendingOps = this.queue.filter(
      op => op.status === 'pending'
    );

    if (pendingOps.length === 0) {
      console.log('✓ No hay operaciones pendientes en la cola');
      return;
    }

    console.log(`🔄 Procesando ${pendingOps.length} operaciones pendientes...`);

    this.isSyncing = true;

    try {
      for (const operation of pendingOps) {
        if (operation.retries >= this.maxRetries) {
          console.error(`❌ Operación ${operation.id} excedió reintentos máximos`);
          // Marcar como error final para que no bloquee, o mover a histórico de fallidos
          operation.status = 'error';
          continue;
        }

        await this.processOperation(operation);
      }
    } finally {
      this.isSyncing = false;
      await this.saveQueue();
    }
  }

  private async processOperation(operation: SyncOperation): Promise<void> {
    operation.status = 'syncing';
    operation.retries++;

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
        default:
          throw new Error(`Tipo de operación desconocido: ${operation.type}`);
      }

      if (result.success) {
        operation.status = 'success';
        this.removeFromQueue(operation.id);
        console.log(`✅ Operación ${operation.id} sincronizada correctamente`);
      } else {
        // Si la respuesta es 404, asumimos que el recurso no existe en ERP y limpiamos la cola
        if (this.shouldDropOperation(result.error)) {
          console.warn(`⚠️ Operación ${operation.id} descartada por 404/No encontrado`);
          this.removeFromQueue(operation.id);
        } else {
          this.handleSyncError(operation, result.error);
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
      } else {
        this.handleSyncError(operation, {
          codigo: errObj.codigo,
          descripcion: errObj.descripcion
        });
      }
    }
  }

  private shouldDropOperation(error: any): boolean {
    if (!error) return false;
    const code = error.codigo || error.status || error.statusCode;
    const desc = (error.descripcion || error.message || '').toString().toLowerCase();
    return code === 404 || desc.includes('404') || desc.includes('not found');
  }

  // ============================================================================
  // SINCRONIZACIÓN DE OPERACIONES ESPECÍFICAS
  // ============================================================================

  private async syncVenta(ventaData: any): Promise<any> {
    try {
      const documento: erpService.DocumentoCliente = {
        Id: 0,
        Tipo: 5, // Pedido
        Numero: 0,
        Referencia: ventaData.id || '',
        Fecha: ventaData.fecha || new Date().toISOString().split('T')[0],
        ID_Cliente: this.parseClienteId(ventaData.cliente?.id),
        PreciosImpIncluidos: true,
        BaseImponible: this.parseMonto(ventaData.totales?.subtotal),
        TotalImporte: this.parseMonto(ventaData.totales?.total),
        Comentario: ventaData.tipoNota || '',
        Contenido: (ventaData.articulos || []).map((art: any) => ({
          TipoRegistro: 1,
          ID_Articulo: this.parseArticuloId(art.articuloId),
          Precio: parseFloat(art.precioUnitario) || 0,
          Dto: parseFloat(art.descuento) || 0,
          DtoPPago: 0,
          DtoEurosXUd: 0,
          DtoEuros: 0,
          Uds: parseFloat(art.cantidad) || 0,
          UdsRegalo: 0,
          UdsAuxiliares: 0,
          ImporteLinea: parseFloat(art.precioUnitario) * parseFloat(art.cantidad),
          PorcentajeIVA: 21,
          PorcentajeRE: 0,
          Lote: null,
          Caducidad: null,
          ID_Partida: 0,
          DescripcionAmplia: art.nota || null,
          Comentario: art.nota || null
        })),
        Pagos: this.buildPagos(ventaData)
      };

      const response = await erpService.crearDocumentoVenta(documento);

      if (response.InfoError && response.InfoError.Codigo === 0) {
        return { success: true, data: response };
      } else {
        return {
          success: false,
          error: {
            codigo: response.InfoError?.Codigo || -1,
            descripcion: response.InfoError?.Descripcion || 'Error desconocido'
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

  private async syncPago(pagoData: any): Promise<any> {
    try {
      // Convertir monto a número limpio
      const importe = parseFloat(pagoData.monto.replace(/[€\s]/g, '').replace(',', '.'));

      const pagoERP = {
        ID_DocCli: pagoData.notaVentaId ? this.parseDocumentoId(pagoData.notaVentaId) : 0, // Si es pago de nota
        ID_Cliente: pagoData.clienteId ? parseInt(pagoData.clienteId, 10) : 0, // Si es pago a cuenta
        ID_MetodoPago: this.getMetodoPagoId(pagoData.formaPago),
        Fecha: new Date().toISOString(), // Fecha del pago
        Importe: isNaN(importe) ? 0 : importe,
        Referencia: pagoData.id // Enviamos ID local como referencia
      };

      const response = await erpService.registrarPago(pagoERP);

      if (response && (!response.InfoError || response.InfoError.Codigo === 0)) {
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
    if (typeof id === 'number') return id;
    if (typeof id === 'string') {
      const parsed = parseInt(id, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private parseArticuloId(id: any): number {
    if (typeof id === 'number') return id;
    if (typeof id === 'string') {
      const parsed = parseInt(id, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private parseDocumentoId(id: any): number {
    if (typeof id === 'number') return id;
    if (typeof id === 'string') {
      const cleaned = id.replace(/^P/i, '');
      const parsed = parseInt(cleaned, 10);
      return isNaN(parsed) ? 0 : parsed;
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

  private buildPagos(ventaData: any): erpService.PagoDocumento[] {
    if (ventaData.estadoPago === 'pagado') {
      return [{
        ID_MetodoPago: this.getMetodoPagoId(ventaData.formaPago || 'Efectivo'),
        Fecha: ventaData.fecha || new Date().toISOString().split('T')[0],
        Importe: this.parseMonto(ventaData.totales?.total)
      }];
    }
    return [];
  }

  private generateId(): string {
    return `SYNC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
  clearQueue(removeErrors: boolean = true): void {
    if (removeErrors) {
      this.queue = this.queue.filter(op => op.status !== 'pending' && op.status !== 'error');
    } else {
      this.queue = this.queue.filter(op => op.status !== 'pending');
    }
    this.saveQueue();
  }

  clearErrors(): void {
    this.errors = [];
    this.saveErrors();
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


