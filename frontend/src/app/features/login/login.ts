import { AfterViewInit, Component, ElementRef, NgZone, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { GOOGLE_CLIENT_ID } from '../../core/config/google.config';

declare const google: any;

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './login.html',
    styleUrl: './login.css',
})
export class Login implements AfterViewInit {
    @ViewChild('googleBoton', { static: true }) googleBoton!: ElementRef<HTMLDivElement>;

    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly activatedRoute = inject(ActivatedRoute);
    private readonly ngZone = inject(NgZone);

    protected readonly cargando = signal(false);
    protected readonly mensajeError = signal<string | null>(null);
    protected readonly mostrarPassword = signal(false);
    protected readonly mensajeExito = signal<string | null>(
        this.activatedRoute.snapshot.queryParamMap.get('registrado')
            ? 'Su cuenta se creó correctamente. Ahora inicie sesión.'
            : null
    );

    protected readonly formulario = this.fb.group({
        username: ['', [Validators.required]],
        password: ['', [Validators.required]],
    });

    protected alternarPassword(): void {
        this.mostrarPassword.update((valor) => !valor);
    }

    ngAfterViewInit(): void {
        if (typeof google === 'undefined') {
            return;
        }

        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (respuesta: { credential: string }) =>
                this.ngZone.run(() => this.continuarConGoogle(respuesta.credential)),
        });

        google.accounts.id.renderButton(this.googleBoton.nativeElement, {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            width: 320,
            text: 'continue_with',
        });
    }

    private continuarConGoogle(credential: string): void {
        this.cargando.set(true);
        this.mensajeError.set(null);
        this.mensajeExito.set(null);

        this.authService.loginConGoogle(credential).subscribe({
            next: () => {
                this.cargando.set(false);
                this.router.navigate(['/dashboard']);
            },
            error: (error) => {
                this.cargando.set(false);
                this.mensajeError.set(
                    error?.error?.mensaje ?? 'No se pudo iniciar sesión con Google. Intente de nuevo.'
                );
            },
        });
    }

    protected enviar(): void {
        if (this.formulario.invalid || this.cargando()) {
            this.formulario.markAllAsTouched();
            return;
        }

        this.cargando.set(true);
        this.mensajeError.set(null);
        this.mensajeExito.set(null);

        const { username, password } = this.formulario.getRawValue();

        this.authService
            .login({ username: username ?? '', password: password ?? '' })
            .subscribe({
                next: () => {
                    this.cargando.set(false);
                    this.router.navigate(['/dashboard']);
                },
                error: (error) => {
                    this.cargando.set(false);
                    this.mensajeError.set(
                        error?.error?.mensaje ?? 'No se pudo iniciar sesión. Por favor, intente de nuevo.'
                    );
                },
            });
    }
}