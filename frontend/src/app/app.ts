import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { BoardColumn } from './core/models/board-column.model';
import { Board } from './core/models/board.model';
import { LoginRequest, RegisterRequest } from './core/models/auth.model';
import { CreateProjectRequest, Project } from './core/models/project.model';
import { Task } from './core/models/task.model';
import { AuthSessionService } from './core/services/auth-session.service';
import { BoardApiService } from './core/services/board-api.service';
import { ProjectApiService } from './core/services/project-api.service';
import { TaskApiService } from './core/services/task-api.service';
import { AuthPanelComponent } from './features/auth-panel/auth-panel.component';
import { BoardColumnsComponent, CreateTaskEvent, MoveTaskEvent } from './features/board-columns/board-columns.component';
import { BoardPanelComponent } from './features/board-panel/board-panel.component';
import { ProjectPanelComponent } from './features/project-panel/project-panel.component';
import { UpdateTaskEvent } from './features/task-card/task-card.component';

interface SelectProjectOptions {
  restoreStoredBoard?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, AuthPanelComponent, BoardColumnsComponent, BoardPanelComponent, ProjectPanelComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
})
export class App implements OnInit {
  protected readonly authSession = inject(AuthSessionService);
  private readonly projectApi = inject(ProjectApiService);
  private readonly boardApi = inject(BoardApiService);
  private readonly taskApi = inject(TaskApiService);
  private readonly selectedProjectStorageKey = 'taskforge.selectedProjectId';
  private readonly selectedBoardStorageKey = 'taskforge.selectedBoardId';

