/**
 * Resumen del Día Screen - CON BORRADORES Y REIMPRESIÓN
 * - Se añade pestaña "Borradores" para ver notas abiertas.
 * - Al pulsar un borrador, se navega a NuevaVenta para editar.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import { useResponsiveLayout } from '../../constants/layout';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import { Cobro, NotaVenta } from '../../types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { 
  imprimirNotaVenta, 
  imprimirComprobanteCobro, 
  NotaImpresion, 
  ComprobanteCobro 
} from '../../services/printer.matricial.service';
import {
  entidadCuentaEnLiquidacionSesion,
  getLiquidacionSesionCheckpointMs,
  setLiquidacionSesionCheckpointNow,
} from '../../services/liquidacion-sesion.service';

const imgRectangle26 = require('../../../assets/blue-image-panel.png');

/** Alineado con NuevaVenta: mismo método en nota y cobro “espejo” antiguo = duplica liquidación */
const METODOS_FISCALES_CONTADO = new Set(['Efectivo', 'Talón', 'TPV – Tarjeta bancaria']);

// --- HELPERS ---

const parseDateString = (dateStr: string): number => {
    if (!dateStr) return 0;
    try {
        if (dateStr.includes('T') || dateStr.includes('Z')) {
            const parsed = new Date(dateStr);
            if (!isNaN(parsed.getTime())) {
                return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
            }
        }
        const part = dateStr.split(',')[0].trim();
        const parts = part.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            if (day && month && year && year > 1900 && year < 2100) {
                return new Date(year, month - 1, day).getTime();
            }
        }
        const fallbackDate = new Date(dateStr);
        if (!isNaN(fallbackDate.getTime())) {
            return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), fallbackDate.getDate()).getTime();
        }
    } catch (error) {
        console.warn('Error parseando fecha:', dateStr, error);
    }
    return 0;
};

const isDateInPeriod = (itemDateString: string, period: string, start: Date, end: Date): boolean => {
    const itemTime = parseDateString(itemDateString);
    if (itemTime === 0) return true; 

    const now = new Date();
    const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (period === 'Hoy') return itemTime === todayTime;
    if (period === 'Ayer') {
        const yesterday = new Date(todayTime);
        yesterday.setDate(yesterday.getDate() - 1);
        return itemTime === yesterday.getTime();
    }
    if (period === 'Semana') {
        const weekAgo = new Date(todayTime);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return itemTime >= weekAgo.getTime() && itemTime <= todayTime;
    }
    if (period === 'Mes') {
        const monthAgo = new Date(todayTime);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return itemTime >= monthAgo.getTime() && itemTime <= todayTime;
    }
    if (period === 'Rango') {
        const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
        const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
        return itemTime >= startTime && itemTime <= endTime;
    }
    return true;
};

const LiquidacionCard = ({ label, value, color, icon, signOverride = false, hint }: any) => {
    const numericValue = parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
    const displayValue = signOverride ? `-${Math.abs(numericValue).toFixed(2).replace('.', ',')}` : numericValue.toFixed(2).replace('.', ',');
    const sign = numericValue > 0 && !signOverride ? '+' : '';

    return (
        <View style={styles.liquidacionCard}>
            <Text style={styles.liquidacionIcon}>{icon}</Text>
            <View style={{flex: 1}}>
                <Text style={styles.liquidacionLabel}>{label}</Text>
                {hint ? <Text style={styles.liquidacionHint}>{hint}</Text> : null}
                <Text style={[styles.liquidacionValue, {color}]}>{sign}{displayValue} €</Text>
            </View>
        </View>
    );
};

// --- COMPONENTES DE ÍTEM ---

