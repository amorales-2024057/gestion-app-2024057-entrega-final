// Modelo de la tabla "movimientos" (backend/db/init.sql). Un movimiento
// es un ingreso o un egreso. Por ahora el apartado de "Nuevo Registro"
// solo trabaja con INGRESO -- el toggle de EGRESO en el maquetado queda
// deshabilitado hasta una proxima entrega -- pero el modelo, la tabla y
// las consultas ya soportan ambos tipos para no tener que tocarlos de
// nuevo cuando se habilite.

export type TipoMovimiento = 'INGRESO' | 'EGRESO';

export interface Movimiento {
    id: number;
    usuario_id: number;
    tipo: TipoMovimiento;
    descripcion: string;
    monto: number;
    categoria: string;
    fecha: string;
    creado_en: Date;
}

export interface MovimientoPublico {
    id: number;
    tipo: TipoMovimiento;
    descripcion: string;
    monto: number;
    categoria: string;
    fecha: string;
}

// Lo que manda el formulario de "Agregar Transaccion" por cada fila de
// la "Vista Previa del Registro" al confirmar y guardar.
export interface CrearMovimientoRequest {
    tipo: TipoMovimiento;
    descripcion: string;
    monto: number;
    categoria: string;
    fecha: string;
}

export interface CrearMovimientosLoteRequest {
    movimientos: CrearMovimientoRequest[];
}

// Una tarjeta de las 4 que se ven arriba del dashboard (Total de
// Ingresos, Total de egresos, Balance total, Porcentaje de balance
// mensual).
export type IconoTarjeta = 'billete' | 'persona' | 'flecha' | 'grafico';

export interface TarjetaResumen {
    etiqueta: string;
    valor: string;
    delta: string;
    icono: IconoTarjeta;
    destacada?: boolean;
    acento?: boolean;
}

export interface PuntoGrafica {
    label: string;
    value: number;
}

export interface ResumenFinanciero {
    tarjetas: TarjetaResumen[];
    balanceAnual: PuntoGrafica[];
    balanceMensual: PuntoGrafica[];
    totales?: {
        totalIngresos: number;
        totalEgresos: number;
        balanceDisponible: number;
    };
}
