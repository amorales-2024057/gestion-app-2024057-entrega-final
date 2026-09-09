import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { CrearMovimientoRequest, MovimientoPublico } from '../models/movimiento.model';
import { ResumenFinanciero } from '../models/resumen-financiero.model';

@Injectable({ providedIn: 'root' })
export class MovimientoService {
    private readonly http = inject(HttpClient);

    listar(): Observable<{ movimientos: MovimientoPublico[] }> {
        return this.http.get<{ movimientos: MovimientoPublico[] }>(`${API_BASE_URL}/movimientos`);
    }

    guardarLote(movimientos: CrearMovimientoRequest[]): Observable<{ movimientos: MovimientoPublico[] }> {
        return this.http.post<{ movimientos: MovimientoPublico[] }>(`${API_BASE_URL}/movimientos/lote`, {
            movimientos,
        });
    }

    obtenerResumen(): Observable<ResumenFinanciero> {
        return this.http.get<ResumenFinanciero>(`${API_BASE_URL}/movimientos/resumen`);
    }

    actualizar(id: number, datos: CrearMovimientoRequest): Observable<MovimientoPublico> {
        return this.http.put<MovimientoPublico>(`${API_BASE_URL}/movimientos/${id}`, datos);
    }

    eliminar(id: number): Observable<void> {
        return this.http.delete<void>(`${API_BASE_URL}/movimientos/${id}`);
    }
}