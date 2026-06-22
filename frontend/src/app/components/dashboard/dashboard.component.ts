import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PayrollService } from '../../services/payroll.service';
import { PayslipService } from '../../services/payslip.service';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { PayrollSummary, YtdSummary, Payslip } from '../../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  user = this.authService.currentUser;

  summary  = signal<PayrollSummary | null>(null);
  ytd      = signal<YtdSummary | null>(null);
  payslips = signal<Payslip[]>([]);
  loading  = signal(true);

  constructor(
    private authService: AuthService,
    private payrollService: PayrollService,
    private payslipService: PayslipService
  ) {}

  ngOnInit(): void {
    this.payrollService.getSummary().subscribe({
      next: (s) => { this.summary.set(s); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
    this.payrollService.getYtd().subscribe({ next: (y) => this.ytd.set(y) });
    this.payslipService.list().subscribe({ next: (p) => this.payslips.set(p) });
  }

  get firstName(): string {
    return this.user()?.name?.split(' ')[0] ?? '';
  }

  get pendingProofs(): string[] {
    return this.ytd()?.taxDeclaration?.proofPendingFields ?? [];
  }

  formatINR(value: number): string {
    return '₹' + value.toLocaleString('en-IN');
  }

  formatMonth(m: string): string {
    const [y, mo] = m.split('-');
    return new Date(+y, +mo - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
  }
}
