import { movimientoRepository } from '../repositories/movimiento.repository';
import {
    CrearMovimientoRequest,
    MovimientoPublico,
    PuntoGrafica,
    ResumenFinanciero,
    TarjetaResumen,
    TipoMovimiento,
} from '../models/movimiento.model';
import { ApiError } from '../utils/api-error';

const CATEGORIAS_INGRESO = [
    'SALARIO',
    'VENTA',
    'REGALO',
    'BONO',
    'REEMBOLSO',
    'PENSION',
    'RENTA',
    'INVERSION',
    'OTRO',
];

const CATEGORIAS_EGRESO = [
    'ALIMENTACION',
    'TRANSPORTE',
    'VIVIENDA',
    'SERVICIOS_BASICOS',
    'SALUD',
    'EDUCACION',
    'ENTRETENIMIENTO',
    'ROPA',
    'OTRO',
];

const NOMBRES_MESES = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function categoriasPorTipo(tipo: TipoMovimiento): string[] {
    return tipo === 'EGRESO' ? CATEGORIAS_EGRESO : CATEGORIAS_INGRESO;
}

function formatearMoneda(valor: number): string {
    return `Q${Math.abs(valor).toLocaleString('es-GT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatearDelta(actual: number, anterior: number): string {
    if (anterior === 0) {
        return actual === 0 ? 'Sin registros todavía' : 'Nuevo este mes';
    }
    const variacion = ((actual - anterior) / anterior) * 100;
    if (Math.round(variacion) === 0) {
        return 'Igual que el mes pasado';
    }
    const comparativo = variacion > 0 ? 'más' : 'menos';
    return `${Math.abs(variacion).toFixed(0)}% ${comparativo} que el mes pasado`;
}

function fechaDeHoy(): string {
    return new Date().toISOString().slice(0, 10);
}

function redondearMonto(monto: number): number {
    return Math.round(monto * 100) / 100;
}

function normalizarYValidar(datos: CrearMovimientoRequest): CrearMovimientoRequest {
    if (datos.tipo !== 'INGRESO' && datos.tipo !== 'EGRESO') {
        throw new ApiError(400, 'El tipo de movimiento debe ser INGRESO o EGRESO.');
    }

    const descripcion = (datos.descripcion ?? '').trim();
    if (descripcion.length > 100) {
        throw new ApiError(400, 'La descripción no puede superar los 100 caracteres.');
    }

    if (!Number.isFinite(datos.monto) || datos.monto <= 0) {
        throw new ApiError(400, 'El monto debe ser un número mayor a cero.');
    }

    if (!datos.categoria || !categoriasPorTipo(datos.tipo).includes(datos.categoria)) {
        throw new ApiError(400, 'La categoría seleccionada no es válida para ese tipo de movimiento.');
    }

    return {
        ...datos,
        descripcion,
        monto: redondearMonto(datos.monto),
        fecha: fechaDeHoy(),
    };
}

function aMovimientoPublico(movimiento: {
    id: number;
    tipo: TipoMovimiento;
    descripcion: string;
    monto: number | string;
    categoria: string;
    fecha: string | Date;
}): MovimientoPublico {
    return {
        id: movimiento.id,
        tipo: movimiento.tipo,
        descripcion: movimiento.descripcion,
        monto: Number(movimiento.monto),
        categoria: movimiento.categoria,
        fecha:
            movimiento.fecha instanceof Date
                ? movimiento.fecha.toISOString().slice(0, 10)
                : String(movimiento.fecha).slice(0, 10),
    };
}

export const movimientoService = {
    async obtenerTotales(usuarioId: number): Promise<{
        totalIngresos: number;
        totalEgresos: number;
        balanceDisponible: number;
    }> {
        const totalesPorTipo = await movimientoRepository.totalesPorTipo(usuarioId);
        const totalIngresos = Number(
            totalesPorTipo.find((fila) => fila.tipo === 'INGRESO')?.total ?? 0
        );
        const totalEgresos = Number(
            totalesPorTipo.find((fila) => fila.tipo === 'EGRESO')?.total ?? 0
        );
        const balanceDisponible = Math.round((totalIngresos - totalEgresos) * 100) / 100;
        return { totalIngresos, totalEgresos, balanceDisponible };
    },

    async actualizar(usuarioId: number, id: number, datos: CrearMovimientoRequest): Promise<MovimientoPublico> {
        const datosNormalizados = normalizarYValidar(datos);

        const actual = await movimientoRepository.buscarPorId(usuarioId, id);
        if (!actual) {
            throw new ApiError(404, 'El movimiento no existe o no pertenece al usuario.');
        }

        const { totalIngresos, totalEgresos } = await this.obtenerTotales(usuarioId);
        const montoActual = Number(actual.monto);

        const ingresosAjustados =
            actual.tipo === 'INGRESO' ? totalIngresos - montoActual : totalIngresos;
        const egresosAjustados =
            actual.tipo === 'EGRESO' ? totalEgresos - montoActual : totalEgresos;

        const nuevosIngresos =
            datosNormalizados.tipo === 'INGRESO'
                ? ingresosAjustados + datosNormalizados.monto
                : ingresosAjustados;
        const nuevosEgresos =
            datosNormalizados.tipo === 'EGRESO'
                ? egresosAjustados + datosNormalizados.monto
                : egresosAjustados;

        if (nuevosEgresos > nuevosIngresos) {
            throw new ApiError(
                400,
                'No se puede actualizar el movimiento porque supera el límite de los ingresos disponibles.'
            );
        }

        const actualizado = await movimientoRepository.actualizar(usuarioId, id, datosNormalizados);
        if (!actualizado) {
            throw new ApiError(404, 'El movimiento no existe o no pertenece al usuario.');
        }
        return aMovimientoPublico(actualizado);
    },

    async eliminar(usuarioId: number, id: number): Promise<void> {
        const actual = await movimientoRepository.buscarPorId(usuarioId, id);
        if (!actual) {
            throw new ApiError(404, 'El movimiento no existe o no pertenece al usuario.');
        }

        if (actual.tipo === 'INGRESO') {
            const { totalIngresos, totalEgresos } = await this.obtenerTotales(usuarioId);
            const montoActual = Number(actual.monto);
            if (totalIngresos - montoActual < totalEgresos) {
                throw new ApiError(
                    400,
                    'No se puede eliminar este ingreso porque los egresos registrados superarían los ingresos restantes.'
                );
            }
        }

        const eliminado = await movimientoRepository.eliminar(usuarioId, id);
        if (!eliminado) {
            throw new ApiError(404, 'El movimiento no existe o no pertenece al usuario.');
        }
    },

    categorias(tipo: TipoMovimiento): string[] {
        return categoriasPorTipo(tipo);
    },

    async crear(usuarioId: number, datos: CrearMovimientoRequest): Promise<MovimientoPublico> {
        const datosNormalizados = normalizarYValidar(datos);

        if (datosNormalizados.tipo === 'EGRESO') {
            const { balanceDisponible } = await this.obtenerTotales(usuarioId);
            if (datosNormalizados.monto > balanceDisponible) {
                throw new ApiError(
                    400,
                    'No se puede registrar el egreso porque supera el límite de los ingresos ya ingresados anteriormente.'
                );
            }
        }

        const creado = await movimientoRepository.crear(usuarioId, datosNormalizados);
        return aMovimientoPublico(creado);
    },

    async crearLote(usuarioId: number, movimientos: CrearMovimientoRequest[]): Promise<MovimientoPublico[]> {
        if (!Array.isArray(movimientos) || movimientos.length === 0) {
            throw new ApiError(400, 'No hay movimientos para guardar.');
        }

        const movimientosNormalizados = movimientos.map(normalizarYValidar);

        const { balanceDisponible } = await this.obtenerTotales(usuarioId);
        let balanceSimulado = balanceDisponible;

        for (const mov of movimientosNormalizados) {
            if (mov.tipo === 'INGRESO') {
                balanceSimulado = Math.round((balanceSimulado + mov.monto) * 100) / 100;
            } else if (mov.tipo === 'EGRESO') {
                if (mov.monto > balanceSimulado) {
                    throw new ApiError(
                        400,
                        'No se puede registrar el egreso porque supera el límite de los ingresos ya ingresados anteriormente.'
                    );
                }
                balanceSimulado = Math.round((balanceSimulado - mov.monto) * 100) / 100;
            }
        }

        const creados = await movimientoRepository.crearVarios(usuarioId, movimientosNormalizados);
        return creados.map(aMovimientoPublico);
    },

    async listar(usuarioId: number): Promise<MovimientoPublico[]> {
        const movimientos = await movimientoRepository.listarPorUsuario(usuarioId);
        return movimientos.map(aMovimientoPublico);
    },

    async obtenerResumen(usuarioId: number): Promise<ResumenFinanciero> {
        const [totalesPorTipo, totalesPorAnio, totalesMesActual, totalesMesesComparativo] = await Promise.all([
            movimientoRepository.totalesPorTipo(usuarioId),
            movimientoRepository.totalesPorAnio(usuarioId),
            movimientoRepository.totalesPorMesDelAnio(usuarioId, new Date().getFullYear()),
            movimientoRepository.totalesMesActualYAnterior(usuarioId),
        ]);

        const totalIngresos = Number(
            totalesPorTipo.find((fila) => fila.tipo === 'INGRESO')?.total ?? 0
        );
        const totalEgresos = Number(
            totalesPorTipo.find((fila) => fila.tipo === 'EGRESO')?.total ?? 0
        );
        const balanceTotal = totalIngresos - totalEgresos;

        const ingresosMesActual = Number(
            totalesMesesComparativo.find((f) => f.periodo === 'ACTUAL' && f.tipo === 'INGRESO')?.total ?? 0
        );
        const egresosMesActual = Number(
            totalesMesesComparativo.find((f) => f.periodo === 'ACTUAL' && f.tipo === 'EGRESO')?.total ?? 0
        );
        const ingresosMesAnterior = Number(
            totalesMesesComparativo.find((f) => f.periodo === 'ANTERIOR' && f.tipo === 'INGRESO')?.total ?? 0
        );
        const egresosMesAnterior = Number(
            totalesMesesComparativo.find((f) => f.periodo === 'ANTERIOR' && f.tipo === 'EGRESO')?.total ?? 0
        );

        const balanceMesActual = ingresosMesActual - egresosMesActual;
        const balanceMesAnterior = ingresosMesAnterior - egresosMesAnterior;
        const porcentajeBalanceMensual =
            ingresosMesActual > 0 ? (balanceMesActual / ingresosMesActual) * 100 : 0;

        const tarjetas: TarjetaResumen[] = [
            {
                etiqueta: 'Total de Ingresos',
                valor: formatearMoneda(totalIngresos),
                delta: formatearDelta(ingresosMesActual, ingresosMesAnterior),
                icono: 'billete',
                destacada: true,
            },
            {
                etiqueta: 'Total de egresos',
                valor: formatearMoneda(totalEgresos),
                delta: formatearDelta(egresosMesActual, egresosMesAnterior),
                icono: 'persona',
            },
            {
                etiqueta: 'Balance total',
                valor: formatearMoneda(balanceTotal),
                delta: formatearDelta(balanceMesActual, balanceMesAnterior),
                icono: 'flecha',
                acento: true,
            },
            {
                etiqueta: 'Ahorro de este mes',
                valor: `${Math.abs(porcentajeBalanceMensual).toFixed(0)}%`,
                delta: ingresosMesActual > 0 ? 'Del mes en curso' : 'Sin registros todavía',
                icono: 'grafico',
            },
        ];

        const anioActual = new Date().getFullYear();
        const aniosConDatos = totalesPorAnio.map((fila) => Number(fila.anio));
        const anioInicio = aniosConDatos.length > 0 ? Math.min(anioActual, ...aniosConDatos) : anioActual;

        const balanceAnual: PuntoGrafica[] = [];
        for (let anio = anioInicio; anio <= anioActual; anio++) {
            const ingresosAnio = Number(
                totalesPorAnio.find((f) => f.anio === String(anio) && f.tipo === 'INGRESO')?.total ?? 0
            );
            const egresosAnio = Number(
                totalesPorAnio.find((f) => f.anio === String(anio) && f.tipo === 'EGRESO')?.total ?? 0
            );
            balanceAnual.push({ label: String(anio), value: ingresosAnio - egresosAnio });
        }

        const balanceMensual: PuntoGrafica[] = NOMBRES_MESES.map((nombre, indice) => {
            const numeroMes = String(indice + 1);
            const ingresosMes = Number(
                totalesMesActual.find((f) => f.mes === numeroMes && f.tipo === 'INGRESO')?.total ?? 0
            );
            const egresosMes = Number(
                totalesMesActual.find((f) => f.mes === numeroMes && f.tipo === 'EGRESO')?.total ?? 0
            );
            return { label: nombre, value: ingresosMes - egresosMes };
        });

        return {
            tarjetas,
            balanceAnual,
            balanceMensual,
            totales: {
                totalIngresos,
                totalEgresos,
                balanceDisponible: balanceTotal,
            },
        };
    },
};