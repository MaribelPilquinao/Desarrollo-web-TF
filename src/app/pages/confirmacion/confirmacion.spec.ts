import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Confirmacion } from './confirmacion';

describe('Confirmacion', () => {
  let component: Confirmacion;
  let fixture: ComponentFixture<Confirmacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([])],
      imports: [Confirmacion],
    }).compileComponents();

    fixture = TestBed.createComponent(Confirmacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Código de pedido');
  });

  it('muestra el código del pedido que llega en la URL', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ codigo: 'MALV-ABC123' }) } } },
      ],
      imports: [Confirmacion],
    }).compileComponents();

    const f = TestBed.createComponent(Confirmacion);
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('MALV-ABC123');
  });
});
