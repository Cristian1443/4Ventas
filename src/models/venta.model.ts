export interface IvaCuotaPorTipo {
    pct: number;
    cuota: number;
}

export interface TotalesVenta {
    subtotal: number;
    descuentos: number;
    base: number;
    iva: number;
    total: number;
    re?: number;
    reAplica?: boolean;
    /** Detalle cuando hay varios tipos de IVA en la misma nota */
    ivaPorTipo?: IvaCuotaPorTipo[];
}

export interface NotaVenta {
    id: string;
    cliente: string;
    precio: string;
    fecha: string;
    items?: any[];
    estado?: 'pendiente' | 'cerrada' | 'anulada' | 'abierta';
    /** pagado = venta al contado · pendiente = crédito (genera cobro pendiente hasta cobrarlo) */
    estadoPago?: 'pagado' | 'pendiente';
    clienteId?: string;
    generoCobro?: boolean;
    cobroId?: string;
    formaPago?: string;
    tipoNota?: string;
    /** Correlativo reservado con tabletConfig; el ERP debe usar el mismo Numero al sincronizar */
    numeroCorrelativo?: number;
    totalesNumericos?: TotalesVenta;
    aplicarDescGlobal?: boolean;
    descGlobal?: string;
    vendedorId?: string;
    /** Marca local (epoch ms): primera vez que la nota se guardó en esta tablet */
    liquidacionSesionTs?: number;
}
