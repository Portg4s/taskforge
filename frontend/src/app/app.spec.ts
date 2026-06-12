import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

const selectedProjectStorageKey = 'taskforge.selectedProjectId';
const selectedBoardStorageKey = 'taskforge.selectedBoardId';

function buildProject(id = 'project-1', name = 'Projet Alpha') {
  return {
    id,
    name,
    description: null,
    ownerId: 'owner-1',
    createdAt: '2026-06-11T09:00:00Z',
    updatedAt: '2026-06-11T09:00:00Z',
  };
}

function buildBoard(id = 'board-1', projectId = 'project-1', name = 'Board Produit') {
  return {
    id,
    name,
    projectId,
    columns: [],
    createdAt: '2026-06-11T09:20:00Z',
    updatedAt: '2026-06-11T09:20:00Z',
  };
}

function buildColumn(id = 'column-1', name = 'Todo') {
  return {
    id,
    name,
    position: 0,
    createdAt: '2026-06-11T09:20:00Z',
    updatedAt: '2026-06-11T09:20:00Z',
  };
}

function buildTask(id = 'task-1', title = 'Task existante') {
  return {
    id,
    title,
    description: 'Avec description',
    priority: 'HIGH' as const,
    dueDate: '2026-12-24',
    position: 0,
    boardId: 'board-1',
    columnId: 'column-1',
    assigneeId: null,
    createdAt: '2026-06-11T09:30:00Z',
    updatedAt: '2026-06-11T09:30:00Z',
  };
}

