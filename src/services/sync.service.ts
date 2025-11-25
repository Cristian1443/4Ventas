/**
 * Servicio de Sincronización Offline-First para React Native
 * - Funciona offline con datos locales si el ERP no está disponible
 * - Sincronización automática cada hora
 * - Cola de sincronización para operaciones offline
 * - No bloquea la app si falla la conexión
 */

import { storageService } from './storage.service';
import * as erpService from './erp.service';

export interface SyncOperation {
  id: string;
  type: 'venta' | 'pago' | 'cliente' | 'gasto' | 'gasto_delete' | 'documento';
  data: any;
  timestamp: number;
  retries: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'success' | 'error';
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

  constructor() {
    this.loadQueue();
    this.loadErrors();
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
      // Procesar cola pendiente primero
      await this.processQueue();

      // Sincronizar clientes
      try {
        await this.syncClientes();
        status.clientes = 'success';
      } catch (error) {
        console.warn('⚠️ Error sincronizando clientes, usando datos locales');
        status.clientes = 'error';
      }

      // Sincronizar artículos
      try {
        await this.syncArticulos();
        status.articulos = 'success';
      } catch (error) {
        console.warn('⚠️ Error sincronizando artículos, usando datos locales');
        status.articulos = 'error';
      }

      // Sincronizar gastos
      try {
        await this.syncGastos();
      } catch (error) {
        console.warn('⚠️ Error sincronizando gastos, usando datos locales');
      }

      status.ultimaSync = new Date().toISOString();
      status.operacionesPendientes = this.getPendingCount();

      console.log('✅ Sincronización completa finalizada');
      return status;
    } catch (error: any) {
      console.error('❌ Error en sincronización completa:', error);
      status.error = error.message;
      return status;
    }
  }

  // ============================================================================
  // SINCRONIZACIÓN DE CLIENTES
  // ============================================================================

  async syncClientes(): Promise<any[]> {
    try {
      console.log('👥 Sincronizando clientes...');
      const clientesERP = await erpService.getClientes();
      const clientesLocales = clientesERP.map(erpService.mapearClienteERPaLocal);
      
      // Guardar en almacenamiento local
      await storageService.setItem('clientes', clientesLocales);
      
      console.log(`✅ ${clientesLocales.length} clientes sincronizados`);
      return clientesLocales;
    } catch (error) {
      console.warn('⚠️ Error sincronizando clientes, usando datos locales');
      // Cargar datos locales si hay
      const clientesLocales = await storageService.getItem<any[]>('clientes');
      return clientesLocales || [];
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
      console.log('📦 Sincronizando artículos...');
      const articulosERP = await erpService.getArticulos();
      const articulosLocales = articulosERP.map(erpService.mapearArticuloERPaLocal);
      
      // Guardar en almacenamiento local
      await storageService.setItem('articulos', articulosLocales);
      
      console.log(`✅ ${articulosLocales.length} artículos sincronizados`);
      return articulosLocales;
    } catch (error) {
      console.warn('⚠️ Error sincronizando artículos, usando datos locales');
      // Cargar datos locales si hay
      const articulosLocales = await storageService.getItem<any[]>('articulos');
      return articulosLocales || [];
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
      console.log('📉 Descargando gastos del ERP...');
      const gastosERP = await erpService.getGastos();
      const gastosServer = gastosERP.map(erpService.mapearGastoERPaLocal);
      
      // Obtener estado local actual
      const gastosLocales = (await storageService.getItem<any[]>('gastos')) || [];

      // 1. PRESERVAR GASTOS NUEVOS LOCALES (Los que tienen ID temporal 'G...')
      // Estos no están en el servidor aún, así que no debemos borrarlos al sobrescribir
      const gastosNuevosOffline = gastosLocales.filter(g => g.id && g.id.toString().startsWith('G'));

      // 2. IDENTIFICAR BORRADOS PENDIENTES
      // Miramos la cola para ver qué IDs se han mandado borrar
      const pendingDeletes = this.queue
        .filter(op => op.type === 'gasto_delete')
        .map(op => op.data.id);

      // 3. MEZCLAR: (Server - BorradosPendientes) + NuevosLocales
      const gastosServerFiltrados = gastosServer.filter(g => !pendingDeletes.includes(g.id));
      
      const listaFinal = [...gastosServerFiltrados, ...gastosNuevosOffline];
      
      // Guardar la lista mezclada
      await storageService.setItem('gastos', listaFinal);
      
      console.log(`✅ Gastos sincronizados: ${gastosServerFiltrados.length} del servidor + ${gastosNuevosOffline.length} locales nuevos`);
      return listaFinal;
    } catch (error) {
      console.warn('⚠️ Error sync gastos, manteniendo locales');
      return (await storageService.getItem<any[]>('gastos')) || [];
    }
  }

  async getGastosLocal(): Promise<any[]> {
    return (await storageService.getItem<any[]>('gastos')) || [];
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
      status: 'pending'
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
      op => op.status === 'pending' || op.status === 'error'
    );

    if (pendingOps.length === 0) {
      console.log('✓ No hay operaciones pendientes en la cola');
      return;
    }

    console.log(`🔄 Procesando ${pendingOps.length} operaciones pendientes...`);

    this.isSyncing = true;

    for (const operation of pendingOps) {
      if (operation.retries >= this.maxRetries) {
        console.error(`❌ Operación ${operation.id} excedió reintentos máximos`);
        continue;
      }

      await this.processOperation(operation);
    }

    this.isSyncing = false;
    this.saveQueue();
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
        default:
          throw new Error(`Tipo de operación desconocido: ${operation.type}`);
      }

      if (result.success) {
        operation.status = 'success';
        this.removeFromQueue(operation.id);
        console.log(`✅ Operación ${operation.id} sincronizada correctamente`);
      } else {
        this.handleSyncError(operation, result.error);
      }
    } catch (error: any) {
      this.handleSyncError(operation, {
        codigo: -1,
        descripcion: error.message || 'Error de conexión'
      });
    }
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
      const pago: erpService.NuevoPago = {
        ID_DocCli: this.parseDocumentoId(pagoData.notaVentaId),
        ID_MetodoPago: this.getMetodoPagoId(pagoData.formaPago),
        Fecha: pagoData.fecha || new Date().toISOString().split('T')[0],
        Importe: this.parseMonto(pagoData.monto)
      };

      const response = await erpService.registrarPago(pago);

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

  private async syncCliente(clienteData: any): Promise<any> {
    // TODO: Implementar cuando sea necesario
    return { success: true };
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

  private async syncDocumento(documentoData: any): Promise<any> {
    // TODO: Implementar cuando sea necesario
    return { success: true };
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
      'Tarjeta de Débito': 2,
      'Tarjeta de Crédito': 3,
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

  clearErrors(): void {
    this.errors = [];
    this.saveErrors();
  }

  // ============================================================================
  // PERSISTENCIA
  // ============================================================================

  private async saveQueue(): Promise<void> {
    try {
      await storageService.setItem('syncQueue', this.queue);
    } catch (error) {
      console.error('Error guardando cola de sincronización:', error);
    }
  }

  private async loadQueue(): Promise<void> {
    try {
      const stored = await storageService.getItem<SyncOperation[]>('syncQueue');
      if (stored) {
        this.queue = stored;
      }
    } catch (error) {
      console.error('Error cargando cola de sincronización:', error);
      this.queue = [];
    }
  }

  private async saveErrors(): Promise<void> {
    try {
      await storageService.setItem('syncErrors', this.errors);
    } catch (error) {
      console.error('Error guardando errores de sincronización:', error);
    }
  }

  private async loadErrors(): Promise<void> {
    try {
      const stored = await storageService.getItem<SyncError[]>('syncErrors');
      if (stored) {
        this.errors = stored;
      }
    } catch (error) {
      console.error('Error cargando errores de sincronización:', error);
      this.errors = [];
    }
  }
}

export const syncService = new SyncService();


