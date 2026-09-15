import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Cart } from './pages/cart/cart';
import { Favorites } from './pages/favorites/favorites';

export const routes: Routes = [
    {path: "", redirectTo: "home", pathMatch: "full"},
    {path: "home", component: Home},
    {path: "cart", component: Cart},
    {path: "favorites", component: Favorites}
];
