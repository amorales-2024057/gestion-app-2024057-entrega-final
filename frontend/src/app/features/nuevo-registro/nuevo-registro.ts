import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MovimientoService } from '../../core/services/movimiento.service';
import {
    categoriasPorTipo,
    MovimientoEnVistaPrevia,
    TipoMovimiento,
} from '../../core/models/movimiento.model';

function formatearMoneda(valor: number): string {
    return `Q${Math.abs(valor).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function redondearMonto(valor: number): number {
    return Math.round(valor * 100) / 100;
}

function fechaDeHoy(): string {
    return new Date().toISOString().slice(0, 10);
}

function fechaDeHoyTexto(): string {
    const [anio, mes, dia] = fechaDeHoy().split('-');
    return `${dia}/${mes}/${anio}`;
}

@Component({
    selector: 'app-nuevo-registro',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './nuevo-registro.html',
    styleUrl: './nuevo-registro.css',
})
export class NuevoRegistro implements OnInit, OnDestroy {
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly movimientoService = inject(MovimientoService);
    private readonly router = inject(Router);

    protected readonly usuario = this.authService.usuario;

    protected readonly tipoSeleccionado = signal<TipoMovimiento>('INGRESO');
    protected readonly categorias = computed(() => categoriasPorTipo(this.tipoSeleccionado()));

    protected readonly vistaPrevia = signal<MovimientoEnVistaPrevia[]>([]);

    protected readonly totalIngresosVista = computed(() =>
        this.vistaPrevia()
            .filter((fila) => fila.tipo === 'INGRESO')
            .reduce((total, fila) => total + fila.monto, 0)
    );
    protected readonly totalEgresosVista = computed(() =>
        this.vistaPrevia()
            .filter((fila) => fila.tipo === 'EGRESO')
            .reduce((total, fila) => total + fila.monto, 0)
    );

    protected readonly balanceDisponibleServidor = signal<number>(0);
    protected readonly totalIngresosServidor = signal<number>(0);
    protected readonly totalEgresosServidor = signal<number>(0);
    protected readonly cargandoBalance = signal<boolean>(true);

    protected readonly totalIngresosGlobal = computed(() =>
        Math.round((this.totalIngresosServidor() + this.totalIngresosVista()) * 100) / 100
    );
    protected readonly totalEgresosGlobal = computed(() =>
        Math.round((this.totalEgresosServidor() + this.totalEgresosVista()) * 100) / 100
    );
    protected readonly balanceDisponibleActual = computed(() =>
        Math.round((this.totalIngresosGlobal() - this.totalEgresosGlobal()) * 100) / 100
    );

    protected readonly hoyTexto = fechaDeHoyTexto();

    protected readonly guardando = signal(false);
    protected readonly mensajeError = signal<string | null>(null);
    protected readonly mensajeExito = signal<string | null>(null);
    private temporizadorMensaje: ReturnType<typeof setTimeout> | null = null;

    protected readonly formulario = this.fb.group({
        descripcion: ['', [Validators.maxLength(100)]],
        monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
        categoria: ['', [Validators.required]],
    });

    ngOnInit(): void {
        this.cargarBalance();
    }

    ngOnDestroy(): void {
        this.limpiarTemporizadorMensaje();
    }

    private mostrarMensajeError(mensaje: string): void {
        this.limpiarTemporizadorMensaje();
        this.mensajeExito.set(null);
        this.mensajeError.set(mensaje);
        this.temporizadorMensaje = setTimeout(() => {
            this.mensajeError.set(null);
            this.temporizadorMensaje = null;
        }, 5000);
    }

    private mostrarMensajeExito(mensaje: string): void {
        this.limpiarTemporizadorMensaje();
        this.mensajeError.set(null);
        this.mensajeExito.set(mensaje);
        this.temporizadorMensaje = setTimeout(() => {
            this.mensajeExito.set(null);
            this.temporizadorMensaje = null;
        }, 5000);
    }

    private limpiarTemporizadorMensaje(): void {
        if (this.temporizadorMensaje !== null) {
            clearTimeout(this.temporizadorMensaje);
            this.temporizadorMensaje = null;
        }
    }

    protected cargarBalance(): void {
        this.cargandoBalance.set(true);
        this.movimientoService.obtenerResumen().subscribe({
            next: (resumen) => {
                if (resumen.totales) {
                    this.totalIngresosServidor.set(resumen.totales.totalIngresos);
                    this.totalEgresosServidor.set(resumen.totales.totalEgresos);
                    this.balanceDisponibleServidor.set(resumen.totales.balanceDisponible);
                }
                this.cargandoBalance.set(false);
            },
            error: () => {
                this.cargandoBalance.set(false);
            },
        });
    }

    protected seleccionarTipo(tipo: TipoMovimiento): void {
        if (this.tipoSeleccionado() === tipo) {
            return;
        }
        this.tipoSeleccionado.set(tipo);
        this.formulario.patchValue({ categoria: '' });
        this.limpiarTemporizadorMensaje();
        this.mensajeError.set(null);
    }

    protected etiquetaCategoria(tipo: TipoMovimiento, valor: string): string {
        return categoriasPorTipo(tipo).find((categoria) => categoria.valor === valor)?.etiqueta ?? valor;
    }

    protected formatearMonto(valor: number): string {
        return formatearMoneda(valor);
    }

    protected descripcionAMostrar(descripcion: string): string {
        return descripcion.trim() ? descripcion : 'Sin descripción';
    }

    protected agregarALaLista(): void {
        if (this.formulario.invalid) {
            this.formulario.markAllAsTouched();
            return;
        }

        this.limpiarTemporizadorMensaje();
        this.mensajeExito.set(null);
        this.mensajeError.set(null);

        const { descripcion, monto, categoria } = this.formulario.getRawValue();
        const montoNumerico = redondearMonto(Number(monto));

        if (this.tipoSeleccionado() === 'EGRESO') {
            const disponible = this.balanceDisponibleActual();
            if (montoNumerico > disponible) {
                this.mostrarMensajeError(
                    `No se puede registrar el egreso porque supera el límite de los ingresos ya ingresados anteriormente. (Disponible: ${formatearMoneda(disponible)})`
                );
                return;
            }
        }

        const nuevaFila: MovimientoEnVistaPrevia = {
            idLocal:
                typeof crypto !== 'undefined' && 'randomUUID' in crypto
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random()}`,
            tipo: this.tipoSeleccionado(),
            descripcion: (descripcion ?? '').trim(),
            monto: montoNumerico,
            categoria: categoria ?? '',
            fecha: fechaDeHoy(),
        };

        this.vistaPrevia.update((filas) => [nuevaFila, ...filas]);

        this.formulario.reset({
            descripcion: '',
            monto: null,
            categoria: '',
        });
    }

    protected quitarDeLaLista(idLocal: string): void {
        this.vistaPrevia.update((filas) => filas.filter((fila) => fila.idLocal !== idLocal));
        this.limpiarTemporizadorMensaje();
        this.mensajeError.set(null);
    }

    protected confirmarYGuardar(): void {
        if (this.guardando() || this.vistaPrevia().length === 0) {
            return;
        }

        this.limpiarTemporizadorMensaje();
        this.mensajeError.set(null);
        this.mensajeExito.set(null);

        if (this.balanceDisponibleActual() < 0) {
            this.mostrarMensajeError(
                'No se puede registrar el egreso porque supera el límite de los ingresos ya ingresados anteriormente.'
            );
            return;
        }

        this.guardando.set(true);

        const movimientos = this.vistaPrevia().map(({ idLocal, ...movimiento }) => movimiento);

        this.movimientoService.guardarLote(movimientos).subscribe({
            next: () => {
                this.guardando.set(false);
                this.vistaPrevia.set([]);
                this.mostrarMensajeExito('Su registro se guardó correctamente. El dashboard ya está actualizado.');
                this.cargarBalance();
            },
            error: (error) => {
                this.guardando.set(false);
                this.mostrarMensajeError(
                    error?.error?.mensaje ?? 'No se pudo guardar el registro. Por favor, intente de nuevo.'
                );
            },
        });
    }

    protected irAlDashboard(): void {
        this.router.navigate(['/dashboard']);
    }

    protected cerrarSesion(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}