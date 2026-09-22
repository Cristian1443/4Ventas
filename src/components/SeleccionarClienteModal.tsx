/**
 * Modal de Selección de Cliente - React Native
 * IGUAL a la versión web
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  FlatList,
  TextInput,
  Modal
} from 'react-native';

interface Cliente {
  id: string;
  nombre: string;
  empresa: string;
  direccion: string;
  codigo?: string;
  nif?: string;
  telefono?: string;
  email?: string;
  ultimaVisita?: string;
  localidad?: string;
  provincia?: string;
  codigoPostal?: string;
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
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  // Limpiar búsqueda cuando se cierra el modal
  useEffect(() => {
    if (!visible) {
      setBusqueda('');
      setBusquedaDebounced('');
      searchInputRef.current?.blur();
    }
  }, [visible]);

  const normalizeText = (value: any): string =>
    String(value || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [busqueda]);

  const clientesFiltrados = useMemo(() => {
    if (!visible) return [];
    if (!busquedaDebounced) return clientes.slice(0, 220);
    const query = normalizeText(busquedaDebounced);
    return clientes.filter((c) => {
      const searchable = [
        c.id,
        c.codigo,
        c.nombre,
        c.empresa,
        c.direccion,
        c.localidad,
        c.provincia,
        c.codigoPostal,
        c.nif,
        c.telefono,
        c.email,
      ].map(normalizeText).join(' ');

      return searchable.includes(query);
    });
  }, [clientes, busquedaDebounced, visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
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
              placeholder="Buscar por código, nombre, localidad, dirección..."
              placeholderTextColor="#94a3b8"
              value={busqueda}
              onChangeText={setBusqueda}
              autoCapitalize="none"
              autoFocus={false}
              showSoftInputOnFocus={true}
              blurOnSubmit={false}
            />
          </TouchableOpacity>
          <View style={styles.searchMetaRow}>
            <Text style={styles.searchMetaText}>
              {clientesFiltrados.length} resultado(s)
            </Text>
            {busqueda.length > 0 && (
              <TouchableOpacity onPress={() => setBusqueda('')} style={styles.clearSearchChip}>
                <Text style={styles.clearSearchChipText}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Lista de clientes */}
          <View style={styles.listContainer}>
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
              <FlatList
                data={clientesFiltrados}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={18}
                maxToRenderPerBatch={24}
                windowSize={8}
                removeClippedSubviews
                keyboardDismissMode="on-drag"
                renderItem={({ item: cliente }) => {
                  const ubicacionLinea = [cliente.localidad, cliente.provincia, cliente.codigoPostal]
                    .map((s) => String(s || '').trim())
                    .filter(Boolean)
                    .join(' · ');
                  return (
                  <TouchableOpacity
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
                          <Text style={styles.clienteIdText}>{cliente.codigo || cliente.id}</Text>
                        </View>
                        <Text style={styles.clienteEmpresa}>{cliente.empresa}</Text>
                      </View>
                      <Text style={styles.clienteNombre}>{cliente.nombre}</Text>
                      {cliente.direccion ? (
                        <Text style={styles.clienteDireccion}>📍 {cliente.direccion}</Text>
                      ) : null}
                      {ubicacionLinea ? (
                        <Text style={styles.clienteLocalidad}>🏘 {ubicacionLinea}</Text>
                      ) : null}
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
                  );
                }}
              />
            )}
          </View>
          <View style={styles.footerActions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
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
    maxWidth: 800,
    height: '88%',
    maxHeight: '90%',
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#0C2ABF',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 16,
    color: '#697b92'
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeIcon: {
    fontSize: 32,
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
    marginHorizontal: 28,
    marginVertical: 20,
    paddingHorizontal: 18,
    height: 52
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12
  },
  searchInput: {
    flex: 1,
    height: 52,
    fontSize: 18,
    color: '#1a1a1a'
  },
  searchMetaRow: {
    marginTop: -8,
    marginBottom: 10,
    marginHorizontal: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchMetaText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  clearSearchChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
  clearSearchChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
    minHeight: 220
  },
  listContent: {
    paddingHorizontal: 28,
    paddingBottom: 24
  },
  clienteCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8
  },
  clienteIdText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  clienteEmpresa: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1
  },
  clienteNombre: {
    fontSize: 16,
    color: '#697b92',
    marginBottom: 4
  },
  clienteDireccion: {
    fontSize: 14,
    color: '#697b92',
    marginBottom: 2
  },
  clienteLocalidad: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    marginBottom: 2,
    marginTop: 2
  },
  clienteTelefono: {
    fontSize: 14,
    color: '#697b92',
    marginTop: 4
  },
  clienteUltimaVisita: {
    fontSize: 13,
    color: '#07BC13',
    fontWeight: '600',
    marginTop: 4
  },
  arrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f7fd',
    alignItems: 'center',
    justifyContent: 'center'
  },
  arrowIcon: {
    fontSize: 28,
    color: '#0C2ABF',
    fontWeight: '300'
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center'
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8
  },
  emptyText: {
    fontSize: 16,
    color: '#697b92',
    textAlign: 'center'
  },
  footerActions: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 12,
    alignItems: 'flex-end',
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: '#334155',
    fontWeight: '700',
  },
});




