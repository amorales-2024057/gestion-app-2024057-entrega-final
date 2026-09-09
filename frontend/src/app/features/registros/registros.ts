import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MovimientoService } from '../../../core/service/movimiento.service';
import {
    CategoriaIngreso,
    CrearMovimientoRequest,
    MovimientoPublico,
    TipoMovimiento,
    categoriasPorTipo,
} from '../../../core/models/movimiento.model';

type FiltroTipo = 'TODOS' | TipoMovimiento;
type FiltroPeriodo = 'TODOS' | 'MES';

interface MovimientoVista extends MovimientoPublico {
    categoriaEtiqueta: string;
}

const TAMANO_PAGINA = 7;

const formateadorMoneda = new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
});

function etiquetaDeCategoria(movimiento: MovimientoPublico): string {
    const todas = [...categoriasPorTipo('INGRESO'), ...categoriasPorTipo('EGRESO')];
    const encontrada = todas.find((c) => c.valor === movimiento.categoria);
    if (encontrada) {
        return encontrada.etiqueta;
    }
    return (
        movimiento.categoria.charAt(0) +
        movimiento.categoria.slice(1).toLowerCase().replace(/_/g, ' ')
    );
}

function perteneceAlMes(fecha: string, referencia: Date): boolean {
    const f = new Date(`${fecha}T00:00:00`);
    return (
        f.getFullYear() === referencia.getFullYear() &&
        f.getMonth() === referencia.getMonth()
    );
}

