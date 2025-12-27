import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  useWindowDimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import * as ImagePicker from 'expo-image-picker';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';

export default function GastosScreen() {
  const navigation = useNavigation<any>();
  const { gastos, addGasto, deleteGasto, currentVendor } = useApp();
  const { width } = useWindowDimensions();

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [nombreGasto, setNombreGasto] = useState('');
  const [valorGasto, setValorGasto] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('Todas');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [imagenGasto, setImagenGasto] = useState<string | null>(null);

  const tiposGasto = ['Comida', 'Combustible', 'Alojamiento', 'Transporte', 'Material', 'Otros'];
  const categoriasFiltro = ['Todas', ...tiposGasto];

  // Helper para fecha local consistente DD/MM/YYYY, HH:MM:SS
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

  const handleAddGasto = () => {
    if (!currentVendor?.id) {
      Alert.alert('Vendedor', 'Inicia sesión con un vendedor antes de registrar un gasto.');
      return;
    }
    if (!nombreGasto || !selectedType || !valorGasto) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    // FIX: Generar ID único robusto y Fecha estándar manual
    const nuevoGasto = {
      id: `G${Date.now()}`, // Timestamp para evitar duplicados
      nombre: nombreGasto,
      categoria: selectedType,
      precio: valorGasto.includes('€') ? valorGasto : `${valorGasto} €`,
      fecha: getFechaActualFormateada(), // Formato forzado DD/MM/YYYY
      imagen: imagenGasto || undefined
    };

    addGasto(nuevoGasto);
    
    // Limpiar
    setNombreGasto('');
    setSelectedType('');
    setValorGasto('');
    setImagenGasto(null);
    
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const handleDeleteGasto = (id: string | number) => {
    const gastoId = String(id).trim();
    console.log('🗑️ Intentando eliminar gasto con ID:', gastoId);
    console.log('📋 Gastos actuales:', gastos.map(g => ({ id: g.id, nombre: g.nombre })));
    
    Alert.alert(
      'Eliminar Gasto',
      '¿Estás seguro de que deseas eliminar este gasto?',
      [
        { 
          text: 'Cancelar', 
          style: 'cancel',
          onPress: () => console.log('❌ Eliminación cancelada')
        },
        { 
          text: 'Eliminar', 
          onPress: () => {
            console.log('✅ Confirmado, eliminando gasto:', gastoId);
            deleteGasto(gastoId)
              .then(() => {
                console.log('✅ Gasto eliminado exitosamente');
              })
              .catch((error) => {
                console.error('❌ Error eliminando gasto:', error);
                Alert.alert('Error', 'No se pudo eliminar el gasto. Inténtalo de nuevo.');
              });
          }, 
          style: 'destructive' 
        }
      ],
      { cancelable: true }
    );
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7
    });

    if (!result.canceled) {
      setImagenGasto(result.assets[0].uri);
    }
  };

  const filteredGastos = gastos.filter(gasto => {
    const matchesSearch = gasto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         gasto.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = selectedCategoria === 'Todas' || gasto.categoria === selectedCategoria;
    return matchesSearch && matchesCategoria;
  });

  const totalGastos = filteredGastos.reduce((sum, gasto) => {
    const valor = parseFloat(gasto.precio.replace(/[^\d,.-]/g, '').replace(',', '.').trim());
    return sum + (isNaN(valor) ? 0 : valor);
  }, 0);

  return (
    <ScreenWithSidebar currentScreen="Gastos" scrollable={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Main')}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Gestión de Gastos</Text>
        </View>
        <TouchableOpacity style={styles.resumenButton} onPress={() => navigation.navigate('ResumenDia')}>
          <LinearGradient
            colors={['#092090', '#0C2ABF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.resumenGradient}
          >
            <Text style={styles.resumenText}>Ver Resumen</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal={width < 1000}
        contentContainerStyle={width < 1000 ? styles.scrollContent : undefined}
      >
        <View style={styles.mainContent}>
          {/* COLUMNA IZQUIERDA - Formulario */}
          <View style={styles.leftColumn}>
            <ScrollView>
              <Text style={styles.subtitle}>Registrar Nuevo Gasto</Text>

              {showSuccessMessage && (
                <View style={styles.successMessage}>
                  <Text style={styles.successIcon}>✓</Text>
                  <Text style={styles.successText}>¡Gasto registrado correctamente!</Text>
                </View>
              )}

              <TextInput
                style={styles.input}
                placeholder="Nombre del Gasto"
                placeholderTextColor="#697b92"
                value={nombreGasto}
                onChangeText={setNombreGasto}
              />

              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.input, styles.dropdown, { flex: 1 }]}
                  onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                >
                  <Text style={[styles.inputText, !selectedType && styles.placeholder]}>
                    {selectedType || 'Tipo de Gasto'}
                  </Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>

                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Valor Ej: 12,69 €"
                  placeholderTextColor="#697b92"
                  value={valorGasto}
                  onChangeText={setValorGasto}
                  keyboardType="decimal-pad"
                />
              </View>

              {showTypeDropdown && (
                <View style={styles.dropdownMenu}>
                  {tiposGasto.map((tipo) => (
                    <TouchableOpacity
                      key={tipo}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedType(tipo);
                        setShowTypeDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{tipo}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={styles.uploadText}>Haz una foto o sube una imagen</Text>
              </TouchableOpacity>

              {imagenGasto && (
                <Image source={{ uri: imagenGasto }} style={styles.previewImage} />
              )}

              <TouchableOpacity style={styles.addButton} onPress={handleAddGasto}>
                <LinearGradient
                  colors={['#092090', '#0C2ABF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addGradient}
                >
                  <Text style={styles.addIcon}>+</Text>
                  <Text style={styles.addText}>Añadir Nuevo Gasto</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* COLUMNA DERECHA - Lista */}
          <View style={styles.rightColumn}>
            <ScrollView>
              <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar gasto..."
                  placeholderTextColor="#697b92"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
                {categoriasFiltro.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterChip, selectedCategoria === cat && styles.filterChipActive]}
                    onPress={() => setSelectedCategoria(cat)}
                  >
                    <Text style={[styles.filterText, selectedCategoria === cat && styles.filterTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.totalCard}>
                <View>
                  <Text style={styles.totalLabel}>
                    Total Gastos {selectedCategoria !== 'Todas' ? `(${selectedCategoria})` : ''}
                  </Text>
                  <Text style={styles.totalValue}>{totalGastos.toFixed(2).replace('.', ',')} €</Text>
                </View>
                <View>
                  <Text style={styles.totalLabel}>Registros</Text>
                  <Text style={styles.totalCount}>{filteredGastos.length}</Text>
                </View>
              </View>

              {filteredGastos.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No hay gastos registrados</Text>
                </View>
              ) : (
                filteredGastos.map((gasto) => (
                  <View key={gasto.id} style={styles.gastoCard}>
                    {gasto.imagen && (
                      <Image source={{ uri: gasto.imagen }} style={styles.gastoImage} />
                    )}
                    {!gasto.imagen && (
                      <View style={styles.gastoImagePlaceholder}>
                        <Text style={styles.gastoImageIcon}>💰</Text>
                      </View>
                    )}
                    <View style={styles.gastoInfo}>
                      <Text style={styles.gastoNombre}>{gasto.nombre}</Text>
                      <View style={styles.gastoMeta}>
                        <View style={styles.categoriaBadge}>
                          <Text style={styles.categoriaBadgeText}>{gasto.categoria}</Text>
                        </View>
                        <Text style={styles.gastoFecha}>{gasto.fecha}</Text>
                      </View>
                    </View>
                    <View style={styles.gastoRight}>
                      <Text style={styles.gastoPrecio}>{gasto.precio}</Text>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => {
                          console.log('🔘 Botón Eliminar presionado para gasto:', gasto.id);
                          handleDeleteGasto(gasto.id);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.deleteButtonText}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
      </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { minWidth: 1000 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  backIcon: { fontSize: 24, color: '#697b92' },
  title: { fontSize: 32, fontWeight: '700', color: '#1a1a1a' },
  resumenButton: { borderRadius: 30, overflow: 'hidden' },
  resumenGradient: { paddingVertical: 10, paddingHorizontal: 20 },
  resumenText: { fontSize: 18, fontWeight: '600', color: '#ffffff' },
  mainContent: { flexDirection: 'row', minWidth: 1000 },
  leftColumn: { width: 480, padding: 40, borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  subtitle: { fontSize: 24, fontWeight: '600', color: '#1a1a1a', marginBottom: 24 },
  successMessage: { backgroundColor: '#91e600', borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  successIcon: { fontSize: 24, color: '#ffffff', marginRight: 8 },
  successText: { fontSize: 18, fontWeight: '600', color: '#ffffff' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5, padding: 18, fontSize: 18, color: '#1a1a1a', marginBottom: 14, minHeight: 56 },
  row: { flexDirection: 'row', marginBottom: 16 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: 10 },
  inputText: { fontSize: 18, color: '#1a1a1a' },
  placeholder: { color: '#697b92' },
  dropdownIcon: { fontSize: 16, color: '#697b92' },
  dropdownMenu: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 5, marginTop: -14, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  dropdownItemText: { fontSize: 18, color: '#1a1a1a' },
  uploadButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed', borderRadius: 8, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  uploadIcon: { fontSize: 18, marginRight: 10 },
  uploadText: { fontSize: 18, color: '#697b92' },
  previewImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 16 },
  addButton: { borderRadius: 30, overflow: 'hidden' },
  addGradient: { paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  addIcon: { fontSize: 20, color: '#ffffff', marginRight: 8, fontWeight: '600' },
  addText: { fontSize: 18, fontWeight: '600', color: '#ffffff' },
  rightColumn: { flex: 1, padding: 40 },
  searchContainer: { flexDirection: 'row', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 30, height: 50, alignItems: 'center', paddingHorizontal: 18, marginBottom: 16 },
  searchIcon: { fontSize: 18, marginRight: 14 },
  searchInput: { flex: 1, fontSize: 18, color: '#1a1a1a' },
  filters: { marginBottom: 24 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 30, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', marginRight: 8 },
  filterChipActive: { backgroundColor: '#0C2ABF', borderColor: '#0C2ABF' },
  filterText: { fontSize: 17, fontWeight: '600', color: '#697b92' },
  filterTextActive: { color: '#ffffff' },
  totalCard: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 16, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  totalLabel: { fontSize: 18, color: '#697b92', marginBottom: 4 },
  totalValue: { fontSize: 32, fontWeight: '700', color: '#f59e0b' },
  totalCount: { fontSize: 32, fontWeight: '700', color: '#1a1a1a', textAlign: 'right' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 20, color: '#697b92' },
  gastoCard: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 18, flexDirection: 'row', marginBottom: 12 },
  gastoImage: { width: 96, height: 96, borderRadius: 10, marginRight: 16 },
  gastoImagePlaceholder: { width: 96, height: 96, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  gastoImageIcon: { fontSize: 40 },
  gastoInfo: { flex: 1, justifyContent: 'center' },
  gastoNombre: { fontSize: 20, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 },
  gastoMeta: { flexDirection: 'row', alignItems: 'center' },
  categoriaBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginRight: 12 },
  categoriaBadgeText: { fontSize: 16, color: '#697b92' },
  gastoFecha: { fontSize: 16, color: '#697b92' },
  gastoRight: { justifyContent: 'center', alignItems: 'flex-end' },
  gastoPrecio: { fontSize: 22, fontWeight: '600', color: '#f59e0b', marginBottom: 8 },
  deleteButton: { backgroundColor: '#fee2e2', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 6 },
  deleteButtonText: { fontSize: 16, fontWeight: '600', color: '#dc2626' }
});