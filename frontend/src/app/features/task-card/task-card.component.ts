import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { BoardColumn } from '../../core/models/board-column.model';
import { Task, TaskPriority } from '../../core/models/task.model';

export interface UpdateTaskEvent {
  task: Task;
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueDate: string | null;
}

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
  @Input() updating = false;

  @Output() targetColumnChange = new EventEmitter<string>();
  @Output() taskMove = new EventEmitter<Task>();
  @Output() taskDelete = new EventEmitter<Task>();
  @Output() taskUpdate = new EventEmitter<UpdateTaskEvent>();

  protected readonly priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
  protected editing = false;
  protected editTitle = '';
  protected editDescription = '';
  protected editPriority: TaskPriority = 'MEDIUM';
  protected editDueDate = '';
  private pendingUpdate = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] && this.pendingUpdate) {
      this.stopEditing();
      return;
    }

    if (changes['task'] && !this.editing) {
      this.resetEditFields();
    }
  }

  protected startEditing(): void {
    this.resetEditFields();
    this.editing = true;
  }

  protected cancelEditing(): void {
    this.stopEditing();
  }

  protected updateTitle(event: Event): void {
    this.editTitle = (event.target as HTMLInputElement).value;
  }

  protected updateDescription(event: Event): void {
    this.editDescription = (event.target as HTMLTextAreaElement).value;
  }

  protected updatePriority(event: Event): void {
    this.editPriority = (event.target as HTMLSelectElement).value as TaskPriority;
  }

  protected updateDueDate(event: Event): void {
    this.editDueDate = (event.target as HTMLInputElement).value;
  }

  protected submitEdit(): void {
    const title = this.editTitle.trim();
    if (title.length === 0) {
      return;
    }

    this.pendingUpdate = true;
    this.taskUpdate.emit({
      task: this.task,
      title,
      description: this.editDescription.trim() || null,
      priority: this.editPriority,
      dueDate: this.editDueDate || null,
    });
  }

  private resetEditFields(): void {
    this.editTitle = this.task.title;
    this.editDescription = this.task.description ?? '';
    this.editPriority = this.task.priority;
    this.editDueDate = this.task.dueDate ?? '';
  }

  private stopEditing(): void {
    this.pendingUpdate = false;
    this.editing = false;
    this.resetEditFields();
  }
}
