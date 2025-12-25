import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Keyboard,
  KeyboardEvent
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import SeleccionarArticuloModal from '../../components/SeleccionarArticuloModal';
import SeleccionarClienteModal from '../../components/SeleccionarClienteModal';
import { vendorService } from '../../services/vendor.service';

// ... (Tipos y Helpers se mantienen igual) ...
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
  
  // IMPORTAR deleteNotaVenta DEL CONTEXTO
  const { addNotaVenta, addCobro, clientes, articulos, deleteNotaVenta } = useApp();

  const ventaDataInicial = route.params?.ventaData;
  const [vendedorActualId, setVendedorActualId] = useState<string | null>(null);

  // Obtener el vendedor actual al cargar la pantalla
  useEffect(() => {
    const obtenerVendedorActual = async () => {
      const vendedor = await vendorService.getVendedorActual();
      if (vendedor) {
        setVendedorActualId(vendedor.id);
      }
    };
    obtenerVendedorActual();
  }, []);

  // ... (Estados se mantienen igual, incluyendo descuento global) ...
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [estadoPago, setEstadoPago] = useState<'pagado' | 'pendiente'>('pendiente'); 
  const [tipoNota, setTipoNota] = useState(TIPOS_NOTA[0]);
  const [formaPago, setFormaPago] = useState(''); 

  const [articuloSeleccionado, setArticuloSeleccionado] = useState<any>(null);
  const [codigoInput, setCodigoInput] = useState('');
  const [cant, setCant] = useState('');
  const [precio, setPrecio] = useState('');
  const [enableDiscount, setEnableDiscount] = useState(false);
  const [desc, setDesc] = useState('');
  const [notaItem, setNotaItem] = useState('');

  const [carrito, setCarrito] = useState<ArticuloVenta[]>([]);
  
  const [enableGlobalDiscount, setEnableGlobalDiscount] = useState(false);
  const [globalDiscountValue, setGlobalDiscountValue] = useState('');

  const [modalCliente, setModalCliente] = useState(false);
  const [modalArticulo, setModalArticulo] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);
  const [modalSelectorVisible, setModalSelectorVisible] = useState(false);
  const [selectorType, setSelectorType] = useState<'tipoDoc' | 'formaPago' | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ... (useEffect de carga inicial se mantiene) ...
  useEffect(() => {
    if (ventaDataInicial) {
      const cli = clientes.find(c => c.id === ventaDataInicial.clienteId) || { 
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
  }, [ventaDataInicial]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
    };

    const handleHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, handleShow);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ... (useEffect de protección de navegación se mantiene) ...
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (carrito.length === 0 || isSaved || e.data.action.type === 'REPLACE') {
        return;
      }

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

  // ... (useMemo metodosDisponibles y useEffect se mantienen) ...
  const metodosDisponibles = useMemo(() => {
    if (estadoPago === 'pendiente') {
      return METODOS_PAGO_CREDITO;
    }
    return METODOS_PAGO_CONTADO;
  }, [estadoPago]);

  useEffect(() => {
    if (!metodosDisponibles.includes(formaPago)) {
      setFormaPago(metodosDisponibles[0]);
    }
  }, [estadoPago, metodosDisponibles]);

  // ... (Funciones de selectores, articulos y carrito se mantienen) ...
  const openSelector = (type: 'tipoDoc' | 'formaPago') => {
    setSelectorType(type);
    setModalSelectorVisible(true);
  };

  const handleSelection = (item: any) => {
    if (selectorType === 'tipoDoc') setTipoNota(item);
    else if (selectorType === 'formaPago') setFormaPago(item);
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
    const match = articulos.find(a => 
        (a.codigoCorto && a.codigoCorto.toLowerCase() === text.toLowerCase()) ||
        a.id.toLowerCase() === text.toLowerCase()
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
    
    const c = parseFloat(cant.replace(',', '.')) || 0;
    const p = parseFloat(precio.replace(',', '.')) || 0;
    const d = enableDiscount ? (parseFloat(desc.replace(',', '.')) || 0) : 0;
    
    if (c <= 0) return Alert.alert('Error', 'Ingresa una cantidad válida.');

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

  // ... (calcularTotales actualizado con descuento global se mantiene) ...
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
    const iva = baseImponible * 0.21;
    const total = baseImponible + iva;

    return { subtotal: subtotalLineas, descuentos: totalDescuentos, base: baseImponible, iva, total };
  };
  
  const totales = calcularTotales();

  // ... (guardarTemporalmente actualizado se mantiene) ...
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

  // --- FINALIZAR VENTA ACTUALIZADO ---
  const finalizarVenta = async () => {
    if (carrito.length === 0 || !clienteSeleccionado) return Alert.alert('Error', 'Faltan datos (Cliente o Artículos).');
    if (!formaPago) return Alert.alert('Error', 'Selecciona una forma de pago.');

    Alert.alert('Confirmar Venta', `Total: ${totales.total.toFixed(2)} €`, [{
      text: 'Finalizar', onPress: async () => {
        try {
          setIsSaved(true); 
          const fechaActual = getFechaActualFormateada();
          
          // DETECTAR SI ES BORRADOR (ID empieza con TEMP o estado es abierta)
          const esBorrador = ventaDataInicial?.id?.startsWith('TEMP') || ventaDataInicial?.estado === 'abierta';
          
          // Si era borrador, generamos un ID NUEVO (ej: N...). Si era edición de nota real, mantenemos ID.
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
          
          // Guardar la nueva nota oficial
          await addNotaVenta(venta as any);

          // SI ERA BORRADOR, ELIMINAR EL ORIGINAL PARA EVITAR DUPLICADOS
          if (esBorrador && ventaDataInicial?.id) {
             await deleteNotaVenta(ventaDataInicial.id);
          }

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

  // ... (El resto del renderizado UI se mantiene igual, con los estilos de descuento global agregados) ...

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
          
          {/* PANEL IZQUIERDO */}
          <View style={styles.leftPanel}>
            <View style={styles.scrollWrapper}>
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={[
                  styles.scrollInner,
                  { paddingBottom: Math.max(40, keyboardHeight + 40) }
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {/* SECCIÓN CLIENTE Y CABECERA */}
                <View style={styles.sectionCard}>
                    {/* CLIENTE */}
                    <View style={[styles.field, { zIndex: 20 }]}>
                        <Text style={styles.label}>Cliente *</Text>
                        <TouchableOpacity style={styles.select} onPress={() => setModalCliente(true)}>
                        <Text style={{ color: clienteSeleccionado ? '#1e293b' : '#94a3b8', fontSize: 19 }}>
                            {clienteSeleccionado ? `${clienteSeleccionado.nombre}` : 'Seleccionar Cliente...'}
                        </Text>
                        <Text style={{fontSize: 20}}>🔍</Text>
                        </TouchableOpacity>
                        {clienteSeleccionado && (
                            <Text style={{fontSize: 15, color: '#64748b', marginTop: 4, marginLeft: 2}}>
                                {clienteSeleccionado.empresa} • {clienteSeleccionado.direccion}
                            </Text>
                        )}
                    </View>

                    {/* FILA DE OPCIONES */}
                    <View style={[styles.row, { marginBottom: 5 }]}>
                        <View style={{flex: 1.2}}>
                            <Text style={styles.label}>Estado Pago</Text>
                            <View style={styles.switchRowCompact}>
                                <TouchableOpacity onPress={() => setEstadoPago('pagado')} style={[styles.switchBtnCompact, estadoPago === 'pagado' && styles.bgSuccess]}>
                                    <Text style={[styles.switchTxtCompact, estadoPago === 'pagado' && styles.txtWhite]}>Contado</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setEstadoPago('pendiente')} style={[styles.switchBtnCompact, estadoPago === 'pendiente' && styles.bgWarning]}>
                                    <Text style={[styles.switchTxtCompact, estadoPago === 'pendiente' && styles.txtWhite]}>Crédito</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.col}>
                            <Text style={styles.label}>Forma Pago</Text>
                            <TouchableOpacity style={styles.selectCompact} onPress={() => openSelector('formaPago')}>
                                <Text numberOfLines={1} style={{fontSize: 17, color: '#1e293b'}}>{formaPago || '-'}</Text>
                                <Text style={{fontSize: 14}}>▼</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.col}>
                            <Text style={styles.label}>Tipo Doc.</Text>
                            <TouchableOpacity style={styles.selectCompact} onPress={() => openSelector('tipoDoc')}>
                                <Text numberOfLines={1} style={{fontSize: 17, color: '#1e293b'}}>{tipoNota.label}</Text>
                                <Text style={{fontSize: 14}}>▼</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />
                <Text style={styles.secTitle}>Añadir Línea (Rápida)</Text>

                {/* GRID DE AÑADIR LÍNEA */}
                <View style={styles.addLineContainer}>
                    <View style={[styles.gridRow, { alignItems: 'flex-end' }]}>
                        <View style={{flex: 3, marginRight: 8}}>
                            <Text style={styles.label}>Artículo / Código</Text>
                            <View style={styles.inputWithIcon}>
                                <TextInput 
                                    style={styles.inputNoBorder}
                                    value={codigoInput}
                                    onChangeText={handleCodigoChange}
                                    placeholder="Escanear o buscar..."
                                    placeholderTextColor="#94a3b8"
                                />
                                <TouchableOpacity onPress={() => setModalArticulo(true)} style={styles.iconContainer}>
                                    <Text style={{fontSize: 20}}>🔍</Text>
                                </TouchableOpacity>
                            </View>
                            {articuloSeleccionado && (
                                <Text style={{fontSize: 15, color: '#10b981', marginTop: 2, fontWeight: '600'}} numberOfLines={1}>
                                    {articuloSeleccionado.nombre}
                                </Text>
                            )}
                        </View>

                        <View style={{flex: 1, marginRight: 8}}>
                            <Text style={styles.label}>Cantidad</Text>
                            <TextInput 
                                style={styles.inputGrid} 
                                value={cant} 
                                onChangeText={setCant} 
                                keyboardType="numeric" 
                                placeholder="" 
                            />
                        </View>

                        <View style={{flex: 1, marginRight: 8}}>
                            <Text style={styles.label}>Precio</Text>
                            <TextInput 
                                style={styles.inputGrid} 
                                value={precio} 
                                onChangeText={setPrecio} 
                                keyboardType="numeric" 
                                placeholder="0.00" 
                            />
                        </View>

                        <View style={{flex: 1}}>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5}}>
                                <Text style={[styles.label, {marginBottom: 0}]}>DTO %</Text>
                                <Switch 
                                    value={enableDiscount} 
                                    onValueChange={setEnableDiscount}
                                    trackColor={{ false: "#e2e8f0", true: "#0C2ABF" }}
                                    thumbColor={"#fff"}
                                    style={{ transform: [{ scaleX: 0.6 }, { scaleY: 0.6 }] }} 
                                />
                            </View>
                            <TextInput 
                                style={[styles.inputGrid, !enableDiscount && styles.inputDisabled]} 
                                value={desc} 
                                onChangeText={setDesc} 
                                keyboardType="numeric" 
                                placeholder="0" 
                                editable={enableDiscount}
                            />
                        </View>
                    </View>

                    <View style={[styles.gridRow, {marginTop: 12, alignItems: 'flex-end'}]}>
                        <View style={{flex: 3, marginRight: 12}}>
                            <Text style={styles.label}>Nota (Opcional)</Text>
                            <TextInput 
                                style={[styles.inputGrid, {height: 40, textAlign: 'left', paddingHorizontal: 10}]} 
                                value={notaItem} 
                                onChangeText={setNotaItem} 
                                placeholder="Detalle..." 
                            />
                        </View>
                        <View style={{flex: 1}}>
                            <TouchableOpacity style={styles.addBtnCompact} onPress={agregarAlCarrito}>
                                <LinearGradient colors={['#092090', '#0C2ABF']} style={styles.gradBtnCompact}>
                                    <Text style={styles.txtBtnCompact}>+ AÑADIR</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
                
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>

            <View style={styles.panelFooter}>
              <TouchableOpacity style={styles.btnSec} onPress={() => setModalHistorial(true)}><Text style={{fontSize: 16, color:'#64748b', fontWeight:'600'}}>Historial</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnPri} onPress={finalizarVenta}>
                 <LinearGradient colors={['#91e600', '#65a30d']} style={styles.gradBtn}><Text style={styles.txtBtnBlack}>✅ FINALIZAR VENTA</Text></LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* PANEL DERECHO */}
          <View style={styles.rightPanel}>
            <Text style={styles.secTitle}>Resumen ({carrito.length})</Text>
            <View style={{flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginBottom: 10}}>
              {carrito.length === 0 ? (
                 <View style={{flex:1, alignItems:'center', justifyContent:'center', opacity:0.5}}>
                   <Text style={{fontSize:52}}>🛒</Text>
                   <Text style={{marginTop: 10, color: '#64748b', fontSize:18}}>Carrito Vacío</Text>
                 </View>
              ) : (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{padding: 0}}>
                  {carrito.map(i => (
                    <View key={i.id} style={styles.rowItem}>
                      <View style={{ flex: 1 }}>
                          <Text style={{fontSize: 16, fontWeight:'600', color: '#1e293b'}}>{i.nombre}</Text>
                          <Text style={{fontSize:16, color: '#64748b'}}>x{i.cantidad}  {i.descuento > 0 ? `(-${i.descuento}%)` : ''}</Text>
                          {i.nota ? <Text style={{fontSize:15, color:'#94a3b8', fontStyle:'italic'}}>{i.nota}</Text> : null}
                      </View>
                      <Text style={{ fontSize: 16, fontWeight:'bold', color: '#1e293b' }}>{(i.precioUnitario * i.cantidad).toFixed(2)} €</Text>
                      <TouchableOpacity onPress={() => eliminarDelCarrito(i.id)} style={{marginLeft:12, padding: 4}}><Text style={{color:'#ef4444', fontSize: 22}}>×</Text></TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
            
            {/* UI DESCUENTO GLOBAL */}
            <View style={styles.globalDiscountBox}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Text style={styles.label}>Descuento Global</Text>
                    <Switch 
                        value={enableGlobalDiscount} 
                        onValueChange={setEnableGlobalDiscount}
                        trackColor={{ false: "#e2e8f0", true: "#0C2ABF" }}
                        thumbColor={"#fff"}
                        style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }} 
                    />
                </View>
                
                {enableGlobalDiscount && (
                    <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8}}>
                  <Text style={{fontSize: 16, color: '#64748b'}}>Porcentaje:</Text>
                        <TextInput 
                            style={styles.inputGlobalDesc}
                            value={globalDiscountValue}
                            onChangeText={setGlobalDiscountValue}
                            keyboardType="numeric"
                            placeholder="0"
                            maxLength={3}
                        />
                  <Text style={{fontSize: 18, fontWeight: 'bold', color: '#1e293b'}}>%</Text>
                    </View>
                )}
            </View>

            <View style={styles.totalBox}>
              <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 5}}>
                 <Text style={{fontSize: 16, color:'#64748b'}}>Subtotal</Text><Text style={{fontSize: 16}}>{totales.subtotal.toFixed(2)} €</Text>
              </View>
              {totales.descuentos > 0 && (
                  <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 5}}>
                      <Text style={{fontSize: 16, color:'#10b981'}}>
                        Descuentos {enableGlobalDiscount && globalDiscountValue ? `(Gbl ${globalDiscountValue}%)` : ''}
                      </Text>
                      <Text style={{fontSize: 16, color:'#10b981'}}>-{totales.descuentos.toFixed(2)} €</Text>
                  </View>
              )}
              <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 5}}>
                 <Text style={{fontSize: 16, color:'#64748b'}}>Base Imponible</Text><Text style={{fontSize: 16}}>{totales.base.toFixed(2)} €</Text>
              </View>
              <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 10}}>
                 <Text style={{fontSize: 16, color:'#64748b'}}>IVA (21%)</Text><Text style={{fontSize: 16}}>{totales.iva.toFixed(2)} €</Text>
              </View>
              <View style={{height:1, backgroundColor:'#cbd5e1', marginBottom: 10}}/>
              <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                 <Text style={{fontSize: 20, fontWeight:'800', color: '#0f172a'}}>TOTAL</Text>
                 <Text style={{fontSize: 28, fontWeight:'800', color: '#0C2ABF'}}>{totales.total.toFixed(2)} €</Text>
              </View>
            </View>
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
  header: { height: 60, justifyContent: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', flexShrink: 0 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  
  mainContent: { flex: 1, flexDirection: 'row', height: '100%', overflow: 'hidden' },
  leftPanel: { width: 600, borderRightWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', flexDirection: 'column', flexShrink: 0, height: '100%', display: 'flex' },
  scrollWrapper: { flex: 1, minHeight: 0 },
  scrollView: { flex: 1 },
  scrollInner: { padding: 20, paddingBottom: 40 },
  rightPanel: { flex: 1, padding: 20, backgroundColor: '#fff', flexDirection: 'column', height: '100%', minWidth: 0 },

  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1
  },
  addLineContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#092090',
    marginBottom: 10,
    shadowColor: '#092090',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },

  field: { marginBottom: 14 },
  label: { fontSize: 15, color: '#64748b', marginBottom: 4, fontWeight: '600', textTransform: 'uppercase' },
  
  select: { height: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, justifyContent: 'space-between', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc' },
  selectCompact: { height: 38, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, justifyContent: 'space-between', paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc' },
  
  gridRow: { flexDirection: 'row' },
  inputWithIcon: {
    height: 42,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 0,
    overflow: 'hidden'
  },
  inputNoBorder: { flex: 1, fontSize: 18, color: '#1e293b', height: '100%' },
  iconContainer: { width: 40, height: '100%', alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#e2e8f0', backgroundColor: '#fff' },
  
  inputGrid: {
    height: 42,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
    fontSize: 18,
    textAlign: 'center',
    color: '#1e293b'
  },
  inputDisabled: {
    backgroundColor: '#e2e8f0',
    color: '#94a3b8',
    borderColor: '#e2e8f0'
  },

  row: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  col: { flex: 1 },
  switchRowCompact: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 6, padding: 2, height: 38 },
  switchBtnCompact: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 5 },
  switchTxtCompact: { fontSize: 16, color: '#64748b', fontWeight: '600' },
  
  bgSuccess: { backgroundColor: '#10b981' },
  bgWarning: { backgroundColor: '#f59e0b' },
  txtWhite: { color: '#fff', fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 16 },
  secTitle: { fontSize: 20, fontWeight: '700', color: '#334155', marginBottom: 12 },

  addBtnCompact: { borderRadius: 8, overflow: 'hidden', height: 40 },
  gradBtnCompact: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  txtBtnCompact: { color: '#fff', fontWeight: '700', fontSize: 17 },

  panelFooter: { padding: 16, paddingBottom: 20, borderTopWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', gap: 12, backgroundColor: '#fff', flexShrink: 0, zIndex: 10 },
  btnSec: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, justifyContent: 'center', alignItems: 'center', height: 48, backgroundColor: '#f8fafc' },
  btnPri: { flex: 2, borderRadius: 8, overflow: 'hidden', height: 48 },
  gradBtn: { padding: 14, alignItems: 'center', height: '100%', justifyContent: 'center' },
  txtBtnBlack: { color: '#1a1a1a', fontWeight: '800', fontSize: 18 },

  rowItem: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderColor: '#f8fafc', alignItems: 'center', justifyContent: 'space-between' },
  totalBox: { marginTop: 'auto', padding: 20, backgroundColor: '#f8fafc', borderRadius: 12 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: 400, backgroundColor: '#fff', borderRadius: 12, padding: 24, maxHeight: '80%', elevation: 5 },
  closeBtn: { marginTop: 20, padding: 12, backgroundColor: '#f1f5f9', alignItems: 'center', borderRadius: 8 },

  selectorModalCard: { width: 320, backgroundColor: '#fff', borderRadius: 12, padding: 0, elevation: 10, maxHeight: '60%' },
  selectorTitle: { fontSize: 22, fontWeight: '700', color: '#1e293b', padding: 16, textAlign: 'center', borderBottomWidth: 1, borderColor: '#f1f5f9', backgroundColor: '#f8fafc', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  selectorItem: { padding: 16, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  selectorItemText: { fontSize: 22, color: '#334155', textAlign: 'center' },

  globalDiscountBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    marginTop: 'auto'
  },
  inputGlobalDesc: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 4,
    paddingHorizontal: 10,
    width: 60,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#092090'
  }
});