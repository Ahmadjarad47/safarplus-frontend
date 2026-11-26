import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

export type StatCardTone = 'primary' | 'info' | 'warning' | 'neutral';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-stat-card',
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
