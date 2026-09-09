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
    'PRESTAMO',
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
    'DEUDAS',
    'OTRO',
];

const NOMBRES_MESES = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function categoriasPorTipo(tipo: TipoMovimiento): string[] {
    return tipo === 'EGRESO' ? CATEGORIAS_EGRESO : CATEGORIAS_INGRESO;
}

function formatearMoneda(valor: number): string {
    const signo = valor < 0 ? '-' : '';
    const absoluto = Math.abs(valor);
    return `${signo}Q${absoluto.toLocaleString('es-GT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatearDelta(actual: number, anterior: number): string {
    if (anterior === 0) {
        return actual === 0 ? 'Sin registros todavía' : 'Nuevo este mes';
    }
    const variacion = ((actual - anterior) / anterior) * 100;
    const signo = variacion >= 0 ? '+' : '';
    return `${signo}${variacion.toFixed(1)}% vs mes anterior`;
}

function validarMovimiento(datos: CrearMovimientoRequest): void {
    if (datos.tipo !== 'INGRESO' && datos.tipo !== 'EGRESO') {
        throw new ApiError(400, 'El tipo de movimiento debe ser INGRESO o EGRESO.');
    }

    if (!datos.descripcion?.trim()) {
        throw new ApiError(400, 'La descripción es obligatoria.');
    }

    if (datos.descripcion.trim().length > 150) {
        throw new ApiError(400, 'La descripción no puede superar los 150 caracteres.');
    }

    if (!Number.isFinite(datos.monto) || datos.monto <= 0) {
        throw new ApiError(400, 'El monto debe ser un número mayor a cero.');
    }

    if (!datos.categoria || !categoriasPorTipo(datos.tipo).includes(datos.categoria)) {
        throw new ApiError(400, 'La categoría seleccionada no es válida para ese tipo de movimiento.');
    }

    if (!datos.fecha || Number.isNaN(Date.parse(datos.fecha))) {
        throw new ApiError(400, 'La fecha no es válida.');
    }
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
    categorias(tipo: TipoMovimiento): string[] {
        return categoriasPorTipo(tipo);
    },

    async crear(usuarioId: number, datos: CrearMovimientoRequest): Promise<MovimientoPublico> {
        validarMovimiento(datos);
        const creado = await movimientoRepository.crear(usuarioId, datos);
        return aMovimientoPublico(creado);
    },

    async crearLote(usuarioId: number, movimientos: CrearMovimientoRequest[]): Promise<MovimientoPublico[]> {
        if (!Array.isArray(movimientos) || movimientos.length === 0) {
            throw new ApiError(400, 'No hay movimientos para guardar.');
        }

        movimientos.forEach(validarMovimiento);

        const creados = await movimientoRepository.crearVarios(usuarioId, movimientos);
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
                etiqueta: 'Porcentaje de balance mensual',
                valor: `${porcentajeBalanceMensual.toFixed(1)}%`,
                delta: ingresosMesActual > 0 ? 'Del mes en curso' : 'Sin registros todavía',
                icono: 'grafico',
            },
        ];

        const anioActual = new Date().getFullYear();
        const balanceAnual: PuntoGrafica[] = [];
        for (let i = 6; i >= 0; i--) {
            const anio = anioActual - i;
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

        return { tarjetas, balanceAnual, balanceMensual };
    },
};