function StatsCard({ title, value, change, changeColor, bgGradient, titleBg }: any) {
  return (
    <View style={[styles.statCard, bgGradient && styles.statCardGradient]}>
      {bgGradient && (
        <LinearGradient
          colors={['#092090', '#0C2ABF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[styles.statBadge, { backgroundColor: titleBg || (bgGradient ? 'rgba(255,255,255,0.2)' : '#0C2ABF') }]}>
        <Text style={styles.statBadgeText} numberOfLines={1}>{title}</Text>
      </View>
      <Text style={[styles.statValue, bgGradient && { color: '#ffffff' }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statChange, { color: changeColor }]} numberOfLines={1}>{change}</Text>
    </View>
  );
}

function ContentPanel({ title, children, onAdd }: any) {
  const navigation = useNavigation<any>();
  const handleAdd = () => {
    if (title.includes('Ventas') || title.includes('Borradores')) navigation.navigate('NuevaVenta');
    else if (title.includes('Gastos')) navigation.navigate('Gastos');
    else if (onAdd) onAdd();
  };
  
  // Ocultar botón en Liquidación y Notas de Venta (solo mostrar en Borradores y Gastos)
  const showAddButton = !title.includes('Liquidación') && !title.includes('Notas de Venta');
  
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View style={{flexDirection:'row', alignItems:'center', flex:1}}>
            <Text style={styles.panelIcon}>📊</Text>
            <Text style={styles.panelTitle}>{title}</Text>
        </View>
        {showAddButton && (
          <TouchableOpacity style={styles.panelAddButton} onPress={handleAdd}>
            <Text style={styles.panelAddText}>+ Añadir</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.panelContent}>{children}</View>
    </View>
  );
}

function NotaVentaItem({ nota, onPrint }: { nota: NotaVenta, onPrint: (n: NotaVenta) => void }) {
  return (
    <View style={styles.notaItem}>
      <View style={{flex:1, gap: 4}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Text style={styles.notaId}>{nota.id}</Text>
            <View style={{backgroundColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4}}>
                <Text style={{fontSize: 12, fontWeight: '700', color: '#475569'}}>{nota.tipoNota || 'S/N'}</Text>
            </View>
            <View style={{backgroundColor: '#e0e7ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4}}>
                <Text style={{fontSize: 12, fontWeight: '600', color: '#0C2ABF'}}>{nota.formaPago || 'Efectivo'}</Text>
            </View>
        </View>
        <Text style={styles.notaCliente} numberOfLines={1}>
           {nota.clienteId ? `[${nota.clienteId}] ` : ''}{nota.cliente}
        </Text>
      </View>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
        <Text style={styles.notaPrecio}>{nota.precio}</Text>
        <TouchableOpacity onPress={() => onPrint(nota)} style={styles.miniPrintButton}>
            <Text style={{fontSize: 18}}>🖨️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// NUEVO COMPONENTE PARA BORRADORES
function BorradorItem({ nota, onContinue }: { nota: NotaVenta, onContinue: (n: NotaVenta) => void }) {
  return (
    <TouchableOpacity style={styles.borradorItem} onPress={() => onContinue(nota)}>
      <View style={{flex:1}}>
        <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
            <Text style={styles.borradorTag}>BORRADOR</Text>
            <Text style={styles.notaId}>{nota.id}</Text>
        </View>
        <Text style={styles.notaCliente} numberOfLines={1}>{nota.cliente}</Text>
        <Text style={{fontSize: 13, color: '#94a3b8'}}>{nota.fecha}</Text>
      </View>
      <View style={{alignItems: 'flex-end'}}>
        <Text style={[styles.notaPrecio, {color: '#f59e0b'}]}>{nota.precio}</Text>
        <Text style={{fontSize: 14, color: '#092090', fontWeight: '600', marginTop: 4}}>Continuar →</Text>
      </View>
    </TouchableOpacity>
  );
}

function GastoItem({ nombre, categoria, precio, imagen }: any) {
  return (
    <View style={styles.gastoItem}>
      <Image source={imagen} style={styles.gastoImage} />
      <View style={styles.gastoInfo}>
        <Text style={styles.gastoNombre} numberOfLines={1}>{nombre}</Text>
        <Text style={styles.gastoCategoria}>{categoria}</Text>
      </View>
      <Text style={styles.gastoPrecio}>{precio}</Text>
    </View>
  );
}

function CobroItem({ cobro, onPrint }: { cobro: Cobro, onPrint: (c: Cobro) => void }) {
    return (
        <View style={styles.cobroItem}>
            <View style={{flexDirection:'row', alignItems:'center', flex: 1}}>
                <Text style={styles.cobroItemIcon}>💰</Text>
                <View style={{flex: 1}}>
                    <Text style={styles.cobroItemCliente}>{cobro.cliente}</Text>
                    <Text style={styles.cobroItemNota}>{cobro.notaVentaId ? `Ref. ${cobro.notaVentaId}` : 'Directo'}</Text>
                </View>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <Text style={styles.cobroItemMonto}>{cobro.monto}</Text>
                <TouchableOpacity onPress={() => onPrint(cobro)} style={styles.miniPrintButton}>
                    <Text style={{fontSize: 18}}>🖨️</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// --- PANTALLA PRINCIPAL ---

export default function ResumenDiaScreen() {
  const navigation = useNavigation<any>();
  const { isTablet, isSmallDevice } = useResponsiveLayout();
  const { notasVenta, gastos, cobros, clientes, currentVendor } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Totales del Día'); 
  const [selectedPeriod, setSelectedPeriod] = useState('Hoy');
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [vendedorActualId, setVendedorActualId] = useState<string | null>(null);
  const [liquidacionCheckpointMs, setLiquidacionCheckpointMs] = useState<number | undefined>();
  /** Solo afecta a la pestaña Efectivo — recorta movimientos anteriores al último «cierre» */
  // Default a "sólo desde el último cierre": la liquidación se ata a la última sincronización
  // real con el ERP en vez de sumar todo el histórico del período por defecto.
  const [soloLiquidacionSesionActual, setSoloLiquidacionSesionActual] = useState(true);

  const layout = useResponsiveLayout();

  useEffect(() => {
    setVendedorActualId(currentVendor?.id || null);
    let ok = true;
    (async () => {
      const ck = await getLiquidacionSesionCheckpointMs(currentVendor?.id ?? null);
      if (!ok) return;
      setLiquidacionCheckpointMs(ck);
      setSoloLiquidacionSesionActual(!!(ck !== undefined && ck > 0));
    })();
    return () => { ok = false; };
  }, [currentVendor?.id]);

  // --- HANDLERS ---

  const handlePrintNota = async (nota: NotaVenta) => {
    try {
        const clienteFull = clientes.find(c => c.id === nota.clienteId || c.nombre === nota.cliente);
        const datosImpresion: NotaImpresion = {
            id: nota.id,
            cliente: {
                codigo: clienteFull?.codigo || clienteFull?.id || nota.clienteId || '',
                nombre: nota.cliente,
                razonSocial: clienteFull?.empresa,
                nif: clienteFull?.nif,
                direccion: clienteFull?.direccion,
                telefono: clienteFull?.telefono
            },
            articulos: (nota.items || (nota as any).articulos || []).map((art: any) => ({
                nombre: art.nombre,
                cantidad: art.cantidad,
                precioUnitario: art.precioUnitario,
                descuento: art.descuento,
                tipoDescuento: art.tipoDescuento,
                nota: art.nota
            })),
            totales: nota.totalesNumericos ? {
                subtotal: nota.totalesNumericos.subtotal.toFixed(2),
                descuentos: nota.totalesNumericos.descuentos.toFixed(2),
                iva: nota.totalesNumericos.iva.toFixed(2),
                total: nota.totalesNumericos.total.toFixed(2),
                base: nota.totalesNumericos.base.toFixed(2),
                porcentajeDescuento: nota.descGlobal || '0'
            } : {
                descuentos: '0,00',
                iva: '0,00',
                total: nota.precio || '0,00'
            },
            tipoNota: nota.tipoNota,
            formaPago: nota.formaPago,
            fecha: nota.fecha
        };
        await imprimirNotaVenta(datosImpresion);
        Alert.alert('Impresión', 'Nota enviada a la impresora');
    } catch (error) {
        Alert.alert('Error', 'No se pudo reimprimir la nota');
    }
  };

  const handlePrintCobro = async (cobro: Cobro) => {
    try {
        const clienteFull = clientes.find(c => c.id === cobro.clienteId || c.nombre === cobro.cliente);
        const montoNum = parseFloat(cobro.monto.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
        // Buscar la nota de venta original para obtener los productos
        const notaOriginal = notasVenta.find(n => n.id === cobro.notaVentaId);
        const articulos = notaOriginal?.items?.map((art: any) => ({
          nombre: art.nombre || '',
          cantidad: parseFloat(art.cantidad || 0),
          precioUnitario: parseFloat(art.precioUnitario || 0),
          descuento: art.descuento || 0,
          tipoDescuento: art.tipoDescuento || 'porcentaje'
        })) || [];
        
        const comprobante: ComprobanteCobro = {
            cobroId: cobro.id,
            cliente: {
                nombre: cobro.cliente,
                empresa: clienteFull?.empresa,
                codigo: clienteFull?.codigo || clienteFull?.id,
                direccion: clienteFull?.direccion,
                nif: clienteFull?.nif
            },
            notas: [{
                id: cobro.notaVentaId || 'S/N',
                client: cobro.cliente,
                date: cobro.fecha,
                amount: montoNum,
                articulos: articulos
            }],
            metodoPago: cobro.formaPago || 'Efectivo',
            subtotal: montoNum,
            fecha: cobro.fecha
        };
        await imprimirComprobanteCobro(comprobante);
        Alert.alert('Impresión', 'Recibo de cobro enviado a la impresora');
    } catch (error) {
        Alert.alert('Error', 'No se pudo reimprimir el cobro');
    }
  };

  // Acción para abrir el borrador
  const handleContinueBorrador = (nota: NotaVenta) => {
    navigation.navigate('NuevaVenta', { ventaData: nota });
  };

  const aplicarRegistrarCierreLiquidacion = async () => {
    if (!currentVendor?.id) {
      Alert.alert('Vendedor', 'Inicia sesión con el vendedor para guardar el cierre.');
      return;
    }
    const ts = await setLiquidacionSesionCheckpointNow(currentVendor.id);
    if (typeof ts === 'number' && ts > 0) {
      setLiquidacionCheckpointMs(ts);
      setSoloLiquidacionSesionActual(true);
      Alert.alert(
        'Cierre registrado',
        'La liquidación en efectivo de esta cuenta empezará a contar sólo desde los movimientos guardados después de esta hora. Puedes ver el día completo desactivando «Sólo sesión actual».'
      );
    }
  };

  const onRegistrarCierreLiquidacionTap = () => {
    Alert.alert(
      '¿Efectivo ya entregado en empresa?',
      'Marca este punto cuando hayas cerrado tu ruta entregando el efectivo. No borra datos ni la cola: solo reorganiza los totales de la pestaña Efectivo (sesión nueva). Las notas siguen apareciendo en el resto del resumen.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Registrar cierre', style: 'default', onPress: () => aplicarRegistrarCierreLiquidacion() },
      ]
    );
  };

  // --- DATOS ---

  const aplicarFiltroSesionLiq =
    soloLiquidacionSesionActual &&
    liquidacionCheckpointMs !== undefined &&
    liquidacionCheckpointMs > 0;

  const { 
    totalVentas, totalGastos, numeroVentas, ventasPendientes, clientesVisitadosHoy,
    filteredNotasVenta, filteredGastos, liquidacionData, cobrosDelDia, notasAbiertas,
    ventasDelPeriodo, gastosDelPeriodo
  } = useMemo(() => {
    const periodToFilter = (selectedPeriod === 'Hoy' || selectedPeriod === 'Ayer' || selectedPeriod === 'Semana' || selectedPeriod === 'Mes') 
      ? selectedPeriod 
      : 'Rango';
    
    // Ventas y gastos filtrados por período seleccionado
    const ventasPeriodo = notasVenta.filter(n => {
      const fechaTime = parseDateString(n.fecha || '');
      const perteneceVendedor = vendedorActualId ? (n.vendedorId === vendedorActualId) : false;
      const matchesPeriod = isDateInPeriod(n.fecha || '', periodToFilter, startDate, endDate);
      return n.estado !== 'anulada' && n.estado !== 'abierta' && perteneceVendedor && matchesPeriod;
    });
    
    const gastosPeriodo = gastos.filter(g => {
      const matchesPeriod = isDateInPeriod(g.fecha || '', periodToFilter, startDate, endDate);
      return matchesPeriod;
    });

    // Filtrar notas normales (cerradas/pendientes)
    // IMPORTANTE: Solo mostrar ventas del vendedor actual
    const filteredVentas = notasVenta.filter(n => {
        const matchesSearch = n.cliente.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPeriod = isDateInPeriod(n.fecha || '', periodToFilter, startDate, endDate);
        // Si hay vendedor actual, SOLO mostrar ventas de ese vendedor
        // Si no hay vendedorId en la nota, no mostrarla (es una nota antigua)
        const perteneceVendedor = vendedorActualId ? (n.vendedorId === vendedorActualId) : false;
        // Excluimos anuladas y abiertas (las abiertas van a su propia lista)
        return n.estado !== 'anulada' && n.estado !== 'abierta' && matchesSearch && matchesPeriod && perteneceVendedor;
    });

    // Filtrar borradores (Abiertas) - Sin filtro de fecha estricto para no perderlos
    // IMPORTANTE: Solo mostrar borradores del vendedor actual
    const filteredBorradores = notasVenta.filter(n => {
        const matchesSearch = n.cliente.toLowerCase().includes(searchTerm.toLowerCase());
        // Si hay vendedor actual, SOLO mostrar borradores de ese vendedor
        // Si no hay vendedorId en la nota, no mostrarla (es una nota antigua o de otro sistema)
        const perteneceVendedor = vendedorActualId ? (n.vendedorId === vendedorActualId) : false;
        return n.estado === 'abierta' && matchesSearch && perteneceVendedor;
    });

    const filteredGastosCalc = gastos.filter(g => {
        const matchesSearch = g.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPeriod = isDateInPeriod(g.fecha || '', periodToFilter, startDate, endDate);
        return matchesSearch && matchesPeriod;
    });
    
    // Cobros pagados del período. Se excluye el “cobro espejo” que antes se creaba
    // al finalizar ventas al contado (duplicaba efectivo con la propia venta).
    const filteredCobros = cobros.filter(c => {
        const matchesPeriod = isDateInPeriod(c.fecha || '', periodToFilter, startDate, endDate);
        return c.estado === 'pagado' && matchesPeriod;
    });

    const notasPorIdLiquidacion = new Map(notasVenta.map(n => [String(n.id), n]));
    /** No quitar cobros de notas a crédito (estadoPago pendiente aunque luego estado=cerrada). */
    const esCobroDuplicadoVentaAlContado = (c: Cobro) => {
      if (!c.notaVentaId) return false;
      const nota = notasPorIdLiquidacion.get(String(c.notaVentaId));
      if (!nota) return false;
      if (nota.estadoPago === 'pagado') return true;
      if (nota.estadoPago === 'pendiente') return false;
      // Notas antiguas sin estadoPago: el bug copiaba la forma de pago del contado en el cobro pagado junto al cierre de la venta.
      return (
        nota.estado === 'cerrada' &&
        !!nota.formaPago &&
        nota.formaPago === c.formaPago &&
        METODOS_FISCALES_CONTADO.has(nota.formaPago)
      );
    };
    const cobrosLiquidaYLista = filteredCobros.filter(c => !esCobroDuplicadoVentaAlContado(c));

    const parsePrecio = (valor: string): number => {
        if (!valor) return 0;
        let sanitized = valor.replace(/[€\s]/g, '').trim();
        if (sanitized.includes(',') && sanitized.includes('.')) {
            sanitized = sanitized.replace(/\./g, '').replace(',', '.');
        } else if (sanitized.includes(',')) {
            sanitized = sanitized.replace(',', '.');
        }
        const parsed = parseFloat(sanitized);
        return isNaN(parsed) ? 0 : parsed;
    };

    let ventasEfectivo = 0;
    let cobrosEfectivo = 0;

    filteredVentas.forEach(n => {
        if (!entidadCuentaEnLiquidacionSesion((n as any).liquidacionSesionTs, liquidacionCheckpointMs, aplicarFiltroSesionLiq)) return;
        const monto = parsePrecio(n.precio || '0');
        if (n.formaPago === 'Efectivo') ventasEfectivo += monto;
    });

    cobrosLiquidaYLista.forEach(c => {
        if (!entidadCuentaEnLiquidacionSesion((c as any).liquidacionSesionTs, liquidacionCheckpointMs, aplicarFiltroSesionLiq)) return;
        const monto = parsePrecio(c.monto || '0');
        if (c.formaPago === 'Efectivo') {
            cobrosEfectivo += monto;
        }
    });

    const gastosParaLiquidacion = filteredGastosCalc.filter(g =>
      entidadCuentaEnLiquidacionSesion((g as any).liquidacionSesionTs, liquidacionCheckpointMs, aplicarFiltroSesionLiq));

    const totalGastosLiquidacionMonto = gastosParaLiquidacion.reduce((sum, g) => sum + parsePrecio(g.precio || '0'), 0);
    const liquidacionEfectivo = ventasEfectivo + cobrosEfectivo - totalGastosLiquidacionMonto;
    const totalVentasMonto = filteredVentas.reduce((sum, n) => sum + parsePrecio(n.precio || '0'), 0);
    const totalGastosResumenMonto = filteredGastosCalc.reduce((sum, g) => sum + parsePrecio(g.precio || '0'), 0);

    // Calcular totales del período seleccionado (no solo hoy)
    const ventasPeriodoMonto = ventasPeriodo.reduce((sum, n) => sum + parsePrecio(n.precio || '0'), 0);
    const gastosPeriodoMonto = gastosPeriodo.reduce((sum, g) => sum + parsePrecio(g.precio || '0'), 0);

    return {
        totalVentas: totalVentasMonto,
        totalGastos: totalGastosResumenMonto,
        numeroVentas: filteredVentas.length,
        ventasPendientes: filteredVentas.filter(n => n.estado === 'pendiente').length,
        clientesVisitadosHoy: new Set(filteredVentas.map(n => n.clienteId || n.cliente)).size,
        filteredNotasVenta: filteredVentas,
        filteredGastos: filteredGastosCalc,
        liquidacionData: { ventasEfectivo, cobrosEfectivo, totalGastos: totalGastosLiquidacionMonto, liquidacionEfectivo },
        cobrosDelDia: cobrosLiquidaYLista,
        notasAbiertas: filteredBorradores, // Usamos la lista filtrada
        historialCambios: [],
        ventasDelPeriodo: ventasPeriodoMonto,
        gastosDelPeriodo: gastosPeriodoMonto
    };
  }, [
    notasVenta,
    gastos,
    cobros,
    searchTerm,
    selectedPeriod,
    startDate,
    endDate,
    vendedorActualId,
    liquidacionCheckpointMs,
    soloLiquidacionSesionActual,
  ]);

  // Función para imprimir el informe diario
  const handleImprimirInforme = async () => {
    try {
      const fecha = new Date().toLocaleString('es-ES');
      const html = `
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1 { color: #0C2ABF; }
            h2 { color: #1e293b; margin-top: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background: #f8fafc; }
            .pill { padding: 6px 10px; border-radius: 12px; background: #e0e7ff; display: inline-block; }
          </style>
        </head>
        <body>
          <h1>Resumen del Día</h1>
          <div class="pill">Periodo: ${selectedPeriod}</div>
          <p>Fecha reporte: ${fecha}</p>

          <h2>Totales</h2>
          <table>
            <tr><th>Métrica</th><th>Valor</th></tr>
            <tr><td>Total Ventas (${selectedPeriod})</td><td>${ventasDelPeriodo.toFixed(2).replace('.', ',')} €</td></tr>
            <tr><td>Total Gastos (${selectedPeriod})</td><td>${gastosDelPeriodo.toFixed(2).replace('.', ',')} €</td></tr>
            <tr><td>Nº Ventas</td><td>${numeroVentas}</td></tr>
            <tr><td>Ventas pendientes</td><td>${ventasPendientes}</td></tr>
            <tr><td>Borradores</td><td>${notasAbiertas.length}</td></tr>
          </table>

          <h2>Liquidación Efectivo</h2>
          <p style="font-size:12px;color:#475569">Suma el efectivo cobrado en ventas al contado y el cobrado de ventas a crédito; resta los gastos del periodo. Talón, TPV u otros medios no entran aquí. «Vaciar cola» no reinicia estos importes.</p>
          <p style="font-size:12px;color:#475569">${soloLiquidacionSesionActual && liquidacionCheckpointMs ? `Filtrando desde el último cierre registrado (${new Date(liquidacionCheckpointMs).toLocaleString('es-ES')}).` : `Vista agrupando todo el período (${selectedPeriod}) sin filtrar por último cierre.`}</p>
          <table>
            <tr><th>Concepto</th><th>Importe</th></tr>
            <tr><td>Ventas al contado (efectivo)</td><td>${liquidacionData.ventasEfectivo.toFixed(2).replace('.', ',')} €</td></tr>
            <tr><td>Cobros de crédito (efectivo)</td><td>${liquidacionData.cobrosEfectivo.toFixed(2).replace('.', ',')} €</td></tr>
            <tr><td>Gastos del período</td><td>-${liquidacionData.totalGastos.toFixed(2).replace('.', ',')} €</td></tr>
            <tr><td><strong>Efectivo neto a entregar (orientativo)</strong></td><td><strong>${liquidacionData.liquidacionEfectivo.toFixed(2).replace('.', ',')} €</strong></td></tr>
          </table>
        </body>
        </html>
      `;

      await Print.printAsync({ html });
    } catch (error: any) {
      Alert.alert('Error', `No se pudo imprimir el informe: ${error?.message || 'desconocido'}`);
    }
  };

  return (
    <ScreenWithSidebar currentScreen="ResumenDia" scrollable={true}>
      <View style={{ paddingHorizontal: layout.padding }}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Resumen del Día</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.printButton} onPress={handleImprimirInforme}>
            <Text style={styles.printButtonIcon}>🖨️</Text>
            <Text style={styles.printButtonText}>Imprimir Informe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('NuevaVenta')}>
            <Text style={styles.actionButtonText}>+ Nueva Venta</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Gastos')}>
            <Text style={styles.actionButtonText}>+ Gasto</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* FILTROS */}
      <View style={[styles.filtersRow, isSmallDevice && styles.filtersRowMobile]}>
        <View style={styles.periodButtons}>
          {['Hoy', 'Ayer', 'Semana', 'Mes'].map((periodo) => (
            <TouchableOpacity key={periodo} onPress={() => setSelectedPeriod(periodo)}>
              {selectedPeriod === periodo ? (
                <LinearGradient colors={['#092090', '#0C2ABF']} style={styles.periodButtonActive}>
                  <Text style={styles.periodTextActive}>{periodo}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.periodButton}><Text style={styles.periodText}>{periodo}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.searchBox, isSmallDevice && { width: '100%', marginTop: 10 }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput style={styles.searchInput} placeholder="Buscar..." value={searchTerm} onChangeText={setSearchTerm} />
        </View>
      </View>

      {/* TABS - Se añade "Borradores" */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['Totales del Día', 'Efectivo (Liquidación)', 'Borradores', 'Notas de Venta', 'Cobros', 'Gastos'].map((tab, index) => {
            const isActive = activeTab === tab;
            // Mostrar badge si hay borradores
            const badgeCount = tab === 'Borradores' ? notasAbiertas.length : 0;
            
            return (
                <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabButton, index > 0 && styles.tabButtonSpacing]}>
                {isActive ? (
                    <LinearGradient colors={['#092090', '#0C2ABF']} style={styles.filterTabActive}>
                    <Text style={styles.filterTabTextActive}>{tab}</Text>
                    {badgeCount > 0 && <View style={styles.tabBadgeWhite}><Text style={styles.tabBadgeTextBlue}>{badgeCount}</Text></View>}
                    </LinearGradient>
                ) : (
                    <View style={styles.filterTab}>
                        <Text style={styles.filterTabText}>{tab}</Text>
                        {badgeCount > 0 && <View style={styles.tabBadgeRed}><Text style={styles.tabBadgeTextWhite}>{badgeCount}</Text></View>}
                    </View>
                )}
                </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* VISTAS SEGÚN TAB */}
      
      {/* 1. TOTALES (según período seleccionado) */}
      {activeTab === 'Totales del Día' && (
        <View style={styles.statsGrid}>
           <TouchableOpacity style={[styles.statWrapper, isTablet ? { width: '23%' } : { width: '48%' }]} onPress={() => setActiveTab('Notas de Venta')}>
              <StatsCard title={`Ventas (${selectedPeriod})`} value={`${ventasDelPeriodo.toFixed(2).replace('.', ',')} €`} change="Total facturado" changeColor="#91e600" bgGradient={true} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statWrapper, isTablet ? { width: '23%' } : { width: '48%' }]} onPress={() => setActiveTab('Gastos')}>
              <StatsCard title={`Gastos (${selectedPeriod})`} value={`${gastosDelPeriodo.toFixed(2).replace('.', ',')} €`} change="Total gastos" changeColor="#f59f0a" titleBg="#0C2ABF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statWrapper, isTablet ? { width: '23%' } : { width: '48%' }]}>
              <StatsCard title="Nº Ventas" value={numeroVentas.toString()} change={ventasPendientes > 0 ? `${ventasPendientes} pendientes` : 'Cerrado'} changeColor="#91e600" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statWrapper, isTablet ? { width: '23%' } : { width: '48%' }]} onPress={() => setActiveTab('Borradores')}>
              <StatsCard title="Borradores" value={notasAbiertas.length.toString()} change="Notas sin cerrar" changeColor="#f59e0b" />
            </TouchableOpacity>
        </View>
      )}

      {/* 2. LIQUIDACIÓN */}
      {activeTab === 'Efectivo (Liquidación)' && (
        <View style={styles.fullWidthPanel}>
            <ContentPanel title="Resumen de Liquidación en Efectivo">
                <View style={styles.liquidacionSesionTools}>
                  <View style={styles.sesionChipsWrap}>
                    <TouchableOpacity
                      style={[styles.sesionChip, soloLiquidacionSesionActual && styles.sesionChipActive]}
                      onPress={() => setSoloLiquidacionSesionActual(true)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.sesionChipText, soloLiquidacionSesionActual && styles.sesionChipTextActive]}>
                        Sólo después del último cierre
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sesionChip, !soloLiquidacionSesionActual && styles.sesionChipActive]}
                      onPress={() => setSoloLiquidacionSesionActual(false)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.sesionChipText, !soloLiquidacionSesionActual && styles.sesionChipTextActive]}>
                        Todo el periodo seleccionado
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.checkpointHint}>
                    {liquidacionCheckpointMs !== undefined && liquidacionCheckpointMs > 0
                      ? `Último registro de cierre de efectivo: ${new Date(liquidacionCheckpointMs).toLocaleString('es-ES')}` +
                          (soloLiquidacionSesionActual ? ' · contando sólo nuevos cobros/notas desde entonces.' : ' · usando todo el período igualmente.')
                      : `Todavía no hay ningún «cierre de sesión»: activa «Sólo después del último cierre» y pulsa el botón inferior tras entregar el efectivo; los movimientos sin hora de guardado no entran en ese modo.`}
                  </Text>
                  <TouchableOpacity style={styles.cierreLiqBtn} onPress={onRegistrarCierreLiquidacionTap} activeOpacity={0.9}>
                    <Text style={styles.cierreLiqBtnText}>Efectivo entregado en empresa · nueva sesión</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.liquidacionInfoBox}>
                  <Text style={styles.liquidacionInfoTitle}>¿Qué significa este resumen?</Text>
                  <Text style={styles.liquidacionInfoText}>
                    Es una <Text style={styles.liquidacionInfoBold}>estimación del efectivo</Text> que tendrías en la caja al cierre del periodo elegido (Hoy, Ayer…), según lo registrado en la app.
                  </Text>
                  <Text style={styles.liquidacionInfoBullet}>
                    • <Text style={styles.liquidacionInfoBold}>Ventas al contado (efectivo):</Text> notas cerradas con forma de pago «Efectivo» (el cliente pagó al momento).
                  </Text>
                  <Text style={styles.liquidacionInfoBullet}>
                    • <Text style={styles.liquidacionInfoBold}>Cobros de crédito (efectivo):</Text> dinero cobrado en efectivo por facturas que se hicieron a crédito (no debe solaparse con las ventas al contado).
                  </Text>
                  <Text style={styles.liquidacionInfoBullet}>
                    • <Text style={styles.liquidacionInfoBold}>Gastos:</Text> importe de gastos del mismo periodo; se restan como salida de caja (no distingue si el gasto se pagó en efectivo u otro medio).
                  </Text>
                  <Text style={styles.liquidacionInfoBullet}>
                    • <Text style={styles.liquidacionInfoBold}>Talón, TPV, transferencia…</Text> no suman en estas dos primeras filas; solo cuentan si la forma de pago de la venta o del cobro es «Efectivo».
                  </Text>
                  <Text style={[styles.liquidacionInfoText, { marginTop: 10, color: '#92400e' }]}>
                    <Text style={styles.liquidacionInfoBold}>Cierre por ruta:</Text> cuando vuelvas a la empresa a entregar efectivo puedes usar el botón anterior. Solo cambia cómo calculamos estos importes en esta pestaña; no borra notas ni albaranes locales.
                  </Text>
                  <Text style={[styles.liquidacionInfoText, { marginTop: 8, color: '#92400e' }]}>
                    <Text style={styles.liquidacionInfoBold}>Cola de sincronización:</Text> «Limpiar cola» no sustituye a un cierre de liquidación; sigue usando el botón o el opcional tras subir al ERP.
                  </Text>
                </View>
                <Text style={styles.liquidacionFormula}>
                  Efectivo ≈ Ventas efectivo contado + Cobros crédito en efectivo − Gastos
                </Text>
                <LiquidacionCard
                  label="Ventas al contado (efectivo)"
                  hint="Total de notas cerradas pagadas en efectivo al momento"
                  value={liquidacionData.ventasEfectivo.toFixed(2)}
                  color="#0C2ABF"
                  icon="📈"
                />
                <LiquidacionCard
                  label="Cobros de crédito (efectivo)"
                  hint="Cobros ya registrados en efectivo sobre ventas a crédito"
                  value={liquidacionData.cobrosEfectivo.toFixed(2)}
                  color="#10b981"
                  icon="💰"
                />
                <LiquidacionCard
                  label="Gastos del período"
                  hint="Salidas registradas en el mismo periodo (se restan del total)"
                  value={liquidacionData.totalGastos.toFixed(2)}
                  color="#dc2626"
                  icon="📉"
                  signOverride={true}
                />
                <View style={styles.liquidacionTotalCard}>
                    <Text style={styles.liquidacionTotalLabel}>Efectivo neto a entregar (orientativo)</Text>
                    <Text style={styles.liquidacionTotalValue}>{liquidacionData.liquidacionEfectivo.toFixed(2).replace('.', ',')} €</Text>
                    <Text style={styles.liquidacionTotalFoot}>
                      Para cuadrar con oficina, usa el mismo periodo que el arqueo y revisa Cobros/Gastos en las pestañas inferiores.
                    </Text>
                </View>
            </ContentPanel>
        </View>
      )}
      
      {/* 3. BORRADORES (NUEVA PESTAÑA) */}
      {activeTab === 'Borradores' && (
          <View style={styles.fullWidthPanel}>
              <ContentPanel title={`Borradores y Notas Abiertas (${notasAbiertas.length})`}>
                  {notasAbiertas.length === 0 ? 
                    <Text style={styles.emptyText}>No hay notas en borrador.</Text> : 
                    notasAbiertas.map((n, i) => (
                        <BorradorItem key={i} nota={n} onContinue={handleContinueBorrador} />
                    ))
                  }
              </ContentPanel>
          </View>
      )}

      {/* 4. GASTOS */}
      {activeTab === 'Gastos' && (
          <View style={styles.fullWidthPanel}>
              <ContentPanel title={`Gastos (${selectedPeriod})`}>
                  {filteredGastos.length === 0 ? (
                      <Text style={styles.emptyText}>No hay gastos registrados en este período.</Text>
                  ) : (
                      filteredGastos.map((gasto: any, index: number) => (
                          <GastoItem key={gasto.id || index} {...gasto} imagen={imgRectangle26} />
                      ))
                  )}
              </ContentPanel>
          </View>
      )}

      {/* 5. NOTAS DE VENTA */}
      {activeTab === 'Notas de Venta' && (
          <View style={styles.fullWidthPanel}>
              <ContentPanel title={`Notas de Venta (${selectedPeriod})`}>
                  {filteredNotasVenta.length === 0 ? 
                    <Text style={styles.emptyText}>No hay notas.</Text> : 
                    filteredNotasVenta.map((n, i) => (
                        <NotaVentaItem key={i} nota={n} onPrint={handlePrintNota} />
                    ))
                  }
              </ContentPanel>
          </View>
      )}

      {/* 6. COBROS */}
      {activeTab === 'Cobros' && (
          <View style={styles.fullWidthPanel}>
              <ContentPanel title={`Cobros (${selectedPeriod})`}>
                  {cobrosDelDia.length === 0 ? 
                    <Text style={styles.emptyText}>No hay cobros.</Text> : 
                    cobrosDelDia.map((c, i) => (
                        <CobroItem key={i} cobro={c} onPrint={handlePrintCobro} />
                    ))
                  }
              </ContentPanel>
          </View>
      )}

      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  // ... (Estilos anteriores se mantienen) ...
  header: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 16 },
  backButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: '#697b92' },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  printButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#0C2ABF', borderRadius: 30 },
  printButtonIcon: { fontSize: 20 },
  printButtonText: { fontSize: 17, fontWeight: '600', color: '#ffffff' },
  actionButton: { paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#092090', borderRadius: 30 },
  actionButtonText: { fontSize: 17, fontWeight: '600', color: '#092090' },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginVertical: 24, alignItems: 'center' },
  filtersRowMobile: { flexDirection: 'column', gap: 10 },
  periodButtons: { flexDirection: 'row', gap: 8 },
  periodButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 30, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', minWidth: 60, alignItems: 'center' },
  periodButtonActive: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 30, minWidth: 60, alignItems: 'center' },
  periodText: { fontSize: 17, fontWeight: '600', color: '#697b92' },
  periodTextActive: { fontSize: 17, fontWeight: '600', color: '#ffffff' },
  searchBox: { flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 30, height: 40, paddingHorizontal: 16, gap: 12 },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, fontSize: 18, color: '#1a1a1a', padding: 0 },
  tabsWrapper: { marginBottom: 20, width: '100%' },
  tabButton: { flexShrink: 0, marginRight: 12 },
  tabButtonSpacing: { marginLeft: 0 },
  filterTab: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 30, borderWidth: 1, borderColor: '#092090', flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterTabActive: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterTabText: { fontSize: 17, fontWeight: '600', color: '#092090' },
  filterTabTextActive: { fontSize: 17, fontWeight: '600', color: '#ffffff' },
  
  // BADGES PARA TABS
  tabBadgeRed: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  tabBadgeWhite: { backgroundColor: '#ffffff', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  tabBadgeTextWhite: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  tabBadgeTextBlue: { color: '#092090', fontSize: 14, fontWeight: 'bold' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 24 },
  statWrapper: { marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, minHeight: 130, justifyContent: 'space-between' },
  statCardGradient: { borderWidth: 0, overflow: 'hidden' },
  statBadge: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20, marginBottom: 8 },
  statBadgeText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  statValue: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  statChange: { fontSize: 16, fontWeight: '500' },
  fullWidthPanel: { width: '100%', marginBottom: 20 },
  panel: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 20 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  panelIcon: { fontSize: 22, marginRight: 8 },
  panelTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  panelAddButton: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#0C2ABF', borderRadius: 20 },
  panelAddText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  panelContent: { gap: 12 },
  notaItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, marginBottom: 8 },
  
  // ESTILOS BORRADOR ITEM
  borradorItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#fffbeb', // Fondo amarillento suave
    borderWidth: 1, 
    borderColor: '#fcd34d', // Borde amarillo/naranja
    borderRadius: 10, 
    padding: 14, 
    marginBottom: 8 
  },
  borradorTag: { fontSize: 14, fontWeight: 'bold', color: '#b45309', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginRight: 8 },

  notaId: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  notaCliente: { fontSize: 17, color: '#64748b' },
  notaPrecio: { fontSize: 19, fontWeight: '700', color: '#0C2ABF' },
  gastoItem: { flexDirection: 'row', gap: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 8, alignItems: 'center' },
  gastoImage: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#e2e8f0' },
  gastoInfo: { flex: 1 },
  gastoNombre: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  gastoCategoria: { fontSize: 16, color: '#64748b' },
  gastoPrecio: { fontSize: 19, fontWeight: '700', color: '#f59e0b' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginVertical: 20, fontStyle: 'italic', fontSize: 18 },
  liquidacionSesionTools: { marginBottom: 14 },
  sesionChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  sesionChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff' },
  sesionChipActive: { borderColor: '#092090', backgroundColor: '#e0e7ff' },
  sesionChipText: { fontSize: 15, fontWeight: '600', color: '#475569' },
  sesionChipTextActive: { color: '#092090' },
  checkpointHint: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 10 },
  cierreLiqBtn: { backgroundColor: '#092090', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', marginBottom: 8 },
  cierreLiqBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  liquidacionInfoBox: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  liquidacionInfoTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  liquidacionInfoText: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 6 },
  liquidacionInfoBold: { fontWeight: '700', color: '#334155' },
  liquidacionInfoBullet: { fontSize: 14, color: '#475569', lineHeight: 20, marginTop: 4, paddingLeft: 2 },
  liquidacionFormula: {
    fontSize: 13,
    color: '#0C2ABF',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  liquidacionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  liquidacionIcon: { fontSize: 26, marginRight: 10, marginTop: 2 },
  liquidacionLabel: { fontSize: 17, fontWeight: '700', color: '#475569' },
  liquidacionHint: { fontSize: 13, color: '#94a3b8', marginTop: 4, marginBottom: 6, lineHeight: 18 },
  liquidacionValue: { fontSize: 22, fontWeight: '700' },
  liquidacionTotalCard: { backgroundColor: '#e0e7ff', padding: 20, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: '#0C2ABF' },
  liquidacionTotalLabel: { fontSize: 20, fontWeight: '600', color: '#092090' },
  liquidacionTotalValue: { fontSize: 32, fontWeight: '800', color: '#092090', marginTop: 5 },
  liquidacionTotalFoot: { fontSize: 13, color: '#4338ca', marginTop: 10, lineHeight: 18 },
  cobroItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 8 },
  cobroItemIcon: { fontSize: 22, marginRight: 10 },
  cobroItemCliente: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  cobroItemNota: { fontSize: 16, color: '#697b92' },
  cobroItemMonto: { fontSize: 19, fontWeight: '700', color: '#092090' },
  miniPrintButton: { padding: 8, backgroundColor: '#e0e7ff', borderRadius: 20, marginLeft: 10 }
});