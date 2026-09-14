import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './login.html',
    styleUrl: './login.css',
})
export class Login {
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly activatedRoute = inject(ActivatedRoute);

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