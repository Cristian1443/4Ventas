/**
 * Agenda Screen - EXACTAMENTE IGUAL A LA WEB
 * Calendario con visitas, entregas y cobros programados
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';
import ScreenWithSidebar from '../../components/common/ScreenWithSidebar';
import { Visita } from '../../types';

export default function AgendaScreen() {
  const navigation = useNavigation<any>();
  const { visitas, addVisita, toggleVisita, clientes, notasVenta, cobros } = useApp();

  // Obtener fecha actual
  const fechaActual = new Date();
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesActualNumero = fechaActual.getMonth();
  const diaActual = fechaActual.getDate();
  const añoActual = fechaActual.getFullYear();

  const [mesActual, setMesActual] = useState(meses[mesActualNumero]);
  const [diaSeleccionado, setDiaSeleccionado] = useState(diaActual);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  
  // Estado para nueva visita
  const [newVisita, setNewVisita] = useState({
    nombre: '',
    hora: '',
    tipo: 'visita' as 'visita' | 'entrega' | 'cobro',
    direccion: ''
  });

  // --- LÓGICA DE FILTRADO REAL ---
  
  // Construir fecha seleccionada YYYY-MM-DD
  const getFechaSeleccionadaISO = () => {
    const mesIndex = meses.indexOf(mesActual);
    // Nota: simplificación de año, asume año actual. En prod se debería manejar el cambio de año.
    return new Date(añoActual, mesIndex, diaSeleccionado).toISOString().split('T')[0];
  };

  const clientesDelDia = useMemo(() => {
    const fechaFiltro = getFechaSeleccionadaISO();
    
    return visitas
      .filter(v => v.fecha === fechaFiltro)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [visitas, diaSeleccionado, mesActual]);

  const diasConVisitas = useMemo(() => {
    const mesIndex = meses.indexOf(mesActual);
    const dias: number[] = [];
    
    visitas.forEach(v => {
        const [y, m, d] = v.fecha.split('-').map(Number);
        if (y === añoActual && m === mesIndex + 1) {
            if (!dias.includes(d)) dias.push(d);
        }
    });
    return dias;
  }, [visitas, mesActual]);

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'visita': return '#092090';
      case 'entrega': return '#10b981';
      case 'cobro': return '#f59e0b';
      default: return '#697b92';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'visita': return 'Visita';
      case 'entrega': return 'Entrega';
      case 'cobro': return 'Cobro';
      default: return tipo;
    }
  };

  // --- ACCIONES ---

  const handleToggleCompletado = async (id: string) => {
    await toggleVisita(id);
  };

  const handleAddCliente = async () => {
    if (!newVisita.nombre || !newVisita.hora || !newVisita.direccion) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const nueva: Visita = {
      id: `V${Date.now()}`, // ID temporal
      clienteNombre: newVisita.nombre,
      direccion: newVisita.direccion,
      fecha: getFechaSeleccionadaISO(),
      hora: newVisita.hora,
      tipo: newVisita.tipo,
      completado: false,
      observaciones: 'Creada manualmente'
    };

    await addVisita(nueva);
    setShowAddModal(false);
    setNewVisita({ nombre: '', hora: '', tipo: 'visita', direccion: '' });
  };

  const handleDiaClick = (dia: number) => {
    setDiaSeleccionado(dia);
  };

  // Stats basados en datos reales del día seleccionado
  const clientesCompletados = clientesDelDia.filter(c => c.completado).length;
  // Ventas realizadas HOY (independiente del día seleccionado en calendario, es KPI diario)
  const ventasHoy = notasVenta.filter(v => v.fecha.includes(new Date().toLocaleDateString('es-ES'))).length;
  const cobrosPendientes = cobros.filter(c => c.estado === 'pendiente').length;

  return (
    <ScreenWithSidebar currentScreen="Agenda" scrollable={false}>
    <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.navigate('Main', { screen: 'Dashboard' })}
              >
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Agenda de Visita</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addButtonGradient}
              >
                <Text style={styles.addButtonText}>+ Añadir Visita</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Visitas Completadas</Text>
              <Text style={[styles.statValue, { color: '#10b981' }]}>
                {clientesCompletados}/{clientesDelDia.length}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Ventas Hoy</Text>
              <Text style={[styles.statValue, { color: '#092090' }]}>
                {ventasHoy}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Cobros Pendientes</Text>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                {cobrosPendientes}
        </Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            {/* Calendario */}
            <View style={styles.calendarioContainer}>
              {/* Selector de mes */}
              <TouchableOpacity
                style={styles.mesSelector}
                onPress={() => setShowMonthPicker(!showMonthPicker)}
              >
                <LinearGradient
                  colors={['#092090', '#0C2ABF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.mesSelectorGradient}
                >
                  <Text style={styles.mesSelectorText}>
                    {mesActual} {añoActual}
                  </Text>
                  <Text style={styles.mesSelectorArrow}>▼</Text>
                </LinearGradient>
              </TouchableOpacity>

              {showMonthPicker && (
                <View style={styles.monthPicker}>
                  {meses.map(mes => (
                    <TouchableOpacity
                      key={mes}
                      style={[
                        styles.monthPickerItem,
                        mesActual === mes && styles.monthPickerItemActive
                      ]}
                      onPress={() => {
                        setMesActual(mes);
                        setShowMonthPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.monthPickerText,
                        mesActual === mes && styles.monthPickerTextActive
                      ]}>
                        {mes}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Días de la semana */}
              <View style={styles.diasSemanaContainer}>
                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((dia, i) => (
                  <Text key={i} style={styles.diaSemanaText}>
                    {dia}
                  </Text>
                ))}
              </View>

              {/* Días del mes */}
              <View style={styles.diasGrid}>
                {/* Días anteriores */}
                {[30, 31].map((dia) => (
                  <View key={`prev-${dia}`} style={styles.diaInactivo}>
                    <Text style={styles.diaInactivoText}>{dia}</Text>
                  </View>
                ))}

                {/* Días del mes actual */}
                {Array.from({ length: 30 }, (_, i) => i + 1).map((dia) => {
                  const esHoy = dia === diaActual;
                  const esDiaSeleccionado = dia === diaSeleccionado;
                  const tieneVisita = diasConVisitas.includes(dia);
                  return (
                    <TouchableOpacity
                      key={dia}
                      style={[
                        styles.diaButton,
                        esHoy && styles.diaButtonHoy,
                        esDiaSeleccionado && !esHoy && styles.diaButtonSeleccionado,
                        tieneVisita && !esHoy && !esDiaSeleccionado && styles.diaButtonConVisita
                      ]}
                      onPress={() => handleDiaClick(dia)}
                    >
                      <Text style={[
                        styles.diaText,
                        esHoy && styles.diaTextHoy,
                        esDiaSeleccionado && !esHoy && styles.diaTextSeleccionado,
                        tieneVisita && !esHoy && !esDiaSeleccionado && styles.diaTextConVisita
                      ]}>
                        {dia}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Días siguientes */}
                {Array.from({ length: 10 }, (_, i) => i + 1).map((dia) => (
                  <View key={`next-${dia}`} style={styles.diaInactivo}>
                    <Text style={styles.diaInactivoText}>{dia}</Text>
            </View>
                ))}
          </View>

              {/* Leyenda */}
              <View style={styles.leyenda}>
                <Text style={styles.leyendaTitle}>Leyenda:</Text>
                <View style={styles.leyendaItem}>
                  <View style={[styles.leyendaDot, { backgroundColor: '#171821' }]} />
                  <Text style={styles.leyendaText}>Hoy</Text>
                </View>
                <View style={styles.leyendaItem}>
                  <LinearGradient
                    colors={['#092090', '#0C2ABF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.leyendaDotGradient}
                  />
                  <Text style={styles.leyendaText}>Con visitas</Text>
                </View>
                <View style={styles.leyendaItem}>
                  <View style={[styles.leyendaDot, { backgroundColor: '#5a6fd8', borderWidth: 2, borderColor: '#092090' }]} />
                  <Text style={styles.leyendaText}>Día seleccionado</Text>
            </View>
          </View>
        </View>

            {/* Lista de clientes del día */}
            <View style={styles.clientesContainer}>
              <Text style={styles.clientesTitle}>
                Agenda - {diaSeleccionado} de {mesActual}
              </Text>

              {clientesDelDia.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    No hay visitas programadas para este día
                    </Text>
                  </View>
              ) : (
                clientesDelDia.map((visita) => (
                  <View
                    key={visita.id}
                    style={[
                      styles.clienteCard,
                      visita.completado && styles.clienteCardCompletado
                    ]}
                  >
                    <View style={[styles.clienteBar, { backgroundColor: getTipoColor(visita.tipo) }]} />
                    <View style={styles.clienteContent}>
                      <View style={styles.clienteInfo}>
                        <View style={styles.clienteHeader}>
                          <Text style={[
                            styles.clienteNombre,
                            visita.completado && styles.clienteNombreCompletado
                          ]}>
                            {visita.clienteNombre}
                          </Text>
                          <View style={[styles.tipoBadge, { backgroundColor: getTipoColor(visita.tipo) + '20' }]}>
                            <Text style={[styles.tipoBadgeText, { color: getTipoColor(visita.tipo) }]}>
                              {getTipoLabel(visita.tipo)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.clienteDireccion}>{visita.direccion}</Text>
                      </View>
                      <View style={styles.clienteActions}>
                        <View style={styles.horaBadge}>
                          <Text style={styles.horaText}>{visita.hora}</Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.checkButton,
                            visita.completado && styles.checkButtonCompletado
                          ]}
                          onPress={() => handleToggleCompletado(visita.id)}
                        >
                          {visita.completado && <Text style={styles.checkIcon}>✓</Text>}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
                </View>
        </ScrollView>

        {/* Modal para añadir cliente */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setShowAddModal(false)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>Añadir Visita</Text>

              <View style={styles.modalForm}>
                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Cliente</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newVisita.nombre}
                    onChangeText={(text) => setNewVisita({ ...newVisita, nombre: text })}
                    placeholder="Nombre del cliente"
                  />
        </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Hora</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newVisita.hora}
                    onChangeText={(text) => setNewVisita({ ...newVisita, hora: text })}
                    placeholder="HH:MM"
                  />
              </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Tipo</Text>
                  <View style={styles.tipoSelector}>
                    {(['visita', 'entrega', 'cobro'] as const).map((tipo) => (
                      <TouchableOpacity
                        key={tipo}
                        style={[
                          styles.tipoOption,
                          newVisita.tipo === tipo && styles.tipoOptionActive
                        ]}
                        onPress={() => setNewVisita({ ...newVisita, tipo })}
                      >
                        <Text style={[
                          styles.tipoOptionText,
                          newVisita.tipo === tipo && styles.tipoOptionTextActive
                        ]}>
                          {getTipoLabel(tipo)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
        </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>Dirección</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newVisita.direccion}
                    onChangeText={(text) => setNewVisita({ ...newVisita, direccion: text })}
                    placeholder="Dirección del cliente"
                    multiline
                  />
            </View>
            </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButtonCancel}
                  onPress={() => {
                    setShowAddModal(false);
                    setNewVisita({ nombre: '', hora: '', tipo: 'visita', direccion: '' });
                  }}
                >
                  <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButtonAdd}
                  onPress={handleAddCliente}
                >
                  <LinearGradient
                    colors={['#092090', '#0C2ABF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalButtonAddGradient}
                  >
                    <Text style={styles.modalButtonAddText}>Añadir</Text>
                  </LinearGradient>
                </TouchableOpacity>
            </View>
          </View>
          </TouchableOpacity>
        </Modal>
        </View>
    </ScreenWithSidebar>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    minHeight: 0, // CRÍTICO: Permite que ScrollView funcione
  },
  scrollView: {
    flex: 1,
    minHeight: 0, // CRÍTICO: Permite que ScrollView calcule su altura
  },
  scrollContent: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 60
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center'
  },
  backIcon: {
    fontSize: 24,
    color: '#697b92'
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  addButton: {
    borderRadius: 30,
    overflow: 'hidden'
  },
  addButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff'
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 10
  },
  statLabel: {
    fontSize: 18,
    color: '#697b92',
    marginBottom: 4
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  contentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 40
  },
  calendarioContainer: {
    flex: 0,
    minWidth: 300,
    width: 450
  },
  mesSelector: {
    borderRadius: 42.735,
    overflow: 'hidden',
    marginBottom: 20
  },
  mesSelectorGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12
  },
  mesSelectorText: {
    fontSize: 21,
    fontWeight: '600',
    color: '#ffffff'
  },
  mesSelectorArrow: {
    fontSize: 10,
    color: '#ffffff'
  },
  monthPicker: {
    position: 'absolute',
    top: 50,
    left: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    zIndex: 10,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4
  },
  monthPickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  monthPickerItemActive: {
    backgroundColor: '#f0f4ff'
  },
  monthPickerText: {
    fontSize: 16,
    color: '#1a1a1a'
  },
  monthPickerTextActive: {
    color: '#092090',
    fontWeight: '600'
  },
  diasSemanaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingHorizontal: 8
  },
  diaSemanaText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#092090',
    textAlign: 'center',
    width: 40
  },
  diasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8
  },
  diaButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  diaButtonHoy: {
    backgroundColor: '#171821'
  },
  diaButtonSeleccionado: {
    backgroundColor: '#5a6fd8',
    borderWidth: 2,
    borderColor: '#092090'
  },
  diaButtonConVisita: {
    backgroundColor: '#0C2ABF'
  },
  diaText: {
    fontSize: 22,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.45)'
  },
  diaTextHoy: {
    color: '#ffffff',
    fontWeight: '700'
  },
  diaTextSeleccionado: {
    color: '#ffffff',
    fontWeight: '700'
  },
  diaTextConVisita: {
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '700'
  },
  diaInactivo: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  diaInactivoText: {
    fontSize: 16,
    color: '#bbb'
  },
  leyenda: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 10
  },
  leyendaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#697b92',
    marginBottom: 8
  },
  leyendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  leyendaDot: {
    width: 18,
    height: 18,
    borderRadius: 9
  },
  leyendaDotGradient: {
    width: 18,
    height: 18,
    borderRadius: 9
  },
  leyendaText: {
    fontSize: 16,
    color: '#697b92'
  },
  clientesContainer: {
    flex: 1,
    minWidth: 300
  },
  clientesTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 20
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12
  },
  emptyText: {
    fontSize: 18,
    color: '#697b92'
  },
  clienteCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    marginBottom: 12
  },
  clienteCardCompletado: {
    backgroundColor: '#f0fdf4',
    opacity: 0.7
  },
  clienteBar: {
    width: 6,
    height: 50,
    borderRadius: 3,
    marginRight: 16
  },
  clienteContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16
  },
  clienteInfo: {
    flex: 1
  },
  clienteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 10
  },
  clienteNombre: {
    fontSize: 19,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  clienteNombreCompletado: {
    textDecorationLine: 'line-through'
  },
  tipoBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10
  },
  tipoBadgeText: {
    fontSize: 15,
    fontWeight: '600'
  },
  clienteDireccion: {
    fontSize: 17,
    color: '#697b92'
  },
  clienteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  horaBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#f1f5f9'
  },
  horaText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  checkButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkButtonCompletado: {
    borderColor: '#10b981',
    backgroundColor: '#10b981'
  },
  checkIcon: {
    fontSize: 18,
    color: '#ffffff'
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    maxWidth: 500,
    width: '90%'
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24
  },
  modalForm: {
    marginBottom: 24
  },
  modalField: {
    marginBottom: 16
  },
  modalLabel: {
    fontSize: 18,
    color: '#697b92',
    marginBottom: 8
  },
  modalInput: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    fontSize: 18,
    color: '#1a1a1a'
  },
  tipoSelector: {
    flexDirection: 'row',
    gap: 8
  },
  tipoOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center'
  },
  tipoOptionActive: {
    backgroundColor: '#0C2ABF',
    borderColor: '#0C2ABF'
  },
  tipoOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#697b92'
  },
  tipoOptionTextActive: {
    color: '#ffffff'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  modalButtonCancel: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center'
  },
  modalButtonCancelText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#697b92'
  },
  modalButtonAdd: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden'
  },
  modalButtonAddGradient: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  modalButtonAddText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff'
  }
});
