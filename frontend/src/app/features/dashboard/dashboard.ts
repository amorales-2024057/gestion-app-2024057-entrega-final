import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { TarjetaResumen } from '../../core/models/resumen-financiero.model';
import { construirSvgBarras, construirSvgLinea } from '../../shared/graficas/graficas.util';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly dashboardService = inject(DashboardService);

    protected readonly usuario = this.authService.usuario;
    protected readonly anioActual = new Date().getFullYear();

    protected readonly cargando = signal(true);
    protected readonly errorCarga = signal<string | null>(null);
    private temporizadorError: ReturnType<typeof setTimeout> | null = null;

    protected readonly tarjetas = signal<TarjetaResumen[]>([]);
    protected readonly svgLinea = signal<SafeHtml | null>(null);
    protected readonly svgBarras = signal<SafeHtml | null>(null);

    ngOnInit(): void {
        this.cargarResumen();
    }

    ngOnDestroy(): void {
        if (this.temporizadorError !== null) {
            clearTimeout(this.temporizadorError);
            this.temporizadorError = null;
        }
    }

    private mostrarError(mensaje: string): void {
        if (this.temporizadorError !== null) {
            clearTimeout(this.temporizadorError);
        }
        this.errorCarga.set(mensaje);
        this.temporizadorError = setTimeout(() => {
            this.errorCarga.set(null);
            this.temporizadorError = null;
        }, 5000);
    }

    private cargarResumen(): void {
        this.cargando.set(true);
        if (this.temporizadorError !== null) {
            clearTimeout(this.temporizadorError);
            this.temporizadorError = null;
        }
        this.errorCarga.set(null);

        this.dashboardService.obtenerResumen().subscribe({
            next: (resumen) => {
                this.tarjetas.set(resumen.tarjetas);

                this.svgLinea.set(
                    resumen.balanceAnual.length > 0
                        ? this.sanitizer.bypassSecurityTrustHtml(construirSvgLinea(resumen.balanceAnual))
                        : null
                );

                this.svgBarras.set(
                    resumen.balanceMensual.length > 0
                        ? this.sanitizer.bypassSecurityTrustHtml(construirSvgBarras(resumen.balanceMensual))
                        : null
                );

                this.cargando.set(false);
            },
            error: () => {
                this.cargando.set(false);
                this.mostrarError('No se pudo cargar el resumen financiero. Por favor, intente de nuevo.');
            },
        });
    }

    protected reintentar(): void {
        this.cargarResumen();
    }

    protected cerrarSesion(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}
