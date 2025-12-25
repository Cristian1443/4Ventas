export interface TotalesVenta {
    subtotal: number;
    descuentos: number;
    base: number;
    iva: number;
    total: number;
}

export interface NotaVenta {
    id: string;
    cliente: string;
    precio: string;
    fecha: string;
    items?: any[];
    estado?: 'pendiente' | 'cerrada' | 'anulada' | 'abierta';
    clienteId?: string;
    generoCobro?: boolean;
    cobroId?: string;
    formaPago?: string;
    tipoNota?: string;
    totalesNumericos?: TotalesVenta;
    aplicarDescGlobal?: boolean;
    descGlobal?: string;
    vendedorId?: string;
}
