import { Injectable, signal } from '@angular/core';
import { HttpClient }         from '@angular/common/http';
import { tap }                from 'rxjs/operators';

export interface VehicleSpecs {
  oil?:     { type?: string; capacity?: string; filterPart?: string; drainPlug?: string; interval?: string };
  tires?:   { front?: string; rear?: string; pressure?: string; lugTorque?: string; rotation?: string };
  spark?:   { plug?: string; gap?: string; torque?: string; socket?: string; interval?: string };
  filters?: Array<{ name: string; part?: string; notes?: string }>;
  notes?:   string[];
}

export interface Vehicle {
  id:             string;
  make:           string;
  model:          string;
  trim?:          string;
  year:           number;
  vin?:           string;
  licensePlate?:  string;
  color?:         string;
  currentMileage: number;
  photoUrl?:      string;
  notes?:         string;
  specs?:         VehicleSpecs;
  isActive:       boolean;
  outOfService:   boolean;
  createdAt:      string;
  updatedAt:      string;
  _count?: { maintenanceLogs: number; reminders: number };
}

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private readonly _vehicles = signal<Vehicle[]>([]);
  readonly vehicles          = this._vehicles.asReadonly();

  constructor(private readonly http: HttpClient) {}

  load() {
    return this.http.get<Vehicle[]>('/api/vehicles').pipe(
      tap(v => this._vehicles.set(v)),
    );
  }

  getOne(id: string) {
    return this.http.get<Vehicle>(`/api/vehicles/${id}`);
  }

  create(data: Partial<Vehicle>) {
    return this.http.post<Vehicle>('/api/vehicles', data).pipe(
      tap(v => this._vehicles.update(list => [v, ...list])),
    );
  }

  update(id: string, data: Partial<Vehicle>) {
    return this.http.put<Vehicle>(`/api/vehicles/${id}`, data).pipe(
      tap(updated => this._vehicles.update(list =>
        list.map(v => v.id === id ? updated : v),
      )),
    );
  }

  remove(id: string) {
    return this.http.delete(`/api/vehicles/${id}`).pipe(
      tap(() => this._vehicles.update(list => list.filter(v => v.id !== id))),
    );
  }

  uploadPhoto(vehicleId: string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ photoUrl: string }>(`/api/uploads/vehicle/${vehicleId}/photo`, fd);
  }

  displayName(v: Vehicle): string {
    return `${v.year} ${v.make} ${v.model}${v.trim ? ' ' + v.trim : ''}`;
  }

  /** In-service vehicles, newest year first. Used by every picker. */
  byYear(): Vehicle[] {
    return this.ordered().filter(v => !v.outOfService);
  }

  /** In-service first (newest year), then out-of-service at the bottom. */
  ordered(): Vehicle[] {
    return [...this._vehicles()].sort((a, b) =>
      Number(!!a.outOfService) - Number(!!b.outOfService)
      || b.year - a.year
      || a.make.localeCompare(b.make)
      || a.model.localeCompare(b.model),
    );
  }
}
