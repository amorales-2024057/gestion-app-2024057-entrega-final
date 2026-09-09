import { Routes } from '@angular/router';
import { Login } from './features/login/login';
import { Registro } from './features/registro/registro';
import { Dashboard } from './features/dashboard/dashboard';
import { NuevoRegistro } from './features/nuevo-registro/nuevo-registro';
import { Registros } from './features/registros/registros';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: Login },
    { path: 'registro', component: Registro },
    { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
    { path: 'registros', component: Registros, canActivate: [authGuard] },
    { path: 'nuevo-registro', component: NuevoRegistro, canActivate: [authGuard] },
    { path: '**', redirectTo: 'login' },
];