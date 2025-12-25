/**
 * Servicio de integración con ERP Verial - PRODUCCIÓN
 * REFACTORIZADO: Agregador de servicios modulares en src/services/erp/
 */

import { erpConfig } from './erp/api.client';
import { clientesService } from './erp/clientes.service';
import { articulosService } from './erp/articulos.service';
import { ventasService } from './erp/ventas.service';
import { cobrosService } from './erp/cobros.service';
import { gastosService } from './erp/gastos.service';
import { documentosService } from './erp/documentos.service';
import { agendaService, almacenService } from './erp/agenda.service';
import { catalogosService } from './erp/catalogos.service';
import { mascotasService } from './erp/mascotas.service';

// Exportar configuración y DTOs (Re-export)
export * from '../dtos/erp.dtos';
export * from '../adapters/erp.adapter';

// Exponer funciones de configuración para compatibilidad
export const setSessionId = erpConfig.setSessionId;
export const getSessionId = erpConfig.getSessionId;
export const isERPEnabled = erpConfig.isEnabled;
export const setERPEnabled = erpConfig.setEnabled;
export const getERPBaseUrl = erpConfig.getBaseUrl;

// Exponer funciones del servicio de Clientes
export const getClientes = clientesService.getClientes;
export const crearCliente = clientesService.crearCliente;
export const crearDireccionEnvio = clientesService.crearDireccionEnvio;

// Exponer funciones del servicio de Artículos
export const getArticulos = articulosService.getArticulos;
export const getStockArticulos = articulosService.getStockArticulos;
export const getImagenesArticulos = articulosService.getImagenesArticulos;
export const getCamposConfigurablesArticulos = articulosService.getCamposConfigurables;

// Exponer funciones del servicio de Ventas
export const crearDocumentoVenta = ventasService.crearDocumentoVenta;
export const pedidoModificable = ventasService.pedidoModificable;
export const updateDocCliente = ventasService.updateDocCliente;
export const getNextNumDocs = ventasService.getNextNumDocs;
export const estadoPedidos = ventasService.estadoPedidos;
export const getHistorialPedidos = ventasService.getHistorialPedidos;

// Exponer funciones del servicio de Cobros
export const getCobrosPendientes = cobrosService.getCobrosPendientes;
export const registrarPago = cobrosService.registrarPago;

// Exponer funciones del servicio de Gastos
export const getGastos = gastosService.getGastos;
export const crearGasto = gastosService.crearGasto;
export const eliminarGasto = gastosService.eliminarGasto;

// Exponer funciones del servicio de Documentos
export const getDocumentos = documentosService.getDocumentos;
export const subirDocumento = documentosService.subirDocumento;
export const eliminarDocumento = documentosService.eliminarDocumento;

// Exponer funciones del servicio de Agenda/Visitas
export const getAgenda = agendaService.getAgenda;
export const crearVisita = agendaService.crearVisita;
export const actualizarVisita = agendaService.actualizarVisita;

// Exponer funciones del servicio de Almacén
export const getNotasAlmacen = almacenService.getNotasAlmacen;

// Exponer funciones del servicio de Mascotas
export const getMascotas = mascotasService.getMascotas;
export const crearMascota = mascotasService.crearMascota;
export const borrarMascota = mascotasService.borrarMascota;

// Exponer funciones de Catálogos
export const getPaises = catalogosService.getPaises;
export const getProvincias = catalogosService.getProvincias;
export const getLocalidades = catalogosService.getLocalidades;
export const getAgentes = catalogosService.getAgentes;
export const getMetodosPago = catalogosService.getMetodosPago;
export const getFormasEnvio = catalogosService.getFormasEnvio;
export const getCursos = catalogosService.getCursos;
export const getAsignaturas = catalogosService.getAsignaturas;
export const getColecciones = catalogosService.getColecciones;
export const getFabricantes = catalogosService.getFabricantes;
export const getCategorias = catalogosService.getCategorias;
export const getCategoriasWeb = catalogosService.getCategoriasWeb;
export const getCondicionesTarifa = catalogosService.getCondicionesTarifa;

// Compatibilidad Version
export async function getVersion(): Promise<string | null> {
  return "1.0.0-Refactored";
}
