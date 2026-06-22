import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PayrollSummary, YtdSummary, TaxDeclaration } from '../models';

@Injectable({ providedIn: 'root' })
export class PayrollService {
  constructor(private http: HttpClient) {}

  getSummary(fy = '2024-25'): Observable<PayrollSummary> {
    return this.http.get<PayrollSummary>(`/api/payroll/summary?fy=${fy}`);
  }

  getYtd(fy = '2024-25'): Observable<YtdSummary> {
    return this.http.get<YtdSummary>(`/api/payroll/ytd?fy=${fy}`);
  }

  getTaxDeclaration(): Observable<TaxDeclaration> {
    return this.http.get<TaxDeclaration>('/api/payroll/tax-declaration');
  }
}
