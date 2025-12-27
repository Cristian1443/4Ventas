export interface Gasto {
    id: string;
    nombre: string;
    categoria: string;
    precio: string;
    fecha: string;
    imagen?: string;
    vendedorId?: string; // ID del vendedor que creó el gasto
}
