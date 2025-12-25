import { UserSession, SyncStatus, AppConfig } from '../models/app-config.model';
import { Gasto } from '../models/gasto.model';
import { NotaVenta } from '../models/venta.model';
import { Cobro } from '../models/cobro.model';
import { Documento } from '../models/documento.model';
import { Articulo } from '../models/articulo.model';
import { Cliente } from '../models/cliente.model';
import { NotaAlmacen } from '../models/almacen.model';
import { Visita } from '../models/visita.model';

export interface AppContextType {
    userSession: UserSession;
    setUserSession: (session: UserSession) => void;

    gastos: Gasto[];
    notasVenta: NotaVenta[];
    cobros: Cobro[];
    documentos: Documento[];
    articulos: Articulo[];
    clientes: Cliente[];
    notasAlmacen: NotaAlmacen[];
    visitas: Visita[];

    syncStatus: SyncStatus;
    modoOffline: boolean;

    addArticulo: (articulo: Articulo) => Promise<void>;
    addCliente: (cliente: Cliente) => Promise<void>;
    addGasto: (gasto: Gasto) => Promise<void>;
    deleteGasto: (id: string) => Promise<void>;

    addNotaVenta: (nota: NotaVenta) => Promise<void>;
    updateNotaVenta: (id: string, estado: 'pendiente' | 'cerrada' | 'anulada' | 'abierta') => Promise<void>;
    deleteNotaVenta: (id: string) => Promise<void>;

    addCobro: (cobro: Cobro) => Promise<void>;
    updateCobro: (id: string, estado: 'pendiente' | 'pagado', metadata?: { formaPago: string; fecha: Date }) => Promise<void>;

    addDocumento: (doc: Documento) => Promise<void>;
    deleteDocumento: (id: string) => Promise<void>;

    updateArticulo: (id: string, cantidad: number) => Promise<void>;
    addNotaAlmacen: (nota: NotaAlmacen) => Promise<void>;

    addVisita: (visita: Visita) => Promise<void>;
    toggleVisita: (id: string) => Promise<void>;

    sincronizar: () => Promise<void>;
    forzarSincronizacion: () => Promise<void>;

    config: AppConfig;
    updateConfig: (config: Partial<AppConfig>) => Promise<void>;
    updateAppConfig: (config: Partial<AppConfig>) => Promise<void>;
    updateSyncStatus: (status: Partial<SyncStatus>) => void;
    login: (username: string) => void;
    logout: () => void;
}
