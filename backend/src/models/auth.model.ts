import { GeneroUsuario, UsuarioPublico } from './usuario.model';

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    usuario: UsuarioPublico;
}

export interface RegistroRequest {
    nombre: string;
    apellido: string;
    email: string;
    genero: GeneroUsuario;
    username: string;
    password: string;
    telefono?: string | null;
}

export interface JwtPayload {
    id: number;
    username: string;
    rol: 'ADMIN' | 'USER';
}

export interface GoogleLoginRequest {
    credential: string;
}