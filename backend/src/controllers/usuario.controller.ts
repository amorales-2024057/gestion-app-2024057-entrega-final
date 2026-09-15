import { Response } from 'express';
import { usuarioService } from '../services/usuario.service';
import { RequestAutenticado } from '../middlewares/auth.middleware';
import { ApiError } from '../utils/api-error';

export const usuarioController = {
    async obtenerPerfil(req: RequestAutenticado, res: Response): Promise<void> {
        if (!req.usuario) {
            throw new ApiError(401, 'No autenticado.');
        }

        const usuario = await usuarioService.obtenerPerfil(req.usuario.id);
        res.status(200).json(usuario);
    },

    async actualizarPerfil(req: RequestAutenticado, res: Response): Promise<void> {
        if (!req.usuario) {1
            throw new ApiError(401, 'No autenticado.');
        }

        const usuarioActualizado = await usuarioService.actualizarPerfil(req.usuario.id, req.body);
        res.status(200).json(usuarioActualizado);
    },
};
