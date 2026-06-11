import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

describe('App', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpTesting.expectOne('/api/projects').flush([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Projets et boards');
  });

  it('should load projects on startup and hide loading state after response', () => {
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Chargement...');

    const request = httpTesting.expectOne('/api/projects');
    expect(request.request.method).toBe('GET');

    request.flush([
      {
        id: 'project-1',
        name: 'Projet Alpha',
        description: 'Premier projet',
        ownerId: 'owner-1',
        createdAt: '2026-06-11T09:00:00Z',
        updatedAt: '2026-06-11T09:00:00Z',
      },
    ]);
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Projet Alpha');
    expect(compiled.textContent).not.toContain('Chargement...');
  });

  it('should create a project from the form and display it after response', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpTesting.expectOne('/api/projects').flush([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const form = compiled.querySelector<HTMLFormElement>('.stacked-form');
    const input = compiled.querySelector<HTMLInputElement>('#project-name');
    const submitButton = compiled.querySelector<HTMLButtonElement>('.stacked-form button[type="submit"]');

    expect(form).toBeTruthy();
    expect(input).toBeTruthy();
    expect(submitButton).toBeTruthy();

    input!.value = 'Projet Beta';
    input!.dispatchEvent(new Event('input'));
    submitButton!.click();

    const postRequest = httpTesting.expectOne('/api/projects');
    expect(postRequest.request.method).toBe('POST');
    expect(postRequest.request.body).toEqual({
      name: 'Projet Beta',
      description: null,
    });

    postRequest.flush({
      id: 'project-2',
      name: 'Projet Beta',
      description: null,
      ownerId: 'owner-1',
      createdAt: '2026-06-11T09:10:00Z',
      updatedAt: '2026-06-11T09:10:00Z',
    });

    const boardsRequest = httpTesting.expectOne('/api/projects/project-2/boards');
    expect(boardsRequest.request.method).toBe('GET');
    boardsRequest.flush([]);
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Projet Beta');
    expect(compiled.textContent).not.toContain('Creation...');
    expect(input!.value).toBe('');
  });

  it('should create a board after selecting a project and display it after response', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpTesting.expectOne('/api/projects').flush([
      {
        id: 'project-1',
        name: 'Projet Alpha',
        description: null,
        ownerId: 'owner-1',
        createdAt: '2026-06-11T09:00:00Z',
        updatedAt: '2026-06-11T09:00:00Z',
      },
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const projectButton = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.list-item'))
      .find((button) => button.textContent?.includes('Projet Alpha'));
    expect(projectButton).toBeTruthy();
    projectButton!.click();

    httpTesting.expectOne('/api/projects/project-1/boards').flush([]);
    fixture.detectChanges();

    const input = compiled.querySelector<HTMLInputElement>('#board-name');
    const form = compiled.querySelector<HTMLFormElement>('.inline-form');
    const submitButton = compiled.querySelector<HTMLButtonElement>('.inline-form button[type="submit"]');

    expect(form).toBeTruthy();
    expect(input).toBeTruthy();
    expect(submitButton).toBeTruthy();

    input!.value = 'Board Produit';
    input!.dispatchEvent(new Event('input'));
    submitButton!.click();

    const postRequest = httpTesting.expectOne('/api/projects/project-1/boards');
    expect(postRequest.request.method).toBe('POST');
    expect(postRequest.request.body).toEqual({ name: 'Board Produit' });

    postRequest.flush({
      id: 'board-1',
      name: 'Board Produit',
      projectId: 'project-1',
      columns: [
        {
          id: 'column-1',
          name: 'Todo',
          position: 0,
          createdAt: '2026-06-11T09:20:00Z',
          updatedAt: '2026-06-11T09:20:00Z',
        },
      ],
      createdAt: '2026-06-11T09:20:00Z',
      updatedAt: '2026-06-11T09:20:00Z',
    });

    const columnsRequest = httpTesting.expectOne('/api/boards/board-1/columns');
    expect(columnsRequest.request.method).toBe('GET');
    columnsRequest.flush([
      {
        id: 'column-1',
        name: 'Todo',
        position: 0,
        createdAt: '2026-06-11T09:20:00Z',
        updatedAt: '2026-06-11T09:20:00Z',
      },
    ]);
    const tasksRequest = httpTesting.expectOne('/api/boards/board-1/tasks');
    expect(tasksRequest.request.method).toBe('GET');
    tasksRequest.flush([]);
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Board Produit');
    expect(compiled.textContent).toContain('Todo');
    expect(compiled.textContent).not.toContain('Creation...');
    expect(input!.value).toBe('');
  });

  it('should display board tasks and create a task in a column', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpTesting.expectOne('/api/projects').flush([
      {
        id: 'project-1',
        name: 'Projet Alpha',
        description: null,
        ownerId: 'owner-1',
        createdAt: '2026-06-11T09:00:00Z',
        updatedAt: '2026-06-11T09:00:00Z',
      },
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const projectButton = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.list-item'))
      .find((button) => button.textContent?.includes('Projet Alpha'));
    expect(projectButton).toBeTruthy();
    projectButton!.click();

    httpTesting.expectOne('/api/projects/project-1/boards').flush([
      {
        id: 'board-1',
        name: 'Board Produit',
        projectId: 'project-1',
        columns: [
          {
            id: 'column-1',
            name: 'Todo',
            position: 0,
            createdAt: '2026-06-11T09:20:00Z',
            updatedAt: '2026-06-11T09:20:00Z',
          },
        ],
        createdAt: '2026-06-11T09:20:00Z',
        updatedAt: '2026-06-11T09:20:00Z',
      },
    ]);
    fixture.detectChanges();

    const boardButton = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.list-item'))
      .find((button) => button.textContent?.includes('Board Produit'));
    expect(boardButton).toBeTruthy();
    boardButton!.click();

    httpTesting.expectOne('/api/boards/board-1/columns').flush([
      {
        id: 'column-1',
        name: 'Todo',
        position: 0,
        createdAt: '2026-06-11T09:20:00Z',
        updatedAt: '2026-06-11T09:20:00Z',
      },
    ]);
    httpTesting.expectOne('/api/boards/board-1/tasks').flush([
      {
        id: 'task-1',
        title: 'Task existante',
        description: 'Avec description',
        priority: 'HIGH',
        dueDate: '2026-12-24',
        position: 0,
        boardId: 'board-1',
        columnId: 'column-1',
        assigneeId: null,
        createdAt: '2026-06-11T09:30:00Z',
        updatedAt: '2026-06-11T09:30:00Z',
      },
    ]);
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Task existante');
    expect(compiled.textContent).toContain('Avec description');
    expect(compiled.textContent).toContain('HIGH');
    expect(compiled.textContent).toContain('2026-12-24');

    const taskInput = compiled.querySelector<HTMLInputElement>('.task-form input');
    const taskButton = compiled.querySelector<HTMLButtonElement>('.task-form button[type="submit"]');
    expect(taskInput).toBeTruthy();
    expect(taskButton).toBeTruthy();

    taskInput!.value = 'Nouvelle tache';
    taskInput!.dispatchEvent(new Event('input'));
    taskButton!.click();

    const postRequest = httpTesting.expectOne('/api/board-columns/column-1/tasks');
    expect(postRequest.request.method).toBe('POST');
    expect(postRequest.request.body).toEqual({ title: 'Nouvelle tache' });

    postRequest.flush({
      id: 'task-2',
      title: 'Nouvelle tache',
      description: null,
      priority: 'MEDIUM',
      dueDate: null,
      position: 1,
      boardId: 'board-1',
      columnId: 'column-1',
      assigneeId: null,
      createdAt: '2026-06-11T09:31:00Z',
      updatedAt: '2026-06-11T09:31:00Z',
    });
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Nouvelle tache');
    expect(taskInput!.value).toBe('');

    const existingTaskCard = Array.from(compiled.querySelectorAll<HTMLElement>('.task-card'))
      .find((card) => card.textContent?.includes('Task existante'));
    expect(existingTaskCard).toBeTruthy();
    existingTaskCard!.querySelector<HTMLButtonElement>('.danger-button')!.click();

    const deleteRequest = httpTesting.expectOne('/api/tasks/task-1');
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush(null);
    fixture.detectChanges();

    expect(compiled.textContent).not.toContain('Task existante');
  });

  it('should sync the move select with the task current column after moving', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpTesting.expectOne('/api/projects').flush([
      {
        id: 'project-1',
        name: 'Projet Alpha',
        description: null,
        ownerId: 'owner-1',
        createdAt: '2026-06-11T09:00:00Z',
        updatedAt: '2026-06-11T09:00:00Z',
      },
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    Array.from(compiled.querySelectorAll<HTMLButtonElement>('.list-item'))
      .find((button) => button.textContent?.includes('Projet Alpha'))!
      .click();

    httpTesting.expectOne('/api/projects/project-1/boards').flush([
      {
        id: 'board-1',
        name: 'Board Produit',
        projectId: 'project-1',
        columns: [
          {
            id: 'todo',
            name: 'Todo',
            position: 0,
            createdAt: '2026-06-11T09:20:00Z',
            updatedAt: '2026-06-11T09:20:00Z',
          },
          {
            id: 'in-progress',
            name: 'In Progress',
            position: 1,
            createdAt: '2026-06-11T09:20:00Z',
            updatedAt: '2026-06-11T09:20:00Z',
          },
        ],
        createdAt: '2026-06-11T09:20:00Z',
        updatedAt: '2026-06-11T09:20:00Z',
      },
    ]);
    fixture.detectChanges();

    Array.from(compiled.querySelectorAll<HTMLButtonElement>('.list-item'))
      .find((button) => button.textContent?.includes('Board Produit'))!
      .click();

    const columns = [
      {
        id: 'todo',
        name: 'Todo',
        position: 0,
        createdAt: '2026-06-11T09:20:00Z',
        updatedAt: '2026-06-11T09:20:00Z',
      },
      {
        id: 'in-progress',
        name: 'In Progress',
        position: 1,
        createdAt: '2026-06-11T09:20:00Z',
        updatedAt: '2026-06-11T09:20:00Z',
      },
    ];
    const todoTask = {
      id: 'task-1',
      title: 'Task mobile',
      description: null,
      priority: 'MEDIUM',
      dueDate: null,
      position: 0,
      boardId: 'board-1',
      columnId: 'todo',
      assigneeId: null,
      createdAt: '2026-06-11T09:30:00Z',
      updatedAt: '2026-06-11T09:30:00Z',
    };
    const movedTask = {
      ...todoTask,
      columnId: 'in-progress',
      position: 0,
      updatedAt: '2026-06-11T09:31:00Z',
    };

    httpTesting.expectOne('/api/boards/board-1/columns').flush(columns);
    httpTesting.expectOne('/api/boards/board-1/tasks').flush([todoTask]);
    fixture.detectChanges();

    const select = compiled.querySelector<HTMLSelectElement>('.task-actions select');
    expect(select).toBeTruthy();
    expect(select!.value).toBe('todo');

    select!.value = 'in-progress';
    select!.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    compiled.querySelector<HTMLButtonElement>('.task-actions .secondary-button')!.click();

    const moveRequest = httpTesting.expectOne('/api/tasks/task-1/move');
    expect(moveRequest.request.method).toBe('PATCH');
    expect(moveRequest.request.body).toEqual({
      columnId: 'in-progress',
      position: 0,
    });
    moveRequest.flush(movedTask);
    httpTesting.expectOne('/api/boards/board-1/tasks').flush([movedTask]);
    fixture.detectChanges();

    const syncedSelect = compiled.querySelector<HTMLSelectElement>('.task-actions select');
    expect(syncedSelect).toBeTruthy();
    expect(syncedSelect!.value).toBe('in-progress');
  });
});
