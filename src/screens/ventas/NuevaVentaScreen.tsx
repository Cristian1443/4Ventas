import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Keyboard,
  KeyboardEvent
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import SeleccionarArticuloModal from '../../components/SeleccionarArticuloModal';
import SeleccionarClienteModal from '../../components/SeleccionarClienteModal';
import { vendorService } from '../../services/vendor.service';
import { colors } from '../../constants/colors';

// New Components
import VentaForm from '../../components/ventas/VentaForm';
import VentaCartSummary from '../../components/ventas/VentaCartSummary';

interface ArticuloVenta {
  id: string;
  articuloId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  tipoDescuento: 'porcentaje' | 'pesos';
  nota?: string;
}

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

export default function NuevaVentaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  const { addNotaVenta, addCobro, clientes, articulos, deleteNotaVenta, currentVendor } = useApp();

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

  // -- EFECTOS --
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
      
      if (ventaDataInicial.items) setCarrito(ventaDataInicial.items);
      if (ventaDataInicial.formaPago) setFormaPago(ventaDataInicial.formaPago);
      
      const tipoFound = TIPOS_NOTA.find(t => t.value === ventaDataInicial.tipoNota);
      if (tipoFound) setTipoNota(tipoFound);
      
      if (ventaDataInicial.estado === 'pagado' || ventaDataInicial.estado === 'pendiente') {
        setEstadoPago(ventaDataInicial.estado);
      }

      if (ventaDataInicial.aplicarDescGlobal) {
        setEnableGlobalDiscount(true);
        setGlobalDiscountValue(ventaDataInicial.descGlobal || '');
      }
    }
  }, [ventaDataInicial, clientePreset, clientes]);

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
      return Alert.alert('Sin stock', 'El artículo no tiene stock disponible.');
    }

    const c = parseFloat(cant.replace(',', '.')) || 0;
    const p = parseFloat(precio.replace(',', '.')) || 0;
    const d = enableDiscount ? (parseFloat(desc.replace(',', '.')) || 0) : 0;

    if (c <= 0) return Alert.alert('Error', 'Ingresa una cantidad válida.');
    if (c > stockDisponible) {
      return Alert.alert('Stock insuficiente', `Stock disponible: ${stockDisponible}. Ajusta la cantidad.`);
    }

    setCarrito([...carrito, {
      id: Date.now().toString(),
      articuloId: artFinal.id,
      nombre: artFinal.nombre,
      cantidad: c,
      precioUnitario: p,
      descuento: d,
      tipoDescuento: 'porcentaje',
      nota: notaItem
    }]);

    resetArticuloForm();
  };

  const eliminarDelCarrito = (id: string) => {
    setCarrito(carrito.filter(i => i.id !== id));
  };

  const calcularTotales = () => {
    let subtotalLineas = 0;
    let descuentoLineas = 0;

    carrito.forEach(item => {
      const bruto = item.precioUnitario * item.cantidad;
      subtotalLineas += bruto;
      if (item.descuento > 0) {
        const descMonto = (bruto * item.descuento) / 100; 
        descuentoLineas += descMonto;
      }
    });

    let baseIntermedia = subtotalLineas - descuentoLineas;
    let descuentoGlobalMonto = 0;

    if (enableGlobalDiscount && globalDiscountValue) {
      const porcentaje = parseFloat(globalDiscountValue.replace(',', '.')) || 0;
      if (porcentaje > 0) {
        descuentoGlobalMonto = (baseIntermedia * porcentaje) / 100;
      }
    }

    const totalDescuentos = descuentoLineas + descuentoGlobalMonto;
    const baseImponible = subtotalLineas - totalDescuentos;
    const iva = baseImponible * 0.10; // IVA 10% según ERP
    const total = baseImponible + iva;

    return { subtotal: subtotalLineas, descuentos: totalDescuentos, base: baseImponible, iva, total };
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
          const notaId = (ventaDataInicial && !esBorrador) ? ventaDataInicial.id : `N${Date.now().toString().slice(-6)}`; 

          const estadoNota = estadoPago === 'pagado' ? 'cerrada' : 'pendiente';
          
          const venta = {
            id: notaId,
            cliente: clienteSeleccionado.nombre,
            clienteId: clienteSeleccionado.id,
            fecha: fechaActual,
            precio: `${totales.total.toFixed(2)} €`,
            estado: estadoNota,
            tipoNota: tipoNota.value,
            formaPago, 
            items: carrito, 
            totalesNumericos: totales,
            aplicarDescGlobal: enableGlobalDiscount,
            descGlobal: globalDiscountValue,
            vendedorId: vendedorActualId || undefined
          };
          
          await addNotaVenta(venta as any);

          if (esBorrador && ventaDataInicial?.id) await deleteNotaVenta(ventaDataInicial.id);

          const nuevoCobro = {
            id: `C${Date.now().toString().slice(-6)}`, 
            cliente: clienteSeleccionado.nombre,
            clienteId: clienteSeleccionado.id,
            monto: `${totales.total.toFixed(2)} €`,
            fecha: fechaActual,
            estado: estadoPago, 
            notaVentaId: notaId, 
            formaPago: formaPago
          };

          await addCobro(nuevoCobro as any); 
          
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
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior="padding"
        keyboardVerticalOffset={Platform.select({ ios: 64, android: 20, default: 0 })}
      >
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
               onOpenHistory={() => setModalHistorial(true)}
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
                enableGlobalDiscount={enableGlobalDiscount}
                setEnableGlobalDiscount={setEnableGlobalDiscount}
                globalDiscountValue={globalDiscountValue}
                setGlobalDiscountValue={setGlobalDiscountValue}
             />
          </View>
        </View>
      </KeyboardAvoidingView>

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

      <SeleccionarArticuloModal 
        visible={modalArticulo} 
        onClose={() => setModalArticulo(false)} 
        articulos={articulos} 
        onSelect={handleSelectArticulo} 
      />
      
      <Modal visible={modalHistorial} transparent animationType="fade">
        <View style={styles.modalBg}><View style={styles.modalCard}><Text style={{textAlign:'center', margin: 20}}>Sin historial reciente.</Text><TouchableOpacity style={styles.closeBtn} onPress={() => setModalHistorial(false)}><Text>Cerrar</Text></TouchableOpacity></View></View>
      </Modal>

    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  header: { height: 60, justifyContent: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexShrink: 0 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  
  mainContent: { flex: 1, flexDirection: 'row', height: '100%', overflow: 'hidden' },
  leftPanel: { width: 600, flexShrink: 0, height: '100%', display: 'flex' },
  rightPanel: { flex: 1, padding: 20, backgroundColor: colors.card, flexDirection: 'column', height: '100%', minWidth: 0 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  selectorModalCard: { width: 400, backgroundColor: colors.card, borderRadius: 12, padding: 20, maxHeight: 500 },
  selectorTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: colors.text },
  selectorItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
  selectorItemText: { fontSize: 16, textAlign: 'center', color: colors.text },
  closeBtn: { marginTop: 15, padding: 10, alignItems: 'center' },
  
  modalCard: { width: 300, backgroundColor: colors.card, borderRadius: 12, padding: 20 },
});