import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  FlatList,
  Keyboard,
  KeyboardEvent
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import SeleccionarClienteModal from '../../components/SeleccionarClienteModal';
import { vendorService } from '../../services/vendor.service';
import { ventasService } from '../../services/erp/ventas.service';
import { colors } from '../../constants/colors';
import { equivalenciaPctFromIvaArticulo } from '../../utils/fiscal.helpers';
import { reservarCorrelativoNotaLocal } from '../../services/documentCounter.service';

// New Components
import VentaForm from '../../components/ventas/VentaForm';
import VentaCartSummary from '../../components/ventas/VentaCartSummary';
import SeleccionarArticuloSidebar from '../../components/ventas/SeleccionarArticuloSidebar';

interface ArticuloVenta {
  id: string;
  articuloId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  tipoDescuento: 'porcentaje' | 'pesos';
  nota?: string;
  /** % IVA aplicable a esta línea (desde ERP) */
  porcentajeIva?: number;
}

type HistorialPedidoRow = {
  id: string;
  referencia: string;
  fecha: string;
  total: string;
  estado: string;
};

const TIPOS_NOTA = [
  { label: 'Albarán', value: 'Serie P' },
  { label: 'Adicional', value: 'Serie X' },
  { label: 'Pedido', value: 'Pedido' },
  { label: 'Presupuesto', value: 'Presupuesto' }
];

const METODOS_PAGO_CONTADO = ['Efectivo', 'Talón', 'TPV – Tarjeta bancaria'];
const METODOS_PAGO_CREDITO = ['Crédito – Pendiente', 'Giro bancario', 'Transferencia'];

const getFechaActualFormateada = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
};

const formatDateISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const normalizeMoney = (value: any): string => {
  const n = typeof value === 'number'
    ? value
    : parseFloat(String(value || '0').replace(/[^\d,.-]/g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return '0,00 €';
  return `${n.toFixed(2).replace('.', ',')} €`;
};

const normalizeDate = (value: any): string => {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const asDate = new Date(raw);
  if (!Number.isNaN(asDate.getTime())) return asDate.toLocaleDateString('es-ES');
  return raw;
};

const normalizeText = (value: any): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

export default function NuevaVentaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  const { addNotaVenta, addCobro, purgeCobrosDeNotaVenta, clientes, articulos, deleteNotaVenta, currentVendor } = useApp();

  const ventaDataInicial = route.params?.ventaData;
  const clientePreset = route.params?.clienteSeleccionado;
  const vendorIdParam = route.params?.vendorId;
  const [vendedorActualId, setVendedorActualId] = useState<string | null>(null);

  useEffect(() => {
    // Prioriza vendorId pasado por navegación; si no, usa contexto/servicio
    if (vendorIdParam) {
      setVendedorActualId(vendorIdParam);
      return;
    }
    if (currentVendor?.id) {
      setVendedorActualId(currentVendor.id);
      return;
    }
    const obtenerVendedorActual = async () => {
      const vendedor = await vendorService.getVendedorActual();
      if (vendedor) setVendedorActualId(vendedor.id);
    };
    obtenerVendedorActual();
  }, [vendorIdParam, currentVendor?.id]);

  // -- ESTADOS UI --
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [estadoPago, setEstadoPago] = useState<'pagado' | 'pendiente'>('pendiente'); 
  const [tipoNota, setTipoNota] = useState(TIPOS_NOTA[0]);
  const [formaPago, setFormaPago] = useState(''); 

  // -- ESTADOS FORMULARIO ITEMS --
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<any>(null);
  const [codigoInput, setCodigoInput] = useState('');
  const [cant, setCant] = useState('');
  const [precio, setPrecio] = useState('');
  const [enableDiscount, setEnableDiscount] = useState(false);
  const [desc, setDesc] = useState('');
  const [notaItem, setNotaItem] = useState('');

  // -- ESTADOS CARRITO --
  const [carrito, setCarrito] = useState<ArticuloVenta[]>([]);
  const [enableGlobalDiscount, setEnableGlobalDiscount] = useState(false);
  const [globalDiscountValue, setGlobalDiscountValue] = useState('');

  // -- MODALES --
  const [modalCliente, setModalCliente] = useState(false);
  const [modalArticulo, setModalArticulo] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);
  const [modalSelectorVisible, setModalSelectorVisible] = useState(false);
  const [selectorType, setSelectorType] = useState<'tipoDoc' | 'formaPago' | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialError, setHistorialError] = useState('');
  const [historialPedidos, setHistorialPedidos] = useState<HistorialPedidoRow[]>([]);

  // -- EFECTOS --
  const resetFlag = route.params?.resetFlag;

  useEffect(() => {
    if (resetFlag) {
      setClienteSeleccionado(null);
      setCarrito([]);
      setFormaPago('');
      setEstadoPago('pendiente');
      setTipoNota(TIPOS_NOTA[0]);
      setEnableGlobalDiscount(false);
      setGlobalDiscountValue('');
      resetArticuloForm();
      setIsSaved(false);
      navigation.setParams({ resetFlag: undefined, ventaData: undefined, clienteSeleccionado: undefined });
    }
  }, [resetFlag, navigation]);

  useEffect(() => {
    // Preselección por navegación (clienteSeleccionado) o por venta existente
    if (clientePreset) {
      setClienteSeleccionado(clientePreset);
    }

    if (ventaDataInicial) {
      const cli = clientes.find(c => c.id === ventaDataInicial.clienteId) || clientePreset || { 
        id: ventaDataInicial.clienteId, 
        nombre: ventaDataInicial.cliente, 
        empresa: '', 
        direccion: '' 
      };
      setClienteSeleccionado(cli);
      
      if (ventaDataInicial.items) {
        const enriched = ventaDataInicial.items.map((it: ArticuloVenta) => {
          const pct =
            typeof it.porcentajeIva === 'number' && it.porcentajeIva > 0
              ? it.porcentajeIva
              : articulos.find(a => a.id === it.articuloId)?.porcentajeIva;
          const porcentajeIva = typeof pct === 'number' && pct > 0 ? pct : 10;
          return { ...it, porcentajeIva };
        });
        setCarrito(enriched);
      }
      if (ventaDataInicial.formaPago) setFormaPago(ventaDataInicial.formaPago);
      
      const tipoFound = TIPOS_NOTA.find(t => t.value === ventaDataInicial.tipoNota);
      if (tipoFound) setTipoNota(tipoFound);
      
      const esp = ventaDataInicial.estadoPago;
      if (esp === 'pagado' || esp === 'pendiente') {
        setEstadoPago(esp);
      } else if (ventaDataInicial.estado === 'cerrada') {
        setEstadoPago('pagado');
      } else if (ventaDataInicial.estado === 'pendiente') {
        setEstadoPago('pendiente');
      }

      if (ventaDataInicial.aplicarDescGlobal) {
        setEnableGlobalDiscount(true);
        setGlobalDiscountValue(ventaDataInicial.descGlobal || '');
      }
    }
  }, [ventaDataInicial, clientePreset, clientes, articulos]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleShow = (event: KeyboardEvent) => setKeyboardHeight(event.endCoordinates?.height || 0);
    const handleHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, handleShow);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);

    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (carrito.length === 0 || isSaved || e.data.action.type === 'REPLACE') return;

      e.preventDefault();

      Alert.alert(
        'Nota sin guardar',
        '¿Tienes artículos pendientes. ¿Qué deseas hacer?',
        [
          { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
          { 
            text: 'Guardar Borrador', 
            onPress: async () => {
              await guardarTemporalmente();
              navigation.dispatch(e.data.action); 
            } 
          },
          { text: 'Seguir editando', style: 'cancel', onPress: () => {} }
        ]
      );
    });
    return unsubscribe;
  }, [navigation, carrito, isSaved, clienteSeleccionado, formaPago, enableGlobalDiscount, globalDiscountValue]);

  const metodosDisponibles = useMemo(() => {
    return estadoPago === 'pendiente' ? METODOS_PAGO_CREDITO : METODOS_PAGO_CONTADO;
  }, [estadoPago]);

  useEffect(() => {
    if (!metodosDisponibles.includes(formaPago)) {
      setFormaPago(metodosDisponibles[0]);
    }
  }, [estadoPago, metodosDisponibles]);

  // -- HANDLERS --
  const openSelector = (type: 'tipoDoc' | 'formaPago') => {
    setSelectorType(type);
    setModalSelectorVisible(true);
  };

  const handleSelection = (item: any) => {
    if (selectorType === 'tipoDoc') {
      setTipoNota(item);
    } else if (selectorType === 'formaPago') {
      // Asegura guardar solo el texto del método para evitar renders inválidos
      setFormaPago(item?.value || item);
    }
    setModalSelectorVisible(false);
  };

  const resetArticuloForm = () => {
    setArticuloSeleccionado(null);
    setCodigoInput('');
    setCant('');
    setPrecio('');
    setDesc('');
    setNotaItem('');
  };

  const handleSelectArticulo = (art: any) => {
    setArticuloSeleccionado(art);
    setCodigoInput(art.codigoCorto || art.nombre);
    setPrecio(art.precio?.toString().replace(/[€\s]/g, '').replace(',', '.') || '');
    setModalArticulo(false);
  };

  const handleSelectCliente = (cliente: any) => {
    setClienteSeleccionado(cliente);
    setModalCliente(false);
    setHistorialPedidos([]);
    setHistorialError('');
  };

  const handleOpenHistorial = async () => {
    if (!clienteSeleccionado) {
      Alert.alert('Historial', 'Selecciona primero un cliente.');
      return;
    }

    const idRaw = String(
      clienteSeleccionado?.id ??
      clienteSeleccionado?.clienteId ??
      clienteSeleccionado?.codigo ??
      ''
    ).trim();
    const idDigits = (idRaw.match(/\d+/)?.[0] || '').trim();
    const idCliente = Number(idDigits || idRaw);
    const hasNumericId = Number.isFinite(idCliente) && idCliente > 0;
    const clienteNombreNorm = normalizeText(clienteSeleccionado?.nombre);
    const clienteEmpresaNorm = normalizeText(clienteSeleccionado?.empresa);

    setModalHistorial(true);
    setHistorialLoading(true);
    setHistorialError('');
    try {
      const today = new Date();
      const from = new Date(today);
      from.setMonth(today.getMonth() - 6);

      // allareasventa=false: este cliente no tiene contratadas todas las áreas de venta de
      // Verial (ej. Mascotas) y pedirlas todas hace que el ERP rechace la consulta entera.
      const data = await ventasService.getHistorialPedidos(
        hasNumericId ? idCliente : 0,
        formatDateISO(from),
        formatDateISO(today),
        false
      );
      const infoErr = ventasService.getLastHistorialInfoError?.();
      const filtered = (data || []).filter((p: any) => {
        if (hasNumericId) return true;
        const pIdRaw = String(p.ID_Cliente ?? p.IdCliente ?? p.id_cliente ?? p.clienteId ?? '').trim();
        const pIdDigits = (pIdRaw.match(/\d+/)?.[0] || '').trim();
        const pIdNum = Number(pIdDigits || pIdRaw);
        const byId = idDigits && (pIdRaw === idRaw || pIdDigits === idDigits || (Number.isFinite(pIdNum) && String(pIdNum) === idDigits));
        const pNameNorm = normalizeText(p.NombreCliente ?? p.Cliente ?? p.RazonSocial ?? '');
        const byName = !!clienteNombreNorm && pNameNorm.includes(clienteNombreNorm);
        const byEmpresa = !!clienteEmpresaNorm && pNameNorm.includes(clienteEmpresaNorm);
        return Boolean(byId || byName || byEmpresa);
      });

      const rows: HistorialPedidoRow[] = filtered.map((p: any, idx: number) => ({
        id: String(p.Id ?? p.ID ?? p.id ?? `hist-${idx}`),
        referencia: String(p.Referencia ?? p.NumDocumento ?? p.Documento ?? p.Serie ?? '-'),
        fecha: normalizeDate(p.Fecha ?? p.FechaDocumento ?? p.FEmision ?? p.FecPedido),
        total: normalizeMoney(p.TotalImporte ?? p.Total ?? p.ImporteTotal ?? p.BaseImponible),
        estado: String(p.Estado ?? p.EstadoTexto ?? p.Situacion ?? 'N/D'),
      }));

      setHistorialPedidos(rows);
      if (rows.length === 0 && infoErr?.Descripcion) {
        setHistorialError(`ERP respondió: ${infoErr.Descripcion}`);
      }
    } catch (error: any) {
      setHistorialError(error?.message || 'No se pudo consultar el historial.');
      setHistorialPedidos([]);
    } finally {
      setHistorialLoading(false);
    }
  };

  const handleCodigoChange = (text: string) => {
    setCodigoInput(text);
    if (!text) {
      setArticuloSeleccionado(null);
      return;
    }
    // Evita buscar con 1 solo carácter para no sobrecargar
    if (text.length < 2) return;

    const normalized = text.toLowerCase();
    const match = articulos.find(a =>
      (a.codigoCorto && a.codigoCorto.toLowerCase() === normalized) ||
      (a.id && a.id.toLowerCase() === normalized)
    );

    if (match) {
      setArticuloSeleccionado(match);
      setPrecio(match.precio?.toString().replace(/[€\s]/g, '').replace(',', '.') || '');
    }
  };

  const agregarAlCarrito = () => {
    let artFinal = articuloSeleccionado;
    if (!artFinal && codigoInput) {
      artFinal = articulos.find(a => a.nombre.toLowerCase() === codigoInput.toLowerCase());
    }

    if (!artFinal) return Alert.alert('Atención', 'Artículo no válido o no encontrado.');

    // Bloquear venta si el stock es 0 o menor
    const stockDisponible = typeof artFinal.cantidad === 'number' ? artFinal.cantidad : 0;
    if (stockDisponible <= 0) {
      console.warn('Vendiendo artículo sin stock:', artFinal.nombre);
    }

    const c = parseFloat(cant.replace(',', '.')) || 0;
    const p = parseFloat(precio.replace(',', '.')) || 0;
    const d = enableDiscount ? (parseFloat(desc.replace(',', '.')) || 0) : 0;

    /* REQUERIDO: Permitimos añadir el artículo incluso si la cantidad es cero
       para dar flexibilidad en correcciones o abonos que puedan ser negativos 
       o ajustados luego. Solo omitimos si cant no se puede parsear. */

    const cantidadYaEnCarrito = carrito
      .filter(i => i.articuloId === artFinal.id)
      .reduce((sum, i) => sum + (Number(i.cantidad) || 0), 0);
    const disponibleParaAgregar = Math.max(0, stockDisponible - cantidadYaEnCarrito);

    if (c > disponibleParaAgregar) {
      console.warn('Vendiendo más del stock disponible');
    }

    const pctIvaRaw =
      typeof artFinal.porcentajeIva === 'number' && artFinal.porcentajeIva > 0
        ? artFinal.porcentajeIva
        : 10;
    const pctIva = Math.round(pctIvaRaw * 100) / 100;

    setCarrito([...carrito, {
      id: Date.now().toString(),
      articuloId: artFinal.id,
      nombre: artFinal.nombre,
      cantidad: c,
      precioUnitario: p,
      descuento: d,
      tipoDescuento: 'porcentaje',
      nota: notaItem,
      porcentajeIva: pctIva,
    }]);

    resetArticuloForm();
  };

  const handleEditItem = (item: ArticuloVenta) => {
    const match = articulos.find((a: any) => a.id === item.articuloId);
    if (match) {
        setArticuloSeleccionado(match);
        setCodigoInput(match.codigoCorto || match.nombre);
    } else {
        setCodigoInput(item.nombre);
    }
    
    setCant(item.cantidad.toString());
    setPrecio(item.precioUnitario.toString());
    
    if (item.descuento > 0) {
      setEnableDiscount(true);
      setDesc(item.descuento.toString());
    } else {
      setEnableDiscount(false);
      setDesc('');
    }
    
    setNotaItem(item.nota || '');
    
    eliminarDelCarrito(item.id);
  };

  const eliminarDelCarrito = (id: string) => {
    setCarrito(carrito.filter(i => i.id !== id));
  };

  const calcularTotales = () => {
    const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

    const lineMeta = carrito.map(item => {
      const bruto = item.precioUnitario * item.cantidad;
      const dtoLinea = item.descuento > 0 ? item.descuento : 0;
      const netConDtoLinea = bruto * (1 - dtoLinea / 100);
      const ivaPctRaw =
        typeof item.porcentajeIva === 'number' && item.porcentajeIva > 0 ? item.porcentajeIva : 10;
      const ivaPct = Math.round(ivaPctRaw * 100) / 100;
      return { bruto, netConDtoLinea, ivaPct };
    });

    const subtotalLineas = round2(lineMeta.reduce((s, l) => s + l.bruto, 0));
    const baseIntermedia = round2(lineMeta.reduce((s, l) => s + l.netConDtoLinea, 0));
    const descuentoLineas = round2(subtotalLineas - baseIntermedia);

    let globalPct = 0;
    if (enableGlobalDiscount && globalDiscountValue) {
      globalPct = parseFloat(globalDiscountValue.replace(',', '.')) || 0;
    }

    let descuentoGlobalMonto = 0;
    let factorGlobal = 1;
    if (globalPct > 0) {
      descuentoGlobalMonto = round2((baseIntermedia * globalPct) / 100);
      factorGlobal = 1 - globalPct / 100;
    }

    const totalDescuentos = round2(descuentoLineas + descuentoGlobalMonto);
    const basesPorLinea = lineMeta.map(l => round2(l.netConDtoLinea * factorGlobal));
    const baseImponible = round2(basesPorLinea.reduce((s, b) => s + b, 0));

    const tieneRE = !!(clienteSeleccionado?.recargoEquivalencia);
    const cuotaIvaPorPct = new Map<number, number>();

    let iva = 0;
    let re = 0;
    basesPorLinea.forEach((baseLinea, idx) => {
      const pctIva = lineMeta[idx].ivaPct;
      const cuotaIva = round2(baseLinea * (pctIva / 100));
      iva = round2(iva + cuotaIva);
      cuotaIvaPorPct.set(pctIva, round2((cuotaIvaPorPct.get(pctIva) || 0) + cuotaIva));
      if (tieneRE) {
        const rePct = equivalenciaPctFromIvaArticulo(pctIva);
        re = round2(re + baseLinea * (rePct / 100));
      }
    });

    const ivaPorTipo = Array.from(cuotaIvaPorPct.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([pct, cuota]) => ({ pct, cuota }));

    const total = round2(baseImponible + iva + re);

    return {
      subtotal: subtotalLineas,
      descuentos: totalDescuentos,
      base: baseImponible,
      iva,
      re,
      reAplica: tieneRE,
      total,
      ivaPorTipo,
    };
  };
  
  const totales = calcularTotales();

  const guardarTemporalmente = async () => {
    setIsSaved(true); 
    const fechaActual = getFechaActualFormateada();
    const notaId = ventaDataInicial?.id || `TEMP-${Date.now().toString().slice(-6)}`;

    const ventaTemp = {
      id: notaId,
      cliente: clienteSeleccionado?.nombre || 'Cliente Sin Definir',
      clienteId: clienteSeleccionado?.id,
      fecha: fechaActual,
      precio: `${totales.total.toFixed(2)} €`,
      estado: 'abierta', 
      tipoNota: tipoNota.value,
      formaPago: formaPago || 'Efectivo', 
      items: carrito, 
      totalesNumericos: totales,
      aplicarDescGlobal: enableGlobalDiscount,
      descGlobal: globalDiscountValue,
      vendedorId: vendedorActualId || undefined
    };

    await addNotaVenta(ventaTemp as any);
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0 || !clienteSeleccionado) return Alert.alert('Error', 'Faltan datos (Cliente o Artículos).');
    if (!formaPago) return Alert.alert('Error', 'Selecciona una forma de pago.');

    Alert.alert('Confirmar Venta', `Total: ${totales.total.toFixed(2)} €`, [{
      text: 'Finalizar', onPress: async () => {
        try {
          setIsSaved(true); 
          const fechaActual = getFechaActualFormateada();
          
          const esBorrador = ventaDataInicial?.id?.startsWith('TEMP') || ventaDataInicial?.estado === 'abierta';
          const reutilizarIdExist = !!(ventaDataInicial && !esBorrador);
          let notaId: string;
          let numeroCorrelativo: number | undefined;
          if (reutilizarIdExist) {
            notaId = ventaDataInicial.id;
            numeroCorrelativo = (ventaDataInicial as any).numeroCorrelativo;
          } else {
            const res = await reservarCorrelativoNotaLocal(tipoNota.value);
            notaId = res.idFormateado;
            numeroCorrelativo = res.numero;
          }

          const estadoNota = estadoPago === 'pagado' ? 'cerrada' : 'pendiente';
          
          const venta: Record<string, unknown> = {
            id: notaId,
            cliente: clienteSeleccionado.nombre,
            clienteId: clienteSeleccionado.id,
            fecha: fechaActual,
            precio: `${totales.total.toFixed(2)} €`,
            estado: estadoNota,
            // estadoPago se usa en sync.service.buildPagos para enviar el pago al ERP
            estadoPago: estadoPago,
            tipoNota: tipoNota.value,
            formaPago, 
            items: carrito, 
            totalesNumericos: totales,
            aplicarDescGlobal: enableGlobalDiscount,
            descGlobal: globalDiscountValue,
            recargoEquivalencia: !!(clienteSeleccionado as any).recargoEquivalencia,
            vendedorId: vendedorActualId || undefined,
            ...(typeof numeroCorrelativo === 'number' && numeroCorrelativo > 0
              ? { numeroCorrelativo }
              : {})
          };
          
          await addNotaVenta(venta as any);

          if (esBorrador && ventaDataInicial?.id) await deleteNotaVenta(ventaDataInicial.id);

          // Al editar y regrabar evita cobros duplicados (ej. estadoPago mal inferido antes).
          await purgeCobrosDeNotaVenta(notaId, estadoPago === 'pendiente' ? { soloPendientes: true } : undefined);

          // Solo crédito: registro de cobro pendiente. Contado ya queda como venta (y cobro ERP va en la nota).
          if (estadoPago === 'pendiente') {
            await addCobro({
              id: `C${Date.now().toString().slice(-6)}`,
              cliente: clienteSeleccionado.nombre,
              clienteId: clienteSeleccionado.id,
              monto: `${totales.total.toFixed(2)} €`,
              fecha: fechaActual,
              estado: 'pendiente',
              notaVentaId: notaId,
              formaPago: formaPago
            } as any);
          }

          navigation.navigate('VerNota', { ventaData: venta });
        } catch (e) { 
          console.error(e);
          setIsSaved(false);
          Alert.alert('Error', 'No se pudo guardar la venta.'); 
        }
      }
    }, { text: 'Cancelar' }]);
  };

  return (
    <ScreenWithSidebar currentScreen="NuevaVenta" scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Nueva Venta</Text>
        </View>

        <View style={styles.mainContent}>
          {/* PANEL IZQUIERDO: FORMULARIO */}
          <View style={styles.leftPanel}>
             <VentaForm 
               clienteSeleccionado={clienteSeleccionado}
               onSelectCliente={() => setModalCliente(true)}
               estadoPago={estadoPago}
               setEstadoPago={setEstadoPago}
               formaPago={formaPago}
               onSelectFormaPago={() => openSelector('formaPago')}
               tipoNotaLabel={tipoNota.label}
               onSelectTipoNota={() => openSelector('tipoDoc')}
               codigoInput={codigoInput}
               setCodigoInput={handleCodigoChange}
               onScanOrSearch={() => setModalArticulo(true)}
               articuloSeleccionado={articuloSeleccionado}
               cant={cant}
               setCant={setCant}
               precio={precio}
               setPrecio={setPrecio}
               enableDiscount={enableDiscount}
               setEnableDiscount={setEnableDiscount}
               desc={desc}
               setDesc={setDesc}
               notaItem={notaItem}
               setNotaItem={setNotaItem}
               onAddItem={agregarAlCarrito}
               onOpenHistory={() => { void handleOpenHistorial(); }}
               onFinalize={finalizarVenta}
               keyboardPadding={keyboardHeight}
             />
          </View>

          {/* PANEL DERECHO: RESUMEN CARRITO */}
          <View style={styles.rightPanel}>
             <VentaCartSummary
                carrito={carrito}
                totales={totales}
                onRemoveItem={eliminarDelCarrito}
                onEditItem={handleEditItem}
                enableGlobalDiscount={enableGlobalDiscount}
                setEnableGlobalDiscount={setEnableGlobalDiscount}
                globalDiscountValue={globalDiscountValue}
                setGlobalDiscountValue={setGlobalDiscountValue}
             />
          </View>
        </View>

        {modalArticulo && (
          <View style={[styles.floatingSidebar, keyboardHeight > 0 && { bottom: keyboardHeight + 10 }]}>
            <SeleccionarArticuloSidebar 
              articulos={articulos} 
              onSelect={handleSelectArticulo} 
              onClose={() => setModalArticulo(false)} 
            />
          </View>
        )}
      </View>

      {/* MODALES */}
      <Modal visible={modalSelectorVisible} transparent animationType="fade" onRequestClose={() => setModalSelectorVisible(false)}>
        <TouchableOpacity style={styles.modalBg} onPress={() => setModalSelectorVisible(false)} activeOpacity={1}>
            <View style={styles.selectorModalCard}>
                <Text style={styles.selectorTitle}>
                    {selectorType === 'tipoDoc' ? 'Seleccionar Tipo de Documento' : 'Seleccionar Forma de Pago'}
                </Text>
                <FlatList
                  data={
                    selectorType === 'tipoDoc'
                      ? TIPOS_NOTA
                      : metodosDisponibles.map(m => ({ label: m, value: m }))
                  }
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.selectorItem} 
                      onPress={() => handleSelection(item)}
                    >
                      <Text style={styles.selectorItemText}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalSelectorVisible(false)}><Text>Cancelar</Text></TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>

      <SeleccionarClienteModal
        visible={modalCliente}
        onClose={() => setModalCliente(false)}
        onSelect={handleSelectCliente}
        clientes={clientes}
      />
      
      <Modal visible={modalHistorial} transparent animationType="fade" onRequestClose={() => setModalHistorial(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, styles.historialModalCard]}>
            <Text style={styles.selectorTitle}>
              Historial ERP {clienteSeleccionado?.nombre ? `- ${clienteSeleccionado.nombre}` : ''}
            </Text>
            {historialLoading ? (
              <View style={styles.historialState}>
                <ActivityIndicator size="large" color="#0C2ABF" />
                <Text style={styles.historialStateText}>Consultando historial del cliente...</Text>
              </View>
            ) : historialError ? (
              <View style={styles.historialState}>
                <Text style={styles.historialErrorText}>{historialError}</Text>
              </View>
            ) : historialPedidos.length === 0 ? (
              <View style={styles.historialState}>
                <Text style={styles.historialStateText}>No hay historial reciente para este cliente.</Text>
              </View>
            ) : (
              <FlatList
                data={historialPedidos}
                keyExtractor={(item) => item.id}
                style={styles.historialList}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={15}
                maxToRenderPerBatch={20}
                windowSize={8}
                renderItem={({ item }) => (
                  <View style={styles.historialRow}>
                    <Text style={styles.historialRef} numberOfLines={1}>{item.referencia}</Text>
                    <Text style={styles.historialMeta}>{item.fecha} · {item.estado}</Text>
                    <Text style={styles.historialTotal}>{item.total}</Text>
                  </View>
                )}
              />
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalHistorial(false)}>
              <Text>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  header: { height: 60, justifyContent: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexShrink: 0 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  
  mainContent: { flex: 1, flexDirection: 'row', overflow: 'hidden' },
  leftPanel: { width: 600, flexShrink: 0 },
  rightPanel: { flex: 1, padding: 20, backgroundColor: colors.card, flexDirection: 'column', minWidth: 0 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  selectorModalCard: { width: 400, backgroundColor: colors.card, borderRadius: 12, padding: 20, maxHeight: 500 },
  selectorTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: colors.text },
  selectorItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
  selectorItemText: { fontSize: 16, textAlign: 'center', color: colors.text },
  closeBtn: { marginTop: 15, padding: 10, alignItems: 'center' },
  
  modalCard: { width: 300, backgroundColor: colors.card, borderRadius: 12, padding: 20 },
  historialModalCard: { width: 720, maxWidth: '94%', maxHeight: '82%' },
  historialList: { width: '100%', marginTop: 8 },
  historialRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  historialRef: { fontSize: 15, fontWeight: '700', color: colors.text },
  historialMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  historialTotal: { fontSize: 14, fontWeight: '700', color: '#0C2ABF', marginTop: 4 },
  historialState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 10,
  },
  historialStateText: { marginTop: 10, color: colors.textSecondary, textAlign: 'center' },
  historialErrorText: { color: '#b91c1c', textAlign: 'center', fontWeight: '600' },
  floatingSidebar: {
    position: 'absolute',
    top: 60,
    right: 20,
    bottom: 20,
    width: 420,
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderRadius: 12
  }
});