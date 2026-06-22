import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AiService } from '../../services/ai.service';
import { PayrollService } from '../../services/payroll.service';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { TaxSimulationResult, InvestmentChecklistResponse, TaxDeclaration } from '../../models';

@Component({
  selector: 'app-tax-planner',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './tax-planner.component.html',
  styleUrl: './tax-planner.component.css',
})
export class TaxPlannerComponent implements OnInit {
  form: FormGroup;
  result           = signal<TaxSimulationResult | null>(null);
  checklist        = signal<InvestmentChecklistResponse | null>(null);
  simulating       = signal(false);
  checklistLoading = signal(false);
  checklistError   = signal('');

  constructor(
    private fb: FormBuilder,
    private aiService: AiService,
    private payrollService: PayrollService
  ) {
    this.form = this.fb.group({
      annualGross:      [''],
      section80C:       [0],
      section80D:       [0],
      hraExemption:     [0],
      ltaExemption:     [0],
      npsContribution:  [0],
      homeLoanInterest: [0],
      regime:           ['old'],
    });
  }

  ngOnInit(): void {
    this.payrollService.getTaxDeclaration().subscribe({
      next: (decl: TaxDeclaration) => {
        this.form.patchValue({
          section80C:       decl.section80C,
          section80D:       decl.section80D,
          hraExemption:     decl.hraExemption,
          ltaExemption:     decl.ltaExemption,
          npsContribution:  decl.npsContribution,
          homeLoanInterest: decl.homeLoanInterest,
        });
      },
    });
  }

  setRegime(r: 'old' | 'new'): void {
    this.form.patchValue({ regime: r });
  }

  runSimulation(): void {
    this.simulating.set(true);
    const v = this.form.value;
    this.aiService
      .taxSimulation({
        annualGross:      v.annualGross ? +v.annualGross : undefined,
        section80C:       +v.section80C       || 0,
        section80D:       +v.section80D       || 0,
        hraExemption:     +v.hraExemption     || 0,
        ltaExemption:     +v.ltaExemption     || 0,
        npsContribution:  +v.npsContribution  || 0,
        homeLoanInterest: +v.homeLoanInterest || 0,
        regime:           v.regime,
      })
      .subscribe({
        next: (res) => { this.result.set(res); this.simulating.set(false); },
        error: ()    => this.simulating.set(false),
      });
  }

  loadChecklist(): void {
    this.checklistLoading.set(true);
    this.checklistError.set('');
    this.aiService.investmentChecklist().subscribe({
      next: (res) => { this.checklist.set(res);   this.checklistLoading.set(false); },
      error: ()    => {
        this.checklistError.set('Failed to load checklist. Please try again.');
        this.checklistLoading.set(false);
      },
    });
  }

  get deductionEntries(): [string, number][] {
    return Object.entries(this.result()?.deductionsApplied ?? {}) as [string, number][];
  }

  pct(value: number | string, max: number): number {
    return Math.min(100, Math.round((+value / max) * 100)) || 0;
  }

  fmt(v: number): string {
    return '₹' + v.toLocaleString('en-IN');
  }

  formatChecklist(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }
}