  protected readonly projects = signal<Project[]>([]);
  protected readonly boards = signal<Board[]>([]);
  protected readonly columns = signal<BoardColumn[]>([]);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly selectedProject = signal<Project | null>(null);
  protected readonly selectedBoard = signal<Board | null>(null);
  protected readonly loadingProjects = signal(false);
  protected readonly loadingBoards = signal(false);
  protected readonly loadingColumns = signal(false);
  protected readonly loadingTasks = signal(false);
  protected readonly restoringSession = signal(false);
  protected readonly authLoading = signal(false);
  protected readonly savingProject = signal(false);
  protected readonly savingBoard = signal(false);
  protected readonly savingTaskColumnId = signal<string | null>(null);
  protected readonly updatingTaskId = signal<string | null>(null);
  protected readonly movingTaskId = signal<string | null>(null);
  protected readonly deletingTaskId = signal<string | null>(null);
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    this.restoreSession();
  }

  protected login(request: LoginRequest): void {
    this.authLoading.set(true);
    this.errorMessage.set('');

    this.authSession
      .login(request)
      .pipe(finalize(() => this.authLoading.set(false)))
      .subscribe({
        next: () => {
          this.resetDashboardState();
          this.loadProjects();
        },
        error: (error: unknown) => {
          this.setError('Impossible de se connecter.', error);
        },
      });
  }

  protected register(request: RegisterRequest): void {
    this.authLoading.set(true);
    this.errorMessage.set('');

    this.authSession
      .register(request)
      .pipe(finalize(() => this.authLoading.set(false)))
      .subscribe({
        next: () => {
          this.resetDashboardState();
          this.loadProjects();
        },
        error: (error: unknown) => {
          this.setAuthError('Impossible de creer le compte.', error);
        },
      });
  }

  protected logout(): void {
    this.authSession.logout();
    this.resetDashboardState();
    this.errorMessage.set('');
  }

  protected loadProjects(): void {
    if (this.authSession.currentUser() === null) {
      return;
    }

    this.loadingProjects.set(true);
    this.errorMessage.set('');

    this.projectApi
      .listProjects()
      .pipe(finalize(() => this.loadingProjects.set(false)))
      .subscribe({
        next: (projects) => {
          this.projects.set(projects);
          this.restoreStoredProject(projects);
        },
        error: (error: unknown) => {
          this.setError('Impossible de charger les projets.', error);
        },
      });
  }

  protected createProject(request: CreateProjectRequest): void {
    this.savingProject.set(true);
    this.errorMessage.set('');

    this.projectApi
      .createProject(request)
      .pipe(finalize(() => this.savingProject.set(false)))
      .subscribe({
        next: (project) => {
          this.projects.update((projects) => [...projects, project]);
          this.selectProject(project);
        },
        error: (error: unknown) => {
          this.setError('Impossible de creer le projet.', error);
        },
      });
  }

  protected selectProject(project: Project, options: SelectProjectOptions = {}): void {
    localStorage.setItem(this.selectedProjectStorageKey, project.id);
    if (options.restoreStoredBoard !== true) {
      localStorage.removeItem(this.selectedBoardStorageKey);
    }

    this.selectedProject.set(project);
    this.selectedBoard.set(null);
    this.boards.set([]);
    this.columns.set([]);
    this.tasks.set([]);
    this.loadBoards(project.id, options.restoreStoredBoard === true ? localStorage.getItem(this.selectedBoardStorageKey) : null);
  }

  protected createBoard(name: string): void {
    const project = this.selectedProject();
    if (project === null) {
      this.errorMessage.set('Selectionne un projet avant de creer un board.');
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
          this.selectBoard(board);
        },
        error: (error: unknown) => {
          this.setError('Impossible de creer le board.', error);
        },
      });
  }

  protected selectBoard(board: Board): void {
    localStorage.setItem(this.selectedBoardStorageKey, board.id);
    this.selectedBoard.set(board);
    this.columns.set([]);
    this.tasks.set([]);
    this.loadColumns(board.id);
    this.loadTasks(board.id);
  }

  protected createTask(event: CreateTaskEvent): void {
    this.savingTaskColumnId.set(event.columnId);
    this.errorMessage.set('');

    this.taskApi
      .createTask(event.columnId, { title: event.title })
      .pipe(finalize(() => this.savingTaskColumnId.set(null)))
      .subscribe({
        next: (task) => {
          this.tasks.update((tasks) => [...tasks, task]);
        },
        error: (error: unknown) => {
          this.setError('Impossible de creer la tache.', error);
        },
      });
  }

  protected moveTask(event: MoveTaskEvent): void {
    const { task, targetColumnId } = event;
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
          this.reloadSelectedBoardTasks();
        },
        error: (error: unknown) => {
          this.setError('Impossible de deplacer la tache.', error);
        },
      });
  }

  protected updateTask(event: UpdateTaskEvent): void {
    const { task, title, description, priority, dueDate } = event;
    this.updatingTaskId.set(task.id);
    this.errorMessage.set('');

    this.taskApi
      .updateTask(task.id, { title, description, priority, dueDate })
      .pipe(finalize(() => this.updatingTaskId.set(null)))
      .subscribe({
        next: (updatedTask) => {
          this.tasks.update((tasks) => tasks.map((candidate) => (candidate.id === updatedTask.id ? updatedTask : candidate)));
        },
        error: (error: unknown) => {
          this.setError('Impossible de modifier la tache.', error);
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
        },
        error: (error: unknown) => {
          this.setError('Impossible de supprimer la tache.', error);
        },
      });
  }

  private loadBoards(projectId: string, boardIdToRestore: string | null = null): void {
    this.loadingBoards.set(true);
    this.errorMessage.set('');

    this.boardApi
      .listBoards(projectId)
      .pipe(finalize(() => this.loadingBoards.set(false)))
      .subscribe({
        next: (boards) => {
          this.boards.set(boards);
          if (boardIdToRestore !== null) {
            this.restoreStoredBoard(boards, boardIdToRestore);
          }
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

  private restoreSession(): void {
    const hadStoredToken = this.authSession.token() !== null;
    if (!hadStoredToken) {
      return;
    }

    this.restoringSession.set(true);
    this.authSession
      .restoreSession()
      .pipe(finalize(() => this.restoringSession.set(false)))
      .subscribe({
        next: (user) => {
          if (user === null) {
            this.resetDashboardState();
            this.errorMessage.set('Session expiree. Reconnecte-toi.');
            return;
          }

          this.loadProjects();
        },
        error: () => {
          this.authSession.expireSession();
          this.resetDashboardState();
          this.errorMessage.set('Session expiree. Reconnecte-toi.');
        },
      });
  }

  private restoreStoredProject(projects: Project[]): void {
    const projectId = localStorage.getItem(this.selectedProjectStorageKey);
    if (projectId === null) {
      return;
    }

    const project = projects.find((candidate) => candidate.id === projectId);
    if (project === undefined) {
      localStorage.removeItem(this.selectedProjectStorageKey);
      localStorage.removeItem(this.selectedBoardStorageKey);
      return;
    }

    this.selectProject(project, { restoreStoredBoard: true });
  }

  private restoreStoredBoard(boards: Board[], boardId: string): void {
    const board = boards.find((candidate) => candidate.id === boardId);
    if (board === undefined) {
      localStorage.removeItem(this.selectedBoardStorageKey);
      return;
    }

    this.selectBoard(board);
  }

  private tasksForColumn(columnId: string): Task[] {
    return this.tasks().filter((task) => task.columnId === columnId);
  }

  private setError(fallback: string, error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.authSession.expireSession();
      this.resetDashboardState();
      this.errorMessage.set('Session expiree. Reconnecte-toi.');
      return;
    }

    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      this.errorMessage.set(error.error.message);
      return;
    }

    this.errorMessage.set(fallback);
  }

  private setAuthError(fallback: string, error: unknown): void {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      const message = error.error.message;
      if (message === 'Email already registered') {
        this.errorMessage.set('Email deja utilise.');
        return;
      }
      if (message.toLowerCase().includes('password')) {
        this.errorMessage.set('Mot de passe trop court.');
        return;
      }
    }

    this.setError(fallback, error);
  }

  private resetDashboardState(): void {
    this.projects.set([]);
    this.boards.set([]);
    this.columns.set([]);
    this.tasks.set([]);
    this.selectedProject.set(null);
    this.selectedBoard.set(null);
    this.loadingProjects.set(false);
    this.loadingBoards.set(false);
    this.loadingColumns.set(false);
    this.loadingTasks.set(false);
    this.savingProject.set(false);
    this.savingBoard.set(false);
    this.savingTaskColumnId.set(null);
    this.updatingTaskId.set(null);
    this.movingTaskId.set(null);
    this.deletingTaskId.set(null);
    localStorage.removeItem(this.selectedProjectStorageKey);
    localStorage.removeItem(this.selectedBoardStorageKey);
  }
}
