import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { BoardColumn } from '../../core/models/board-column.model';
import { Task } from '../../core/models/task.model';

@Component({
  selector: 'app-task-card',
  imports: [CommonModule],
  templateUrl: './task-card.component.html',
})
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;
  @Input({ required: true }) columns: BoardColumn[] = [];
  @Input({ required: true }) targetColumnId = '';
  @Input() moving = false;
  @Input() deleting = false;

  @Output() targetColumnChange = new EventEmitter<string>();
  @Output() taskMove = new EventEmitter<Task>();
  @Output() taskDelete = new EventEmitter<Task>();
}
