export interface Articulo {
    id: string;
    nombre: string;
    cantidad: number;
    categoria: string;
    categoriaId?: string;
    precio?: string;
    stockMinimo?: number;
    proveedor?: string;
    imagen?: string;
    codigoCorto?: string;
}
