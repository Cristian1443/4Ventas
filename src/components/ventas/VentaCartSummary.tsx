import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput } from 'react-native';
import { colors } from '../../constants/colors';

interface CartItem {
    id: string;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    nota?: string;
}

interface Totals {
    subtotal: number;
    descuentos: number;
    base: number;
    iva: number;
    total: number;
}

interface VentaCartSummaryProps {
    carrito: CartItem[];
    totales: Totals;
    onRemoveItem: (id: string) => void;
    enableGlobalDiscount: boolean;
    setEnableGlobalDiscount: (val: boolean) => void;
    globalDiscountValue: string;
    setGlobalDiscountValue: (val: string) => void;
}

export default function VentaCartSummary({
    carrito,
    totales,
    onRemoveItem,
    enableGlobalDiscount,
    setEnableGlobalDiscount,
    globalDiscountValue,
    setGlobalDiscountValue
}: VentaCartSummaryProps) {

    return (
        <View style={styles.container}>
            <Text style={styles.secTitle}>Resumen ({carrito.length})</Text>

            {/* LISTA DE ARTÍCULOS */}
            <View style={styles.cartListContainer}>
                {carrito.length === 0 ? (
                    <View style={styles.emptyCart}>
                        <Text style={{ fontSize: 52 }}>🛒</Text>
                        <Text style={styles.emptyCartText}>Carrito Vacío</Text>
                    </View>
                ) : (
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 0 }}>
                        {carrito.map(i => (
                            <View key={i.id} style={styles.rowItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>{i.nombre}</Text>
                                    <Text style={styles.itemDetails}>x{i.cantidad}  {i.descuento > 0 ? `(-${i.descuento}%)` : ''}</Text>
                                    {i.nota ? <Text style={styles.itemNote}>{i.nota}</Text> : null}
                                </View>
                                <Text style={styles.itemPrice}>{(i.precioUnitario * i.cantidad).toFixed(2)} €</Text>
                                <TouchableOpacity onPress={() => onRemoveItem(i.id)} style={styles.removeBtn}>
                                    <Text style={styles.removeIcon}>×</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* DESCUENTO GLOBAL */}
            <View style={styles.globalDiscountBox}>
                <View style={styles.discountHeader}>
                    <Text style={styles.label}>Descuento Global</Text>
                    <Switch
                        value={enableGlobalDiscount}
                        onValueChange={setEnableGlobalDiscount}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={"#fff"}
                        style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                    />
                </View>

                {enableGlobalDiscount && (
                    <View style={styles.discountInputRow}>
                        <Text style={styles.discountLabel}>Porcentaje:</Text>
                        <TextInput
                            style={styles.inputGlobalDesc}
                            value={globalDiscountValue}
                            onChangeText={setGlobalDiscountValue}
                            keyboardType="numeric"
                            placeholder="0"
                            maxLength={3}
                        />
                        <Text style={styles.percentSymbol}>%</Text>
                    </View>
                )}
            </View>

            {/* TOTALES */}
            <View style={styles.totalBox}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{totales.subtotal.toFixed(2)} €</Text>
                </View>
                {totales.descuentos > 0 && (
                    <View style={styles.totalRow}>
                        <Text style={[styles.totalLabel, { color: colors.success }]}>
                            Descuentos {enableGlobalDiscount && globalDiscountValue ? `(Gbl ${globalDiscountValue}%)` : ''}
                        </Text>
                        <Text style={[styles.totalValue, { color: colors.success }]}>-{totales.descuentos.toFixed(2)} €</Text>
                    </View>
                )}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Base Imponible</Text><Text style={styles.totalValue}>{totales.base.toFixed(2)} €</Text>
                </View>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>IVA (21%)</Text><Text style={styles.totalValue}>{totales.iva.toFixed(2)} €</Text>
                </View>
                <View style={styles.divider} />
                <View style={[styles.totalRow, { alignItems: 'center' }]}>
                    <Text style={styles.grandTotalLabel}>TOTAL</Text>
                    <Text style={styles.grandTotalValue}>{totales.total.toFixed(2)} €</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, flexDirection: 'column', height: '100%' },
    secTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: colors.text },

    cartListContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        marginBottom: 10,
        backgroundColor: colors.card
    },
    emptyCart: { flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.5 },
    emptyCartText: { marginTop: 10, color: colors.textSecondary, fontSize: 18 },

    rowItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border
    },
    itemName: { fontSize: 16, fontWeight: '600', color: colors.text },
    itemDetails: { fontSize: 16, color: colors.textSecondary },
    itemNote: { fontSize: 15, color: colors.textLight, fontStyle: 'italic' },
    itemPrice: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    removeBtn: { marginLeft: 12, padding: 4 },
    removeIcon: { color: colors.danger, fontSize: 22 },

    globalDiscountBox: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border
    },
    discountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
    discountInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
    discountLabel: { fontSize: 16, color: colors.textSecondary },
    inputGlobalDesc: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.borderDark,
        borderRadius: 6,
        width: 60,
        height: 36,
        textAlign: 'center',
        fontSize: 16,
        color: colors.text
    },
    percentSymbol: { fontSize: 18, fontWeight: 'bold', color: colors.text },

    totalBox: {
        marginTop: 'auto',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16
    },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    totalLabel: { fontSize: 16, color: colors.textSecondary },
    totalValue: { fontSize: 16, color: colors.text },
    divider: { height: 1, backgroundColor: colors.borderDark, marginBottom: 10, marginTop: 5 },
    grandTotalLabel: { fontSize: 20, fontWeight: '800', color: colors.text },
    grandTotalValue: { fontSize: 28, fontWeight: '800', color: colors.primary },
});
