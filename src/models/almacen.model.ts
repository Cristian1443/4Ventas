export interface NotaAlmacen {
    id: string;
    tipo: 'Carga Camion' | 'Descarga Camion' | 'Inventario Camion' | 'Intercambio Entrada' | 'Intercambio Salida';
    fecha: string;
    usuario: string;
    articulos: number;
    observaciones?: string;
    estado?: 'pendiente' | 'sincronizado';
    items?: { articuloId: string; nombre: string; cantidad: number }[];
    /** Epoch ms al crear la nota en la tablet; permite filtrar por el último reset de stock local. */
    liquidacionSesionTs?: number;
}
