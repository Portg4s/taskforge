import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { BoardColumn } from './core/models/board-column.model';
import { Board } from './core/models/board.model';
import { Project } from './core/models/project.model';
import { BoardApiService } from './core/services/board-api.service';
import { ProjectApiService } from './core/services/project-api.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly projectApi = inject(ProjectApiService);
  private readonly boardApi = inject(BoardApiService);

  protected readonly projectName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(160)],
  });
  protected readonly projectDescription = new FormControl('', { nonNullable: true });
  protected readonly boardName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(160)],
  });

  protected projects: Project[] = [];
  protected boards: Board[] = [];
  protected columns: BoardColumn[] = [];
  protected selectedProject: Project | null = null;
  protected selectedBoard: Board | null = null;
  protected loadingProjects = false;
  protected loadingBoards = false;
  protected loadingColumns = false;
  protected savingProject = false;
  protected savingBoard = false;
  protected errorMessage = '';

  ngOnInit(): void {
    this.loadProjects();
  }

  protected loadProjects(): void {
    this.loadingProjects = true;
    this.errorMessage = '';

    this.projectApi.listProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loadingProjects = false;
      },
      error: (error: unknown) => {
        this.loadingProjects = false;
        this.setError('Impossible de charger les projets.', error);
      },
    });
  }

  protected createProject(): void {
    if (this.projectName.invalid) {
      this.projectName.markAsTouched();
      return;
    }

    this.savingProject = true;
    this.errorMessage = '';
    const description = this.projectDescription.value.trim();

    this.projectApi
      .createProject({
        name: this.projectName.value.trim(),
        description: description.length > 0 ? description : null,
      })
      .subscribe({
        next: (project) => {
          this.projects = [...this.projects, project];
          this.projectName.reset('');
          this.projectDescription.reset('');
          this.savingProject = false;
          this.selectProject(project);
        },
        error: (error: unknown) => {
          this.savingProject = false;
          this.setError('Impossible de créer le projet.', error);
        },
      });
  }

  protected selectProject(project: Project): void {
    this.selectedProject = project;
    this.selectedBoard = null;
    this.boards = [];
    this.columns = [];
    this.boardName.reset('');
    this.loadBoards(project.id);
  }

  protected createBoard(): void {
    if (this.selectedProject === null) {
      this.errorMessage = 'Sélectionne un projet avant de créer un board.';
      return;
    }
    if (this.boardName.invalid) {
      this.boardName.markAsTouched();
      return;
    }

    this.savingBoard = true;
    this.errorMessage = '';

    this.boardApi
      .createBoard(this.selectedProject.id, {
        name: this.boardName.value.trim(),
      })
      .subscribe({
        next: (board) => {
          this.boards = [...this.boards, board];
          this.boardName.reset('');
          this.savingBoard = false;
          this.selectBoard(board);
        },
        error: (error: unknown) => {
          this.savingBoard = false;
          this.setError('Impossible de créer le board.', error);
        },
      });
  }

  protected selectBoard(board: Board): void {
    this.selectedBoard = board;
    this.columns = [];
    this.loadColumns(board.id);
  }

  private loadBoards(projectId: string): void {
    this.loadingBoards = true;
    this.errorMessage = '';

    this.boardApi.listBoards(projectId).subscribe({
      next: (boards) => {
        this.boards = boards;
        this.loadingBoards = false;
      },
      error: (error: unknown) => {
        this.loadingBoards = false;
        this.setError('Impossible de charger les boards.', error);
      },
    });
  }

  private loadColumns(boardId: string): void {
    this.loadingColumns = true;
    this.errorMessage = '';

    this.boardApi.listColumns(boardId).subscribe({
      next: (columns) => {
        this.columns = columns;
        this.loadingColumns = false;
      },
      error: (error: unknown) => {
        this.loadingColumns = false;
        this.setError('Impossible de charger les colonnes.', error);
      },
    });
  }

  private setError(fallback: string, error: unknown): void {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      this.errorMessage = error.error.message;
      return;
    }

    this.errorMessage = fallback;
  }
}
