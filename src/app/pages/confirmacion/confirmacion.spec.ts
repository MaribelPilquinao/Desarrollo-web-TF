import { provideRouter } from '@angular/router';
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
  });
});
