import { Response } from 'express';
import { movimientoService } from '../services/movimiento.service';
import { RequestAutenticado } from '../middlewares/auth.middleware';
import { ApiError } from '../utils/api-error';
import { TipoMovimiento } from '../models/movimiento.model';

function requerirUsuario(req: RequestAutenticado): number {
    if (!req.usuario) {
        throw new ApiError(401, 'No autenticado.');
    }
    return req.usuario.id;
}

export const movimientoController = {
    async categorias(req: RequestAutenticado, res: Response): Promise<void> {
        const tipo = (req.query.tipo === 'EGRESO' ? 'EGRESO' : 'INGRESO') as TipoMovimiento;
        res.status(200).json({ categorias: movimientoService.categorias(tipo) });
    },

    async crear(req: RequestAutenticado, res: Response): Promise<void> {
        const usuarioId = requerirUsuario(req);
        const movimiento = await movimientoService.crear(usuarioId, req.body);
        res.status(201).json(movimiento);
    },

    async crearLote(req: RequestAutenticado, res: Response): Promise<void> {
        const usuarioId = requerirUsuario(req);
        const movimientos = await movimientoService.crearLote(usuarioId, req.body?.movimientos ?? []);
        res.status(201).json({ movimientos });
    },

    async listar(req: RequestAutenticado, res: Response): Promise<void> {
        const usuarioId = requerirUsuario(req);
        const movimientos = await movimientoService.listar(usuarioId);
        res.status(200).json({ movimientos });
    },

    async resumen(req: RequestAutenticado, res: Response): Promise<void> {
        const usuarioId = requerirUsuario(req);
        const resumen = await movimientoService.obtenerResumen(usuarioId);
        res.status(200).json(resumen);
    },
};