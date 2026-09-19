import { Routes } from '@angular/router';
import { Cart } from './pages/cart/cart';
import { Favorites } from './pages/favorites/favorites';
import { Home } from './pages/home/home';

export const routes: Routes = [
    {path: "", redirectTo: "home", pathMatch: "full"},
    {path: "home", component: Home},
    {path: "cart", component: Cart},
    {path: "favorites", component: Favorites}
];
