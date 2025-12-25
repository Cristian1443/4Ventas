/**
 * Servicio de Gestión de Vendedores
 * Sistema local para manejar múltiples vendedores sin autenticación ERP
 * Sincroniza desde Google Sheets (no hay endpoint en el ERP)
 */

import { storageService } from './storage.service';

export interface Vendedor {
    id: string;
    nombre: string;
    codigo: string;
    sessionId: string; // ID de sesión del ERP (ej: "18", "39")
    activo: boolean;
    fechaCreacion: string;
}

class VendorService {
    private readonly STORAGE_KEY = 'vendedores';
    private readonly CURRENT_VENDOR_KEY = 'vendedor_actual';

    // ============================================================================
    // GESTIÓN DE VENDEDORES
    // ============================================================================

    async getVendedores(): Promise<Vendedor[]> {
        try {
            const vendedores = await storageService.getItem<Vendedor[]>(this.STORAGE_KEY) || [];
            console.log(`📋 [VendorService] ${vendedores.length} vendedores encontrados`);
            return vendedores;
        } catch (error) {
            console.error('❌ [VendorService] Error obteniendo vendedores:', error);
            return [];
        }
    }

    async getVendedorById(id: string): Promise<Vendedor | null> {
        const vendedores = await this.getVendedores();
        return vendedores.find(v => v.id === id) || null;
    }

    async agregarVendedor(vendedor: Omit<Vendedor, 'id' | 'fechaCreacion'>): Promise<Vendedor> {
        try {
            const vendedores = await this.getVendedores();

            // Generar ID único
            const nuevoVendedor: Vendedor = {
                ...vendedor,
                id: `VEN-${Date.now()}`,
                fechaCreacion: new Date().toISOString()
            };

            vendedores.push(nuevoVendedor);
            await storageService.setItem(this.STORAGE_KEY, vendedores);

            console.log(`✅ [VendorService] Vendedor agregado: ${nuevoVendedor.nombre}`);
            return nuevoVendedor;
        } catch (error) {
            console.error('❌ [VendorService] Error agregando vendedor:', error);
            throw error;
        }
    }

    async actualizarVendedor(id: string, updates: Partial<Vendedor>): Promise<boolean> {
        try {
            const vendedores = await this.getVendedores();
            const index = vendedores.findIndex(v => v.id === id);

            if (index === -1) {
                console.warn(`⚠️ [VendorService] Vendedor no encontrado: ${id}`);
                return false;
            }

            vendedores[index] = { ...vendedores[index], ...updates };
            await storageService.setItem(this.STORAGE_KEY, vendedores);

            console.log(`✅ [VendorService] Vendedor actualizado: ${id}`);
            return true;
        } catch (error) {
            console.error('❌ [VendorService] Error actualizando vendedor:', error);
            return false;
        }
    }

    async eliminarVendedor(id: string): Promise<boolean> {
        try {
            const vendedores = await this.getVendedores();
            const filtered = vendedores.filter(v => v.id !== id);

            if (filtered.length === vendedores.length) {
                console.warn(`⚠️ [VendorService] Vendedor no encontrado: ${id}`);
                return false;
            }

            await storageService.setItem(this.STORAGE_KEY, filtered);

            // Si el vendedor eliminado era el actual, limpiar sesión
            const currentVendor = await this.getVendedorActual();
            if (currentVendor?.id === id) {
                await this.cerrarSesion();
            }

            console.log(`✅ [VendorService] Vendedor eliminado: ${id}`);
            return true;
        } catch (error) {
            console.error('❌ [VendorService] Error eliminando vendedor:', error);
            return false;
        }
    }

    // ============================================================================
    // SESIÓN ACTUAL
    // ============================================================================

    async getVendedorActual(): Promise<Vendedor | null> {
        try {
            const vendedorId = await storageService.getItem<string>(this.CURRENT_VENDOR_KEY);
            if (!vendedorId) return null;

            return await this.getVendedorById(vendedorId);
        } catch (error) {
            console.error('❌ [VendorService] Error obteniendo vendedor actual:', error);
            return null;
        }
    }

    async iniciarSesion(vendedorId: string): Promise<Vendedor | null> {
        try {
            const vendedor = await this.getVendedorById(vendedorId);

            if (!vendedor) {
                console.warn(`⚠️ [VendorService] Vendedor no encontrado: ${vendedorId}`);
                return null;
            }

            if (!vendedor.activo) {
                console.warn(`⚠️ [VendorService] Vendedor inactivo: ${vendedor.nombre}`);
                return null;
            }

            await storageService.setItem(this.CURRENT_VENDOR_KEY, vendedorId);
            console.log(`✅ [VendorService] Sesión iniciada: ${vendedor.nombre} (Session ERP: ${vendedor.sessionId})`);

            return vendedor;
        } catch (error) {
            console.error('❌ [VendorService] Error iniciando sesión:', error);
            return null;
        }
    }

    async cerrarSesion(): Promise<void> {
        try {
            await storageService.removeItem(this.CURRENT_VENDOR_KEY);
            console.log(`✅ [VendorService] Sesión cerrada`);
        } catch (error) {
            console.error('❌ [VendorService] Error cerrando sesión:', error);
        }
    }


    // ============================================================================
    // INICIALIZACIÓN CON VENDEDORES POR DEFECTO
    // ============================================================================

    async inicializarVendedoresPorDefecto(): Promise<void> {
        try {
            const vendedores = await this.getVendedores();

            // Si ya hay vendedores, no hacer nada
            if (vendedores.length > 0) {
                console.log(`ℹ️ [VendorService] Ya existen ${vendedores.length} vendedores configurados`);
                return;
            }

            // Crear vendedores por defecto con códigos de agente (902, 903, etc.)
            // Estos son los agentes mencionados por el usuario:
            // Teixido Flor: Agente 902, 903, 904, 905, 908, 909
            // Xosé María Teixido Núñez: Agente 906, 912, 913
            const vendedoresPorDefecto: Omit<Vendedor, 'id' | 'fechaCreacion'>[] = [
                { nombre: 'Agente 902', codigo: 'Agente 902', sessionId: '902', activo: true },
                { nombre: 'Agente 903', codigo: 'Agente 903', sessionId: '903', activo: true },
                { nombre: 'Agente 904', codigo: 'Agente 904', sessionId: '904', activo: true },
                { nombre: 'Agente 905', codigo: 'Agente 905', sessionId: '905', activo: true },
                { nombre: 'Agente 906', codigo: 'Agente 906', sessionId: '906', activo: true },
                { nombre: 'Agente 908', codigo: 'Agente 908', sessionId: '908', activo: true },
                { nombre: 'Agente 909', codigo: 'Agente 909', sessionId: '909', activo: true },
                { nombre: 'Agente 912', codigo: 'Agente 912', sessionId: '912', activo: true },
                { nombre: 'Agente 913', codigo: 'Agente 913', sessionId: '913', activo: true },
            ];

            for (const vendedor of vendedoresPorDefecto) {
                await this.agregarVendedor(vendedor);
            }

            console.log(`✅ [VendorService] ${vendedoresPorDefecto.length} vendedores por defecto creados`);
        } catch (error) {
            console.error('❌ [VendorService] Error inicializando vendedores por defecto:', error);
        }
    }
}

export const vendorService = new VendorService();
