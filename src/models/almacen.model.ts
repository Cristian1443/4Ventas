export interface NotaAlmacen {
    id: string;
    tipo: 'Carga Camion' | 'Descarga Camion' | 'Inventario Camion' | 'Intercambio Entrada' | 'Intercambio Salida';
    fecha: string;
    usuario: string;
    articulos: number;
    observaciones?: string;
}
