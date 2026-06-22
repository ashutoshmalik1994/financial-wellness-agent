import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Payslip, UploadPayslipResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class PayslipService {
  constructor(private http: HttpClient) {}

  upload(file: File, month?: string): Observable<UploadPayslipResponse> {
    const fd = new FormData();
    fd.append('payslip', file);
    if (month) fd.append('month', month);
    return this.http.post<UploadPayslipResponse>('/api/payslips/upload', fd);
  }

  list(): Observable<Payslip[]> {
    return this.http.get<Payslip[]>('/api/payslips');
  }

  getById(id: string): Observable<Payslip> {
    return this.http.get<Payslip>(`/api/payslips/${id}`);
  }
}
