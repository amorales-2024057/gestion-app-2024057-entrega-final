import bcrypt from 'bcryptjs';
import { usuarioRepository } from '../repositories/usuario.repository';
import { ActualizarPerfilRequest, UsuarioPublico, GeneroUsuario } from '../models/usuario.model';
import { aUsuarioPublico } from './auth.service';
import { ApiError } from '../utils/api-error';

const GENEROS_VALIDOS: GeneroUsuario[] = [
    'MASCULINO',
    'FEMENINO',
    'OTRO',
    'PREFIERO_NO_DECIRLO',
];

function validarDatosPerfil(datos: ActualizarPerfilRequest): void {
    if (!datos.nombre?.trim() || !datos.apellido?.trim()) {
        throw new ApiError(400, 'El nombre y el apellido son obligatorios.');
    }

    if (!datos.username?.trim() || datos.username.trim().length < 3) {
        throw new ApiError(400, 'El nombre de usuario debe tener al menos 3 caracteres.');
    }

    if (!GENEROS_VALIDOS.includes(datos.genero)) {
        throw new ApiError(400, 'El género seleccionado no es válido.');
    }

    if (datos.password && datos.password.length < 8) {
        throw new ApiError(400, 'La nueva contraseña debe tener al menos 8 caracteres.');
    }
}

export const usuarioService = {
    async obtenerPerfil(id: number): Promise<UsuarioPublico> {
        const usuario = await usuarioRepository.buscarPorId(id);
        if (!usuario) {
            throw new ApiError(404, 'Usuario no encontrado.');
        }
        return aUsuarioPublico(usuario);
    },

    async actualizarPerfil(id: number, datos: ActualizarPerfilRequest): Promise<UsuarioPublico> {
        validarDatosPerfil(datos);

        const usuarioExistente = await usuarioRepository.buscarPorId(id);
        if (!usuarioExistente) {
            throw new ApiError(404, 'Usuario no encontrado.');
        }

        const usernameLimpio = datos.username.trim();

        const usernameOcupado = await usuarioRepository.existeUsernameDeOtroUsuario(usernameLimpio, id);
        if (usernameOcupado) {
            throw new ApiError(409, 'Ese nombre de usuario ya está en uso.');
        }

        const passwordHash = datos.password ? await bcrypt.hash(datos.password, 10) : null;

        const usuarioActualizado = await usuarioRepository.actualizarPerfil(
            id,
            {
                ...datos,
                username: usernameLimpio,
                email: usuarioExistente.email,
                nombre: datos.nombre.trim(),
                apellido: datos.apellido.trim(),
                telefono: datos.telefono?.trim() || null,
            },
            passwordHash
        );

        return aUsuarioPublico(usuarioActualizado);
    },
};
