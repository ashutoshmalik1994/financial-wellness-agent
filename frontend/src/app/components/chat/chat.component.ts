import { Component, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../services/ai.service';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { ChatMessage } from '../../models';

export const SUGGESTED_QUESTIONS = [
  'Why is my net salary lower this month?',
  'How much HRA did I receive?',
  'What deductions were applied this month?',
  'Explain my PF deduction',
  'What is my TDS this month?',
  'How can I reduce my tax this year?',
  'What is the difference between gross and net pay?',
  'What is my year-to-date net pay?',
];

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NavbarComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements AfterViewChecked {
  @ViewChild('messagesEl') messagesEl!: ElementRef<HTMLDivElement>;

  messages   = signal<ChatMessage[]>([]);
  loading    = signal(false);
  dataSource = signal('');
  inputText  = '';
  suggestions = SUGGESTED_QUESTIONS;

  constructor(private aiService: AiService) {}

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  /** Enter sends, Shift+Enter inserts newline */
  onKeydown(event: Event): void {
    const ke = event as KeyboardEvent;
    if (ke.key === 'Enter' && !ke.shiftKey) {
      ke.preventDefault();
      this.sendMessage();
    }
  }

  askQuestion(q: string): void {
    this.inputText = q;
    this.sendMessage();
  }

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || this.loading()) return;

    this.inputText = '';
    this.messages.update((m) => [
      ...m,
      { role: 'user', content: text, timestamp: new Date() },
    ]);
    this.loading.set(true);

    const history = this.messages()
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    this.aiService.chat({ question: text, history }).subscribe({
      next: (res) => {
        this.dataSource.set(res.dataSource);
        this.messages.update((m) => [
          ...m,
          { role: 'assistant', content: res.answer, timestamp: new Date() },
        ]);
        this.loading.set(false);
      },
      error: () => {
        this.messages.update((m) => [
          ...m,
          { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() },
        ]);
        this.loading.set(false);
      },
    });
  }

  formatTime(d?: Date): string {
    if (!d) return '';
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesEl?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* ignore */ }
  }
}
