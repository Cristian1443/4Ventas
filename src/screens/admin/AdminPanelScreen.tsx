import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { catalogosService } from '../../services/erp/catalogos.service';
import { ventasService } from '../../services/erp/ventas.service';
import { vendorService } from '../../services/vendor.service';
import type { Vendedor } from '../../services/vendor.service';
import { storageService } from '../../services/storage.service';
import { syncService } from '../../services/sync.service';
import type { SyncOperation, SyncError, SyncAuditEntry } from '../../services/sync.service';

type AgenteRow = {
  id: string;
  nombre: string;
};

type AlbaranRow = {
  id: string;
  referencia: string;
  cliente: string;
  fecha: string;
  total: string;
  vendedor: string;
  source: 'ERP' | 'LOCAL' | 'LOCAL_SYNCED';
  raw: any;
};

type VendorKpiRow = {
  id: string;
  nombre: string;
  ventasLocal: number;
  cobrosLocal: number;
  gastosLocal: number;
  docsLocal: number;
  pendientesVenta: number;
  pendientesPago: number;
  pendientesOtros: number;
  erroresSync: number;
  ultimaVentaSync: string;
};

type AdminAuditEntry = {
  id: string;
  action: 'create_vendor' | 'delete_vendor' | 'delete_vendor_blocked' | 'permission_change' | 'clear_tablet_agent';
  actor: string;
  detail: string;
  timestamp: number;
};

const ADMIN_AUDIT_KEY = 'adminAuditLog';
const PROTECTED_VENDOR_CODES = new Set(['902', '903', '904', '905', '906', '908', '909', '912', '913']);
const ADMIN_DELETE_PIN = '2026';

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

function normalizeMoney(value: any): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value || '0').replace(/[^\d,.-]/g, '').replace(',', '.'));
  if (!Number.isFinite(num)) return '0,00 €';
  return `${num.toFixed(2).replace('.', ',')} €`;
}

