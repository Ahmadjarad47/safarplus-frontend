import { Component, Input } from '@angular/core';

export type StatCardTone = 'primary' | 'info' | 'warning' | 'neutral';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.css'
})
export class StatCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number = '';
  @Input() description = '';
  @Input() suffix = '';
  @Input() iconClass = 'fas fa-chart-simple';
  @Input() tone: StatCardTone = 'primary';
  @Input() highlighted = false;
}
