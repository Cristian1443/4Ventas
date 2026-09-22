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

export type VentasListaParams =
  | undefined
  | {
      /** Desde KPI “Notas pendientes”: lista solo esas notas */
      filtroLista?: 'pendientes';
    };

export type RootStackParamList = {
    Login: undefined;
    LoginEmail: undefined;
    VendorSelection: undefined;
    AdminPanel: undefined;
    Numeradores: undefined;
    Main: undefined;
    Dashboard: undefined;
    VentasMenu: undefined;
    Ventas: VentasListaParams;
    VentasList: VentasListaParams;
    NuevaVenta: { clienteSeleccionado?: Cliente; ventaData?: any; vendorId?: string };
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
    NuevaNotaAlmacen: undefined;
    ResumenStock: undefined;
    Configuracion: undefined;
    Agenda: undefined;
};