function moneyToNumber(value: string): number {
  const n = parseFloat(String(value || '0').replace(/[^\d,.-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function parseDateFlexible(value: string): Date | null {
  if (!value) return null;
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) return iso;

  const m = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]) - 1;
  const yyyy = Number(m[3]);
  const d = new Date(yyyy, mm, dd);
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractLineas(raw: any): any[] {
  if (!raw || typeof raw !== 'object') return [];
  if (Array.isArray(raw.Contenido)) return raw.Contenido;
  if (Array.isArray(raw.Lineas)) return raw.Lineas;
  if (Array.isArray(raw.Lines)) return raw.Lines;
  if (Array.isArray(raw.Detalle)) return raw.Detalle;
  return [];
}

function csvEscape(v: any): string {
  const s = String(v ?? '');
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toInt(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getVendorHealth(v: VendorKpiRow): 'ok' | 'warning' | 'error' {
  const pending = v.pendientesVenta + v.pendientesPago + v.pendientesOtros;
  if (v.erroresSync > 0) return 'error';
  if (pending > 0) return 'warning';
  return 'ok';
}

function healthLabel(health: 'ok' | 'warning' | 'error'): string {
  if (health === 'ok') return 'OK';
  if (health === 'warning') return 'Pendiente';
  return 'Error';
}

function sourceLabel(source: AlbaranRow['source']): string {
  if (source === 'LOCAL_SYNCED') return 'LOCAL OK';
  return source;
}

export default function AdminPanelScreen() {
  const navigation = useNavigation<any>();
  const { userSession, logout, setCurrentVendor, config, updateConfig } = useApp();
  const { width, height } = useWindowDimensions();
  const isCompactHero = width < 860;
  const isLandscapeTablet = width >= 1024 && width > height;

  const [loading, setLoading] = useState(false);
  const [agentes, setAgentes] = useState<AgenteRow[]>([]);
  const [localVendedores, setLocalVendedores] = useState<Vendedor[]>([]);
  const [albaranes, setAlbaranes] = useState<AlbaranRow[]>([]);
  const [searchAgente, setSearchAgente] = useState('');
  const [searchAlbaran, setSearchAlbaran] = useState('');
  const [vendedorFiltro, setVendedorFiltro] = useState('todos');
  const [daysBack, setDaysBack] = useState('30');
  const [selectedAlbaran, setSelectedAlbaran] = useState<AlbaranRow | null>(null);
  const [lastSync, setLastSync] = useState<string>('Nunca');
  const [vendorStats, setVendorStats] = useState<VendorKpiRow[]>([]);
  const [historialWarning, setHistorialWarning] = useState<string>('');
  const [retryingVendorId, setRetryingVendorId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'resumen' | 'vendedores' | 'albaranes' | 'configuracion'>('resumen');
  const [sourceFilter, setSourceFilter] = useState<'todos' | 'erp' | 'pendientes' | 'sync'>('todos');
  const [sortField, setSortField] = useState<'fecha' | 'total' | 'cliente'>('fecha');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [debouncedSearchAlbaran, setDebouncedSearchAlbaran] = useState('');
  const [albaranesLimit, setAlbaranesLimit] = useState(60);
  const [creatingVendor, setCreatingVendor] = useState(false);
  const [deletingVendorId, setDeletingVendorId] = useState<string | null>(null);
  const [newVendorNombre, setNewVendorNombre] = useState('');
  const [newVendorCodigo, setNewVendorCodigo] = useState('');
  const [newVendorSession, setNewVendorSession] = useState('39');
  const [newVendorAlmacen, setNewVendorAlmacen] = useState('');
  const [almacenesErp, setAlmacenesErp] = useState<{ id: string; nombre: string }[]>([]);
  const [adminAudit, setAdminAudit] = useState<AdminAuditEntry[]>([]);
  const [editingVendor, setEditingVendor] = useState<Vendedor | null>(null);
  const [editVendorNombre, setEditVendorNombre] = useState('');
  const [editVendorCodigo, setEditVendorCodigo] = useState('');
  const [editVendorSession, setEditVendorSession] = useState('');
  const [editVendorAlmacen, setEditVendorAlmacen] = useState('');
  const [editVendorPrinterType, setEditVendorPrinterType] = useState<'matricial' | 'termica_bt'>('matricial');
  const [editVendorPrinterHost, setEditVendorPrinterHost] = useState('');
  const [editVendorPrinterPort, setEditVendorPrinterPort] = useState('');
  const [editVendorPrinterBtAddress, setEditVendorPrinterBtAddress] = useState('');
  const [editVendorPrinterBtName, setEditVendorPrinterBtName] = useState('');
  const [scanningBtDevices, setScanningBtDevices] = useState(false);
  const [btDevicesFound, setBtDevicesFound] = useState<{ device_name: string; inner_mac_address: string }[]>([]);
  const [savingVendorEdit, setSavingVendorEdit] = useState(false);
  const [permissionMode, setPermissionMode] = useState<'full' | 'view'>('full');
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pendingDeleteVendor, setPendingDeleteVendor] = useState<Vendedor | null>(null);
  const [heroCollapsed, setHeroCollapsed] = useState(true);

  // --- Configuración de Tablet ---
  const TABLET_CONFIG_KEY = 'tabletConfig';
  const [tabletEmpresa, setTabletEmpresa] = useState('');
  const [tabletAgenteId, setTabletAgenteId] = useState('');
  const [tabletContadorAlbaranes, setTabletContadorAlbaranes] = useState('1');
  const [tabletContadorPedidos, setTabletContadorPedidos] = useState('1');
  const [tabletContadorAdicional, setTabletContadorAdicional] = useState('1');
  const [tabletContadorOtros, setTabletContadorOtros] = useState('1');
  const [nuevoDocNombre, setNuevoDocNombre] = useState('');
  const [nuevoDocUrl, setNuevoDocUrl] = useState('');
  const [nuevoDocCategoria, setNuevoDocCategoria] = useState('');
  const [tabletImpresora, setTabletImpresora] = useState('');
  const [tabletImpresoraPuerto, setTabletImpresoraPuerto] = useState('9100');
  const [tabletEncabezado1, setTabletEncabezado1] = useState('');
  const [tabletEncabezado2, setTabletEncabezado2] = useState('');
  const [tabletEncabezado3, setTabletEncabezado3] = useState('');
  const [tabletCabeceraEmpresa, setTabletCabeceraEmpresa] = useState('');
  const [tabletCabeceraDireccion, setTabletCabeceraDireccion] = useState('');
  const [tabletCabeceraTelefono, setTabletCabeceraTelefono] = useState('');
  const [tabletCabeceraMostrarVendedor, setTabletCabeceraMostrarVendedor] = useState(false);
  const [savingTabletConfig, setSavingTabletConfig] = useState(false);
  const [tabletConfigSaved, setTabletConfigSaved] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const today = new Date();
      const from = new Date(today);
      const days = Number(daysBack) || 30;
      from.setDate(today.getDate() - days);

      const [agentesRaw, pedidosRaw, almacenesRaw] = await Promise.all([
        catalogosService.getAgentes(),
        // allareasventa=false: pedir todas las áreas de venta (ej. Mascotas) hace que Verial
        // rechace la consulta completa si el cliente no tiene esa área contratada.
        ventasService.getHistorialPedidos(0, formatDateISO(from), formatDateISO(today), false),
        catalogosService.getAlmacenes(),
      ]);

      const almacenesParsed = (almacenesRaw || [])
        .map((a: any) => ({
          id: String(a.Id ?? a.ID_Almacen ?? a.id ?? '').trim(),
          nombre: String(a.Nombre ?? a.NombreAlmacen ?? a.Descripcion ?? '').trim(),
        }))
        .filter(a => a.id);
      setAlmacenesErp(almacenesParsed);

      // Resumen local por vendedor + estado de sincronización
      const vendedoresLocales = await vendorService.getVendedores();
      const stats: VendorKpiRow[] = await Promise.all(
        (vendedoresLocales || []).map(async (v) => {
          const keyVentas = `notasVenta__${v.id}`;
          const keyCobros = `cobros__${v.id}`;
          const keyGastos = `gastos__${v.id}`;
          const keyDocs = `documentos__${v.id}`;
          const keyQueue = `syncQueue__${v.id}`;
          const keyErrors = `syncErrors__${v.id}`;
          const keyAudit = `syncAudit__${v.id}`;

          const [
            ventas,
            cobros,
            gastos,
            docs,
            queue,
            errors,
            audit
          ] = await Promise.all([
            storageService.getItem<any[]>(keyVentas),
            storageService.getItem<any[]>(keyCobros),
            storageService.getItem<any[]>(keyGastos),
            storageService.getItem<any[]>(keyDocs),
            storageService.getItem<SyncOperation[]>(keyQueue),
            storageService.getItem<SyncError[]>(keyErrors),
            storageService.getItem<SyncAuditEntry[]>(keyAudit),
          ]);

          const pending = (queue || []).filter(q => q.status === 'pending' || q.status === 'error');
          const pendingVenta = pending.filter(q => q.type === 'venta').length;
          const pendingPago = pending.filter(q => q.type === 'pago').length;
          const pendingOtros = Math.max(0, pending.length - pendingVenta - pendingPago);

          const lastVentaOk = (audit || []).find(a => a.type === 'venta' && a.status === 'success');
          const lastVentaErr = (audit || []).find(a => a.type === 'venta' && a.status === 'error');
          let ultimaVentaSync = 'Sin envíos';
          if (lastVentaOk) {
            ultimaVentaSync = `OK ${new Date(lastVentaOk.timestamp).toLocaleString('es-ES')}`;
          } else if (lastVentaErr) {
            ultimaVentaSync = `Error ${new Date(lastVentaErr.timestamp).toLocaleString('es-ES')}`;
          }

          return {
            id: v.id,
            nombre: v.nombre,
            ventasLocal: (ventas || []).length,
            cobrosLocal: (cobros || []).length,
            gastosLocal: (gastos || []).length,
            docsLocal: (docs || []).length,
            pendientesVenta: pendingVenta,
            pendientesPago: pendingPago,
            pendientesOtros: pendingOtros,
            erroresSync: (errors || []).length,
            ultimaVentaSync
          };
        })
      );

      const agentesMapped: AgenteRow[] = (agentesRaw || []).map((a: any, idx: number) => ({
        id: String(a.Id ?? a.ID_Agente ?? a.id ?? a.Codigo ?? idx + 1),
        nombre: String(a.Nombre ?? a.nombre ?? a.Descripcion ?? a.descripcion ?? `Agente ${idx + 1}`),
      }));

      const pedidosMapped: AlbaranRow[] = (pedidosRaw || []).map((p: any, idx: number) => ({
        id: String(p.Id ?? p.ID_DocCli ?? p.id ?? idx + 1),
        referencia: String(p.Referencia ?? p.SerieNumero ?? p.Numero ?? '-'),
        cliente: String(p.NombreCliente ?? p.Cliente ?? p.RazonSocial ?? 'Cliente'),
        fecha: String(p.Fecha ?? p.fecha ?? '-'),
        total: normalizeMoney(p.TotalImporte ?? p.Total ?? p.Importe ?? 0),
        vendedor: String(p.Agente ?? p.NombreAgente ?? p.Vendedor ?? p.CodigoAgente ?? '-'),
        source: 'ERP',
        raw: p,
      }));

      const infoErr = ventasService.getLastHistorialInfoError?.();
      let finalAlbaranes = pedidosMapped;
      let warningMsg = '';

      if (infoErr?.Codigo && infoErr.Codigo !== 0) {
        if (infoErr.Codigo === 20) {
          warningMsg = 'Sincronización de Historial no disponible (Módulo ERP no contratado)';
        } else {
          warningMsg = `ERP respondió: [${infoErr.Codigo}] ${infoErr.Descripcion || 'Sin detalle'}`;
        }

        // Fallback: si el endpoint de historial está bloqueado por licencia (ej. módulo no contratado),
        // mostrar ventas locales por vendedor para no dejar el panel vacío.
        const fromDate = from;
        const toDate = today;
        const localRows: AlbaranRow[] = [];

        for (const v of (vendedoresLocales || [])) {
          const notas = (await storageService.getItem<any[]>(`notasVenta__${v.id}`)) || [];
          const queue = (await storageService.getItem<SyncOperation[]>(`syncQueue__${v.id}`)) || [];
          const errors = (await storageService.getItem<SyncError[]>(`syncErrors__${v.id}`)) || [];
          const pendingVentaIds = new Set(
            queue
              .filter((q) => q.type === 'venta' && (q.status === 'pending' || q.status === 'error'))
              .map((q) => String(q.data?.id || '').trim())
              .filter(Boolean)
          );
          const errorVentaIds = new Set(
            errors
              .filter((e) => e.operation?.type === 'venta')
              .map((e) => String(e.operation?.data?.id || '').trim())
              .filter(Boolean)
          );

          notas.forEach((n: any) => {
            const fechaRaw = String(n.fecha || '');
            const fechaParsed = parseDateFlexible(fechaRaw);
            const inRange = !fechaParsed || (fechaParsed >= fromDate && fechaParsed <= toDate);
            if (!inRange) return;
            const notaId = String(n.id || '').trim();
            const isPending = !!notaId && (pendingVentaIds.has(notaId) || errorVentaIds.has(notaId));

            localRows.push({
              id: String(n.id || `LOCAL-${v.id}-${Date.now()}`),
              referencia: String(n.id || n.referencia || 'LOCAL'),
              cliente: String(n.cliente || n.clienteNombre || 'Cliente'),
              fecha: fechaRaw || '-',
              total: normalizeMoney(n.totalesNumericos?.total ?? n.total ?? n.precio ?? 0),
              vendedor: v.nombre,
              source: isPending ? 'LOCAL' : 'LOCAL_SYNCED',
              raw: n
            });
          });
        }

        // Fallback adicional: notas globales/legacy sin namespacing por vendedor.
        if (localRows.length === 0) {
          const notasGlobales = (await storageService.getItem<any[]>('notasVenta')) || [];
          notasGlobales.forEach((n: any, idx: number) => {
            const fechaRaw = String(n.fecha || '');
            const fechaParsed = parseDateFlexible(fechaRaw);
            const inRange = !fechaParsed || (fechaParsed >= fromDate && fechaParsed <= toDate);
            if (!inRange) return;

            localRows.push({
              id: String(n.id || `LOCAL-GLOBAL-${idx}`),
              referencia: String(n.id || n.referencia || 'LOCAL'),
              cliente: String(n.cliente || n.clienteNombre || 'Cliente'),
              fecha: fechaRaw || '-',
              total: normalizeMoney(n.totalesNumericos?.total ?? n.total ?? n.precio ?? 0),
              vendedor: String(n.vendedorNombre || n.vendedorId || 'GLOBAL'),
              source: 'LOCAL',
              raw: n
            });
          });
        }

        if (localRows.length > 0) {
          finalAlbaranes = localRows;
          warningMsg += ` · Mostrando ${localRows.length} albaranes desde almacenamiento local.`;
        }
      }

      setAgentes(agentesMapped);
      setLocalVendedores(vendedoresLocales || []);
      setAlbaranes(finalAlbaranes);
      setVendorStats(stats);
      setHistorialWarning(warningMsg);
      setLastSync(new Date().toLocaleString('es-ES'));
    } catch (error: any) {
      Alert.alert('Error', `No se pudo cargar la información de administración.\n${error?.message || ''}`);
    } finally {
      setLoading(false);
    }
  }, [daysBack]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const headerSubtitle = useMemo(() => {
    const email = userSession?.email || 'admin';
    return `${email} · Última actualización: ${lastSync}`;
  }, [userSession?.email, lastSync]);

  const agentesFiltrados = useMemo(() => {
    const q = searchAgente.trim().toLowerCase();
    if (!q) return agentes;
    return agentes.filter(a => a.nombre.toLowerCase().includes(q) || a.id.toLowerCase().includes(q));
  }, [agentes, searchAgente]);

  /** Evita chips duplicados por el mismo código de agente en almacén local. */
  const vendedoresParaAsignacionTablet = useMemo(() => {
    const active = localVendedores.filter(v => v.activo !== false);
    const seenCodigo = new Set<string>();
    const out: typeof localVendedores = [];
    for (const v of active) {
      const c = String(v.codigo ?? '').trim();
      if (c && seenCodigo.has(c)) continue;
      if (c) seenCodigo.add(c);
      out.push(v);
    }
    return out.sort((a, b) =>
      String(a.codigo || '').localeCompare(String(b.codigo || ''), undefined, { numeric: true })
    );
  }, [localVendedores]);

  const localVendedoresFiltrados = useMemo(() => {
    const q = searchAgente.trim().toLowerCase();
    if (!q) return localVendedores;
    return localVendedores.filter((v) =>
      v.nombre.toLowerCase().includes(q) ||
      v.codigo.toLowerCase().includes(q) ||
      v.id.toLowerCase().includes(q) ||
      v.sessionId.toLowerCase().includes(q)
    );
  }, [localVendedores, searchAgente]);

  const albaranesFiltrados = useMemo(() => {
    const q = debouncedSearchAlbaran.trim().toLowerCase();
    return albaranes.filter(p => {
      const bySearch = !q || (
        p.referencia.toLowerCase().includes(q) ||
        p.cliente.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.vendedor.toLowerCase().includes(q)
      );
      const byVendedor = vendedorFiltro === 'todos' || p.vendedor === vendedorFiltro;
      const bySource =
        sourceFilter === 'todos' ||
        (sourceFilter === 'erp' && p.source === 'ERP') ||
        (sourceFilter === 'pendientes' && p.source === 'LOCAL') ||
        (sourceFilter === 'sync' && p.source === 'LOCAL_SYNCED');
      return bySearch && byVendedor && bySource;
    });
  }, [albaranes, debouncedSearchAlbaran, vendedorFiltro, sourceFilter]);

  const albaranesOrdenados = useMemo(() => {
    const rows = [...albaranesFiltrados];
    rows.sort((a, b) => {
      let diff = 0;
      if (sortField === 'cliente') {
        diff = a.cliente.localeCompare(b.cliente, 'es', { sensitivity: 'base' });
      } else if (sortField === 'total') {
        diff = moneyToNumber(a.total) - moneyToNumber(b.total);
      } else {
        const da = parseDateFlexible(a.fecha)?.getTime() || 0;
        const db = parseDateFlexible(b.fecha)?.getTime() || 0;
        diff = da - db;
      }
      return sortDir === 'asc' ? diff : -diff;
    });
    return rows;
  }, [albaranesFiltrados, sortField, sortDir]);

  const albaranesVisibles = useMemo(() => {
    return albaranesOrdenados.slice(0, albaranesLimit);
  }, [albaranesOrdenados, albaranesLimit]);

  const canManage = permissionMode === 'full';

  const vendedoresDisponibles = useMemo(() => {
    const uniq = Array.from(new Set(albaranes.map(a => a.vendedor).filter(Boolean)));
    return uniq.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [albaranes]);

  const dashboardTotals = useMemo(() => {
    const base = {
      ventas: 0,
      cobros: 0,
      gastos: 0,
      docs: 0,
      pendientes: 0,
      errores: 0,
      vendorsOk: 0,
      vendorsWarning: 0,
      vendorsError: 0,
    };

    return vendorStats.reduce((acc, v) => {
      acc.ventas += v.ventasLocal;
      acc.cobros += v.cobrosLocal;
      acc.gastos += v.gastosLocal;
      acc.docs += v.docsLocal;
      acc.pendientes += v.pendientesVenta + v.pendientesPago + v.pendientesOtros;
      acc.errores += v.erroresSync;

      const health = getVendorHealth(v);
      if (health === 'ok') acc.vendorsOk += 1;
      if (health === 'warning') acc.vendorsWarning += 1;
      if (health === 'error') acc.vendorsError += 1;
      return acc;
    }, base);
  }, [vendorStats]);

  const sourceCounters = useMemo(() => {
    return albaranes.reduce(
      (acc, row) => {
        acc.total += 1;
        if (row.source === 'ERP') acc.erp += 1;
        if (row.source === 'LOCAL') acc.pendientes += 1;
        if (row.source === 'LOCAL_SYNCED') acc.sync += 1;
        return acc;
      },
      { total: 0, erp: 0, pendientes: 0, sync: 0 }
    );
  }, [albaranes]);

  const bars = useMemo(() => {
    const max = Math.max(
      dashboardTotals.ventas || 0,
      dashboardTotals.cobros || 0,
      dashboardTotals.gastos || 0,
      1
    );
    return [
      { key: 'ventas', label: 'Ventas', value: dashboardTotals.ventas, color: '#2563eb', width: `${(dashboardTotals.ventas / max) * 100}%` },
      { key: 'cobros', label: 'Cobros', value: dashboardTotals.cobros, color: '#16a34a', width: `${(dashboardTotals.cobros / max) * 100}%` },
      { key: 'gastos', label: 'Gastos', value: dashboardTotals.gastos, color: '#dc2626', width: `${(dashboardTotals.gastos / max) * 100}%` },
    ];
  }, [dashboardTotals]);

  const vendorHealthByName = useMemo(() => {
    const map = new Map<string, 'ok' | 'warning' | 'error'>();
    vendorStats.forEach((v) => map.set(v.nombre, getVendorHealth(v)));
    return map;
  }, [vendorStats]);

  const topRisks = useMemo(() => {
    return [...vendorStats]
      .map((v) => {
        const pending = v.pendientesVenta + v.pendientesPago + v.pendientesOtros;
        const score = (v.erroresSync * 3) + pending;
        return { ...v, pending, score };
      })
      .filter((v) => v.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [vendorStats]);

  const handleRetryVendor = async (vendorId: string, vendorName: string) => {
    try {
      setRetryingVendorId(vendorId);
      await syncService.setVendor(vendorId);
      // Forzamos el reintento reseteando contadores internos de la cola
      await syncService.processQueue(true); 
      await loadData();
      Alert.alert('Sincronización iniciada', `Se han reintentado los envíos pendientes de ${vendorName}.`);
    } catch (error: any) {
      Alert.alert('Error', `No se pudo reintentar la subida de ${vendorName}.\n${error?.message || ''}`);
    } finally {
      setRetryingVendorId(null);
    }
  };

  const handleClearSyncErrors = async (vendorId: string, vendorName: string) => {
    try {
      await syncService.setVendor(vendorId);
      await syncService.clearErrors();
      await loadData();
      Alert.alert('Limpieza completada', `Se eliminó el historial de errores de ${vendorName}.`);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo limpiar el historial de errores.');
    }
  };

  const handleClearSyncQueue = async (vendorId: string, vendorName: string) => {
    Alert.alert(
      '¿Vaciar cola de envíos?',
      `Se eliminarán solo los envíos pendientes al ERP para ${vendorName} (esa subida ya no se realizará). No se borran notas, cobros ni gastos almacenados en el dispositivo; el resumen del día / liquidación en efectivo no se resetea.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Vaciar y Limpiar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await syncService.setVendor(vendorId);
              await syncService.clearQueue();
              await syncService.clearErrors();
              await loadData();
              Alert.alert(
                'Cola vaciada',
                `Cola de sincronización vaciada para ${vendorName}. Los datos locales del vendedor se mantienen.`
              );
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo vaciar la cola.');
            }
          }
        }
      ]
    );
  };

  const toggleSort = (field: 'fecha' | 'total' | 'cliente') => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDir(field === 'cliente' ? 'asc' : 'desc');
  };

  const ensureManagePermission = () => {
    if (canManage) return true;
    Alert.alert('Solo visual', 'Tu perfil está en modo solo visual. Cambia a admin total para realizar esta acción.');
    return false;
  };

  const appendAdminAudit = useCallback(async (entry: Omit<AdminAuditEntry, 'id' | 'timestamp' | 'actor'>) => {
    try {
      const actor = userSession?.email || 'admin';
      const nextEntry: AdminAuditEntry = {
        id: `AUD-ADM-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        actor,
        ...entry,
      };
      const current = (await storageService.getItem<AdminAuditEntry[]>(ADMIN_AUDIT_KEY)) || [];
      const next = [nextEntry, ...current].slice(0, 100);
      await storageService.setItem(ADMIN_AUDIT_KEY, next);
      setAdminAudit(next);
    } catch {
      // No bloqueamos UI por errores de auditoría.
    }
  }, [userSession?.email]);

  /** Cada vendedor debe operar con una sesión ERP independiente; avisa si dos activos comparten sessionId. */
  const findDuplicateSessionVendor = (sessionId: string, excludeVendorId?: string): Vendedor | undefined => {
    const id = sessionId.trim();
    if (!id) return undefined;
    return localVendedores.find(
      v => v.activo !== false && v.id !== excludeVendorId && v.sessionId?.trim() === id
    );
  };

  const confirmDuplicateSessionIfAny = (sessionId: string, excludeVendorId: string | undefined, onProceed: () => void) => {
    const duplicado = findDuplicateSessionVendor(sessionId, excludeVendorId);
    if (!duplicado) {
      onProceed();
      return;
    }
    Alert.alert(
      'Sesión ERP duplicada',
      `El vendedor "${duplicado.nombre}" ya usa la sesión ERP "${sessionId}". Cada vendedor debe tener una sesión independiente en Verial. ¿Guardar igualmente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Guardar igualmente', style: 'destructive', onPress: onProceed },
      ]
    );
  };

  const handleCreateVendor = async () => {
    if (!ensureManagePermission()) return;
    const nombre = newVendorNombre.trim();
    const codigo = newVendorCodigo.trim();
    const sessionId = newVendorSession.trim() || '39';

    if (!nombre || !codigo) {
      Alert.alert('Validación', 'Debes indicar nombre y código del vendedor.');
      return;
    }

    confirmDuplicateSessionIfAny(sessionId, undefined, () => createVendor(nombre, codigo, sessionId));
  };

  const createVendor = async (nombre: string, codigo: string, sessionId: string) => {
    try {
      setCreatingVendor(true);
      await vendorService.agregarVendedor({
        nombre,
        codigo,
        sessionId,
        almacenId: newVendorAlmacen.trim() || undefined,
        activo: true,
      });
      await appendAdminAudit({ action: 'create_vendor', detail: `Creado vendedor ${nombre} (${codigo})` });
      setNewVendorNombre('');
      setNewVendorCodigo('');
      setNewVendorSession('39');
      setNewVendorAlmacen('');
      await loadData();
      Alert.alert('Vendedor creado', `${nombre} se agregó correctamente.`);
    } catch (error: any) {
      Alert.alert('Error', `No se pudo crear el vendedor.\n${error?.message || ''}`);
    } finally {
      setCreatingVendor(false);
    }
  };

  const confirmDeleteVendor = (vendor: Vendedor) => {
    if (!ensureManagePermission()) return;
    const nombre = vendor.nombre;
    const codigo = vendor.codigo;
    if (PROTECTED_VENDOR_CODES.has(codigo)) {
      appendAdminAudit({ action: 'delete_vendor_blocked', detail: `Bloqueado borrado de vendedor protegido ${nombre} (${codigo})` });
      Alert.alert('Protegido', `El vendedor ${nombre} (${codigo}) está protegido y no se puede eliminar.`);
      return;
    }

    Alert.alert(
      'Eliminar vendedor',
      `¿Deseas eliminar a ${nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            setPendingDeleteVendor(vendor);
            setPinValue('');
            setPinModalVisible(true);
          },
        },
      ]
    );
  };

  const handleToggleVendorActivo = async (vendor: Vendedor) => {
    if (!ensureManagePermission()) return;
    try {
      const nextActivo = !vendor.activo;
      const ok = await vendorService.actualizarVendedor(vendor.id, { activo: nextActivo });
      if (!ok) {
        Alert.alert('No actualizado', 'No se pudo actualizar el estado del vendedor.');
        return;
      }
      await appendAdminAudit({
        action: nextActivo ? 'create_vendor' : 'delete_vendor_blocked',
        detail: `${nextActivo ? 'Reactivado' : 'Desactivado'} vendedor ${vendor.nombre} (${vendor.codigo})`,
      });
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', `No se pudo actualizar el estado del vendedor.\n${error?.message || ''}`);
    }
  };

  const openEditVendor = (vendor: Vendedor) => {
    if (!ensureManagePermission()) return;
    setEditingVendor(vendor);
    setEditVendorNombre(vendor.nombre);
    setEditVendorCodigo(vendor.codigo);
    setEditVendorSession(vendor.sessionId);
    setEditVendorAlmacen(vendor.almacenId || '');
    setEditVendorPrinterType(vendor.printerType || 'matricial');
    setEditVendorPrinterHost(vendor.printerHost || '');
    setEditVendorPrinterPort(vendor.printerPort || '');
    setEditVendorPrinterBtAddress(vendor.printerBtAddress || '');
    setEditVendorPrinterBtName(vendor.printerBtName || '');
    setBtDevicesFound([]);
  };

  const handleAddDocumentoDrive = async () => {
    if (!ensureManagePermission()) return;
    const nombre = nuevoDocNombre.trim();
    const url = nuevoDocUrl.trim();
    if (!nombre || !url) {
      Alert.alert('Validación', 'Indica un nombre y la URL de Drive del documento/carpeta.');
      return;
    }
    const nuevo = {
      id: `DRIVE-${Date.now()}`,
      nombre,
      url,
      categoria: nuevoDocCategoria.trim() || undefined,
    };
    const actuales = config.documentosDrive || [];
    await updateConfig({ documentosDrive: [...actuales, nuevo] });
    setNuevoDocNombre('');
    setNuevoDocUrl('');
    setNuevoDocCategoria('');
  };

  const handleDeleteDocumentoDrive = (id: string) => {
    if (!ensureManagePermission()) return;
    Alert.alert('Eliminar documento', '¿Quitar este documento/carpeta de la lista visible para vendedores?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const actuales = config.documentosDrive || [];
          await updateConfig({ documentosDrive: actuales.filter(d => d.id !== id) });
        },
      },
    ]);
  };

  const handleScanBtPrinters = async () => {
    setScanningBtDevices(true);
    setBtDevicesFound([]);
    try {
      const { scanDevices } = await import('../../services/printer.thermal.service');
      const devices = await scanDevices();
      setBtDevicesFound(devices);
      if (devices.length === 0) {
        Alert.alert('Sin dispositivos', 'No se encontraron impresoras Bluetooth emparejadas. Empareja la impresora desde los ajustes del sistema y vuelve a intentar.');
      }
    } catch (error: any) {
      Alert.alert('Error', `No se pudo buscar impresoras Bluetooth.\n${error?.message || 'Requiere un build nativo (no disponible en Expo Go).'}`);
    } finally {
      setScanningBtDevices(false);
    }
  };

  const saveEditVendor = async () => {
    if (!ensureManagePermission()) return;
    if (!editingVendor) return;
    const nombre = editVendorNombre.trim();
    const codigo = editVendorCodigo.trim();
    const sessionId = editVendorSession.trim();
    if (!nombre || !codigo || !sessionId) {
      Alert.alert('Validación', 'Completa nombre, código y sesión ERP.');
      return;
    }
    confirmDuplicateSessionIfAny(sessionId, editingVendor.id, () => saveEditVendorConfirmed(nombre, codigo, sessionId));
  };

  const saveEditVendorConfirmed = async (nombre: string, codigo: string, sessionId: string) => {
    if (!editingVendor) return;
    try {
      setSavingVendorEdit(true);
      const ok = await vendorService.actualizarVendedor(editingVendor.id, {
        nombre,
        codigo,
        sessionId,
        almacenId: editVendorAlmacen.trim() || undefined,
        printerType: editVendorPrinterType,
        printerHost: editVendorPrinterType === 'matricial' ? (editVendorPrinterHost.trim() || undefined) : undefined,
        printerPort: editVendorPrinterType === 'matricial' ? (editVendorPrinterPort.trim() || undefined) : undefined,
        printerBtAddress: editVendorPrinterType === 'termica_bt' ? (editVendorPrinterBtAddress.trim() || undefined) : undefined,
        printerBtName: editVendorPrinterType === 'termica_bt' ? (editVendorPrinterBtName.trim() || undefined) : undefined,
      });
      if (!ok) {
        Alert.alert('No actualizado', 'No se pudo guardar cambios del vendedor.');
        return;
      }
      await appendAdminAudit({
        action: 'create_vendor',
        detail: `Editado vendedor ${editingVendor.nombre} -> ${nombre} (${codigo})`,
      });
      setEditingVendor(null);
      await loadData();
      Alert.alert('Guardado', 'Vendedor actualizado correctamente.');
    } catch (error: any) {
      Alert.alert('Error', `No se pudo editar el vendedor.\n${error?.message || ''}`);
    } finally {
      setSavingVendorEdit(false);
    }
  };

  const executeDeleteVendor = async (vendor: Vendedor) => {
    try {
      setDeletingVendorId(vendor.id);
      const ok = await vendorService.eliminarVendedor(vendor.id);
      if (!ok) {
        Alert.alert('No eliminado', 'No se encontró el vendedor a eliminar.');
        return;
      }
      await appendAdminAudit({ action: 'delete_vendor', detail: `Eliminado vendedor ${vendor.nombre} (${vendor.codigo})` });
      await loadData();
      Alert.alert('Eliminado', `${vendor.nombre} se eliminó correctamente.`);
    } catch (error: any) {
      Alert.alert('Error', `No se pudo eliminar el vendedor.\n${error?.message || ''}`);
    } finally {
      setDeletingVendorId(null);
    }
  };

  const validatePinAndDelete = async () => {
    if (!pendingDeleteVendor) return;
    if (pinValue.trim() !== ADMIN_DELETE_PIN) {
      Alert.alert('PIN incorrecto', 'El PIN de seguridad no es válido.');
      return;
    }
    setPinModalVisible(false);
    const vendor = pendingDeleteVendor;
    setPendingDeleteVendor(null);
    setPinValue('');
    await executeDeleteVendor(vendor);
  };

  const applyPermissionMode = async (mode: 'full' | 'view') => {
    if (permissionMode === mode) return;
    setPermissionMode(mode);
    await appendAdminAudit({
      action: 'permission_change',
      detail: `Cambio de permisos a ${mode === 'full' ? 'admin total' : 'solo visual'}`,
    });
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchAlbaran(searchAlbaran), 250);
    return () => clearTimeout(t);
  }, [searchAlbaran]);

  useEffect(() => {
    const loadAudit = async () => {
      const audit = (await storageService.getItem<AdminAuditEntry[]>(ADMIN_AUDIT_KEY)) || [];
      setAdminAudit(audit);
    };
    loadAudit();
  }, []);

  useEffect(() => {
    setAlbaranesLimit(60);
  }, [searchAlbaran, vendedorFiltro, sourceFilter, daysBack, sortField, sortDir]);

  useEffect(() => {
    const loadTabletConfig = async () => {
      const saved = await storageService.getItem<any>(TABLET_CONFIG_KEY);
      if (saved) {
        setTabletEmpresa(saved.empresaNombre || '');
        setTabletAgenteId(saved.agentAsignadoId || '');
        setTabletContadorAlbaranes(String(saved.contadorAlbaranes ?? '1'));
        setTabletContadorPedidos(String(saved.contadorPedidos ?? '1'));
        setTabletContadorAdicional(String(saved.contadorAdicional ?? '1'));
        setTabletContadorOtros(String(saved.contadorOtros ?? saved.contadorPresupuesto ?? '1'));
        setTabletImpresora(saved.impresora || '');
        setTabletImpresoraPuerto(String(saved.impresoraPuerto ?? '9100'));
        setTabletEncabezado1(String(saved.encabezadoImpresion1 ?? ''));
        setTabletEncabezado2(String(saved.encabezadoImpresion2 ?? ''));
        setTabletEncabezado3(String(saved.encabezadoImpresion3 ?? ''));
        setTabletCabeceraEmpresa(String(saved.cabeceraEmpresa ?? ''));
        setTabletCabeceraDireccion(String(saved.cabeceraDireccion ?? ''));
        setTabletCabeceraTelefono(String(saved.cabeceraTelefono ?? ''));
        setTabletCabeceraMostrarVendedor(Boolean(saved.cabeceraMostrarVendedor));
      }
    };
    loadTabletConfig();
  }, []);

  const saveTabletConfig = async () => {
    setSavingTabletConfig(true);
    try {
      const prev = (await storageService.getItem<Record<string, unknown>>(TABLET_CONFIG_KEY)) || {};
      const config = {
        ...prev,
        empresaNombre: tabletEmpresa.trim(),
        agentAsignadoId: tabletAgenteId,
        contadorAlbaranes: toInt(tabletContadorAlbaranes) || 1,
        contadorPedidos: toInt(tabletContadorPedidos) || 1,
        contadorAdicional: toInt(tabletContadorAdicional) || 1,
        contadorOtros: toInt(tabletContadorOtros) || 1,
        impresora: tabletImpresora.trim(),
        impresoraPuerto: tabletImpresoraPuerto.trim().replace(/\s/g, '') || '9100',
        encabezadoImpresion1: tabletEncabezado1.trim(),
        encabezadoImpresion2: tabletEncabezado2.trim(),
        encabezadoImpresion3: tabletEncabezado3.trim(),
        cabeceraEmpresa: tabletCabeceraEmpresa.trim(),
        cabeceraDireccion: tabletCabeceraDireccion.trim(),
        cabeceraTelefono: tabletCabeceraTelefono.trim(),
        cabeceraMostrarVendedor: tabletCabeceraMostrarVendedor,
      };
      await storageService.setItem(TABLET_CONFIG_KEY, config);

      if (tabletAgenteId) {
        await storageService.setItem('vendedor_actual', tabletAgenteId);
      } else {
        await vendorService.cerrarSesion();
        await syncService.setVendor(null);
        setCurrentVendor(null);
      }

      setTabletConfigSaved(true);
      setTimeout(() => setTabletConfigSaved(false), 2500);
      Alert.alert('Configuración guardada', 'Los ajustes de la tablet se han guardado correctamente.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    } finally {
      setSavingTabletConfig(false);
    }
  };

  const handleQuitarAgenteTablet = () => {
    if (!ensureManagePermission()) return;
    if (!tabletAgenteId) {
      Alert.alert('Sin agente', 'Esta tablet no tiene un agente asignado en la configuración.');
      return;
    }
    const anteriorNombre = localVendedores.find(v => v.id === tabletAgenteId)?.nombre || tabletAgenteId;
    Alert.alert(
      'Quitar agente de esta tablet',
      `Se borrará la asignación del agente "${anteriorNombre}". Hasta que asignes otro agente y guardes la configuración, no se podrá entrar como vendedor en esta tablet. ¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar agente',
          style: 'destructive',
          onPress: async () => {
            setSavingTabletConfig(true);
            try {
              const prevCfg = (await storageService.getItem<Record<string, unknown>>(TABLET_CONFIG_KEY)) || {};
              const config = {
                ...prevCfg,
                empresaNombre: tabletEmpresa.trim(),
                agentAsignadoId: '',
                contadorAlbaranes: toInt(tabletContadorAlbaranes) || 1,
                contadorPedidos: toInt(tabletContadorPedidos) || 1,
                contadorAdicional: toInt(tabletContadorAdicional) || 1,
                contadorOtros: toInt(tabletContadorOtros) || 1,
                impresora: tabletImpresora.trim(),
                impresoraPuerto: tabletImpresoraPuerto.trim().replace(/\s/g, '') || '9100',
                encabezadoImpresion1: tabletEncabezado1.trim(),
                encabezadoImpresion2: tabletEncabezado2.trim(),
                encabezadoImpresion3: tabletEncabezado3.trim(),
              };
              await storageService.setItem(TABLET_CONFIG_KEY, config);
              await vendorService.cerrarSesion();
              await syncService.setVendor(null);
              setCurrentVendor(null);
              setTabletAgenteId('');
              await appendAdminAudit({
                action: 'clear_tablet_agent',
                detail: `Agente anterior: ${anteriorNombre}`,
              });
              Alert.alert('Hecho', 'Se ha quitado el agente asignado a esta tablet.');
            } catch {
              Alert.alert('Error', 'No se pudo actualizar la configuración.');
            } finally {
              setSavingTabletConfig(false);
            }
          },
        },
      ]
    );
  };

  const exportCsv = () => {
    if (albaranesFiltrados.length === 0) {
      Alert.alert('Exportar CSV', 'No hay albaranes para exportar.');
      return;
    }

    const header = ['ID', 'Referencia', 'Cliente', 'Fecha', 'Total', 'Vendedor', 'Origen', 'EstadoSync', 'SaludVendedor'];
    const rows = albaranesOrdenados.map((p) => {
      const health = vendorHealthByName.get(p.vendedor) || 'warning';
      const estadoSync = p.source === 'LOCAL' ? 'Pendiente' : 'Sincronizada';
      return [
        p.id,
        p.referencia,
        p.cliente,
        p.fecha,
        p.total,
        p.vendedor,
        sourceLabel(p.source),
        estadoSync,
        healthLabel(health),
      ];
    });
    const csv = [header, ...rows].map(r => r.map(csvEscape).join(';')).join('\n');

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `albaranes_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      return;
    }

    Alert.alert('Exportación', 'La exportación CSV automática está disponible en Web. Si quieres, te habilito exportación móvil en el siguiente paso.');
  };

  const exportAdminAuditCsv = () => {
    if (adminAudit.length === 0) {
      Alert.alert('Bitácora', 'No hay acciones para exportar.');
      return;
    }
    const header = ['Fecha', 'Actor', 'Accion', 'Detalle'];
    const rows = adminAudit.map((a) => [
      new Date(a.timestamp).toLocaleString('es-ES'),
      a.actor,
      a.action,
      a.detail,
    ]);
    const csv = [header, ...rows].map(r => r.map(csvEscape).join(';')).join('\n');

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bitacora_admin_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      return;
    }
    Alert.alert('Exportación', 'La exportación CSV automática está disponible en Web.');
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Deseas salir del panel administrador?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => {
          logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#092090', '#0C2ABF']} style={styles.header}>
        <Text style={styles.title}>Panel Administrador</Text>
        <Text style={styles.subtitle}>{headerSubtitle}</Text>
        <View style={[styles.heroPanel, isLandscapeTablet && styles.heroPanelLandscape]}>
          {isLandscapeTablet ? (
            <>
              <View style={styles.heroLandscapeTopRow}>
                <View style={styles.heroStatusRow}>
                  <View style={[styles.heroModeBadge, canManage ? styles.heroModeBadgeFull : styles.heroModeBadgeView]}>
                    <Text style={[styles.heroModeText, canManage ? styles.heroModeTextFull : styles.heroModeTextView]}>
                      {canManage ? 'Modo: Admin total' : 'Modo: Solo visual'}
                    </Text>
                  </View>
                  <Text style={styles.heroMetaText}>Sync: {lastSync}</Text>
                </View>
                <TouchableOpacity
                  style={styles.heroCollapseBtn}
                  onPress={() => setHeroCollapsed((prev) => !prev)}
                >
                  <Text style={styles.heroCollapseBtnText}>{heroCollapsed ? 'EXPANDIR' : 'COMPACTAR'}</Text>
                </TouchableOpacity>
              </View>
              {heroCollapsed ? (
                <View style={styles.heroCompactRow}>
                  <View style={styles.filtersRow}>
                    {['7', '30', '90'].map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.rangeChip, daysBack === d && styles.rangeChipActive]}
                        onPress={() => setDaysBack(d)}
                      >
                        <Text style={[styles.rangeChipText, daysBack === d && styles.rangeChipTextActive]}>{d}d</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.heroActionBtnLandscape]}
                    onPress={loadData}
                    disabled={loading}
                  >
                    <Text style={styles.actionBtnText}>{loading ? 'ACTUALIZANDO...' : 'ACTUALIZAR ERP'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.permissionRow}>
                    <TouchableOpacity
                      style={[styles.permissionChip, permissionMode === 'full' && styles.permissionChipActive]}
                      onPress={() => { void applyPermissionMode('full'); }}
                    >
                      <Text style={[styles.permissionChipText, permissionMode === 'full' && styles.permissionChipTextActive]}>
                        Admin total
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.permissionChip, permissionMode === 'view' && styles.permissionChipActive]}
                      onPress={() => { void applyPermissionMode('view'); }}
                    >
                      <Text style={[styles.permissionChipText, permissionMode === 'view' && styles.permissionChipTextActive]}>
                        Solo visual
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.headerActions, styles.headerActionsLandscape]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.heroActionBtnLandscape]}
                      onPress={loadData}
                      disabled={loading}
                    >
                      <Text style={styles.actionBtnText}>{loading ? 'ACTUALIZANDO...' : 'ACTUALIZAR ERP'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.heroActionBtnLandscape]}
                      onPress={exportCsv}
                    >
                      <Text style={styles.actionBtnText}>EXPORTAR CSV</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.heroActionBtnLandscape, styles.logoutBtn]}
                      onPress={handleLogout}
                    >
                      <Text style={[styles.actionBtnText, styles.logoutBtnText]}>CERRAR SESION</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          ) : (
            <>
              <View style={styles.heroStatusRow}>
                <View style={[styles.heroModeBadge, canManage ? styles.heroModeBadgeFull : styles.heroModeBadgeView]}>
                  <Text style={[styles.heroModeText, canManage ? styles.heroModeTextFull : styles.heroModeTextView]}>
                    {canManage ? 'Modo: Admin total' : 'Modo: Solo visual'}
                  </Text>
                </View>
                <Text style={styles.heroMetaText}>Última sync: {lastSync}</Text>
              </View>

              <View style={styles.heroBlock}>
                <Text style={styles.heroBlockTitle}>Rango de consulta</Text>
                <View style={styles.filtersRow}>
                  {['7', '30', '90'].map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.rangeChip, daysBack === d && styles.rangeChipActive]}
                      onPress={() => setDaysBack(d)}
                    >
                      <Text style={[styles.rangeChipText, daysBack === d && styles.rangeChipTextActive]}>{d} días</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.heroBlock}>
                <Text style={styles.heroBlockTitle}>Acciones rápidas</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.heroActionBtn, isCompactHero ? styles.heroActionBtnCompact : styles.heroActionBtnWide]}
                    onPress={loadData}
                    disabled={loading}
                  >
                    <Text style={styles.actionBtnText}>{loading ? 'ACTUALIZANDO...' : 'ACTUALIZAR ERP'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.heroActionBtn, isCompactHero ? styles.heroActionBtnCompact : styles.heroActionBtnWide]}
                    onPress={exportCsv}
                  >
                    <Text style={styles.actionBtnText}>EXPORTAR CSV</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.heroActionBtn, isCompactHero ? styles.heroActionBtnCompact : styles.heroActionBtnWide, styles.logoutBtn]}
                    onPress={handleLogout}
                  >
                    <Text style={[styles.actionBtnText, styles.logoutBtnText]}>CERRAR SESION</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.heroBlock}>
                <Text style={styles.heroBlockTitle}>Permisos</Text>
                <View style={styles.permissionRow}>
                  <TouchableOpacity
                    style={[styles.permissionChip, permissionMode === 'full' && styles.permissionChipActive]}
                    onPress={() => { void applyPermissionMode('full'); }}
                  >
                    <Text style={[styles.permissionChipText, permissionMode === 'full' && styles.permissionChipTextActive]}>
                      Admin total
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.permissionChip, permissionMode === 'view' && styles.permissionChipActive]}
                    onPress={() => { void applyPermissionMode('view'); }}
                  >
                    <Text style={[styles.permissionChipText, permissionMode === 'view' && styles.permissionChipTextActive]}>
                      Solo visual
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
          {!canManage && (!isLandscapeTablet || !heroCollapsed) && (
            <Text style={styles.readOnlyHint}>
              Modo solo visual activo: crear, editar, activar/desactivar y eliminar están bloqueados.
            </Text>
          )}
        </View>

        <View style={[styles.sectionTabs, !isCompactHero && styles.sectionTabsDesktop]}>
          <TouchableOpacity
            style={[styles.sectionTab, !isCompactHero && styles.sectionTabDesktop, activeSection === 'resumen' && styles.sectionTabActive]}
            onPress={() => setActiveSection('resumen')}
          >
            <Text style={[styles.sectionTabText, activeSection === 'resumen' && styles.sectionTabTextActive]}>RESUMEN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sectionTab, !isCompactHero && styles.sectionTabDesktop, activeSection === 'vendedores' && styles.sectionTabActive]}
            onPress={() => setActiveSection('vendedores')}
          >
            <Text style={[styles.sectionTabText, activeSection === 'vendedores' && styles.sectionTabTextActive]}>VENDEDORES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sectionTab, !isCompactHero && styles.sectionTabDesktop, activeSection === 'albaranes' && styles.sectionTabActive]}
            onPress={() => setActiveSection('albaranes')}
          >
            <Text style={[styles.sectionTabText, activeSection === 'albaranes' && styles.sectionTabTextActive]}>ALBARANES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sectionTab, !isCompactHero && styles.sectionTabDesktop, activeSection === 'configuracion' && styles.sectionTabActive]}
            onPress={() => setActiveSection('configuracion')}
          >
            <Text style={[styles.sectionTabText, activeSection === 'configuracion' && styles.sectionTabTextActive]}>CONFIGURACIÓN</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {(activeSection === 'resumen' || activeSection === 'albaranes') && (
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Ventas registradas</Text>
              <Text style={styles.kpiValue}>{dashboardTotals.ventas}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Cobros local</Text>
              <Text style={styles.kpiValue}>{dashboardTotals.cobros}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Gastos local</Text>
              <Text style={styles.kpiValue}>{dashboardTotals.gastos}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Pendientes ERP</Text>
              <Text style={styles.kpiValue}>{dashboardTotals.pendientes}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Albaranes (filtro)</Text>
              <Text style={styles.kpiValue}>{albaranesFiltrados.length}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Vendedores ERP</Text>
              <Text style={styles.kpiValue}>{agentesFiltrados.length}</Text>
            </View>
            <View style={[styles.kpiCard, styles.kpiCardOk]}>
              <Text style={styles.kpiLabel}>Salud OK</Text>
              <Text style={styles.kpiValue}>{dashboardTotals.vendorsOk}</Text>
            </View>
            <View style={[styles.kpiCard, styles.kpiCardWarn]}>
              <Text style={styles.kpiLabel}>En revisión</Text>
              <Text style={styles.kpiValue}>{dashboardTotals.vendorsWarning}</Text>
            </View>
            <View style={[styles.kpiCard, styles.kpiCardError]}>
              <Text style={styles.kpiLabel}>Con error</Text>
              <Text style={styles.kpiValue}>{dashboardTotals.vendorsError}</Text>
            </View>
          </View>
        )}

        {activeSection === 'resumen' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tendencia rápida</Text>
            <Text style={styles.cardSubtitle}>Comparativa visual del período seleccionado</Text>
            {bars.map((b) => (
              <View key={b.key} style={styles.barRow}>
                <View style={styles.barLabelWrap}>
                  <Text style={styles.barLabel}>{b.label}</Text>
                  <Text style={styles.barValue}>{b.value}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: b.width as any, backgroundColor: b.color }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {activeSection === 'resumen' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Riesgos prioritarios</Text>
            <Text style={styles.cardSubtitle}>Vendedores con mayor volumen de errores y pendientes</Text>
            {topRisks.length === 0 ? (
              <Text style={styles.emptyText}>Sin riesgos activos. Excelente estado de sincronización.</Text>
            ) : (
              topRisks.map((v, idx) => (
                <View key={`risk-${v.id}`} style={styles.riskRow}>
                  <Text style={styles.riskRank}>#{idx + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowMain}>{v.nombre}</Text>
                    <Text style={styles.rowAux}>
                      Score: {v.score} · Errores: {v.erroresSync} · Pendientes: {v.pending}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeSection === 'resumen' && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Bitácora admin</Text>
              <TouchableOpacity style={styles.miniActionBtn} onPress={exportAdminAuditCsv}>
                <Text style={styles.miniActionBtnText}>Exportar</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardSubtitle}>Últimas acciones de seguridad y gestión de vendedores</Text>
            {adminAudit.length === 0 ? (
              <Text style={styles.emptyText}>Sin acciones recientes.</Text>
            ) : (
              adminAudit.slice(0, 8).map((a) => (
                <View key={a.id} style={styles.riskRow}>
                  <Text style={styles.auditBadge}>
                    {a.action === 'create_vendor'
                      ? 'CREATE'
                      : a.action === 'delete_vendor'
                        ? 'DELETE'
                        : a.action === 'permission_change'
                          ? 'PERMISSION'
                          : a.action === 'clear_tablet_agent'
                            ? 'TABLET'
                            : 'BLOCKED'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowMain}>{a.detail}</Text>
                    <Text style={styles.rowAux}>{new Date(a.timestamp).toLocaleString('es-ES')} · {a.actor}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {(activeSection === 'resumen' || activeSection === 'vendedores') && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Estado por vendedor (local + sync)</Text>
            {vendorStats.length === 0 ? (
              <Text style={styles.emptyText}>No hay vendedores locales para resumir.</Text>
            ) : (
              vendorStats.map((v) => {
                const health = getVendorHealth(v);
                const pending = v.pendientesVenta + v.pendientesPago + v.pendientesOtros;
                return (
                  <View key={`kpi-${v.id}`} style={styles.vendorCard}>
                    <View style={styles.vendorHeader}>
                      <Text style={styles.rowMain}>{v.nombre}</Text>
                      <View
                        style={[
                          styles.healthBadge,
                          health === 'ok' && styles.healthOk,
                          health === 'warning' && styles.healthWarning,
                          health === 'error' && styles.healthError,
                        ]}
                      >
                        <Text
                          style={[
                            styles.healthBadgeText,
                            health === 'ok' && styles.healthOkText,
                            health === 'warning' && styles.healthWarningText,
                            health === 'error' && styles.healthErrorText,
                          ]}
                        >
                          {health === 'ok' ? 'OK' : health === 'warning' ? 'Pendiente' : 'Error'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.rowAux}>
                      Ventas: {v.ventasLocal} · Cobros: {v.cobrosLocal} · Gastos: {v.gastosLocal} · Docs: {v.docsLocal}
                    </Text>
                    <Text style={styles.rowAux}>
                      Pendientes ERP: {pending} (Venta: {v.pendientesVenta}, Pago: {v.pendientesPago}, Otros: {v.pendientesOtros}) · Errores: {v.erroresSync}
                    </Text>
                    <Text style={styles.rowAux}>Último envío de venta: {v.ultimaVentaSync}</Text>

                    <View style={styles.vendorActions}>
                      <TouchableOpacity
                        style={[styles.retryBtn, (!canManage || retryingVendorId === v.id) && styles.retryBtnDisabled]}
                        disabled={!canManage || retryingVendorId === v.id}
                        onPress={() => handleRetryVendor(v.id, v.nombre)}
                      >
                        <Text style={styles.retryBtnText}>
                          {retryingVendorId === v.id ? 'Sincronizando...' : '🔄 Sincronizar'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.retryBtn, styles.clearErrorBtn, !canManage && styles.retryBtnDisabled]}
                        disabled={!canManage}
                        onPress={() => handleClearSyncErrors(v.id, v.nombre)}
                      >
                        <Text style={[styles.retryBtnText, styles.clearErrorBtnText]}>Limpiar Errores</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.retryBtn, styles.clearQueueBtn, !canManage && styles.retryBtnDisabled]}
                        disabled={!canManage}
                        onPress={() => handleClearSyncQueue(v.id, v.nombre)}
                      >
                        <Text style={[styles.retryBtnText, styles.clearQueueBtnText]}>Vaciar Cola</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {(activeSection === 'vendedores') && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Vendedores</Text>
            <View style={styles.vendorForm}>
              <Text style={styles.cardSubtitle}>Crear vendedor (admin)</Text>
              <View style={styles.vendorFormRow}>
                <TextInput
                  value={newVendorNombre}
                  onChangeText={setNewVendorNombre}
                  style={[styles.searchInput, styles.vendorFormInput]}
                  placeholder="Nombre"
                  placeholderTextColor="#94a3b8"
                />
                <TextInput
                  value={newVendorCodigo}
                  onChangeText={setNewVendorCodigo}
                  style={[styles.searchInput, styles.vendorFormInputSmall]}
                  placeholder="Código"
                  placeholderTextColor="#94a3b8"
                />
                <TextInput
                  value={newVendorSession}
                  onChangeText={setNewVendorSession}
                  style={[styles.searchInput, styles.vendorFormInputSmall]}
                  placeholder="Sesión ERP"
                  placeholderTextColor="#94a3b8"
                />
                <TextInput
                  value={newVendorAlmacen}
                  onChangeText={setNewVendorAlmacen}
                  style={[styles.searchInput, styles.vendorFormInputSmall]}
                  placeholder="ID Almacén (vehículo)"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity
                  style={[styles.retryBtn, styles.createVendorBtn, (!canManage || creatingVendor) && styles.retryBtnDisabled]}
                  disabled={!canManage || creatingVendor}
                  onPress={handleCreateVendor}
                >
                  <Text style={styles.createVendorBtnText}>{creatingVendor ? 'Creando...' : 'Crear'}</Text>
                </TouchableOpacity>
              </View>
              {almacenesErp.length > 0 ? (
                <View style={{ marginTop: 6 }}>
                  <Text style={styles.configHint}>
                    Almacenes reales en Verial (toca para usar como ID Almacén — debe ser el almacén del furgón, no el código de agente):
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                    {almacenesErp.map(a => (
                      <TouchableOpacity
                        key={a.id}
                        style={[styles.filterChip, newVendorAlmacen === a.id && styles.filterChipActive, { marginRight: 6 }]}
                        onPress={() => setNewVendorAlmacen(a.id)}
                      >
                        <Text style={[styles.filterText, newVendorAlmacen === a.id && styles.filterTextActive]}>
                          [{a.id}] {a.nombre || 'Sin nombre'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <Text style={styles.configHint}>
                  No se pudo leer el catálogo de almacenes de Verial. El stock por vendedor solo será correcto si el "ID Almacén" indicado aquí coincide con un almacén real de Verial (no con el código de agente).
                </Text>
              )}
            </View>
            <TextInput
              value={searchAgente}
              onChangeText={setSearchAgente}
              style={styles.searchInput}
              placeholder="Buscar vendedor por nombre o ID"
              placeholderTextColor="#94a3b8"
            />
            {loading ? (
              <ActivityIndicator color="#0C2ABF" />
            ) : localVendedoresFiltrados.length === 0 ? (
              <Text style={styles.emptyText}>No hay vendedores disponibles.</Text>
            ) : (
              localVendedoresFiltrados.slice(0, 80).map((a) => (
                <View key={a.id} style={styles.row}>
                  <View style={styles.vendorListRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowMain}>{a.nombre}</Text>
                      <Text style={styles.rowAux}>
                        Código: {a.codigo} · Sesión: {a.sessionId}{a.almacenId ? ` · Almacén: ${a.almacenId}` : ''} · Estado: {a.activo ? 'Activo' : 'Inactivo'} · ID: {a.id}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.editVendorBtn, !canManage && styles.retryBtnDisabled]}
                      disabled={!canManage}
                      onPress={() => openEditVendor(a)}
                    >
                      <Text style={styles.editVendorBtnText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleVendorBtn, !a.activo && styles.toggleVendorBtnOff, !canManage && styles.retryBtnDisabled]}
                      disabled={!canManage}
                      onPress={() => handleToggleVendorActivo(a)}
                    >
                      <Text style={[styles.toggleVendorBtnText, !a.activo && styles.toggleVendorBtnTextOff]}>
                        {a.activo ? 'Desactivar' : 'Activar'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.deleteVendorBtn, (!canManage || deletingVendorId === a.id) && styles.retryBtnDisabled]}
                      disabled={!canManage || deletingVendorId === a.id}
                      onPress={() => confirmDeleteVendor(a)}
                    >
                      <Text style={styles.deleteVendorBtnText}>
                        {deletingVendorId === a.id ? 'Eliminando...' : 'Eliminar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {(activeSection === 'albaranes') && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Albaranes recientes</Text>
            {!!historialWarning && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{historialWarning}</Text>
              </View>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <TouchableOpacity
                style={[styles.vendorChip, vendedorFiltro === 'todos' && styles.vendorChipActive]}
                onPress={() => setVendedorFiltro('todos')}
              >
                <Text style={[styles.vendorChipText, vendedorFiltro === 'todos' && styles.vendorChipTextActive]}>Todos</Text>
              </TouchableOpacity>
              {vendedoresDisponibles.map(v => (
                <TouchableOpacity
                  key={`vendor-${v}`}
                  style={[styles.vendorChip, vendedorFiltro === v && styles.vendorChipActive]}
                  onPress={() => setVendedorFiltro(v)}
                >
                  <Text style={[styles.vendorChipText, vendedorFiltro === v && styles.vendorChipTextActive]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <TouchableOpacity
                style={[styles.sourceChip, sourceFilter === 'todos' && styles.sourceChipActive]}
                onPress={() => setSourceFilter('todos')}
              >
                <Text style={[styles.sourceChipText, sourceFilter === 'todos' && styles.sourceChipTextActive]}>
                  Todos ({sourceCounters.total})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sourceChip, sourceFilter === 'erp' && styles.sourceChipActive]}
                onPress={() => setSourceFilter('erp')}
              >
                <Text style={[styles.sourceChipText, sourceFilter === 'erp' && styles.sourceChipTextActive]}>
                  ERP ({sourceCounters.erp})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sourceChip, sourceFilter === 'pendientes' && styles.sourceChipActive]}
                onPress={() => setSourceFilter('pendientes')}
              >
                <Text style={[styles.sourceChipText, sourceFilter === 'pendientes' && styles.sourceChipTextActive]}>
                  Pendientes ({sourceCounters.pendientes})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sourceChip, sourceFilter === 'sync' && styles.sourceChipActive]}
                onPress={() => setSourceFilter('sync')}
              >
                <Text style={[styles.sourceChipText, sourceFilter === 'sync' && styles.sourceChipTextActive]}>
                  Sincronizadas ({sourceCounters.sync})
                </Text>
              </TouchableOpacity>
            </ScrollView>
            <TextInput
              value={searchAlbaran}
              onChangeText={setSearchAlbaran}
              style={styles.searchInput}
              placeholder="Buscar por referencia, cliente, vendedor o ID"
              placeholderTextColor="#94a3b8"
            />
            {loading ? (
              <ActivityIndicator color="#0C2ABF" />
            ) : albaranesFiltrados.length === 0 ? (
              <Text style={styles.emptyText}>No hay albaranes en el período consultado.</Text>
            ) : (
              <>
                <View style={styles.tableHeader}>
                  <TouchableOpacity style={styles.tableHeaderCell} onPress={() => toggleSort('fecha')}>
                    <Text style={styles.tableHeaderText}>Fecha {sortField === 'fecha' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.tableHeaderCell} onPress={() => toggleSort('cliente')}>
                    <Text style={styles.tableHeaderText}>Cliente {sortField === 'cliente' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.tableHeaderCell} onPress={() => toggleSort('total')}>
                    <Text style={styles.tableHeaderText}>Total {sortField === 'total' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</Text>
                  </TouchableOpacity>
                </View>
                {albaranesVisibles.map((p) => (
                  <TouchableOpacity key={`${p.id}-${p.referencia}`} style={styles.row} onPress={() => setSelectedAlbaran(p)}>
                    {Platform.OS === 'web' ? (
                      <View style={styles.tableRowDense}>
                        <Text style={[styles.tableCellDense, { flex: 1.1 }]}>{p.fecha}</Text>
                        <Text style={[styles.tableCellDense, { flex: 2 }]} numberOfLines={1}>{p.cliente}</Text>
                        <Text style={[styles.tableCellDense, { flex: 1.2, textAlign: 'right' }]}>{p.total}</Text>
                        <Text style={[styles.tableCellDense, { flex: 1.3 }]} numberOfLines={1}>{p.vendedor}</Text>
                        <View
                          style={[
                            styles.sourceBadge,
                            p.source === 'ERP'
                              ? styles.sourceBadgeErp
                              : p.source === 'LOCAL_SYNCED'
                                ? styles.sourceBadgeSynced
                                : styles.sourceBadgeLocal
                          ]}
                        >
                          <Text
                            style={[
                              styles.sourceBadgeText,
                              p.source === 'ERP'
                                ? styles.sourceBadgeErpText
                                : p.source === 'LOCAL_SYNCED'
                                  ? styles.sourceBadgeSyncedText
                                  : styles.sourceBadgeLocalText
                            ]}
                          >
                            {sourceLabel(p.source)}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={styles.albaranHeader}>
                          <Text style={styles.rowMain}>{p.referencia} · {p.cliente}</Text>
                          <View
                            style={[
                              styles.sourceBadge,
                              p.source === 'ERP'
                                ? styles.sourceBadgeErp
                                : p.source === 'LOCAL_SYNCED'
                                  ? styles.sourceBadgeSynced
                                  : styles.sourceBadgeLocal
                            ]}
                          >
                            <Text
                              style={[
                                styles.sourceBadgeText,
                                p.source === 'ERP'
                                  ? styles.sourceBadgeErpText
                                  : p.source === 'LOCAL_SYNCED'
                                    ? styles.sourceBadgeSyncedText
                                    : styles.sourceBadgeLocalText
                              ]}
                            >
                              {sourceLabel(p.source)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.rowAux}>{p.fecha} · {p.total} · {p.vendedor}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ))}
                {albaranesOrdenados.length > albaranesVisibles.length && (
                  <TouchableOpacity style={styles.loadMoreBtn} onPress={() => setAlbaranesLimit((p) => p + 60)}>
                    <Text style={styles.loadMoreBtnText}>
                      Mostrar más ({albaranesOrdenados.length - albaranesVisibles.length} restantes)
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
        {activeSection === 'configuracion' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Configuración de Tablet</Text>
            <Text style={styles.cardSubtitle}>
              Ajustes específicos de este dispositivo: empresa, agente asignado, contadores de documentos e impresora.
            </Text>

            {/* Identificación */}
            <View style={styles.configSection}>
              <Text style={styles.configSectionTitle}>Identificación</Text>
              <Text style={styles.configLabel}>Nombre de empresa</Text>
              <TextInput
                value={tabletEmpresa}
                onChangeText={setTabletEmpresa}
                style={styles.searchInput}
                placeholder="Ej: Teixido Flor"
                placeholderTextColor="#94a3b8"
              />
              <Text style={[styles.configLabel, { marginTop: 12 }]}>Agente asignado a esta tablet</Text>
              {localVendedores.length === 0 ? (
                <Text style={styles.emptyText}>No hay vendedores registrados. Crea uno en la pestaña VENDEDORES.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4, marginBottom: 4 }}>
                  {vendedoresParaAsignacionTablet.map(v => (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.vendorChip,
                        tabletAgenteId === v.id && styles.vendorChipActive,
                        { marginBottom: 4 }
                      ]}
                      onPress={() => setTabletAgenteId(v.id)}
                    >
                      <Text style={[styles.vendorChipText, tabletAgenteId === v.id && styles.vendorChipTextActive]}>
                        {v.nombre} ({v.codigo})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {tabletAgenteId ? (
                <Text style={styles.configHint}>
                  Agente seleccionado: {localVendedores.find(v => v.id === tabletAgenteId)?.nombre || tabletAgenteId}
                </Text>
              ) : (
                <Text style={[styles.configHint, { color: '#dc2626' }]}>Sin agente asignado</Text>
              )}
              {tabletAgenteId ? (
                <TouchableOpacity
                  style={[styles.tabletUnassignBtn, savingTabletConfig && styles.retryBtnDisabled]}
                  onPress={handleQuitarAgenteTablet}
                  disabled={savingTabletConfig}
                >
                  <Text style={styles.tabletUnassignBtnText}>Quitar agente de esta tablet</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Contadores de documentos */}
            <View style={styles.configSection}>
              <Text style={styles.configSectionTitle}>Contadores de documentos</Text>
              <Text style={styles.configSubtitle}>
                El siguiente número que se usará por tipo de documento. Al finalizar una venta nueva la app lo reserva, muestra una referencia como N000123 y envía ese mismo correlativo al ERP al sincronizar.
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { alignSelf: 'flex-start', marginBottom: 12 }]}
                onPress={() => navigation.navigate('Numeradores')}
              >
                <Text style={styles.actionBtnText}>Abrir pantalla de Numeradores</Text>
              </TouchableOpacity>
              <View style={styles.configCountersGrid}>
                <View style={styles.configCounterItem}>
                  <Text style={styles.configLabel}>Albaranes</Text>
                  <TextInput
                    value={tabletContadorAlbaranes}
                    onChangeText={setTabletContadorAlbaranes}
                    style={[styles.searchInput, styles.configCounterInput]}
                    placeholder="1"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.configCounterItem}>
                  <Text style={styles.configLabel}>Pedidos</Text>
                  <TextInput
                    value={tabletContadorPedidos}
                    onChangeText={setTabletContadorPedidos}
                    style={[styles.searchInput, styles.configCounterInput]}
                    placeholder="1"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.configCounterItem}>
                  <Text style={styles.configLabel}>Adicional</Text>
                  <TextInput
                    value={tabletContadorAdicional}
                    onChangeText={setTabletContadorAdicional}
                    style={[styles.searchInput, styles.configCounterInput]}
                    placeholder="1"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.configCounterItem}>
                  <Text style={styles.configLabel}>Presupuesto</Text>
                  <TextInput
                    value={tabletContadorOtros}
                    onChangeText={setTabletContadorOtros}
                    style={[styles.searchInput, styles.configCounterInput]}
                    placeholder="1"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            {/* Documentación compartida (Google Drive) */}
            <View style={styles.configSection}>
              <Text style={styles.configSectionTitle}>Documentación (Google Drive)</Text>
              <Text style={styles.configSubtitle}>
                Carpetas o archivos de un repositorio compartido de Google Drive que verán los vendedores en la pantalla de Documentos. Al tocarlos, se abren con la app/navegador de Drive.
              </Text>
              {(config.documentosDrive || []).map(doc => (
                <View key={doc.id} style={styles.driveDocRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driveDocNombre}>{doc.nombre}{doc.categoria ? ` · ${doc.categoria}` : ''}</Text>
                    <Text style={styles.driveDocUrl} numberOfLines={1}>{doc.url}</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteDocumentoDrive(doc.id)}>
                    <Text style={styles.deleteIcon}>🗑</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TextInput
                value={nuevoDocNombre}
                onChangeText={setNuevoDocNombre}
                style={[styles.searchInput, { marginTop: 10 }]}
                placeholder="Nombre (ej. Catálogo 2026)"
                placeholderTextColor="#94a3b8"
              />
              <TextInput
                value={nuevoDocUrl}
                onChangeText={setNuevoDocUrl}
                style={[styles.searchInput, { marginTop: 8 }]}
                placeholder="URL de Drive (carpeta o archivo compartido)"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
              <TextInput
                value={nuevoDocCategoria}
                onChangeText={setNuevoDocCategoria}
                style={[styles.searchInput, { marginTop: 8 }]}
                placeholder="Categoría (opcional, ej. Catálogos)"
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity style={[styles.actionBtn, { alignSelf: 'flex-start', marginTop: 8 }]} onPress={handleAddDocumentoDrive}>
                <Text style={styles.actionBtnText}>Añadir documento</Text>
              </TouchableOpacity>
            </View>

            {/* Encabezado documentos */}
            <View style={styles.configSection}>
              <Text style={styles.configSectionTitle}>Encabezado impreso (opcional)</Text>
              <Text style={styles.configHint}>
                Información que aparece en la cabecera de albaranes/comprobantes impresos. Si la dejas vacía se usa solo el nombre comercial habitual de la app.
              </Text>
              <Text style={[styles.configLabel, { marginTop: 10 }]}>Empresa</Text>
              <TextInput
                value={tabletCabeceraEmpresa}
                onChangeText={setTabletCabeceraEmpresa}
                style={[styles.searchInput, { minHeight: 42 }]}
                placeholder="Ej: TEIXIDO FLOR"
                placeholderTextColor="#94a3b8"
              />
              <Text style={[styles.configLabel, { marginTop: 8 }]}>Dirección</Text>
              <TextInput
                value={tabletCabeceraDireccion}
                onChangeText={setTabletCabeceraDireccion}
                style={[styles.searchInput, { minHeight: 42 }]}
                placeholder="Ej: dirección fiscal"
                placeholderTextColor="#94a3b8"
              />
              <Text style={[styles.configLabel, { marginTop: 8 }]}>Teléfono</Text>
              <TextInput
                value={tabletCabeceraTelefono}
                onChangeText={setTabletCabeceraTelefono}
                style={[styles.searchInput, { minHeight: 42 }]}
                placeholder="Ej: 600 000 000"
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity
                style={[styles.filterChip, tabletCabeceraMostrarVendedor && styles.filterChipActive, { marginTop: 10, alignSelf: 'flex-start' }]}
                onPress={() => setTabletCabeceraMostrarVendedor(v => !v)}
              >
                <Text style={[styles.filterText, tabletCabeceraMostrarVendedor && styles.filterTextActive]}>
                  {tabletCabeceraMostrarVendedor ? '✓ ' : ''}Mostrar vendedor en cabecera
                </Text>
              </TouchableOpacity>
            </View>

            {/* Impresora */}
            <View style={styles.configSection}>
              <Text style={styles.configSectionTitle}>Impresora por defecto</Text>
              <Text style={styles.configSubtitle}>
                La impresión por ahora usa el cuadro de impresión del sistema (Wi‑Fi / “Guardar PDF”). Soporte Bluetooth directo pendiente de integrar en la app (impresoras matriciales/térmicas típicamente requieren un módulo nativo BLE o el SDK del fabricante).
              </Text>
              <Text style={styles.configLabel}>IP o nombre de host (solo red LAN)</Text>
              <TextInput
                value={tabletImpresora}
                onChangeText={setTabletImpresora}
                style={styles.searchInput}
                placeholder="Ej: 192.168.1.100"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={[styles.configLabel, { marginTop: 10 }]}>Puerto RAW (usualmente 9100)</Text>
              <TextInput
                value={tabletImpresoraPuerto}
                onChangeText={setTabletImpresoraPuerto}
                style={[styles.searchInput, styles.configCounterInput]}
                placeholder="9100"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
              />
              <Text style={styles.configHint}>
                El envío directo TCP a la impresora está preparado a nivel de configuración almacenada (host/puerto). Si la demo de red no llega papel, revisa firewall, VLAN y que el driver de la impresora acepte RAW en ese puerto.
              </Text>
            </View>

            {/* Botón guardar */}
            <TouchableOpacity
              style={[styles.actionBtn, savingTabletConfig && styles.retryBtnDisabled, { alignSelf: 'stretch', marginTop: 8 }]}
              onPress={saveTabletConfig}
              disabled={savingTabletConfig}
            >
              <Text style={styles.actionBtnText}>
                {savingTabletConfig ? 'Guardando...' : tabletConfigSaved ? '✓ Guardado' : 'Guardar configuración'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!selectedAlbaran} transparent animationType="fade" onRequestClose={() => setSelectedAlbaran(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Detalle de Albarán</Text>
            {selectedAlbaran && (
              <>
                <Text style={styles.modalText}><Text style={styles.modalLabel}>ID:</Text> {selectedAlbaran.id}</Text>
                <Text style={styles.modalText}><Text style={styles.modalLabel}>Referencia:</Text> {selectedAlbaran.referencia}</Text>
                <Text style={styles.modalText}><Text style={styles.modalLabel}>Cliente:</Text> {selectedAlbaran.cliente}</Text>
                <Text style={styles.modalText}><Text style={styles.modalLabel}>Fecha:</Text> {selectedAlbaran.fecha}</Text>
                <Text style={styles.modalText}><Text style={styles.modalLabel}>Total:</Text> {selectedAlbaran.total}</Text>
                <Text style={styles.modalText}><Text style={styles.modalLabel}>Vendedor:</Text> {selectedAlbaran.vendedor}</Text>
                <Text style={styles.modalText}>
                  <Text style={styles.modalLabel}>Origen:</Text>{' '}
                  {selectedAlbaran.source === 'LOCAL_SYNCED' ? 'LOCAL (sincronizada)' : selectedAlbaran.source}
                </Text>

                <Text style={[styles.modalLabel, { marginTop: 10 }]}>Líneas:</Text>
                {extractLineas(selectedAlbaran.raw).length === 0 ? (
                  <Text style={styles.modalText}>Sin líneas detalladas en respuesta ERP.</Text>
                ) : (
                  <ScrollView style={{ maxHeight: 240, marginTop: 6 }}>
                    {extractLineas(selectedAlbaran.raw).map((l: any, i: number) => (
                      <Text key={`${selectedAlbaran.id}-l-${i}`} style={styles.modalText}>
                        {i + 1}. {String(l.NombreArticulo ?? l.Descripcion ?? l.Nombre ?? 'Línea')} ·
                        {' '}Uds: {String(l.Uds ?? l.Cantidad ?? l.Unidades ?? 0)} ·
                        {' '}Precio: {normalizeMoney(l.Precio ?? l.ImporteLinea ?? l.Total ?? 0)}
                      </Text>
                    ))}
                  </ScrollView>
                )}
              </>
            )}
            <TouchableOpacity style={[styles.actionBtn, { alignSelf: 'flex-end', marginTop: 10 }]} onPress={() => setSelectedAlbaran(null)}>
              <Text style={styles.actionBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!editingVendor} transparent animationType="fade" onRequestClose={() => setEditingVendor(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Editar vendedor</Text>
            <TextInput
              value={editVendorNombre}
              onChangeText={setEditVendorNombre}
              style={styles.searchInput}
              placeholder="Nombre"
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              value={editVendorCodigo}
              onChangeText={setEditVendorCodigo}
              style={styles.searchInput}
              placeholder="Código"
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              value={editVendorSession}
              onChangeText={setEditVendorSession}
              style={styles.searchInput}
              placeholder="Sesión ERP"
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              value={editVendorAlmacen}
              onChangeText={setEditVendorAlmacen}
              style={styles.searchInput}
              placeholder="ID Almacén (vehículo)"
              placeholderTextColor="#94a3b8"
            />
            {almacenesErp.length > 0 && (
              <View style={{ marginTop: 4 }}>
                <Text style={styles.configHint}>Almacenes reales en Verial (toca para asignar):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  {almacenesErp.map(a => (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.filterChip, editVendorAlmacen === a.id && styles.filterChipActive, { marginRight: 6 }]}
                      onPress={() => setEditVendorAlmacen(a.id)}
                    >
                      <Text style={[styles.filterText, editVendorAlmacen === a.id && styles.filterTextActive]}>
                        [{a.id}] {a.nombre || 'Sin nombre'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={[styles.modalLabel, { marginTop: 10 }]}>Impresora del vendedor</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <TouchableOpacity
                style={[styles.filterChip, editVendorPrinterType === 'matricial' && styles.filterChipActive]}
                onPress={() => setEditVendorPrinterType('matricial')}
              >
                <Text style={[styles.filterText, editVendorPrinterType === 'matricial' && styles.filterTextActive]}>Matricial (red)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, editVendorPrinterType === 'termica_bt' && styles.filterChipActive]}
                onPress={() => setEditVendorPrinterType('termica_bt')}
              >
                <Text style={[styles.filterText, editVendorPrinterType === 'termica_bt' && styles.filterTextActive]}>Térmica Bluetooth</Text>
              </TouchableOpacity>
            </View>

            {editVendorPrinterType === 'matricial' ? (
              <>
                <TextInput
                  value={editVendorPrinterHost}
                  onChangeText={setEditVendorPrinterHost}
                  style={[styles.searchInput, { marginTop: 8 }]}
                  placeholder="IP impresora (ej. 192.168.1.200)"
                  placeholderTextColor="#94a3b8"
                />
                <TextInput
                  value={editVendorPrinterPort}
                  onChangeText={setEditVendorPrinterPort}
                  style={[styles.searchInput, { marginTop: 8 }]}
                  placeholder="Puerto (ej. 9100)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                />
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, scanningBtDevices && styles.retryBtnDisabled, { marginTop: 8, alignSelf: 'flex-start' }]}
                  onPress={handleScanBtPrinters}
                  disabled={scanningBtDevices}
                >
                  <Text style={styles.actionBtnText}>{scanningBtDevices ? 'Buscando...' : 'Buscar dispositivos emparejados'}</Text>
                </TouchableOpacity>
                {btDevicesFound.map(d => (
                  <TouchableOpacity
                    key={d.inner_mac_address}
                    style={[styles.filterChip, editVendorPrinterBtAddress === d.inner_mac_address && styles.filterChipActive, { marginTop: 6, alignSelf: 'flex-start' }]}
                    onPress={() => { setEditVendorPrinterBtAddress(d.inner_mac_address); setEditVendorPrinterBtName(d.device_name); }}
                  >
                    <Text style={[styles.filterText, editVendorPrinterBtAddress === d.inner_mac_address && styles.filterTextActive]}>
                      {d.device_name} ({d.inner_mac_address})
                    </Text>
                  </TouchableOpacity>
                ))}
                {editVendorPrinterBtAddress ? (
                  <Text style={[styles.cardSubtitle, { marginTop: 6 }]}>
                    Seleccionada: {editVendorPrinterBtName || 'Impresora'} ({editVendorPrinterBtAddress})
                  </Text>
                ) : null}
              </>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={[styles.actionBtn, styles.logoutBtn]} onPress={() => setEditingVendor(null)}>
                <Text style={[styles.actionBtnText, styles.logoutBtnText]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, savingVendorEdit && styles.retryBtnDisabled]}
                disabled={savingVendorEdit}
                onPress={saveEditVendor}
              >
                <Text style={styles.actionBtnText}>{savingVendorEdit ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={pinModalVisible} transparent animationType="fade" onRequestClose={() => setPinModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Validación de seguridad</Text>
            <Text style={styles.cardSubtitle}>
              Ingresa PIN para eliminar definitivamente a {pendingDeleteVendor?.nombre || 'este vendedor'}.
            </Text>
            <TextInput
              value={pinValue}
              onChangeText={setPinValue}
              style={styles.searchInput}
              placeholder="PIN de seguridad"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              keyboardType="number-pad"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.logoutBtn]}
                onPress={() => {
                  setPinModalVisible(false);
                  setPinValue('');
                  setPendingDeleteVendor(null);
                }}
              >
                <Text style={[styles.actionBtnText, styles.logoutBtnText]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => { void validatePinAndDelete(); }}>
                <Text style={styles.actionBtnText}>Validar y eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2ff' },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 13, marginBottom: 8 },
  heroPanel: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.16)',
    padding: 8,
    gap: 8,
  },
  heroPanelLandscape: {
    gap: 6,
    padding: 8,
  },
  heroLandscapeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroCollapseBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroCollapseBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  heroCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroModeBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroModeBadgeFull: {
    borderColor: '#86efac',
    backgroundColor: '#dcfce7',
  },
  heroModeBadgeView: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  heroModeText: { fontWeight: '800', fontSize: 12 },
  heroModeTextFull: { color: '#166534' },
  heroModeTextView: { color: '#92400e' },
  heroMetaText: { color: '#dbeafe', fontSize: 11, fontWeight: '600' },
  heroBlock: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroBlockTitle: { color: '#dbeafe', fontWeight: '700', fontSize: 11, marginBottom: 5 },
  filtersRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rangeChip: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  rangeChipActive: { backgroundColor: '#fff' },
  rangeChipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  rangeChipTextActive: { color: '#0C2ABF' },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  headerActionsLandscape: { marginTop: 2 },
  permissionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  permissionChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  permissionChipActive: {
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  permissionChipText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  permissionChipTextActive: {
    color: '#0C2ABF',
  },
  readOnlyHint: {
    marginTop: 8,
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActionBtn: {
    minWidth: 132,
  },
  heroActionBtnCompact: {
    flexBasis: '100%',
    width: '100%',
  },
  heroActionBtnWide: {
    flexGrow: 1,
  },
  heroActionBtnLandscape: {
    minWidth: 138,
    paddingVertical: 7,
    minHeight: 34,
  },
  actionBtnText: { color: '#0C2ABF', fontWeight: '700', fontSize: 12 },
  logoutBtn: { backgroundColor: '#fee2e2' },
  logoutBtnText: { color: '#991b1b' },
  sectionTabs: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  sectionTabsDesktop: {
    alignSelf: 'flex-start',
  },
  sectionTab: {
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flex: 1,
    minWidth: 92,
    alignItems: 'center',
  },
  sectionTabDesktop: {
    flex: 0,
  },
  sectionTabActive: { backgroundColor: '#fff', borderColor: '#fff' },
  sectionTabText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  sectionTabTextActive: { color: '#0C2ABF' },
  content: { padding: 16, gap: 12, paddingBottom: 40, marginTop: 4 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  kpiCardOk: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  kpiCardWarn: { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  kpiCardError: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  kpiLabel: { color: '#64748b', fontSize: 12 },
  kpiValue: { color: '#0f172a', fontSize: 22, fontWeight: '700', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  cardSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  miniActionBtn: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  miniActionBtnText: {
    color: '#1d4ed8',
    fontWeight: '800',
    fontSize: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    color: '#0f172a',
  },
  vendorChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  vendorChipActive: {
    backgroundColor: '#0C2ABF',
    borderColor: '#0C2ABF',
  },
  vendorChipText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 12,
  },
  vendorChipTextActive: {
    color: '#fff',
  },
  row: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 10 },
  vendorCard: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 10,
    gap: 4,
  },
  vendorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  healthBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  healthBadgeText: { fontSize: 11, fontWeight: '700' },
  healthOk: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  healthWarning: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  healthError: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  healthOkText: { color: '#166534' },
  healthWarningText: { color: '#92400e' },
  healthErrorText: { color: '#991b1b' },
  vendorActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  retryBtn: {
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  retryBtnDisabled: {
    opacity: 0.7,
  },
  retryBtnText: { color: '#1d4ed8', fontWeight: '700', fontSize: 12 },
  albaranHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  sourceBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  sourceBadgeErp: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' },
  sourceBadgeLocal: { backgroundColor: '#ede9fe', borderColor: '#c4b5fd' },
  sourceBadgeSynced: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  sourceBadgeText: { fontSize: 11, fontWeight: '700' },
  sourceBadgeErpText: { color: '#075985' },
  sourceBadgeLocalText: { color: '#5b21b6' },
  sourceBadgeSyncedText: { color: '#166534' },
  sourceChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  sourceChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  sourceChipText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 12,
  },
  sourceChipTextActive: {
    color: '#fff',
  },
  tableHeader: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 2,
  },
  tableHeaderCell: {
    flex: 1,
  },
  tableHeaderText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  barRow: { marginBottom: 10 },
  barLabelWrap: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { color: '#334155', fontWeight: '700', fontSize: 13 },
  barValue: { color: '#0f172a', fontWeight: '800', fontSize: 13 },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 999 },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 10,
    gap: 10,
  },
  riskRank: {
    width: 30,
    textAlign: 'center',
    color: '#1e3a8a',
    fontWeight: '800',
    fontSize: 13,
  },
  auditBadge: {
    minWidth: 64,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    color: '#334155',
    fontWeight: '800',
    fontSize: 10,
    overflow: 'hidden',
  },
  tableRowDense: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tableCellDense: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
  },
  vendorForm: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
  },
  vendorFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  vendorFormInput: {
    flex: 1,
    minWidth: 180,
    marginBottom: 0,
    backgroundColor: '#fff',
  },
  vendorFormInputSmall: {
    width: 110,
    marginBottom: 0,
    backgroundColor: '#fff',
  },
  createVendorBtn: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  createVendorBtnText: {
    color: '#1e40af',
    fontWeight: '800',
    fontSize: 12,
  },
  vendorListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editVendorBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  editVendorBtnText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 12,
  },
  toggleVendorBtn: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  toggleVendorBtnOff: {
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
  },
  toggleVendorBtnText: {
    color: '#166534',
    fontWeight: '800',
    fontSize: 12,
  },
  toggleVendorBtnTextOff: {
    color: '#92400e',
  },
  deleteVendorBtn: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  deleteVendorBtnText: {
    color: '#b91c1c',
    fontWeight: '800',
    fontSize: 12,
  },
  loadMoreBtn: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
  },
  loadMoreBtnText: {
    color: '#1d4ed8',
    fontWeight: '800',
    fontSize: 12,
  },
  rowMain: { fontSize: 15, color: '#0f172a', fontWeight: '600' },
  rowAux: { fontSize: 13, color: '#64748b', marginTop: 2 },
  emptyText: { color: '#64748b', fontSize: 14, paddingVertical: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  modalLabel: { fontWeight: '700', color: '#0f172a' },
  modalText: { fontSize: 14, color: '#334155', marginBottom: 4 },
  warningBox: {
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  warningText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '600',
  },
  clearErrorBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  clearErrorBtnText: {
    color: '#dc2626',
  },
  clearQueueBtn: {
    backgroundColor: '#fff7ed',
    borderColor: '#ffedd5',
  },
  clearQueueBtnText: {
    color: '#ea580c',
  },
  configSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  configSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  configSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 10,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  configHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  driveDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  driveDocNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  driveDocUrl: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  deleteButton: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  deleteIcon: {
    fontSize: 16,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  filterChipActive: {
    backgroundColor: '#0C2ABF',
    borderColor: '#0C2ABF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#697b92',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  tabletUnassignBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  tabletUnassignBtnText: {
    color: '#991b1b',
    fontWeight: '700',
    fontSize: 14,
  },
  configCountersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  configCounterItem: {
    flex: 1,
    minWidth: 120,
  },
  configCounterInput: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
});