@Component({
    selector: 'app-registros',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './registros.html',
    styleUrl: './registros.css',
})
export class Registros implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly movimientoService = inject(MovimientoService);
    private readonly router = inject(Router);
    private readonly fb = inject(FormBuilder);

    protected readonly usuario = this.authService.usuario;

    protected readonly cargando = signal(true);
    protected readonly mensajeError = signal<string | null>(null);
    protected readonly mensajeAccion = signal<string | null>(null);

    protected readonly movimientos = signal<MovimientoVista[]>([]);
    protected readonly filtroTipo = signal<FiltroTipo>('TODOS');
    protected readonly filtroPeriodo = signal<FiltroPeriodo>('TODOS');
    protected readonly terminoBusqueda = signal('');
    protected readonly paginaActual = signal(1);

    protected readonly seleccionado = signal<MovimientoVista | null>(null);
    protected readonly enEdicion = signal<MovimientoVista | null>(null);
    protected readonly enEliminacion = signal<MovimientoVista | null>(null);
    protected readonly guardando = signal(false);

    protected readonly formularioEdicion = this.fb.group({
        tipo: ['INGRESO' as TipoMovimiento, Validators.required],
        descripcion: ['', [Validators.required, Validators.maxLength(150)]],
        monto: [0, [Validators.required, Validators.min(0.01)]],
        categoria: ['', Validators.required],
        fecha: ['', Validators.required],
    });

    private readonly movimientosDelPeriodo = computed(() => {
        if (this.filtroPeriodo() === 'MES') {
            return this.movimientos().filter((m) => perteneceAlMes(m.fecha, new Date()));
        }
        return this.movimientos();
    });

    protected readonly filtrados = computed(() => {
        const tipo = this.filtroTipo();
        const termino = this.terminoBusqueda().trim().toLowerCase();
        return this.movimientosDelPeriodo().filter((m) => {
            if (tipo !== 'TODOS' && m.tipo !== tipo) {
                return false;
            }
            if (
                termino &&
                !m.descripcion.toLowerCase().includes(termino) &&
                !m.categoriaEtiqueta.toLowerCase().includes(termino)
            ) {
                return false;
            }
            return true;
        });
    });

    protected readonly totalPaginas = computed(() =>
        Math.max(1, Math.ceil(this.filtrados().length / TAMANO_PAGINA))
    );

    protected readonly paginas = computed(() =>
        Array.from({ length: this.totalPaginas() }, (_, i) => i + 1)
    );

    protected readonly paginaMovimientos = computed(() => {
        const inicio = (this.paginaActual() - 1) * TAMANO_PAGINA;
        return this.filtrados().slice(inicio, inicio + TAMANO_PAGINA);
    });

    protected readonly rangoTexto = computed(() => {
        const total = this.filtrados().length;
        if (total === 0) {
            return '0';
        }
        const inicio = (this.paginaActual() - 1) * TAMANO_PAGINA + 1;
        const fin = Math.min(this.paginaActual() * TAMANO_PAGINA, total);
        return `${inicio}-${fin}`;
    });

    protected readonly totalMovimientos = computed(() => this.movimientosDelPeriodo().length);
    protected readonly totalIngresos = computed(() =>
        this.movimientosDelPeriodo()
            .filter((m) => m.tipo === 'INGRESO')
            .reduce((suma, m) => suma + m.monto, 0)
    );
    protected readonly totalEgresos = computed(() =>
        this.movimientosDelPeriodo()
            .filter((m) => m.tipo === 'EGRESO')
            .reduce((suma, m) => suma + m.monto, 0)
    );
    protected readonly balanceNeto = computed(
        () => this.totalIngresos() - this.totalEgresos()
    );

    protected readonly operacionesEsteMes = computed(
        () => this.movimientos().filter((m) => perteneceAlMes(m.fecha, new Date())).length
    );

    protected readonly deltaIngresos = computed(() => this.deltaPorcentual('INGRESO'));
    protected readonly deltaEgresos = computed(() => this.deltaPorcentual('EGRESO'));

    protected readonly estadoBalance = computed(() =>
        this.balanceNeto() >= 0 ? 'Superávit activo' : 'Déficit'
    );

    protected readonly mesActual = computed(() => {
        const nombre = new Date().toLocaleDateString('es-GT', { month: 'long' });
        return nombre.charAt(0).toUpperCase() + nombre.slice(1);
    });

    protected get categoriasEdicion(): CategoriaIngreso[] {
        const tipo =
            (this.formularioEdicion.get('tipo')?.value as TipoMovimiento) ?? 'INGRESO';
        return categoriasPorTipo(tipo);
    }

    ngOnInit(): void {
        this.cargarMovimientos();

        this.formularioEdicion.get('tipo')?.valueChanges.subscribe((tipo) => {
            const categorias = categoriasPorTipo((tipo as TipoMovimiento) ?? 'INGRESO');
            const categoriaActual = this.formularioEdicion.get('categoria')?.value;
            if (!categorias.some((c) => c.valor === categoriaActual)) {
                this.formularioEdicion.get('categoria')?.setValue(categorias[0].valor);
            }
        });
    }

    private cargarMovimientos(): void {
        this.cargando.set(true);
        this.mensajeError.set(null);

        this.movimientoService.listar().subscribe({
            next: (respuesta) => {
                this.movimientos.set(
                    respuesta.movimientos.map((m) => ({
                        ...m,
                        categoriaEtiqueta: etiquetaDeCategoria(m),
                    }))
                );
                this.cargando.set(false);
                this.paginaActual.set(1);
            },
            error: () => {
                this.cargando.set(false);
                this.mensajeError.set(
                    'No se pudieron cargar sus registros. Por favor, intente de nuevo.'
                );
            },
        });
    }

    private deltaPorcentual(tipo: TipoMovimiento): string {
        const actual = this.sumarPor(tipo, 0);
        const anterior = this.sumarPor(tipo, 1);
        if (anterior === 0) {
            return actual > 0 ? 'Nuevo este mes' : 'Sin registros todavía';
        }
        const variacion = ((actual - anterior) / anterior) * 100;
        return `${variacion >= 0 ? '+' : ''}${variacion.toFixed(0)}% vs mes anterior`;
    }

    private sumarPor(tipo: TipoMovimiento, mesesAtras: number): number {
        const referencia = new Date();
        referencia.setMonth(referencia.getMonth() - mesesAtras);
        return this.movimientos()
            .filter((m) => m.tipo === tipo && perteneceAlMes(m.fecha, referencia))
            .reduce((suma, m) => suma + m.monto, 0);
    }

    protected formatearMonto(monto: number): string {
        return formateadorMoneda.format(monto);
    }

    protected formatearMovimiento(movimiento: MovimientoPublico): string {
        const signo = movimiento.tipo === 'INGRESO' ? '+' : '-';
        return `${signo}${formateadorMoneda.format(movimiento.monto)}`;
    }

    protected formatearFecha(fecha: string): string {
        const [anio, mes, dia] = fecha.split('-');
        return `${dia}/${mes}/${anio}`;
    }

    protected cambiarFiltroTipo(tipo: FiltroTipo): void {
        this.filtroTipo.set(tipo);
        this.paginaActual.set(1);
    }

    protected cambiarFiltroPeriodo(evento: Event): void {
        this.filtroPeriodo.set((evento.target as HTMLSelectElement).value as FiltroPeriodo);
        this.paginaActual.set(1);
    }

    protected buscar(evento: Event): void {
        this.terminoBusqueda.set((evento.target as HTMLInputElement).value);
        this.paginaActual.set(1);
    }

    protected irAPagina(pagina: number): void {
        if (pagina >= 1 && pagina <= this.totalPaginas()) {
            this.paginaActual.set(pagina);
        }
    }

    protected ver(movimiento: MovimientoVista): void {
        this.seleccionado.set(movimiento);
    }

    protected abrirEdicion(movimiento: MovimientoVista): void {
        this.enEdicion.set(movimiento);
        this.formularioEdicion.setValue({
            tipo: movimiento.tipo,
            descripcion: movimiento.descripcion,
            monto: movimiento.monto,
            categoria: movimiento.categoria,
            fecha: movimiento.fecha,
        });
    }

    protected confirmarEdicion(): void {
        const movimiento = this.enEdicion();
        if (!movimiento || this.guardando()) {
            return;
        }
        if (this.formularioEdicion.invalid) {
            this.formularioEdicion.markAllAsTouched();
            return;
        }

        const datos = this.formularioEdicion.getRawValue() as CrearMovimientoRequest;
        datos.monto = Number(datos.monto);

        this.guardando.set(true);
        this.movimientoService.actualizar(movimiento.id, datos).subscribe({
            next: (actualizado) => {
                this.guardando.set(false);
                this.enEdicion.set(null);
                this.movimientos.update((lista) =>
                    lista.map((m) =>
                        m.id === actualizado.id
                            ? { ...actualizado, categoriaEtiqueta: etiquetaDeCategoria(actualizado) }
                            : m
                    )
                );
                this.mensajeAccion.set('Registro actualizado correctamente.');
            },
            error: () => {
                this.guardando.set(false);
                this.mensajeAccion.set('No se pudo actualizar el registro. Intente de nuevo.');
            },
        });
    }

    protected pedirConfirmacionEliminacion(movimiento: MovimientoVista): void {
        this.enEliminacion.set(movimiento);
    }

    protected confirmarEliminacion(): void {
        const movimiento = this.enEliminacion();
        if (!movimiento || this.guardando()) {
            return;
        }

        this.guardando.set(true);
        this.movimientoService.eliminar(movimiento.id).subscribe({
            next: () => {
                this.guardando.set(false);
                this.enEliminacion.set(null);
                this.movimientos.update((lista) =>
                    lista.filter((m) => m.id !== movimiento.id)
                );
                if (this.paginaActual() > this.totalPaginas()) {
                    this.paginaActual.set(this.totalPaginas());
                }
                this.mensajeAccion.set('Registro eliminado correctamente.');
            },
            error: () => {
                this.guardando.set(false);
                this.mensajeAccion.set('No se pudo eliminar el registro. Intente de nuevo.');
            },
        });
    }

    protected cerrarModales(): void {
        this.seleccionado.set(null);
        this.enEdicion.set(null);
        this.enEliminacion.set(null);
    }

    protected cerrarSesion(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}