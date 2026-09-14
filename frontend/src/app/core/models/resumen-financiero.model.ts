import { PuntoGrafica } from '../../shared/graficas/graficas.util';

// Los 4 iconos que pide el maquetado para las tarjetas del resumen:
// billete (ingresos), persona (egresos), flecha (balance) y grafico
// (porcentaje). Se dibujan en dashboard.html con un @switch.
export type IconoTarjeta = 'billete' | 'persona' | 'flecha' | 'grafico';

export interface TarjetaResumen {
    etiqueta: string;
    valor: string;
    delta: string;
    icono: IconoTarjeta;
    destacada?: boolean;
    acento?: boolean;
}

export interface ResumenFinanciero {
    tarjetas: TarjetaResumen[];
    balanceAnual: PuntoGrafica[];
    balanceMensual: PuntoGrafica[];
    totales?: {
        totalIngresos: number;
        totalEgresos: number;
        balanceDisponible: number;
    };
}