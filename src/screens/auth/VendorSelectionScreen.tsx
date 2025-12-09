/**
 * Vendor Selection Screen
 * Diseño coherente con los colores de la app (Azul #0C2ABF + Verde #8bd600)
 * Con aislamiento de sesión - cada vendedor tiene sus propios datos
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '../../constants/layout';
import { vendorService, Vendedor } from '../../services/vendor.service';
import { setSessionId } from '../../services/erp.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function VendorSelectionScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const layout = useResponsiveLayout();
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        loadVendedores();
    }, []);

    const loadVendedores = async () => {
        try {
            setLoading(true);
            await vendorService.inicializarVendedoresPorDefecto();
            const lista = await vendorService.getVendedores();
            const activos = lista.filter(v => v.activo);

            if (activos.length === 0) {
                Alert.alert(
                    'Sin Vendedores',
                    'No hay vendedores configurados. Contacta al administrador.',
                    [{ text: 'Volver', onPress: () => navigation.goBack() }]
                );
            }

            setVendedores(activos);
        } catch (error) {
            console.error('Error cargando vendedores:', error);
            Alert.alert('Error', 'No se pudieron cargar los vendedores');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectVendedor = async (vendedor: Vendedor) => {
        try {
            setSelectedId(vendedor.id);

            // IMPORTANTE: Limpiar datos del vendedor anterior para aislamiento de sesión
            console.log(`🔄 Limpiando datos del vendedor anterior...`);

            // Obtener todas las claves y filtrar las que queremos mantener
            const keysToKeep = ['vendedores', 'vendedor_actual', 'config'];
            const allKeys = await AsyncStorage.getAllKeys();
            const keysToRemove = allKeys.filter((key: string) => !keysToKeep.includes(key));

            if (keysToRemove.length > 0) {
                await AsyncStorage.multiRemove(keysToRemove);
                console.log(`✅ ${keysToRemove.length} claves de datos limpiadas (sesión aislada)`);
            }

            // Iniciar sesión con el nuevo vendedor
            const result = await vendorService.iniciarSesion(vendedor.id);

            if (result) {
                // Configurar el sessionId del ERP ÚNICO para este vendedor
                setSessionId(vendedor.sessionId);
                console.log(`✅ Sesión iniciada: ${vendedor.nombre} (ERP Session: ${vendedor.sessionId})`);

                setTimeout(() => {
                    navigation.replace('Main');
                }, 400);
            } else {
                Alert.alert('Error', 'No se pudo iniciar sesión');
                setSelectedId(null);
            }
        } catch (error) {
            console.error('Error al seleccionar vendedor:', error);
            Alert.alert('Error', 'Ocurrió un error al iniciar sesión');
            setSelectedId(null);
        }
    };

    // Calcular número de columnas según el ancho
    const numColumns = layout.isTablet ? (width > 1200 ? 4 : 3) : 2;
    const cardWidth = layout.isTablet ? 240 : (width - 80) / 2;

    const renderVendedor = ({ item }: { item: Vendedor }) => {
        const isSelected = selectedId === item.id;
        const inicial = item.nombre.charAt(0).toUpperCase();

        return (
            <TouchableOpacity
                style={[
                    styles.vendedorCard,
                    { width: cardWidth },
                    isSelected && styles.vendedorCardSelected
                ]}
                onPress={() => handleSelectVendedor(item)}
                disabled={isSelected}
                activeOpacity={0.85}
            >
                <View style={[styles.cardContainer, isSelected && styles.cardContainerSelected]}>
                    {/* Avatar con gradiente azul de la app */}
                    <LinearGradient
                        colors={['#092090', '#0C2ABF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.avatarContainer}
                    >
                        <Text style={styles.avatarText}>{inicial}</Text>
                    </LinearGradient>

                    {/* Nombre del vendedor */}
                    <Text style={styles.vendedorNombre} numberOfLines={2}>
                        {item.nombre}
                    </Text>

                    {/* Badge con código y sessionId */}
                    <View style={styles.codigoBadge}>
                        <Text style={styles.codigoText}>{item.codigo}</Text>
                    </View>

                    <Text style={styles.sessionText}>Sesión ERP: {item.sessionId}</Text>

                    {/* Indicador de selección con verde de la app */}
                    {isSelected && (
                        <View style={styles.loadingOverlay}>
                            <LinearGradient
                                colors={['#8bd600', '#c4ff57']}
                                style={styles.checkmarkGradient}
                            >
                                <Text style={styles.checkmark}>✓</Text>
                            </LinearGradient>
                            <ActivityIndicator size="small" color="#8bd600" style={{ marginTop: 12 }} />
                            <Text style={styles.loadingText}>Iniciando...</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0C2ABF" />
                    <Text style={styles.loadingTextMain}>Cargando vendedores...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            {/* Header con colores de la app */}
            <LinearGradient
                colors={['#092090', '#0C2ABF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>

                <View style={styles.headerContent}>
                    <Text style={styles.title}>Selecciona tu Perfil</Text>
                    <Text style={styles.subtitle}>Cada vendedor tiene su propia sesión</Text>
                </View>
            </LinearGradient>

            {/* Grid de vendedores */}
            <FlatList
                data={vendedores}
                keyExtractor={(item) => item.id}
                renderItem={renderVendedor}
                numColumns={numColumns}
                key={numColumns}
                contentContainerStyle={styles.gridContent}
                columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>👥</Text>
                        <Text style={styles.emptyText}>No hay vendedores disponibles</Text>
                        <Text style={styles.emptySubtext}>Contacta al administrador</Text>
                    </View>
                }
            />

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    ¿No encuentras tu perfil? Contacta al administrador
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    loadingTextMain: {
        fontSize: 20,
        color: '#64748b',
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    backButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginRight: 18,
    },
    backIcon: {
        fontSize: 26,
        color: '#ffffff',
        fontWeight: '600',
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
    gridContent: {
        padding: 28,
        paddingBottom: 120,
    },
    row: {
        justifyContent: 'flex-start',
        gap: 20,
        marginBottom: 20,
    },
    vendedorCard: {
        marginBottom: 20,
    },
    vendedorCardSelected: {
        transform: [{ scale: 0.97 }],
    },
    cardContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        minHeight: 280,
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardContainerSelected: {
        borderColor: '#8bd600',
        borderWidth: 3,
    },
    avatarContainer: {
        width: 110,
        height: 110,
        borderRadius: 55,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
        shadowColor: '#092090',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    avatarText: {
        fontSize: 52,
        fontWeight: '800',
        color: '#ffffff',
    },
    vendedorNombre: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 12,
        minHeight: 56,
        lineHeight: 28,
    },
    codigoBadge: {
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#c7d2fe',
        marginBottom: 8,
    },
    codigoText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#4f46e5',
        letterSpacing: 0.5,
    },
    sessionText: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '600',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
    },
    checkmarkGradient: {
        width: 68,
        height: 68,
        borderRadius: 34,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8bd600',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
    },
    checkmark: {
        fontSize: 38,
        color: '#1e293b',
        fontWeight: '900',
    },
    loadingText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#64748b',
        marginTop: 8,
    },
    emptyState: {
        padding: 80,
        alignItems: 'center',
    },
    emptyIcon: {
        fontSize: 72,
        marginBottom: 20,
        opacity: 0.3,
    },
    emptyText: {
        fontSize: 22,
        color: '#475569',
        textAlign: 'center',
        fontWeight: '700',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 17,
        color: '#94a3b8',
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: 28,
        paddingVertical: 22,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    footerText: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        fontWeight: '500',
    },
});
