import { pool } from '../config/db';
import { Usuario, ActualizarPerfilRequest } from '../models/usuario.model';
import { RegistroRequest } from '../models/auth.model';

export const usuarioRepository = {
    async existeUsername(username: string): Promise<boolean> {
        const resultado = await pool.query('SELECT 1 FROM usuarios WHERE username = $1 LIMIT 1', [username]);
        return (resultado.rowCount ?? 0) > 0;
    },

    async existeEmail(email: string): Promise<boolean> {
        const resultado = await pool.query('SELECT 1 FROM usuarios WHERE email = $1 LIMIT 1', [email]);
        return (resultado.rowCount ?? 0) > 0;
    },

    async crear(datos: RegistroRequest, passwordHash: string): Promise<Usuario> {
        const resultado = await pool.query<Usuario>(
            `INSERT INTO usuarios (username, password, nombre, apellido, email, genero, rol, telefono)
             VALUES ($1, $2, $3, $4, $5, $6, 'USER', $7)
             RETURNING *`,
            [
                datos.username,
                passwordHash,
                datos.nombre,
                datos.apellido,
                datos.email,
                datos.genero,
                datos.telefono ?? null,
            ]
        );
        return resultado.rows[0];
    },

    async buscarPorUsername(username: string): Promise<Usuario | null> {
        const resultado = await pool.query<Usuario>(
            'SELECT * FROM usuarios WHERE username = $1 LIMIT 1',
            [username]
        );
        return resultado.rows[0] ?? null;
    },

    async buscarPorEmail(email: string): Promise<Usuario | null> {
        const resultado = await pool.query<Usuario>(
            'SELECT * FROM usuarios WHERE email = $1 LIMIT 1',
            [email]
        );
        return resultado.rows[0] ?? null;
    },

    async buscarPorId(id: number): Promise<Usuario | null> {
        const resultado = await pool.query<Usuario>(
            'SELECT * FROM usuarios WHERE id = $1 LIMIT 1',
            [id]
        );
        return resultado.rows[0] ?? null;
    },

    async buscarPorGoogleId(googleId: string): Promise<Usuario | null> {
        const resultado = await pool.query<Usuario>(
            'SELECT * FROM usuarios WHERE google_id = $1 LIMIT 1',
            [googleId]
        );
        return resultado.rows[0] ?? null;
    },

    async vincularGoogle(id: number, googleId: string, avatarUrl: string | null): Promise<Usuario> {
        const resultado = await pool.query<Usuario>(
            `UPDATE usuarios
             SET google_id = $1,
                 avatar_url = COALESCE($2, avatar_url),
                 actualizado_en = NOW()
             WHERE id = $3
             RETURNING *`,
            [googleId, avatarUrl, id]
        );
        return resultado.rows[0];
    },

    async crearConGoogle(datos: {
        username: string;
        nombre: string;
        apellido: string;
        email: string;
        avatarUrl: string | null;
        googleId: string;
    }): Promise<Usuario> {
        const resultado = await pool.query<Usuario>(
            `INSERT INTO usuarios (username, password, nombre, apellido, email, genero, rol, avatar_url, google_id)
             VALUES ($1, NULL, $2, $3, $4, 'PREFIERO_NO_DECIRLO', 'USER', $5, $6)
             RETURNING *`,
            [datos.username, datos.nombre, datos.apellido, datos.email, datos.avatarUrl, datos.googleId]
        );
        return resultado.rows[0];
    },

    async existeUsernameDeOtroUsuario(username: string, idUsuarioActual: number): Promise<boolean> {
        const resultado = await pool.query(
            'SELECT 1 FROM usuarios WHERE username = $1 AND id <> $2 LIMIT 1',
            [username, idUsuarioActual]
        );
        return (resultado.rowCount ?? 0) > 0;
    },

    async existeEmailDeOtroUsuario(email: string, idUsuarioActual: number): Promise<boolean> {
        const resultado = await pool.query(
            'SELECT 1 FROM usuarios WHERE email = $1 AND id <> $2 LIMIT 1',
            [email, idUsuarioActual]
        );
        return (resultado.rowCount ?? 0) > 0;
    },

    async actualizarPerfil(
        id: number,
        datos: ActualizarPerfilRequest,
        passwordHash: string | null
    ): Promise<Usuario> {
        const resultado = await pool.query<Usuario>(
            `UPDATE usuarios
             SET nombre = $1,
                 apellido = $2,
                 email = $3,
                 genero = $4,
                 username = $5,
                 telefono = $6,
                 password = COALESCE($7, password),
                 actualizado_en = NOW()
             WHERE id = $8
             RETURNING *`,
            [
                datos.nombre,
                datos.apellido,
                datos.email,
                datos.genero,
                datos.username,
                datos.telefono ?? null,
                passwordHash,
                id,
            ]
        );
        return resultado.rows[0];
    },
};