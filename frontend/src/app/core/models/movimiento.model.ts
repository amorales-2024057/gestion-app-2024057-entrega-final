export type TipoMovimiento = 'INGRESO' | 'EGRESO';

export interface MovimientoPublico {
    id: number;
    tipo: TipoMovimiento;
    descripcion: string;
    monto: number;
    categoria: string;
    fecha: string;
}

export interface CrearMovimientoRequest {
    tipo: TipoMovimiento;
    descripcion: string;
    monto: number;
    categoria: string;
    fecha: string;
}

export interface MovimientoEnVistaPrevia extends CrearMovimientoRequest {
    idLocal: string;
}

export interface CategoriaIngreso {
    valor: string;
    etiqueta: string;
}

export const CATEGORIAS_INGRESO: CategoriaIngreso[] = [
    { valor: 'SALARIO', etiqueta: 'Salario' },
    { valor: 'VENTA', etiqueta: 'Venta' },
    { valor: 'REGALO', etiqueta: 'Regalo' },
    { valor: 'BONO', etiqueta: 'Bono / Aguinaldo' },
    { valor: 'REEMBOLSO', etiqueta: 'Reembolso' },
    { valor: 'PENSION', etiqueta: 'Pensión' },
    { valor: 'RENTA', etiqueta: 'Renta' },
    { valor: 'PRESTAMO', etiqueta: 'Préstamo recibido' },
    { valor: 'INVERSION', etiqueta: 'Inversión' },
    { valor: 'OTRO', etiqueta: 'Otro' },
];

export const CATEGORIAS_EGRESO: CategoriaIngreso[] = [
    { valor: 'ALIMENTACION', etiqueta: 'Alimentación' },
    { valor: 'TRANSPORTE', etiqueta: 'Transporte' },
    { valor: 'VIVIENDA', etiqueta: 'Vivienda / Renta' },
    { valor: 'SERVICIOS_BASICOS', etiqueta: 'Servicios básicos' },
    { valor: 'SALUD', etiqueta: 'Salud' },
    { valor: 'EDUCACION', etiqueta: 'Educación' },
    { valor: 'ENTRETENIMIENTO', etiqueta: 'Entretenimiento' },
    { valor: 'ROPA', etiqueta: 'Ropa y calzado' },
    { valor: 'DEUDAS', etiqueta: 'Deudas y préstamos' },
    { valor: 'OTRO', etiqueta: 'Otro' },
];

export function categoriasPorTipo(tipo: TipoMovimiento): CategoriaIngreso[] {
    return tipo === 'EGRESO' ? CATEGORIAS_EGRESO : CATEGORIAS_INGRESO;
}