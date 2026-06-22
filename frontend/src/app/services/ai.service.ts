import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ChatRequest,
  ChatResponse,
  TaxSimulationRequest,
  TaxSimulationResult,
  InvestmentChecklistResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AiService {
  constructor(private http: HttpClient) {}

  chat(req: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>('/api/ai/chat', req);
  }

  taxSimulation(req: TaxSimulationRequest): Observable<TaxSimulationResult> {
    return this.http.post<TaxSimulationResult>('/api/ai/tax-simulation', req);
  }

  investmentChecklist(): Observable<InvestmentChecklistResponse> {
    return this.http.get<InvestmentChecklistResponse>('/api/ai/investment-checklist');
  }
}
