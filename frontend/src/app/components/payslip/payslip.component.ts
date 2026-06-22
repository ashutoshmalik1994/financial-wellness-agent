import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PayslipService } from '../../services/payslip.service';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { Payslip, UploadPayslipResponse } from '../../models';

@Component({
  selector: 'app-payslip',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent],
  templateUrl: './payslip.component.html',
  styleUrl: './payslip.component.css',
})
export class PayslipComponent implements OnInit {
  payslips      = signal<Payslip[]>([]);
  selected      = signal<Payslip | null>(null);
  uploadResult  = signal<UploadPayslipResponse | null>(null);
  uploadError   = signal<string | null>(null);
  loading       = signal(true);
  uploading     = false;
  isDragging    = false;
  selectedFile: File | null = null;
  selectedMonth = '';

  constructor(private payslipService: PayslipService) {}

  ngOnInit(): void {
    this.loadPayslips();
  }

  private loadPayslips(): void {
    this.payslipService.list().subscribe({
      next: (p) => { this.payslips.set(p); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.setFile(input.files[0]);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(): void {
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File): void {
    this.selectedFile = file;
    this.uploadResult.set(null);
    this.uploadError.set(null);
  }

  uploadPayslip(): void {
    if (!this.selectedFile) return;
    this.uploading = true;
    this.uploadResult.set(null);
    this.uploadError.set(null);

    this.payslipService.upload(this.selectedFile, this.selectedMonth || undefined).subscribe({
      next: (res) => {
        this.uploadResult.set(res);
        this.uploading = false;
        this.selectedFile = null;
        this.selectedMonth = '';
        this.loadPayslips();
      },
      error: (err) => {
        this.uploadError.set(err.error?.error || 'Upload failed. Please try again.');
        this.uploading = false;
      },
    });
  }

  clearFile(): void {
    this.selectedFile = null;
    this.uploadResult.set(null);
    this.uploadError.set(null);
  }

  toggleSelect(p: Payslip): void {
    this.selected.set(this.selected()?._id === p._id ? null : p);
  }

  fmt(v: number): string {
    return '₹' + v.toLocaleString('en-IN');
  }

  fmtMonth(m: string): string {
    const [y, mo] = m.split('-');
    return new Date(+y, +mo - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  fmtMonthShort(m: string): string {
    const [y, mo] = m.split('-');
    return new Date(+y, +mo - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
  }
}
