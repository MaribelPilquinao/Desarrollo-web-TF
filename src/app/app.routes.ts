import { Routes } from '@angular/router';
import { Cart } from './pages/cart/cart';
import { Checkout } from './pages/checkout/checkout';
import { Confirmacion } from './pages/confirmacion/confirmacion';
import { Favorites } from './pages/favorites/favorites';
import { Home } from './pages/home/home';
import { MiCuenta } from './pages/mi-cuenta/mi-cuenta';
import { ProductoDetalle } from './pages/producto-detalle/producto-detalle';


export const routes: Routes = [
    { path: "", redirectTo: "producto-detalle", pathMatch: "full" },
    { path: "home", component: Home },
    { path: "cart", component: Cart },
    { path: "producto-detalle", component: ProductoDetalle },
    { path: "favorites", component: Favorites },
    { path: 'checkout', component: Checkout },
    { path: 'confirmacion', component: Confirmacion },
    { path: 'mi-cuenta', component: MiCuenta }
];

