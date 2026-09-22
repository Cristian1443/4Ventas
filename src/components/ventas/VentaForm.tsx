import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/colors';

interface VentaFormProps {
    clienteSeleccionado: any;
    onSelectCliente: () => void;

    estadoPago: 'pagado' | 'pendiente';
    setEstadoPago: (estado: 'pagado' | 'pendiente') => void;

    formaPago: string;
    onSelectFormaPago: () => void;

    tipoNotaLabel: string;
    onSelectTipoNota: () => void;

    // Add Item States
    codigoInput: string;
    setCodigoInput: (val: string) => void;
    onScanOrSearch: () => void;

    articuloSeleccionado: any;
    cant: string;
    setCant: (val: string) => void;
    precio: string;
    setPrecio: (val: string) => void;

    enableDiscount: boolean;
    setEnableDiscount: (val: boolean) => void;
    desc: string;
    setDesc: (val: string) => void;

    notaItem: string;
    setNotaItem: (val: string) => void;

    onAddItem: () => void;

    // Footer Actions
    onOpenHistory: () => void;
    onFinalize: () => void;

    keyboardPadding: number;
}

export default function VentaForm({
    clienteSeleccionado,
    onSelectCliente,
    estadoPago,
    setEstadoPago,
    formaPago,
    onSelectFormaPago,
    tipoNotaLabel,
    onSelectTipoNota,
    codigoInput,
    setCodigoInput,
    onScanOrSearch,
    articuloSeleccionado,
    cant,
    setCant,
    precio,
    setPrecio,
    enableDiscount,
    setEnableDiscount,
    desc,
    setDesc,
    notaItem,
    setNotaItem,
    onAddItem,
    onOpenHistory,
    onFinalize,
    keyboardPadding
}: VentaFormProps) {
    const cantidadRef = useRef<TextInput>(null);
    const precioRef = useRef<TextInput>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const addRowRef = useRef<View>(null);

    // Con softwareKeyboardLayoutMode="pan" en Android, el OS desplaza
    // toda la pantalla. Solo necesitamos un pequeño scroll extra para
    // asegurar que el botón AÑADIR (junto a Nota) sea visible.
    const scrollToAddRow = useCallback(() => {
        setTimeout(() => {
            addRowRef.current?.measureLayout(
                scrollViewRef.current as any,
                (_x: number, y: number) => {
                    scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 10), animated: true });
                },
                () => {}
            );
        }, 150);
    }, []);

    const isPrecioCeroOVacio = useCallback((raw: string): boolean => {
        const trimmed = String(raw ?? '').trim();
        if (!trimmed) return true;
        const normalized = trimmed.replace(/[€\s]/g, '').replace(',', '.');
        if (normalized === '' || normalized === '-' || normalized === '.') return true;
        const n = parseFloat(normalized);
        return Number.isFinite(n) && n === 0;
    }, []);

    const handlePrecioFocus = useCallback(() => {
        if (isPrecioCeroOVacio(precio)) setPrecio('');
        scrollToAddRow();
    }, [precio, setPrecio, isPrecioCeroOVacio, scrollToAddRow]);

    return (
        <View style={styles.container}>
            <View style={styles.scrollWrapper}>
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollInner,
                        { paddingBottom: keyboardPadding > 0 ? keyboardPadding : 40 }
                    ]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={true}
                >
                    {/* SECCIÓN CLIENTE Y CABECERA */}
                    <View style={styles.sectionCard}>
                        {/* CLIENTE */}
                        <View style={[styles.field, { zIndex: 20 }]}>
                            <Text style={styles.label}>Cliente *</Text>
                            <TouchableOpacity style={styles.select} onPress={onSelectCliente}>
                                <Text style={{ color: clienteSeleccionado ? colors.text : colors.textLight, fontSize: 19 }}>
                                    {clienteSeleccionado ? `${clienteSeleccionado.nombre}` : 'Seleccionar Cliente...'}
                                </Text>
                                <Text style={{ fontSize: 20 }}>🔍</Text>
                            </TouchableOpacity>
                            {clienteSeleccionado && (
                                <Text style={{ fontSize: 15, color: colors.textSecondary, marginTop: 4, marginLeft: 2 }}>
                                    {clienteSeleccionado.empresa} • {clienteSeleccionado.direccion}
                                </Text>
                            )}
                        </View>

                        {/* FILA DE OPCIONES */}
                        <View style={[styles.row, { marginBottom: 5 }]}>
                            <View style={{ flex: 1.2 }}>
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
                                <TouchableOpacity style={styles.selectCompact} onPress={onSelectFormaPago}>
                                    <Text numberOfLines={1} style={{ fontSize: 17, color: colors.text }}>{formaPago || '-'}</Text>
                                    <Text style={{ fontSize: 14 }}>▼</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.col}>
                                <Text style={styles.label}>Tipo Doc.</Text>
                                <TouchableOpacity style={styles.selectCompact} onPress={onSelectTipoNota}>
                                    <Text numberOfLines={1} style={{ fontSize: 17, color: colors.text }}>{tipoNotaLabel}</Text>
                                    <Text style={{ fontSize: 14 }}>▼</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />
                    <Text style={styles.secTitle}>Añadir Línea (Rápida)</Text>

                    {/* GRID DE AÑADIR LÍNEA */}
                    <View style={styles.addLineContainer}>
                        <View style={[styles.gridRow, { alignItems: 'flex-end' }]}>
                            <View style={{ flex: 3, marginRight: 8 }}>
                                <Text style={styles.label}>Artículo / Código</Text>
                                <View style={styles.inputWithIcon}>
                                    <TextInput
                                        style={styles.inputNoBorder}
                                        value={codigoInput}
                                        onChangeText={setCodigoInput}
                                        placeholder="Escanear o buscar..."
                                        placeholderTextColor={colors.textLight}
                                        onFocus={scrollToAddRow}
                                    />
                                    <TouchableOpacity onPress={onScanOrSearch} style={styles.iconContainer}>
                                        <Text style={{ fontSize: 20 }}>🔍</Text>
                                    </TouchableOpacity>
                                </View>
                                {articuloSeleccionado && (
                                    <Text style={{ fontSize: 15, color: colors.success, marginTop: 2, fontWeight: '600' }} numberOfLines={1}>
                                        {articuloSeleccionado.nombre}
                                    </Text>
                                )}
                            </View>

                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.label}>Cantidad</Text>
                                <TextInput
                                    style={styles.inputGrid}
                                    value={cant}
                                    onChangeText={setCant}
                                    keyboardType="numeric"
                                    onFocus={scrollToAddRow}
                                />
                            </View>

                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.label}>Precio</Text>
                                <TextInput
                                    ref={precioRef}
                                    style={styles.inputGrid}
                                    value={precio}
                                    onChangeText={setPrecio}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                    onFocus={handlePrecioFocus}
                                />
                            </View>

                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                    <Text style={[styles.label, { marginBottom: 0 }]}>DTO %</Text>
                                    <Switch
                                        value={enableDiscount}
                                        onValueChange={setEnableDiscount}
                                        trackColor={{ false: colors.border, true: colors.primary }}
                                        thumbColor={"#fff"}
                                        style={{ transform: [{ scaleX: 0.6 }, { scaleY: 0.6 }] }}
                                    />
                                </View>
                                <TextInput
                                    style={[styles.inputGrid, !enableDiscount && styles.inputDisabled]}
                                    value={desc}
                                    onChangeText={setDesc}
                                    keyboardType="numeric"
                                    onFocus={scrollToAddRow}
                                    placeholder="0"
                                    editable={enableDiscount}
                                />
                            </View>
                        </View>

                        <View
                            ref={addRowRef}
                            style={[styles.gridRow, { marginTop: 12, alignItems: 'flex-end' }]}
                        >
                            <View style={{ flex: 3, marginRight: 12 }}>
                                <Text style={styles.label}>Nota (Opcional)</Text>
                                <TextInput
                                    style={[styles.inputGrid, { height: 40, textAlign: 'left', paddingHorizontal: 10 }]}
                                    value={notaItem}
                                    onChangeText={setNotaItem}
                                    placeholder="Detalle..."
                                    onFocus={scrollToAddRow}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <TouchableOpacity style={styles.addBtnCompact} onPress={onAddItem}>
                                    <LinearGradient colors={colors.gradientPrimary} style={styles.gradBtnCompact}>
                                        <Text style={styles.txtBtnCompact}>+ AÑADIR</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 60 }} />
                </ScrollView>
            </View>

            {keyboardPadding === 0 && (
                <View style={styles.panelFooter}>
                    <TouchableOpacity style={styles.btnSec} onPress={onOpenHistory}><Text style={{ fontSize: 16, color: colors.textSecondary, fontWeight: '600' }}>Historial</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnPri} onPress={onFinalize}>
                        <LinearGradient colors={colors.gradientSuccess} style={styles.gradBtn}><Text style={styles.txtBtnBlack}>✅ FINALIZAR VENTA</Text></LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, borderRightWidth: 1, borderColor: colors.border, backgroundColor: colors.background, flexDirection: 'column' },
    scrollWrapper: { flex: 1, minHeight: 0 },
    scrollView: { flex: 1 },
    scrollInner: { padding: 20, paddingBottom: 40 },

    sectionCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1
    },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
    secTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: colors.text },

    addLineContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.primary,
        marginBottom: 10,
        shadowColor: colors.primary,
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },

    field: { marginBottom: 14 },
    label: { fontSize: 15, color: colors.textSecondary, marginBottom: 4, fontWeight: '600', textTransform: 'uppercase' },

    select: { height: 44, borderWidth: 1, borderColor: colors.borderDark, borderRadius: 8, justifyContent: 'space-between', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background },
    selectCompact: { height: 38, borderWidth: 1, borderColor: colors.borderDark, borderRadius: 8, justifyContent: 'space-between', paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background },

    row: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    col: { flex: 1 },
    switchRowCompact: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: 6, padding: 2, height: 38 },
    switchBtnCompact: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 5 },
    switchTxtCompact: { fontSize: 16, color: colors.textSecondary, fontWeight: '600' },

    bgSuccess: { backgroundColor: colors.success },
    bgWarning: { backgroundColor: colors.warning },
    txtWhite: { color: colors.textInverse },

    gridRow: { flexDirection: 'row' },
    inputWithIcon: {
        height: 42,
        borderWidth: 1,
        borderColor: colors.borderDark,
        borderRadius: 8,
        backgroundColor: colors.background,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
        overflow: 'hidden'
    },
    inputNoBorder: { flex: 1, fontSize: 18, color: colors.text, height: '100%' },
    iconContainer: { width: 40, height: '100%', alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.border, backgroundColor: colors.card },

    inputGrid: {
        height: 42,
        borderWidth: 1,
        borderColor: colors.borderDark,
        borderRadius: 8,
        paddingHorizontal: 10,
        backgroundColor: colors.background,
        fontSize: 18,
        textAlign: 'center',
        color: colors.text
    },
    inputDisabled: {
        backgroundColor: colors.border,
        color: colors.disabled,
        borderColor: colors.border
    },

    addBtnCompact: { borderRadius: 8, overflow: 'hidden', height: 42 },
    gradBtnCompact: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    txtBtnCompact: { color: colors.textInverse, fontWeight: 'bold', fontSize: 16 },

    panelFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    btnSec: { padding: 10 },
    btnPri: { borderRadius: 8, overflow: 'hidden', height: 48, paddingHorizontal: 20, minWidth: 180 },
    gradBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    txtBtnBlack: { color: '#000', fontWeight: 'bold', fontSize: 17 },
});
