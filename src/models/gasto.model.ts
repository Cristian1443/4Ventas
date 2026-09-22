export interface Gasto {
    id: string;
    nombre: string;
    categoria: string;
    precio: string;
    fecha: string;
    imagen?: string;
    vendedorId?: string; // ID del vendedor que creó el gasto
    /** Epoch ms al crear el gasto en la tablet */
    liquidacionSesionTs?: number;
}