describe('App', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();

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
    localStorage.clear();
  });

  function openBoardWithTask(task = buildTask()) {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpTesting.expectOne('/api/projects').flush([buildProject()]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    Array.from(compiled.querySelectorAll<HTMLButtonElement>('.list-item'))
      .find((button) => button.textContent?.includes('Projet Alpha'))!
      .click();

    httpTesting.expectOne('/api/projects/project-1/boards').flush([buildBoard()]);
    fixture.detectChanges();

    Array.from(compiled.querySelectorAll<HTMLButtonElement>('.list-item'))
      .find((button) => button.textContent?.includes('Board Produit'))!
      .click();

    httpTesting.expectOne('/api/boards/board-1/columns').flush([buildColumn()]);
    httpTesting.expectOne('/api/boards/board-1/tasks').flush([task]);
    fixture.detectChanges();

    return { fixture, compiled };
  }

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

    expect(localStorage.getItem(selectedProjectStorageKey)).toBe('project-2');
    expect(localStorage.getItem(selectedBoardStorageKey)).toBeNull();
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

    expect(localStorage.getItem(selectedProjectStorageKey)).toBe('project-1');
    expect(localStorage.getItem(selectedBoardStorageKey)).toBe('board-1');
    expect(compiled.textContent).toContain('Board Produit');
    expect(compiled.textContent).toContain('Todo');
    expect(compiled.textContent).not.toContain('Creation...');
    expect(input!.value).toBe('');
  });

  it('should restore an existing selected project from localStorage on startup', () => {
    localStorage.setItem(selectedProjectStorageKey, 'project-1');
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();

    httpTesting.expectOne('/api/projects').flush([
      buildProject('project-1', 'Projet Alpha'),
      buildProject('project-2', 'Projet Beta'),
    ]);

    const boardsRequest = httpTesting.expectOne('/api/projects/project-1/boards');
    expect(boardsRequest.request.method).toBe('GET');
    boardsRequest.flush([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Projet Alpha');
    expect(localStorage.getItem(selectedProjectStorageKey)).toBe('project-1');
  });

  it('should restore an existing selected board from localStorage after loading boards', () => {
    localStorage.setItem(selectedProjectStorageKey, 'project-1');
    localStorage.setItem(selectedBoardStorageKey, 'board-2');
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();

    httpTesting.expectOne('/api/projects').flush([buildProject()]);
    httpTesting.expectOne('/api/projects/project-1/boards').flush([
      buildBoard('board-1', 'project-1', 'Board Produit'),
      buildBoard('board-2', 'project-1', 'Board Technique'),
    ]);

    const columnsRequest = httpTesting.expectOne('/api/boards/board-2/columns');
    expect(columnsRequest.request.method).toBe('GET');
    columnsRequest.flush([buildColumn()]);

    const tasksRequest = httpTesting.expectOne('/api/boards/board-2/tasks');
    expect(tasksRequest.request.method).toBe('GET');
    tasksRequest.flush([]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Board Technique');
    expect(compiled.textContent).toContain('Todo');
    expect(localStorage.getItem(selectedProjectStorageKey)).toBe('project-1');
    expect(localStorage.getItem(selectedBoardStorageKey)).toBe('board-2');
  });

  it('should clean stale stored selection ids without displaying an error', () => {
    localStorage.setItem(selectedProjectStorageKey, 'missing-project');
    localStorage.setItem(selectedBoardStorageKey, 'missing-board');
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();

    httpTesting.expectOne('/api/projects').flush([buildProject()]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-message')).toBeNull();
    expect(localStorage.getItem(selectedProjectStorageKey)).toBeNull();
    expect(localStorage.getItem(selectedBoardStorageKey)).toBeNull();
  });

  it('should clean a stale stored board id after restoring its project', () => {
    localStorage.setItem(selectedProjectStorageKey, 'project-1');
    localStorage.setItem(selectedBoardStorageKey, 'missing-board');
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();

    httpTesting.expectOne('/api/projects').flush([buildProject()]);
    httpTesting.expectOne('/api/projects/project-1/boards').flush([buildBoard()]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.error-message')).toBeNull();
    expect(localStorage.getItem(selectedProjectStorageKey)).toBe('project-1');
    expect(localStorage.getItem(selectedBoardStorageKey)).toBeNull();
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

  it('should switch a task to edit mode when clicking Modifier', () => {
    const { fixture, compiled } = openBoardWithTask();

    const taskCard = compiled.querySelector<HTMLElement>('.task-card');
    expect(taskCard).toBeTruthy();

    Array.from(taskCard!.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Modifier'))!
      .click();
    fixture.detectChanges();

    expect(taskCard!.querySelector('.task-edit-form')).toBeTruthy();
    expect(taskCard!.textContent).toContain('Enregistrer');
    expect(taskCard!.textContent).toContain('Annuler');
    expect(taskCard!.querySelector<HTMLInputElement>('input[type="text"]')!.value).toBe('Task existante');
    expect(taskCard!.querySelector<HTMLTextAreaElement>('textarea')!.value).toBe('Avec description');
    expect(taskCard!.querySelector<HTMLSelectElement>('.task-edit-form select')!.value).toBe('HIGH');
    expect(taskCard!.querySelector<HTMLInputElement>('input[type="date"]')!.value).toBe('2026-12-24');
  });

  it('should cancel task editing without sending a PATCH request', () => {
    const { fixture, compiled } = openBoardWithTask();
    const taskCard = compiled.querySelector<HTMLElement>('.task-card')!;

    Array.from(taskCard.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Modifier'))!
      .click();
    fixture.detectChanges();

    const titleInput = taskCard.querySelector<HTMLInputElement>('input[type="text"]')!;
    titleInput.value = 'Titre ignore';
    titleInput.dispatchEvent(new Event('input'));

    Array.from(taskCard.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Annuler'))!
      .click();
    fixture.detectChanges();

    httpTesting.expectNone('/api/tasks/task-1');
    expect(taskCard.querySelector('.task-edit-form')).toBeNull();
    expect(taskCard.textContent).toContain('Task existante');
    expect(taskCard.textContent).not.toContain('Titre ignore');
  });

  it('should update a task and display the backend response', () => {
    const { fixture, compiled } = openBoardWithTask();
    const taskCard = compiled.querySelector<HTMLElement>('.task-card')!;

    Array.from(taskCard.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Modifier'))!
      .click();
    fixture.detectChanges();

    const titleInput = taskCard.querySelector<HTMLInputElement>('input[type="text"]')!;
    const descriptionInput = taskCard.querySelector<HTMLTextAreaElement>('textarea')!;
    const prioritySelect = taskCard.querySelector<HTMLSelectElement>('.task-edit-form select')!;
    const dueDateInput = taskCard.querySelector<HTMLInputElement>('input[type="date"]')!;

    titleInput.value = 'Task modifiee';
    titleInput.dispatchEvent(new Event('input'));
    descriptionInput.value = 'Description modifiee';
    descriptionInput.dispatchEvent(new Event('input'));
    prioritySelect.value = 'LOW';
    prioritySelect.dispatchEvent(new Event('change'));
    dueDateInput.value = '2027-01-15';
    dueDateInput.dispatchEvent(new Event('input'));

    taskCard.querySelector<HTMLButtonElement>('.task-edit-form button[type="submit"]')!.click();
    fixture.detectChanges();

    const patchRequest = httpTesting.expectOne('/api/tasks/task-1');
    expect(patchRequest.request.method).toBe('PATCH');
    expect(patchRequest.request.body).toEqual({
      title: 'Task modifiee',
      description: 'Description modifiee',
      priority: 'LOW',
      dueDate: '2027-01-15',
    });
    expect(taskCard.textContent).toContain('Enregistrement...');

    patchRequest.flush({
      ...buildTask(),
      title: 'Task modifiee',
      description: 'Description modifiee',
      priority: 'LOW',
      dueDate: '2027-01-15',
      updatedAt: '2026-06-11T09:45:00Z',
    });
    fixture.detectChanges();

    expect(taskCard.querySelector('.task-edit-form')).toBeNull();
    expect(taskCard.textContent).toContain('Task modifiee');
    expect(taskCard.textContent).toContain('Description modifiee');
    expect(taskCard.textContent).toContain('LOW');
    expect(taskCard.textContent).toContain('2027-01-15');
  });

  it('should keep editing and avoid PATCH when the task title is empty', () => {
    const { fixture, compiled } = openBoardWithTask();
    const taskCard = compiled.querySelector<HTMLElement>('.task-card')!;

    Array.from(taskCard.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Modifier'))!
      .click();
    fixture.detectChanges();

    const titleInput = taskCard.querySelector<HTMLInputElement>('input[type="text"]')!;
    titleInput.value = '   ';
    titleInput.dispatchEvent(new Event('input'));
    taskCard.querySelector<HTMLButtonElement>('.task-edit-form button[type="submit"]')!.click();
    fixture.detectChanges();

    httpTesting.expectNone('/api/tasks/task-1');
    expect(taskCard.querySelector('.task-edit-form')).toBeTruthy();
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
    Array.from(compiled.querySelectorAll<HTMLButtonElement>('.task-actions .secondary-button'))
      .find((button) => button.textContent?.includes('Deplacer'))!
      .click();

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
