import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';

import { BoardColumn } from '../../core/models/board-column.model';
import { Board } from '../../core/models/board.model';
import { Task } from '../../core/models/task.model';
import { TaskCardComponent } from '../task-card/task-card.component';

export interface CreateTaskEvent {
  columnId: string;
  title: string;
}

export interface MoveTaskEvent {
  task: Task;
  targetColumnId: string;
}

@Component({
  selector: 'app-board-columns',
  imports: [CommonModule, TaskCardComponent],
  templateUrl: './board-columns.component.html',
})
export class BoardColumnsComponent implements OnChanges {
  @Input() selectedBoard: Board | null = null;
  @Input({ required: true }) columns: BoardColumn[] = [];
  @Input({ required: true }) tasks: Task[] = [];
  @Input() loadingColumns = false;
  @Input() loadingTasks = false;
  @Input() savingTaskColumnId: string | null = null;
  @Input() movingTaskId: string | null = null;
  @Input() deletingTaskId: string | null = null;

  @Output() taskCreate = new EventEmitter<CreateTaskEvent>();
  @Output() taskMove = new EventEmitter<MoveTaskEvent>();
  @Output() taskDelete = new EventEmitter<Task>();

  protected newTaskTitles: Record<string, string> = {};
  protected taskMoveTargets: Record<string, string> = {};

  ngOnChanges(): void {
    this.taskMoveTargets = Object.fromEntries(this.tasks.map((task) => [task.id, task.columnId]));
  }

  protected tasksForColumn(columnId: string): Task[] {
    return this.tasks
      .filter((task) => task.columnId === columnId)
      .sort((first, second) => first.position - second.position);
  }

  protected updateNewTaskTitle(columnId: string, event: Event): void {
    this.newTaskTitles = {
      ...this.newTaskTitles,
      [columnId]: (event.target as HTMLInputElement).value,
    };
  }

  protected submitTask(columnId: string, input: HTMLInputElement): void {
    const title = input.value.trim();
    if (title.length === 0) {
      return;
    }

    this.taskCreate.emit({ columnId, title });
    this.newTaskTitles = {
      ...this.newTaskTitles,
      [columnId]: '',
    };
    input.value = '';
  }

  protected setTaskMoveTarget(taskId: string, columnId: string): void {
    this.taskMoveTargets = {
      ...this.taskMoveTargets,
      [taskId]: columnId,
    };
  }

  protected emitMove(task: Task): void {
    this.taskMove.emit({
      task,
      targetColumnId: this.taskMoveTargets[task.id] ?? task.columnId,
    });
  }
}
