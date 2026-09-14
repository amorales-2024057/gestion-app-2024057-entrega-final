export type RolUsuario = 'ADMIN' | 'USER';

export type GeneroUsuario = 'MASCULINO' | 'FEMENINO' | 'OTRO' | 'PREFIERO_NO_DECIRLO';

export interface Usuario {
    id: number;
    username: string;
    password: string | null;
    nombre: string;
    apellido: string;
    email: string;
    genero: GeneroUsuario;
    rol: RolUsuario;
    telefono: string | null;
    avatar_url: string | null;
    google_id: string | null;
    activo: boolean;
    creado_en: Date;
    actualizado_en: Date;
}

export interface UsuarioPublico {
    id: number;
    username: string;
    nombre: string;
    apellido: string;
    email: string;
    genero: GeneroUsuario;
    rol: RolUsuario;
    telefono: string | null;
    avatarUrl: string | null;
}

export interface ActualizarPerfilRequest {
    nombre: string;
    apellido: string;
    email: string;
    genero: GeneroUsuario;
    username: string;
    telefono?: string | null;
    password?: string;
}