import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ActualizarPerfilRequest, GeneroUsuario } from '../../core/models/usuario.model';

@Component({
    selector: 'app-cuenta',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './cuenta.html',
    styleUrl: './cuenta.css',
})
export class Cuenta implements OnInit, OnDestroy {
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    protected readonly usuario = this.authService.usuario;

    protected readonly cargando = signal(true);
    protected readonly guardando = signal(false);
    protected readonly mensajeExito = signal<string | null>(null);
    protected readonly mensajeError = signal<string | null>(null);
    private temporizadorMensaje: ReturnType<typeof setTimeout> | null = null;

    protected readonly generos: { valor: GeneroUsuario; etiqueta: string }[] = [
        { valor: 'MASCULINO', etiqueta: 'Masculino' },
        { valor: 'FEMENINO', etiqueta: 'Femenino' },
        { valor: 'OTRO', etiqueta: 'Otro' },
        { valor: 'PREFIERO_NO_DECIRLO', etiqueta: 'Prefiero no decirlo' },
    ];

    protected readonly formulario = this.fb.group({
        nombre: ['', [Validators.required, Validators.maxLength(100)]],
        apellido: ['', [Validators.required, Validators.maxLength(100)]],
        username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
        email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
        genero: ['PREFIERO_NO_DECIRLO' as GeneroUsuario, [Validators.required]],
        telefono: ['', [Validators.maxLength(20)]],
        password: ['', [Validators.minLength(8)]],
    });

    ngOnInit(): void {
        this.cargarDatos();
    }

    ngOnDestroy(): void {
        this.limpiarTemporizador();
    }

    private limpiarTemporizador(): void {
        if (this.temporizadorMensaje !== null) {
            clearTimeout(this.temporizadorMensaje);
            this.temporizadorMensaje = null;
        }
    }

    private mostrarMensajeExito(mensaje: string): void {
        this.limpiarTemporizador();
        this.mensajeError.set(null);
        this.mensajeExito.set(mensaje);
        this.temporizadorMensaje = setTimeout(() => {
            this.mensajeExito.set(null);
            this.temporizadorMensaje = null;
        }, 5000);
    }

    private mostrarMensajeError(mensaje: string): void {
        this.limpiarTemporizador();
        this.mensajeExito.set(null);
        this.mensajeError.set(mensaje);
        this.temporizadorMensaje = setTimeout(() => {
            this.mensajeError.set(null);
            this.temporizadorMensaje = null;
        }, 5000);
    }

    protected cargarDatos(): void {
        const actual = this.usuario();
        if (actual) {
            this.poblarFormulario(actual);
        }

        this.cargando.set(true);
        this.authService.obtenerPerfil().subscribe({
            next: (datos) => {
                this.poblarFormulario(datos);
                this.cargando.set(false);
            },
            error: () => {
                this.cargando.set(false);
            },
        });
    }

    private poblarFormulario(datos: {
        nombre: string;
        apellido: string;
        username: string;
        email: string;
        genero: GeneroUsuario;
        telefono: string | null;
    }): void {
        this.formulario.patchValue({
            nombre: datos.nombre ?? '',
            apellido: datos.apellido ?? '',
            username: datos.username ?? '',
            email: datos.email ?? '',
            genero: datos.genero ?? 'PREFIERO_NO_DECIRLO',
            telefono: datos.telefono ?? '',
            password: '',
        });
    }

    protected guardarCambios(): void {
        if (this.guardando()) {
            return;
        }

        if (this.formulario.invalid) {
            this.formulario.markAllAsTouched();
            return;
        }

        this.limpiarTemporizador();
        this.mensajeError.set(null);
        this.mensajeExito.set(null);
        this.guardando.set(true);

        const raw = this.formulario.getRawValue();
        const payload: ActualizarPerfilRequest = {
            nombre: (raw.nombre ?? '').trim(),
            apellido: (raw.apellido ?? '').trim(),
            username: (raw.username ?? '').trim(),
            email: (raw.email ?? '').trim(),
            genero: (raw.genero as GeneroUsuario) ?? 'PREFIERO_NO_DECIRLO',
            telefono: (raw.telefono ?? '').trim() || null,
            ...(raw.password?.trim() ? { password: raw.password.trim() } : {}),
        };

        this.authService.actualizarPerfil(payload).subscribe({
            next: (actualizado) => {
                this.guardando.set(false);
                this.poblarFormulario(actualizado);
                this.mostrarMensajeExito('Información de la cuenta actualizada exitosamente.');
            },
            error: (error) => {
                this.guardando.set(false);
                this.mostrarMensajeError(
                    error?.error?.mensaje ?? 'No se pudo actualizar la información. Intente nuevamente.'
                );
            },
        });
    }

    protected restaurar(): void {
        const actual = this.usuario();
        if (actual) {
            this.poblarFormulario(actual);
        }
        this.limpiarTemporizador();
        this.mensajeError.set(null);
        this.mensajeExito.set(null);
    }

    protected etiquetaGenero(valor?: string): string {
        return this.generos.find((g) => g.valor === valor)?.etiqueta ?? valor ?? 'No especificado';
    }

    protected etiquetaRol(rol?: string): string {
        return rol === 'ADMIN' ? 'Administrador' : 'Usuario Personal';
    }

    protected cerrarSesion(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}
