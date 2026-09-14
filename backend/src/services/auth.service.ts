import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { usuarioRepository } from '../repositories/usuario.repository';
import { LoginRequest, LoginResponse, JwtPayload, RegistroRequest } from '../models/auth.model';
import { GeneroUsuario, Usuario, UsuarioPublico } from '../models/usuario.model';
import { ApiError } from '../utils/api-error';
import { env } from '../config/env';

const clienteGoogle = new OAuth2Client(env.googleClientId);

const GENEROS_VALIDOS: GeneroUsuario[] = [
    'MASCULINO',
    'FEMENINO',
    'OTRO',
    'PREFIERO_NO_DECIRLO',
];

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_USERNAME = /^[a-zA-Z0-9._-]+$/;

function validarDatosRegistro(datos: RegistroRequest): void {
    if (!datos.nombre?.trim()) {
        throw new ApiError(400, 'Por favor, indique su nombre.');
    }

    if (!datos.apellido?.trim()) {
        throw new ApiError(400, 'Por favor, indique su apellido.');
    }

    if (!datos.email?.trim() || !REGEX_EMAIL.test(datos.email.trim())) {
        throw new ApiError(400, 'Ingrese un correo electrónico válido.');
    }

    if (!datos.genero || !GENEROS_VALIDOS.includes(datos.genero)) {
        throw new ApiError(400, 'Seleccione un género válido.');
    }

    const username = datos.username?.trim() ?? '';
    if (username.length < 3 || username.length > 50) {
        throw new ApiError(400, 'El nombre de usuario debe tener entre 3 y 50 caracteres.');
    }
    if (!REGEX_USERNAME.test(username)) {
        throw new ApiError(
            400,
            'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos.'
        );
    }

    if (!datos.password || datos.password.length < 8) {
        throw new ApiError(400, 'La contraseña debe tener al menos 8 caracteres.');
    }
}

export function aUsuarioPublico(usuario: Usuario): UsuarioPublico {
    return {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        genero: usuario.genero,
        rol: usuario.rol,
        telefono: usuario.telefono,
        avatarUrl: usuario.avatar_url,
    };
}

function generarToken(usuario: Usuario): string {
    const payload: JwtPayload = {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
    };
    return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

async function generarUsernameUnico(base: string): Promise<string> {
    const limpio = base.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40) || 'usuario';
    let candidato = limpio;
    let sufijo = 1;
    while (await usuarioRepository.existeUsername(candidato)) {
        candidato = `${limpio}${sufijo}`;
        sufijo += 1;
    }
    return candidato;
}

export const authService = {
    async login({ username, password }: LoginRequest): Promise<LoginResponse> {
        if (!username || !password) {
            throw new ApiError(400, 'El usuario y la contraseña son obligatorios.');
        }

        const usuario = await usuarioRepository.buscarPorUsername(username);
        if (!usuario) {
            throw new ApiError(401, 'Credenciales inválidas.');
        }

        if (!usuario.activo) {
            throw new ApiError(403, 'Esta cuenta se encuentra deshabilitada.');
        }

        if (!usuario.password) {
            throw new ApiError(401, 'Esta cuenta inicia sesión con Google. Use el botón "Continuar con Google".');
        }

        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            throw new ApiError(401, 'Credenciales inválidas.');
        }

        return {
            token: generarToken(usuario),
            usuario: aUsuarioPublico(usuario),
        };
    },

    async loginConGoogle(credential: string): Promise<LoginResponse> {
        if (!credential) {
            throw new ApiError(400, 'Falta el token de Google.');
        }

        let payload;
        try {
            const ticket = await clienteGoogle.verifyIdToken({
                idToken: credential,
                audience: env.googleClientId,
            });
            payload = ticket.getPayload();
        } catch {
            throw new ApiError(401, 'No se pudo verificar la cuenta de Google.');
        }

        if (!payload?.email) {
            throw new ApiError(401, 'La cuenta de Google no tiene un correo asociado.');
        }

        const email = payload.email.toLowerCase();
        let usuario = await usuarioRepository.buscarPorGoogleId(payload.sub);

        if (!usuario) {
            const existente = await usuarioRepository.buscarPorEmail(email);
            if (existente) {
                usuario = await usuarioRepository.vincularGoogle(existente.id, payload.sub, payload.picture ?? null);
            } else {
                const username = await generarUsernameUnico(email.split('@')[0] ?? 'usuario');
                usuario = await usuarioRepository.crearConGoogle({
                    username,
                    nombre: payload.given_name?.trim() || payload.name?.trim() || 'Usuario',
                    apellido: payload.family_name?.trim() || 'Sin apellido',
                    email,
                    avatarUrl: payload.picture ?? null,
                    googleId: payload.sub,
                });
            }
        }

        if (!usuario.activo) {
            throw new ApiError(403, 'Esta cuenta se encuentra deshabilitada.');
        }

        return {
            token: generarToken(usuario),
            usuario: aUsuarioPublico(usuario),
        };
    },

    async registrar(datos: RegistroRequest): Promise<LoginResponse> {
        validarDatosRegistro(datos);

        const username = datos.username.trim();
        const email = datos.email.trim().toLowerCase();

        if (await usuarioRepository.existeUsername(username)) {
            throw new ApiError(409, 'Ese nombre de usuario ya está en uso. Elija otro, por favor.');
        }

        if (await usuarioRepository.existeEmail(email)) {
            throw new ApiError(409, 'Ya existe una cuenta registrada con ese correo electrónico.');
        }

        const passwordHash = await bcrypt.hash(datos.password, 10);

        const usuarioCreado = await usuarioRepository.crear(
            {
                ...datos,
                username,
                email,
                nombre: datos.nombre.trim(),
                apellido: datos.apellido.trim(),
                telefono: datos.telefono?.trim() || null,
            },
            passwordHash
        );

        return {
            token: generarToken(usuarioCreado),
            usuario: aUsuarioPublico(usuarioCreado),
        };
    },

    async obtenerPerfil(id: number): Promise<UsuarioPublico> {
        const usuario = await usuarioRepository.buscarPorId(id);
        if (!usuario) {
            throw new ApiError(404, 'Usuario no encontrado.');
        }
        return aUsuarioPublico(usuario);
    },
};