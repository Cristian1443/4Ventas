/**
 * Modal de Selección de Cliente - React Native
 * IGUAL a la versión web
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal
} from 'react-native';

interface Cliente {
  id: string;
  nombre: string;
  empresa: string;
  direccion: string;
  telefono?: string;
  email?: string;
  ultimaVisita?: string;
}

interface SeleccionarClienteModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (cliente: Cliente) => void;
  clientes: Cliente[];
}

export default function SeleccionarClienteModal({
  visible,
  onClose,
  onSelect,
  clientes
}: SeleccionarClienteModalProps) {
  const [busqueda, setBusqueda] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  // Limpiar búsqueda cuando se cierra el modal
  useEffect(() => {
    if (!visible) {
      setBusqueda('');
      searchInputRef.current?.blur();
    }
  }, [visible]);

  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.empresa.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.id.includes(busqueda) ||
    (c.direccion && c.direccion.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Seleccionar Cliente</Text>
              {clientes.length > 0 && (
                <Text style={styles.subtitle}>
                  {clientes.length} clientes disponibles
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Buscador */}
          <TouchableOpacity 
            style={styles.searchContainer}
            onPress={() => searchInputRef.current?.focus()}
            activeOpacity={1}
          >
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Buscar por código, nombre o empresa..."
              placeholderTextColor="#94a3b8"
              value={busqueda}
              onChangeText={setBusqueda}
              autoCapitalize="none"
              autoFocus={false}
              showSoftInputOnFocus={true}
              blurOnSubmit={false}
            />
          </TouchableOpacity>

          {/* Lista de clientes */}
          <ScrollView style={styles.listContainer}>
            {clientesFiltrados.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>
                  {busqueda ? 'No se encontraron clientes' : 'No hay clientes'}
                </Text>
                <Text style={styles.emptyText}>
                  {busqueda ? 'Intenta con otros términos' : 'Los clientes se cargarán del ERP'}
                </Text>
              </View>
            ) : (
              clientesFiltrados.map((cliente) => (
                <TouchableOpacity
                  key={cliente.id}
                  style={styles.clienteCard}
                  onPress={() => {
                    onSelect(cliente);
                    setBusqueda('');
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.clienteInfo}>
                    <View style={styles.clienteHeader}>
                      <View style={styles.clienteIdBadge}>
                        <Text style={styles.clienteIdText}>{cliente.id}</Text>
                      </View>
                      <Text style={styles.clienteEmpresa}>{cliente.empresa}</Text>
                    </View>
                    <Text style={styles.clienteNombre}>{cliente.nombre}</Text>
                    {cliente.direccion && (
                      <Text style={styles.clienteDireccion}>📍 {cliente.direccion}</Text>
                    )}
                    {cliente.telefono && (
                      <Text style={styles.clienteTelefono}>📞 {cliente.telefono}</Text>
                    )}
                    {cliente.ultimaVisita && (
                      <Text style={styles.clienteUltimaVisita}>
                        Última visita: {cliente.ultimaVisita}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.arrowContainer}>
                    <Text style={styles.arrowIcon}>›</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 700,
    maxHeight: '80%',
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0C2ABF',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#697b92'
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeIcon: {
    fontSize: 28,
    color: '#697b92',
    fontWeight: '300'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginHorizontal: 24,
    marginVertical: 16,
    paddingHorizontal: 16
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#1a1a1a'
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20
  },
  clienteCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  clienteInfo: {
    flex: 1
  },
  clienteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  clienteIdBadge: {
    backgroundColor: '#91e600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8
  },
  clienteIdText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  clienteEmpresa: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1
  },
  clienteNombre: {
    fontSize: 14,
    color: '#697b92',
    marginBottom: 4
  },
  clienteDireccion: {
    fontSize: 12,
    color: '#697b92',
    marginBottom: 2
  },
  clienteTelefono: {
    fontSize: 12,
    color: '#697b92',
    marginTop: 4
  },
  clienteUltimaVisita: {
    fontSize: 11,
    color: '#07BC13',
    fontWeight: '600',
    marginTop: 4
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f7fd',
    alignItems: 'center',
    justifyContent: 'center'
  },
  arrowIcon: {
    fontSize: 24,
    color: '#0C2ABF',
    fontWeight: '300'
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center'
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: '#697b92',
    textAlign: 'center'
  }
});




