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
    /** % IVA del artículo en el ERP (10, 21, 4, …); precios en app sin IVA. */
    porcentajeIva?: number;
}
