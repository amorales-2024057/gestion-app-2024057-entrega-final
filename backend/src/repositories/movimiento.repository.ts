import { pool } from '../config/db';
import { CrearMovimientoRequest, Movimiento, TipoMovimiento } from '../models/movimiento.model';

interface TotalPorTipo {
    tipo: TipoMovimiento;
    total: string;
}

interface TotalPorAnio {
    anio: string;
    tipo: TipoMovimiento;
    total: string;
}

interface TotalPorMes {
    mes: string;
    tipo: TipoMovimiento;
    total: string;
}

export const movimientoRepository = {
        async actualizar(usuarioId: number, id: number, datos: CrearMovimientoRequest): Promise<Movimiento | null> {
        const resultado = await pool.query<Movimiento>(
            `UPDATE movimientos
             SET tipo = $3, descripcion = $4, monto = $5, categoria = $6, fecha = $7
             WHERE id = $1 AND usuario_id = $2
             RETURNING *`,
            [id, usuarioId, datos.tipo, datos.descripcion, datos.monto, datos.categoria, datos.fecha]
        );
        return resultado.rows[0] ?? null;
    },

    async eliminar(usuarioId: number, id: number): Promise<boolean> {
        const resultado = await pool.query(
            `DELETE FROM movimientos WHERE id = $1 AND usuario_id = $2`,
            [id, usuarioId]
        );
        return (resultado.rowCount ?? 0) > 0;
    },
    
    async crear(usuarioId: number, datos: CrearMovimientoRequest): Promise<Movimiento> {
        const resultado = await pool.query<Movimiento>(
            `INSERT INTO movimientos (usuario_id, tipo, descripcion, monto, categoria, fecha)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [usuarioId, datos.tipo, datos.descripcion, datos.monto, datos.categoria, datos.fecha]
        );
        return resultado.rows[0];
    },

    async crearVarios(usuarioId: number, movimientos: CrearMovimientoRequest[]): Promise<Movimiento[]> {
        const cliente = await pool.connect();
        try {
            await cliente.query('BEGIN');
            const creados: Movimiento[] = [];

            for (const movimiento of movimientos) {
                const resultado = await cliente.query<Movimiento>(
                    `INSERT INTO movimientos (usuario_id, tipo, descripcion, monto, categoria, fecha)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING *`,
                    [
                        usuarioId,
                        movimiento.tipo,
                        movimiento.descripcion,
                        movimiento.monto,
                        movimiento.categoria,
                        movimiento.fecha,
                    ]
                );
                creados.push(resultado.rows[0]);
            }

            await cliente.query('COMMIT');
            return creados;
        } catch (error) {
            await cliente.query('ROLLBACK');
            throw error;
        } finally {
            cliente.release();
        }
    },

    async listarPorUsuario(usuarioId: number): Promise<Movimiento[]> {
        const resultado = await pool.query<Movimiento>(
            `SELECT * FROM movimientos
             WHERE usuario_id = $1
             ORDER BY fecha DESC, creado_en DESC`,
            [usuarioId]
        );
        return resultado.rows;
    },

    // Total de ingresos y total de egresos de todo el historial del
    // usuario (para las tarjetas "Total de Ingresos" / "Total de
    // egresos" / "Balance total").
    async totalesPorTipo(usuarioId: number): Promise<TotalPorTipo[]> {
        const resultado = await pool.query<TotalPorTipo>(
            `SELECT tipo, COALESCE(SUM(monto), 0) AS total
             FROM movimientos
             WHERE usuario_id = $1
             GROUP BY tipo`,
            [usuarioId]
        );
        return resultado.rows;
    },

    // Totales agrupados por año y tipo, usados para la grafica de linea
    // "Balance por año".
    async totalesPorAnio(usuarioId: number): Promise<TotalPorAnio[]> {
        const resultado = await pool.query<TotalPorAnio>(
            `SELECT EXTRACT(YEAR FROM fecha)::text AS anio, tipo, COALESCE(SUM(monto), 0) AS total
             FROM movimientos
             WHERE usuario_id = $1
             GROUP BY anio, tipo`,
            [usuarioId]
        );
        return resultado.rows;
    },

    // Totales agrupados por mes (del año actual) y tipo, usados para la
    // grafica de barras "balance mensual del usuario por Año".
    async totalesPorMesDelAnio(usuarioId: number, anio: number): Promise<TotalPorMes[]> {
        const resultado = await pool.query<TotalPorMes>(
            `SELECT EXTRACT(MONTH FROM fecha)::text AS mes, tipo, COALESCE(SUM(monto), 0) AS total
             FROM movimientos
             WHERE usuario_id = $1 AND EXTRACT(YEAR FROM fecha) = $2
             GROUP BY mes, tipo`,
            [usuarioId, anio]
        );
        return resultado.rows;
    },

    // Total de ingresos y egresos del mes actual y del mes anterior,
    // usados para calcular el "delta" de las tarjetas y el porcentaje
    // de balance mensual.
    async totalesMesActualYAnterior(usuarioId: number): Promise<
        { periodo: 'ACTUAL' | 'ANTERIOR'; tipo: TipoMovimiento; total: string }[]
    > {
        const resultado = await pool.query<{
            periodo: 'ACTUAL' | 'ANTERIOR';
            tipo: TipoMovimiento;
            total: string;
        }>(
            `SELECT
                 CASE
                     WHEN date_trunc('month', fecha) = date_trunc('month', CURRENT_DATE) THEN 'ACTUAL'
                     ELSE 'ANTERIOR'
                 END AS periodo,
                 tipo,
                 COALESCE(SUM(monto), 0) AS total
             FROM movimientos
             WHERE usuario_id = $1
               AND date_trunc('month', fecha) IN (
                   date_trunc('month', CURRENT_DATE),
                   date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
               )
             GROUP BY periodo, tipo`,
            [usuarioId]
        );
        return resultado.rows;
    },
};
