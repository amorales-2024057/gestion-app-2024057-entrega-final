import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { LoginRequest, LoginResponse, RegistroRequest, UsuarioPublico } from '../models/usuario.model';
import { SesionExpiradaService } from './sesion-expirada.service';

const CLAVE_TOKEN = 'finanzas_token';
const CLAVE_USUARIO = 'finanzas_usuario';
const DURACION_SESION_POR_DEFECTO_MS = 30 * 60 * 1000;
const EVENTOS_ACTIVIDAD = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

interface PayloadToken {
    iat?: number;
    exp?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly sesionExpiradaService = inject(SesionExpiradaService);

    private readonly usuarioActual = signal<UsuarioPublico | null>(this.cargarUsuarioGuardado());
    readonly usuario = this.usuarioActual.asReadonly();

    private temporizadorInactividad: ReturnType<typeof setTimeout> | null = null;
    private duracionSesionMs = DURACION_SESION_POR_DEFECTO_MS;
    private escuchandoActividad = false;
    private readonly manejarActividad = (): void => this.reiniciarConteoInactividad();

    constructor(private readonly http: HttpClient) {
        const token = this.obtenerToken();
        if (token) {
            this.duracionSesionMs = this.calcularDuracionSesion(token);
            this.iniciarControlDeInactividad();
        }
    }

    login(credenciales: LoginRequest): Observable<LoginResponse> {
        return this.http
            .post<LoginResponse>(`${API_BASE_URL}/auth/login`, credenciales)
            .pipe(tap((respuesta) => this.guardarSesion(respuesta)));
    }

    registrar(datos: RegistroRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${API_BASE_URL}/auth/registro`, datos);
    }

    private guardarSesion(respuesta: LoginResponse): void {
        localStorage.setItem(CLAVE_TOKEN, respuesta.token);
        localStorage.setItem(CLAVE_USUARIO, JSON.stringify(respuesta.usuario));
        this.usuarioActual.set(respuesta.usuario);
        this.duracionSesionMs = this.calcularDuracionSesion(respuesta.token);
        this.iniciarControlDeInactividad();
    }

    logout(): void {
        this.detenerControlDeInactividad();
        localStorage.removeItem(CLAVE_TOKEN);
        localStorage.removeItem(CLAVE_USUARIO);
        this.usuarioActual.set(null);
    }

    obtenerToken(): string | null {
        return localStorage.getItem(CLAVE_TOKEN);
    }

    estaAutenticado(): boolean {
        return !!this.obtenerToken();
    }

    private cargarUsuarioGuardado(): UsuarioPublico | null {
        const datosGuardados = localStorage.getItem(CLAVE_USUARIO);
        if (!datosGuardados) {
            return null;
        }

        try {
            return JSON.parse(datosGuardados) as UsuarioPublico;
        } catch {
            return null;
        }
    }

    private calcularDuracionSesion(token: string): number {
        const payload = this.decodificarPayload(token);
        if (payload?.iat && payload?.exp) {
            const duracion = (payload.exp - payload.iat) * 1000;
            if (duracion > 0) {
                return duracion;
            }
        }
        return DURACION_SESION_POR_DEFECTO_MS;
    }

    private iniciarControlDeInactividad(): void {
        this.reiniciarConteoInactividad();

        if (!this.escuchandoActividad) {
            EVENTOS_ACTIVIDAD.forEach((evento) => window.addEventListener(evento, this.manejarActividad));
            this.escuchandoActividad = true;
        }
    }

    private detenerControlDeInactividad(): void {
        if (this.temporizadorInactividad !== null) {
            clearTimeout(this.temporizadorInactividad);
            this.temporizadorInactividad = null;
        }

        if (this.escuchandoActividad) {
            EVENTOS_ACTIVIDAD.forEach((evento) => window.removeEventListener(evento, this.manejarActividad));
            this.escuchandoActividad = false;
        }
    }

    private reiniciarConteoInactividad(): void {
        if (this.temporizadorInactividad !== null) {
            clearTimeout(this.temporizadorInactividad);
        }
        this.temporizadorInactividad = setTimeout(() => this.expirarSesion(), this.duracionSesionMs);
    }

    private expirarSesion(): void {
        this.logout();
        this.sesionExpiradaService.mostrar();
    }

    private decodificarPayload(token: string): PayloadToken | null {
        try {
            const segmentoPayload = token.split('.')[1];
            const base64 = segmentoPayload.replace(/-/g, '+').replace(/_/g, '/');
            const json = atob(base64);
            return JSON.parse(json) as PayloadToken;
        } catch {
            return null;
        }
    }
}