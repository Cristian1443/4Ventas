import { Cliente } from '../models/cliente.model';

export type ScreenType =
    | 'login'
    | 'loginEmail'
    | 'dashboard'
    | 'ventasMenu'
    | 'ventas'
    | 'nuevaVenta'
    | 'verNota'
    | 'resumenDia'
    | 'cobros'
    | 'cobrosList'
    | 'cobrosConfirmacion'
    | 'gastos'
    | 'documentos'
    | 'clientes'
    | 'articulos'
    | 'comunicacion'
    | 'almacen'
    | 'notasAlmacen'
    | 'resumenStock'
    | 'configuracion'
    | 'agenda';

export type RootStackParamList = {
    Login: undefined;
    LoginEmail: undefined;
    Main: undefined;
    Dashboard: undefined;
    VentasMenu: undefined;
    Ventas: undefined;
    NuevaVenta: { clienteSeleccionado?: Cliente; ventaData?: any };
    VerNota: { ventaData: any; notaId?: string };
    ResumenDia: undefined;
    CobrosList: undefined;
    Cobros: { clienteSeleccionado?: Cliente };
    CobrosConfirmacion: { cobranzaActual: any };
    Gastos: undefined;
    Documentos: undefined;
    Clientes: undefined;
    Articulos: undefined;
    Comunicacion: undefined;
    Almacen: undefined;
    NotasAlmacen: undefined;
    ResumenStock: undefined;
    Configuracion: undefined;
    Agenda: undefined;
};
