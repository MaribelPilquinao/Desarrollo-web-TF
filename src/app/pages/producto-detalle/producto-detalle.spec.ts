import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductoDetalle } from './producto-detalle';

describe('ProductoDetalle', () => {
  let component: ProductoDetalle;
  let fixture: ComponentFixture<ProductoDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([])],
      imports: [ProductoDetalle],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductoDetalle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
