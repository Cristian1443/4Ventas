import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import SeleccionarArticuloModal from '../../components/SeleccionarArticuloModal';

// --- TIPOS ---
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

export default function NuevaVentaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  // 1. [CRÍTICO] Importamos addCobro. En tu archivo subido esto faltaba.
  const { addNotaVenta, addCobro, clientes, articulos } = useApp();

  // --- ESTADOS ---
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(route.params?.clienteSeleccionado || null);
  
  // 2. [CRÍTICO] Estado por defecto 'pendiente' para que genere deuda visible
  const [estadoPago, setEstadoPago] = useState<'pagado' | 'pendiente'>('pendiente'); 
  
  const [tipoNota, setTipoNota] = useState('Serie P (Oficiales)');
  const [formaPago, setFormaPago] = useState('Efectivo');
  
  // Estados de Artículo
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<any>(null);
  const [cant, setCant] = useState('1');
  const [precio, setPrecio] = useState('');
  const [desc, setDesc] = useState('');
  const [tipoDesc, setTipoDesc] = useState<'porcentaje' | 'pesos'>('porcentaje');
  const [notaItem, setNotaItem] = useState('');

  const [carrito, setCarrito] = useState<ArticuloVenta[]>([]);
  const [modalCliente, setModalCliente] = useState(false);
  const [modalArticulo, setModalArticulo] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);
  const [dropdownTipo, setDropdownTipo] = useState(false);
  const [dropdownPago, setDropdownPago] = useState(false);

  // --- LÓGICA ---
  const resetArticuloForm = () => {
    setArticuloSeleccionado(null);
    setCant('1');
    setPrecio('');
    setDesc('');
    setNotaItem('');
  };

  const handleSelectArticulo = (art: any) => {
    setArticuloSeleccionado(art);
    // Limpiamos el precio de símbolos para que sea editable
    setPrecio(art.precio?.toString().replace(/[€\s]/g, '').replace(',', '.') || '');
    setModalArticulo(false);
  };

  const agregarAlCarrito = () => {
    if (!articuloSeleccionado) return Alert.alert('Atención', 'Selecciona un artículo.');
    const c = parseFloat(cant.replace(',', '.')) || 0;
    const p = parseFloat(precio.replace(',', '.')) || 0;
    const d = parseFloat(desc.replace(',', '.')) || 0;
    if (c <= 0) return Alert.alert('Error', 'Cantidad inválida');

    setCarrito([...carrito, {
      id: Date.now().toString(),
      articuloId: articuloSeleccionado.id,
      nombre: articuloSeleccionado.nombre,
      cantidad: c,
      precioUnitario: p,
      descuento: d,
      tipoDescuento: tipoDesc,
      nota: notaItem
    }]);
    resetArticuloForm();
  };

  const eliminarDelCarrito = (id: string) => {
    setCarrito(carrito.filter(i => i.id !== id));
  };

  const calcularTotales = () => {
    let subtotal = 0;
    let totalDesc = 0;
    carrito.forEach(item => {
      const st = item.precioUnitario * item.cantidad;
      subtotal += st;
      if (item.descuento > 0) {
        totalDesc += item.tipoDescuento === 'porcentaje' ? (st * item.descuento) / 100 : item.descuento * item.cantidad;
      }
    });
    const base = subtotal - totalDesc;
    return { subtotal, descuentos: totalDesc, base, iva: base * 0.21, total: base * 1.21 };
  };
  const totales = calcularTotales();

  // --- FUNCIÓN DE GUARDADO CONECTADA ---
  const guardarVenta = async () => {
    if (carrito.length === 0 || !clienteSeleccionado) return Alert.alert('Error', 'Faltan datos (Cliente o Artículos).');
    
    Alert.alert('Confirmar', `Total: ${totales.total.toFixed(2)} €`, [{
      text: 'Guardar', onPress: async () => {
        try {
          const fechaActual = new Date().toLocaleString('es-ES');
          const timestamp = Date.now().toString(); 
          const notaId = `N${timestamp.slice(-6)}`; 

          // 1. GUARDAR LA NOTA (Historial de productos)
          const estadoNota = estadoPago === 'pagado' ? 'cerrada' : 'pendiente';
          const venta = {
            id: notaId,
            cliente: clienteSeleccionado.nombre,
            clienteId: clienteSeleccionado.id,
            fecha: fechaActual,
            precio: `${totales.total.toFixed(2)} €`,
            estado: estadoNota,
            tipoNota, 
            formaPago, 
            items: carrito, 
            totalesNumericos: totales
          };
          
          console.log('💾 Guardando nota de venta:', { 
            id: venta.id, 
            cliente: venta.cliente, 
            clienteId: venta.clienteId, 
            estado: venta.estado,
            precio: venta.precio 
          });
          
          await addNotaVenta(venta as any);

          // 3. [CRÍTICO] CREAR EL COBRO (DEUDA)
          // Este bloque faltaba en tu archivo y es lo que conecta con CobrosList
          const nuevoCobro = {
            id: `C${timestamp.slice(-6)}`, 
            cliente: clienteSeleccionado.nombre,
            clienteId: clienteSeleccionado.id,
            monto: `${totales.total.toFixed(2)} €`,
            fecha: fechaActual,
            estado: estadoPago, // Si es 'pendiente', la pantalla CobrosList lo mostrará
            notaVentaId: notaId, 
            formaPago: formaPago
          };

          // Llamamos a la función global
          await addCobro(nuevoCobro as any); 

          // 4. Navegar
          navigation.navigate('VerNota', { ventaData: venta });
          
        } catch (e) { 
          console.error(e);
          Alert.alert('Error', 'No se pudo guardar la venta correctamente'); 
        }
      }
    }, { text: 'Cancelar' }]);
  };

  return (
    <ScreenWithSidebar currentScreen="NuevaVenta" scrollable={false}>
      {/* Header Superior */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nueva Venta</Text>
      </View>

      {/* CONTENEDOR PRINCIPAL DIVIDIDO */}
      <View style={styles.mainContent}>
        
        {/* PANEL IZQUIERDO */}
        <View style={styles.leftPanel}>
          <View style={styles.scrollWrapper}>
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollInner}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {/* SELECTOR CLIENTE */}
              <View style={[styles.field, { zIndex: 20 }]}>
                <Text style={styles.label}>Cliente *</Text>
                <TouchableOpacity style={styles.select} onPress={() => setModalCliente(true)}>
                  <Text style={{ color: clienteSeleccionado ? '#1e293b' : '#94a3b8' }}>
                    {clienteSeleccionado?.nombre || 'Seleccionar Cliente...'}
                  </Text>
                  <Text>▼</Text>
                </TouchableOpacity>
              </View>

              {/* SELECTOR ESTADO (PAGADO / PENDIENTE) */}
              <View style={styles.field}>
                <Text style={styles.label}>Estado inicial</Text>
                <View style={styles.switchRow}>
                  {['pagado', 'pendiente'].map((est) => (
                    <TouchableOpacity
                      key={est}
                      style={[styles.switchBtn, estadoPago === est && (est === 'pagado' ? styles.bgWhite : styles.bgBlue)]}
                      onPress={() => setEstadoPago(est as any)}
                    >
                      <Text style={[styles.switchTxt, estadoPago === est && (est === 'pagado' ? styles.txtBlue : styles.txtWhite)]}>
                        {est.charAt(0).toUpperCase() + est.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Mensaje visual de confirmación */}
                <Text style={{fontSize: 11, color: '#64748b', marginTop: 4, fontStyle: 'italic'}}>
                  {estadoPago === 'pendiente' ? '⚠️ Se generará una deuda en Cobros Pendientes' : '✅ Se marcará como cobrada (Historial)'}
                </Text>
              </View>

              {/* Tipo y Forma Pago */}
              <View style={[styles.row, { zIndex: 15 }]}>
                <View style={[styles.col, { zIndex: 16 }]}>
                  <Text style={styles.label}>Tipo Doc.</Text>
                  <TouchableOpacity style={styles.select} onPress={() => { setDropdownTipo(!dropdownTipo); setDropdownPago(false); }}>
                    <Text numberOfLines={1}>{tipoNota}</Text>
                    <Text>▼</Text>
                  </TouchableOpacity>
                  {dropdownTipo && (
                    <View style={styles.dropdown}>
                      {['Serie P (Oficiales)', 'Serie X', 'Pedido'].map(t => (
                        <TouchableOpacity key={t} style={styles.dropItem} onPress={() => { setTipoNota(t); setDropdownTipo(false); }}>
                          <Text>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <View style={[styles.col, { zIndex: 15 }]}>
                  <Text style={styles.label}>Forma Pago</Text>
                  <TouchableOpacity style={styles.select} onPress={() => { setDropdownPago(!dropdownPago); setDropdownTipo(false); }}>
                    <Text numberOfLines={1}>{formaPago}</Text>
                    <Text>▼</Text>
                  </TouchableOpacity>
                  {dropdownPago && (
                    <View style={styles.dropdown}>
                      {['Efectivo', 'Tarjeta', 'Bizum'].map(p => (
                        <TouchableOpacity key={p} style={styles.dropItem} onPress={() => { setFormaPago(p); setDropdownPago(false); }}>
                          <Text>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.divider} />
              <Text style={styles.secTitle}>Añadir Línea</Text>

              {/* Artículo */}
              <View style={[styles.field, { zIndex: 10 }]}>
                <Text style={styles.label}>Artículo *</Text>
                <TouchableOpacity style={styles.select} onPress={() => setModalArticulo(true)}>
                  <Text style={{ color: articuloSeleccionado ? '#1e293b' : '#94a3b8' }}>
                    {articuloSeleccionado?.nombre || 'Buscar en catálogo...'}
                  </Text>
                  <Text>🔍</Text>
                </TouchableOpacity>
              </View>

              {/* Cantidad y Precio */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Cant.</Text>
                  <TextInput style={styles.input} value={cant} onChangeText={setCant} keyboardType="numeric" selectTextOnFocus />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Precio Unit.</Text>
                  <TextInput style={styles.input} value={precio} onChangeText={setPrecio} keyboardType="numeric" placeholder="0.00" />
                </View>
              </View>

              {/* Descuento */}
              <View style={styles.field}>
                <Text style={styles.label}>Descuento</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TextInput style={[styles.input, { flex: 1, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]} value={desc} onChangeText={setDesc} keyboardType="numeric" placeholder="0" />
                  <TouchableOpacity style={styles.suffixBtn} onPress={() => setTipoDesc(t => t === 'porcentaje' ? 'pesos' : 'porcentaje')}>
                    <Text style={{ fontWeight: 'bold', color: '#092090' }}>{tipoDesc === 'porcentaje' ? '%' : '€'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Nota */}
              <View style={styles.field}>
                <Text style={styles.label}>Nota (opcional)</Text>
                <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]} multiline value={notaItem} onChangeText={setNotaItem} placeholder="Detalle opcional..." />
              </View>

              <TouchableOpacity style={styles.addBtn} onPress={agregarAlCarrito}>
                <LinearGradient colors={['#092090', '#0C2ABF']} style={styles.gradBtn}><Text style={styles.txtBtn}>+ AÑADIR AL CARRITO</Text></LinearGradient>
              </TouchableOpacity>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>

          {/* Footer Izquierdo Fijo */}
          <View style={styles.panelFooter}>
            <TouchableOpacity style={styles.btnSec} onPress={() => setModalHistorial(true)}><Text style={{color:'#64748b', fontWeight:'600'}}>Historial</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btnPri} onPress={guardarVenta}>
               <LinearGradient colors={['#8bd600', '#c4ff57']} style={styles.gradBtn}><Text style={styles.txtBtnBlack}>✅ CREAR NOTA</Text></LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* PANEL DERECHO - RESUMEN */}
        <View style={styles.rightPanel}>
          <Text style={styles.secTitle}>Resumen ({carrito.length})</Text>
          <View style={{flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginBottom: 10}}>
            {carrito.length === 0 ? (
               <View style={{flex:1, alignItems:'center', justifyContent:'center', opacity:0.5}}>
                 <Text style={{fontSize:40}}>🛒</Text>
                 <Text style={{marginTop: 10, color: '#64748b'}}>Carrito Vacío</Text>
               </View>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{padding: 0}}>
                {carrito.map(i => (
                  <View key={i.id} style={styles.rowItem}>
                    <View style={{ flex: 1 }}>
                        <Text style={{fontWeight:'600', color: '#1e293b'}}>{i.nombre}</Text>
                        <Text style={{fontSize:12, color: '#64748b'}}>x{i.cantidad}  {i.descuento > 0 ? `(-${i.descuento})` : ''}</Text>
                    </View>
                    <Text style={{ fontWeight:'bold', color: '#1e293b' }}>{(i.precioUnitario * i.cantidad).toFixed(2)} €</Text>
                    <TouchableOpacity onPress={() => eliminarDelCarrito(i.id)} style={{marginLeft:12, padding: 4}}><Text style={{color:'#ef4444', fontSize: 18}}>×</Text></TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
          
          <View style={styles.totalBox}>
            <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 5}}>
               <Text style={{color:'#64748b'}}>Base</Text><Text>{totales.base.toFixed(2)} €</Text>
            </View>
            <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 10}}>
               <Text style={{color:'#64748b'}}>IVA (21%)</Text><Text>{totales.iva.toFixed(2)} €</Text>
            </View>
            <View style={{height:1, backgroundColor:'#cbd5e1', marginBottom: 10}}/>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
               <Text style={{fontSize: 16, fontWeight:'800', color: '#0f172a'}}>TOTAL</Text>
               <Text style={{fontSize: 20, fontWeight:'800', color: '#0C2ABF'}}>{totales.total.toFixed(2)} €</Text>
            </View>
          </View>
        </View>
      </View>

      {/* MODALES */}
      <Modal visible={modalCliente} transparent animationType="fade"><View style={styles.modalBg}><View style={styles.modalCard}>
        <Text style={styles.modalTitle}>Clientes</Text>
        <ScrollView style={{maxHeight: 300}}>{clientes.map(c => <TouchableOpacity key={c.id} style={styles.modalItem} onPress={() => {setClienteSeleccionado(c); setModalCliente(false)}}><Text style={{fontSize:16}}>{c.nombre}</Text></TouchableOpacity>)}</ScrollView>
        <TouchableOpacity style={styles.closeBtn} onPress={() => setModalCliente(false)}><Text>Cerrar</Text></TouchableOpacity>
      </View></View></Modal>

      <SeleccionarArticuloModal visible={modalArticulo} onClose={() => setModalArticulo(false)} articulos={articulos} onSelect={handleSelectArticulo} />
      
      <Modal visible={modalHistorial} transparent animationType="fade"><View style={styles.modalBg}><View style={styles.modalCard}><Text style={{textAlign:'center', margin: 20}}>Sin historial reciente.</Text><TouchableOpacity style={styles.closeBtn} onPress={() => setModalHistorial(false)}><Text>Cerrar</Text></TouchableOpacity></View></View></Modal>

    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  header: { height: 60, justifyContent: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', flexShrink: 0 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  
  mainContent: { flex: 1, flexDirection: 'row', height: '100%', overflow: 'hidden' },
  
  leftPanel: { width: 420, borderRightWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', flexDirection: 'column', flexShrink: 0, height: '100%', display: 'flex' },
  scrollWrapper: { flex: 1, minHeight: 0 },
  scrollView: { flex: 1 },
  scrollInner: { padding: 20, paddingBottom: 40 },
  
  rightPanel: { flex: 1, padding: 20, backgroundColor: '#fff', flexDirection: 'column', height: '100%', minWidth: 0 },

  field: { marginBottom: 14 },
  label: { fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: '600' },
  select: { height: 46, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, justifyContent: 'space-between', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff' },
  input: { height: 46, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#fff', fontSize: 15, color: '#1e293b' },
  
  row: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  col: { flex: 1 },
  
  switchRow: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 8, padding: 3 },
  switchBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
  bgWhite: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  bgBlue: { backgroundColor: '#0C2ABF' },
  txtBlue: { color: '#092090', fontWeight: '700', fontSize: 13 },
  switchTxt: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  txtWhite: { color: '#fff', fontWeight: '700', fontSize: 13 },
  
  dropdown: { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, zIndex: 999, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  dropItem: { padding: 14, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 16 },
  secTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 12 },
  
  suffixBtn: { width: 46, borderWidth: 1, borderColor: '#cbd5e1', borderLeftWidth: 0, borderTopRightRadius: 8, borderBottomRightRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
  
  addBtn: { marginTop: 10, borderRadius: 8, overflow: 'hidden', marginBottom: 10 },
  gradBtn: { padding: 14, alignItems: 'center' },
  txtBtn: { color: '#fff', fontWeight: '700', fontSize: 14 },
  txtBtnBlack: { color: '#1a1a1a', fontWeight: '800', fontSize: 14 },
  
  panelFooter: { padding: 16, paddingBottom: 20, borderTopWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', gap: 12, backgroundColor: '#fff', flexShrink: 0, zIndex: 10 },
  btnSec: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, justifyContent: 'center', alignItems: 'center', height: 48, backgroundColor: '#f8fafc' },
  btnPri: { flex: 2, borderRadius: 8, overflow: 'hidden', height: 48 },
  
  rowItem: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderColor: '#f8fafc', alignItems: 'center', justifyContent: 'space-between' },
  totalBox: { marginTop: 'auto', padding: 20, backgroundColor: '#f8fafc', borderRadius: 12 },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', 
    // @ts-ignore
    position: Platform.OS === 'web' ? 'fixed' : 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 },
  modalCard: { width: 400, backgroundColor: '#fff', borderRadius: 12, padding: 24, maxHeight: '80%', elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center', color: '#1e293b' },
  modalItem: { padding: 14, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  closeBtn: { marginTop: 20, padding: 12, backgroundColor: '#f1f5f9', alignItems: 'center', borderRadius: 8 }
});