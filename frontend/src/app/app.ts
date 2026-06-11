import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { BoardColumn } from './core/models/board-column.model';
import { Board } from './core/models/board.model';
import { Project } from './core/models/project.model';
import { Task } from './core/models/task.model';
import { BoardApiService } from './core/services/board-api.service';
import { ProjectApiService } from './core/services/project-api.service';
import { TaskApiService } from './core/services/task-api.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly projectApi = inject(ProjectApiService);
  private readonly boardApi = inject(BoardApiService);
  private readonly taskApi = inject(TaskApiService);

  protected readonly projectName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(160)],
  });
  protected readonly projectDescription = new FormControl('', { nonNullable: true });
  protected readonly boardName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(160)],
  });

  protected readonly projects = signal<Project[]>([]);
  protected readonly boards = signal<Board[]>([]);
  protected readonly columns = signal<BoardColumn[]>([]);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly newTaskTitles = signal<Record<string, string>>({});
  protected readonly taskMoveTargets = signal<Record<string, string>>({});
  protected readonly selectedProject = signal<Project | null>(null);
  protected readonly selectedBoard = signal<Board | null>(null);
  protected readonly loadingProjects = signal(false);
  protected readonly loadingBoards = signal(false);
  protected readonly loadingColumns = signal(false);
  protected readonly loadingTasks = signal(false);
  protected readonly savingProject = signal(false);
  protected readonly savingBoard = signal(false);
  protected readonly savingTaskColumnId = signal<string | null>(null);
  protected readonly movingTaskId = signal<string | null>(null);
  protected readonly deletingTaskId = signal<string | null>(null);
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    this.loadProjects();
  }

  protected loadProjects(): void {
    this.loadingProjects.set(true);
    this.errorMessage.set('');

    this.projectApi
      .listProjects()
      .pipe(finalize(() => this.loadingProjects.set(false)))
      .subscribe({
        next: (projects) => {
          this.projects.set(projects);
        },
        error: (error: unknown) => {
          this.setError('Impossible de charger les projets.', error);
        },
      });
  }

  protected createProject(): void {
    const name = this.projectName.value.trim();
    if (this.projectName.invalid || name.length === 0) {
      this.projectName.markAsTouched();
      return;
    }

    this.savingProject.set(true);
    this.errorMessage.set('');
    const description = this.projectDescription.value.trim();

    this.projectApi
      .createProject({
        name,
        description: description.length > 0 ? description : null,
      })
      .pipe(finalize(() => this.savingProject.set(false)))
      .subscribe({
        next: (project) => {
          this.projects.update((projects) => [...projects, project]);
          this.projectName.reset('');
          this.projectDescription.reset('');
          this.selectProject(project);
        },
        error: (error: unknown) => {
          this.setError('Impossible de creer le projet.', error);
        },
      });
  }

  protected selectProject(project: Project): void {
    this.selectedProject.set(project);
    this.selectedBoard.set(null);
    this.boards.set([]);
    this.columns.set([]);
    this.tasks.set([]);
    this.boardName.reset('');
    this.loadBoards(project.id);
  }

  protected createBoard(): void {
    const project = this.selectedProject();
    const name = this.boardName.value.trim();
    if (project === null) {
      this.errorMessage.set('Selectionne un projet avant de creer un board.');
      return;
    }
    if (this.boardName.invalid || name.length === 0) {
      this.boardName.markAsTouched();
      return;
    }

    this.savingBoard.set(true);
    this.errorMessage.set('');

    this.boardApi
      .createBoard(project.id, { name })
      .pipe(finalize(() => this.savingBoard.set(false)))
      .subscribe({
        next: (board) => {
          this.boards.update((boards) => [...boards, board]);
          this.boardName.reset('');
          this.selectBoard(board);
        },
        error: (error: unknown) => {
          this.setError('Impossible de creer le board.', error);
        },
      });
  }

  protected selectBoard(board: Board): void {
    this.selectedBoard.set(board);
    this.columns.set([]);
    this.tasks.set([]);
    this.loadColumns(board.id);
    this.loadTasks(board.id);
  }

  protected tasksForColumn(columnId: string): Task[] {
    return this.tasks()
      .filter((task) => task.columnId === columnId)
      .sort((first, second) => first.position - second.position);
  }

  protected updateNewTaskTitle(columnId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newTaskTitles.update((titles) => ({
      ...titles,
      [columnId]: input.value,
    }));
  }

  protected createTask(columnId: string, input: HTMLInputElement): void {
    const title = input.value.trim();
    if (title.length === 0) {
      return;
    }

    this.savingTaskColumnId.set(columnId);
    this.errorMessage.set('');

    this.taskApi
      .createTask(columnId, { title })
      .pipe(finalize(() => this.savingTaskColumnId.set(null)))
      .subscribe({
        next: (task) => {
          this.tasks.update((tasks) => [...tasks, task]);
          this.taskMoveTargets.update((targets) => ({
            ...targets,
            [task.id]: task.columnId,
          }));
          input.value = '';
          this.newTaskTitles.update((titles) => ({
            ...titles,
            [columnId]: '',
          }));
        },
        error: (error: unknown) => {
          this.setError('Impossible de creer la tache.', error);
        },
      });
  }

  protected updateTaskMoveTarget(taskId: string, event: Event): void {
    this.taskMoveTargets.update((targets) => ({
      ...targets,
      [taskId]: (event.target as HTMLSelectElement).value,
    }));
  }

  protected moveTask(task: Task): void {
    const targetColumnId = this.taskMoveTargets()[task.id] ?? task.columnId;
    if (targetColumnId === task.columnId) {
      return;
    }

    this.movingTaskId.set(task.id);
    this.errorMessage.set('');

    this.taskApi
      .moveTask(task.id, { columnId: targetColumnId, position: this.tasksForColumn(targetColumnId).length })
      .pipe(finalize(() => this.movingTaskId.set(null)))
      .subscribe({
        next: (movedTask) => {
          this.tasks.update((tasks) => tasks.map((candidate) => (candidate.id === movedTask.id ? movedTask : candidate)));
          this.taskMoveTargets.update((targets) => ({
            ...targets,
            [movedTask.id]: movedTask.columnId,
          }));
          this.reloadSelectedBoardTasks();
        },
        error: (error: unknown) => {
          this.setError('Impossible de deplacer la tache.', error);
        },
      });
  }

  protected deleteTask(task: Task): void {
    this.deletingTaskId.set(task.id);
    this.errorMessage.set('');

    this.taskApi
      .deleteTask(task.id)
      .pipe(finalize(() => this.deletingTaskId.set(null)))
      .subscribe({
        next: () => {
          this.tasks.update((tasks) => tasks.filter((candidate) => candidate.id !== task.id));
          this.taskMoveTargets.update((targets) => {
            const nextTargets = { ...targets };
            delete nextTargets[task.id];
            return nextTargets;
          });
        },
        error: (error: unknown) => {
          this.setError('Impossible de supprimer la tache.', error);
        },
      });
  }

  private loadBoards(projectId: string): void {
    this.loadingBoards.set(true);
    this.errorMessage.set('');

    this.boardApi
      .listBoards(projectId)
      .pipe(finalize(() => this.loadingBoards.set(false)))
      .subscribe({
        next: (boards) => {
          this.boards.set(boards);
        },
        error: (error: unknown) => {
          this.setError('Impossible de charger les boards.', error);
        },
      });
  }

  private loadColumns(boardId: string): void {
    this.loadingColumns.set(true);
    this.errorMessage.set('');

    this.boardApi
      .listColumns(boardId)
      .pipe(finalize(() => this.loadingColumns.set(false)))
      .subscribe({
        next: (columns) => {
          this.columns.set(columns);
        },
        error: (error: unknown) => {
          this.setError('Impossible de charger les colonnes.', error);
        },
      });
  }

  private loadTasks(boardId: string): void {
    this.loadingTasks.set(true);
    this.errorMessage.set('');

    this.taskApi
      .listBoardTasks(boardId)
      .pipe(finalize(() => this.loadingTasks.set(false)))
      .subscribe({
        next: (tasks) => {
          this.tasks.set(tasks);
          this.syncTaskMoveTargets(tasks);
        },
        error: (error: unknown) => {
          this.setError('Impossible de charger les taches.', error);
        },
      });
  }

  private reloadSelectedBoardTasks(): void {
    const board = this.selectedBoard();
    if (board !== null) {
      this.loadTasks(board.id);
    }
  }

  private syncTaskMoveTargets(tasks: Task[]): void {
    this.taskMoveTargets.set(Object.fromEntries(tasks.map((task) => [task.id, task.columnId])));
  }

  private setError(fallback: string, error: unknown): void {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      this.errorMessage.set(error.error.message);
      return;
    }

    this.errorMessage.set(fallback);
  }
}
