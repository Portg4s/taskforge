import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { App } from './app';
import { AuthUser } from './core/models/auth.model';
import { authInterceptor } from './core/services/auth.interceptor';

const authTokenStorageKey = 'taskforge.authToken';
const selectedProjectStorageKey = 'taskforge.selectedProjectId';
const selectedBoardStorageKey = 'taskforge.selectedBoardId';

function buildUser(): AuthUser {
  return {
    id: 'user-1',
    email: 'user@taskforge.local',
    displayName: 'TaskForge User',
    createdAt: '2026-06-11T08:00:00Z',
  };
}

function buildProject(id = 'project-1', name = 'Projet Alpha') {
  return {
    id,
    name,
    description: null,
    ownerId: 'user-1',
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
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  function startAuthenticated(projects = [buildProject()], token = 'test-token') {
    localStorage.setItem(authTokenStorageKey, token);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const meRequest = httpTesting.expectOne('/api/auth/me');
    expect(meRequest.request.method).toBe('GET');
    expect(meRequest.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    meRequest.flush(buildUser());

    const projectsRequest = httpTesting.expectOne('/api/projects');
    expect(projectsRequest.request.method).toBe('GET');
    expect(projectsRequest.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    projectsRequest.flush(projects);
    fixture.detectChanges();

    return { fixture, compiled: fixture.nativeElement as HTMLElement };
  }

  function openBoardWithTask(task = buildTask()) {
    const { fixture, compiled } = startAuthenticated([buildProject()]);

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
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show auth screen without token and avoid loading projects', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Connexion');
    expect(compiled.textContent).toContain('Inscription');
    httpTesting.expectNone('/api/auth/me');
    httpTesting.expectNone('/api/projects');
  });

  it('should login, store token, show dashboard, and load projects', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector<HTMLInputElement>('#auth-email')!.value = 'user@taskforge.local';
    compiled.querySelector<HTMLInputElement>('#auth-email')!.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLInputElement>('#auth-password')!.value = 'password-123';
    compiled.querySelector<HTMLInputElement>('#auth-password')!.dispatchEvent(new Event('input'));
    Array.from(compiled.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Se connecter'))!
      .click();

    const loginRequest = httpTesting.expectOne('/api/auth/login');
    expect(loginRequest.request.method).toBe('POST');
    expect(loginRequest.request.headers.has('Authorization')).toBe(false);
    expect(loginRequest.request.body).toEqual({
      email: 'user@taskforge.local',
      password: 'password-123',
    });
    loginRequest.flush({ token: 'login-token', user: buildUser() });

    const projectsRequest = httpTesting.expectOne('/api/projects');
    expect(projectsRequest.request.headers.get('Authorization')).toBe('Bearer login-token');
    projectsRequest.flush([buildProject()]);
    fixture.detectChanges();

    expect(localStorage.getItem(authTokenStorageKey)).toBe('login-token');
    expect(compiled.textContent).toContain('Connecte en tant que TaskForge User');
    expect(compiled.textContent).toContain('Projet Alpha');
  });

  it('should register, store token, show dashboard, and load projects', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    Array.from(compiled.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Inscription'))!
      .click();
    fixture.detectChanges();

    compiled.querySelector<HTMLInputElement>('#auth-email')!.value = 'new@taskforge.local';
    compiled.querySelector<HTMLInputElement>('#auth-email')!.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLInputElement>('#auth-password')!.value = 'password-123';
    compiled.querySelector<HTMLInputElement>('#auth-password')!.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLInputElement>('#auth-display-name')!.value = 'New User';
    compiled.querySelector<HTMLInputElement>('#auth-display-name')!.dispatchEvent(new Event('input'));
    Array.from(compiled.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Creer un compte'))!
      .click();

    const registerRequest = httpTesting.expectOne('/api/auth/register');
    expect(registerRequest.request.method).toBe('POST');
    expect(registerRequest.request.headers.has('Authorization')).toBe(false);
    expect(registerRequest.request.body).toEqual({
      email: 'new@taskforge.local',
      password: 'password-123',
      displayName: 'New User',
    });
    registerRequest.flush({
      token: 'register-token',
      user: {
        ...buildUser(),
        email: 'new@taskforge.local',
        displayName: 'New User',
      },
    });

    const projectsRequest = httpTesting.expectOne('/api/projects');
    expect(projectsRequest.request.headers.get('Authorization')).toBe('Bearer register-token');
    projectsRequest.flush([]);
    fixture.detectChanges();

    expect(localStorage.getItem(authTokenStorageKey)).toBe('register-token');
    expect(compiled.textContent).toContain('Connecte en tant que New User');
    expect(compiled.textContent).toContain("Aucun projet pour l'instant.");
  });

  it('should show a clear error and avoid register API call when password is too short', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    Array.from(compiled.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Inscription'))!
      .click();
    fixture.detectChanges();

    compiled.querySelector<HTMLInputElement>('#auth-email')!.value = 'short@taskforge.local';
    compiled.querySelector<HTMLInputElement>('#auth-email')!.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLInputElement>('#auth-password')!.value = 'short';
    compiled.querySelector<HTMLInputElement>('#auth-password')!.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLInputElement>('#auth-display-name')!.value = 'Short User';
    compiled.querySelector<HTMLInputElement>('#auth-display-name')!.dispatchEvent(new Event('input'));
    Array.from(compiled.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Creer un compte'))!
      .click();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Mot de passe trop court.');
    httpTesting.expectNone('/api/auth/register');
    expect(localStorage.getItem(authTokenStorageKey)).toBeNull();
  });

  it('should display a clear API error when register fails', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    Array.from(compiled.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Inscription'))!
      .click();
    fixture.detectChanges();

    compiled.querySelector<HTMLInputElement>('#auth-email')!.value = 'used@taskforge.local';
    compiled.querySelector<HTMLInputElement>('#auth-email')!.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLInputElement>('#auth-password')!.value = 'password-123';
    compiled.querySelector<HTMLInputElement>('#auth-password')!.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLInputElement>('#auth-display-name')!.value = 'Used User';
    compiled.querySelector<HTMLInputElement>('#auth-display-name')!.dispatchEvent(new Event('input'));
    Array.from(compiled.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Creer un compte'))!
      .click();

    const registerRequest = httpTesting.expectOne('/api/auth/register');
    expect(registerRequest.request.body).toEqual({
      email: 'used@taskforge.local',
      password: 'password-123',
      displayName: 'Used User',
    });
    registerRequest.flush(
      { message: 'Email already registered' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Email deja utilise.');
    expect(localStorage.getItem(authTokenStorageKey)).toBeNull();
    httpTesting.expectNone('/api/projects');
  });

  it('should restore an existing token with me then load projects', () => {
    const { compiled } = startAuthenticated([buildProject()]);

    expect(compiled.textContent).toContain('Connecte en tant que TaskForge User');
    expect(compiled.textContent).toContain('Projet Alpha');
  });

  it('should clear an invalid stored token and show auth screen', () => {
    localStorage.setItem(authTokenStorageKey, 'bad-token');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const meRequest = httpTesting.expectOne('/api/auth/me');
    expect(meRequest.request.headers.get('Authorization')).toBe('Bearer bad-token');
    meRequest.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(localStorage.getItem(authTokenStorageKey)).toBeNull();
    expect(compiled.textContent).toContain('Session expiree. Reconnecte-toi.');
    expect(compiled.textContent).toContain('Connexion');
    httpTesting.expectNone('/api/projects');
  });

  it('should logout, clear token and selections, then show auth screen', () => {
    const { fixture, compiled } = startAuthenticated([buildProject()]);
    localStorage.setItem(selectedProjectStorageKey, 'project-1');
    localStorage.setItem(selectedBoardStorageKey, 'board-1');

    Array.from(compiled.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Deconnexion'))!
      .click();
    fixture.detectChanges();

    expect(localStorage.getItem(authTokenStorageKey)).toBeNull();
    expect(localStorage.getItem(selectedProjectStorageKey)).toBeNull();
    expect(localStorage.getItem(selectedBoardStorageKey)).toBeNull();
    expect(compiled.textContent).toContain('Connexion');
    expect(compiled.textContent).not.toContain('Projet Alpha');
  });

  it('should expire the session when a protected API returns 401', () => {
    const { fixture, compiled } = startAuthenticated([buildProject()]);

    Array.from(compiled.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.includes('Rafraichir'))!
      .click();

    const projectsRequest = httpTesting.expectOne('/api/projects');
    projectsRequest.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(localStorage.getItem(authTokenStorageKey)).toBeNull();
    expect(compiled.textContent).toContain('Session expiree. Reconnecte-toi.');
    expect(compiled.textContent).toContain('Connexion');
  });

  it('should render title in the authenticated dashboard', () => {
    const { compiled } = startAuthenticated([]);

    expect(compiled.querySelector('h1')?.textContent).toContain('Projets et boards');
  });

  it('should load projects after authenticated startup and hide loading state', () => {
    const { compiled } = startAuthenticated([buildProject('project-1', 'Projet Alpha')]);

    expect(compiled.textContent).toContain('Projet Alpha');
    expect(compiled.textContent).not.toContain('Chargement...');
  });

  it('should create a project from the form and display it after response', () => {
    const { fixture, compiled } = startAuthenticated([]);

    const input = compiled.querySelector<HTMLInputElement>('#project-name')!;
    const submitButton = compiled.querySelector<HTMLButtonElement>('.stacked-form button[type="submit"]')!;

    input.value = 'Projet Beta';
    input.dispatchEvent(new Event('input'));
    submitButton.click();

    const postRequest = httpTesting.expectOne('/api/projects');
    expect(postRequest.request.method).toBe('POST');
    expect(postRequest.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(postRequest.request.body).toEqual({
      name: 'Projet Beta',
      description: null,
    });
    postRequest.flush(buildProject('project-2', 'Projet Beta'));

    const boardsRequest = httpTesting.expectOne('/api/projects/project-2/boards');
    boardsRequest.flush([]);
    fixture.detectChanges();

    expect(localStorage.getItem(selectedProjectStorageKey)).toBe('project-2');
    expect(compiled.textContent).toContain('Projet Beta');
    expect(input.value).toBe('');
  });

  it('should create a board after selecting a project and display it after response', () => {
    const { fixture, compiled } = startAuthenticated([buildProject()]);

    Array.from(compiled.querySelectorAll<HTMLButtonElement>('.list-item'))
      .find((button) => button.textContent?.includes('Projet Alpha'))!
      .click();
    httpTesting.expectOne('/api/projects/project-1/boards').flush([]);
    fixture.detectChanges();

    const input = compiled.querySelector<HTMLInputElement>('#board-name')!;
    input.value = 'Board Produit';
    input.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLButtonElement>('.inline-form button[type="submit"]')!.click();

    const postRequest = httpTesting.expectOne('/api/projects/project-1/boards');
    expect(postRequest.request.method).toBe('POST');
    expect(postRequest.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(postRequest.request.body).toEqual({ name: 'Board Produit' });
    postRequest.flush({
      ...buildBoard(),
      columns: [buildColumn()],
    });

    httpTesting.expectOne('/api/boards/board-1/columns').flush([buildColumn()]);
    httpTesting.expectOne('/api/boards/board-1/tasks').flush([]);
    fixture.detectChanges();

    expect(localStorage.getItem(selectedProjectStorageKey)).toBe('project-1');
    expect(localStorage.getItem(selectedBoardStorageKey)).toBe('board-1');
    expect(compiled.textContent).toContain('Board Produit');
    expect(compiled.textContent).toContain('Todo');
  });

  it('should restore an existing selected project after authenticated startup', () => {
    localStorage.setItem(selectedProjectStorageKey, 'project-1');
    const { compiled } = startAuthenticated([
      buildProject('project-1', 'Projet Alpha'),
      buildProject('project-2', 'Projet Beta'),
    ]);

    const boardsRequest = httpTesting.expectOne('/api/projects/project-1/boards');
    expect(boardsRequest.request.headers.get('Authorization')).toBe('Bearer test-token');
    boardsRequest.flush([]);

    expect(compiled.textContent).toContain('Projet Alpha');
    expect(localStorage.getItem(selectedProjectStorageKey)).toBe('project-1');
  });

  it('should restore an existing selected board after loading boards', () => {
    localStorage.setItem(selectedProjectStorageKey, 'project-1');
    localStorage.setItem(selectedBoardStorageKey, 'board-2');
    const { fixture, compiled } = startAuthenticated([buildProject()]);

    httpTesting.expectOne('/api/projects/project-1/boards').flush([
      buildBoard('board-1', 'project-1', 'Board Produit'),
      buildBoard('board-2', 'project-1', 'Board Technique'),
    ]);
    httpTesting.expectOne('/api/boards/board-2/columns').flush([buildColumn()]);
    httpTesting.expectOne('/api/boards/board-2/tasks').flush([]);
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Board Technique');
    expect(compiled.textContent).toContain('Todo');
    expect(localStorage.getItem(selectedBoardStorageKey)).toBe('board-2');
  });

  it('should clean stale stored selection ids without displaying an error', () => {
    localStorage.setItem(selectedProjectStorageKey, 'missing-project');
    localStorage.setItem(selectedBoardStorageKey, 'missing-board');
    const { compiled } = startAuthenticated([buildProject()]);

    expect(compiled.querySelector('.error-message')).toBeNull();
    expect(localStorage.getItem(selectedProjectStorageKey)).toBeNull();
    expect(localStorage.getItem(selectedBoardStorageKey)).toBeNull();
  });

  it('should display board tasks and create then delete a task', () => {
    const { fixture, compiled } = openBoardWithTask();

    expect(compiled.textContent).toContain('Task existante');
    expect(compiled.textContent).toContain('Avec description');
    expect(compiled.textContent).toContain('HIGH');
    expect(compiled.textContent).toContain('2026-12-24');

    const taskInput = compiled.querySelector<HTMLInputElement>('.task-form input')!;
    taskInput.value = 'Nouvelle tache';
    taskInput.dispatchEvent(new Event('input'));
    compiled.querySelector<HTMLButtonElement>('.task-form button[type="submit"]')!.click();

    const postRequest = httpTesting.expectOne('/api/board-columns/column-1/tasks');
    expect(postRequest.request.method).toBe('POST');
    expect(postRequest.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(postRequest.request.body).toEqual({ title: 'Nouvelle tache' });
    postRequest.flush({
      ...buildTask('task-2', 'Nouvelle tache'),
      description: null,
      priority: 'MEDIUM',
      dueDate: null,
      position: 1,
    });
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Nouvelle tache');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    Array.from(compiled.querySelectorAll<HTMLElement>('.task-card'))
      .find((card) => card.textContent?.includes('Task existante'))!
      .querySelector<HTMLButtonElement>('.danger-button')!
      .click();

    const deleteRequest = httpTesting.expectOne('/api/tasks/task-1');
    expect(deleteRequest.request.method).toBe('DELETE');
    expect(deleteRequest.request.headers.get('Authorization')).toBe('Bearer test-token');
    deleteRequest.flush(null);
    fixture.detectChanges();

    expect(compiled.textContent).not.toContain('Task existante');
  });

  it('should not delete a task when confirmation is cancelled', () => {
    const { fixture, compiled } = openBoardWithTask();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    compiled.querySelector<HTMLButtonElement>('.danger-button')!.click();
    fixture.detectChanges();

    expect(window.confirm).toHaveBeenCalledWith('Supprimer cette tache ?');
    httpTesting.expectNone('/api/tasks/task-1');
    expect(compiled.textContent).toContain('Task existante');
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
    expect(patchRequest.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(patchRequest.request.body).toEqual({
      title: 'Task modifiee',
      description: 'Description modifiee',
      priority: 'LOW',
      dueDate: '2027-01-15',
    });
    patchRequest.flush({
      ...buildTask(),
      title: 'Task modifiee',
      description: 'Description modifiee',
      priority: 'LOW',
      dueDate: '2027-01-15',
    });
    fixture.detectChanges();

    expect(taskCard.querySelector('.task-edit-form')).toBeNull();
    expect(taskCard.textContent).toContain('Task modifiee');
    expect(taskCard.textContent).toContain('Description modifiee');
    expect(taskCard.textContent).toContain('LOW');
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
    const { fixture, compiled } = startAuthenticated([buildProject()]);

    Array.from(compiled.querySelectorAll<HTMLButtonElement>('.list-item'))
      .find((button) => button.textContent?.includes('Projet Alpha'))!
      .click();
    httpTesting.expectOne('/api/projects/project-1/boards').flush([buildBoard()]);
    fixture.detectChanges();

    Array.from(compiled.querySelectorAll<HTMLButtonElement>('.list-item'))
      .find((button) => button.textContent?.includes('Board Produit'))!
      .click();

    const columns = [buildColumn('todo', 'Todo'), buildColumn('in-progress', 'In Progress')];
    const todoTask = {
      ...buildTask('task-1', 'Task mobile'),
      description: null,
      priority: 'MEDIUM' as const,
      dueDate: null,
      columnId: 'todo',
    };
    const movedTask = {
      ...todoTask,
      columnId: 'in-progress',
      position: 0,
    };

    httpTesting.expectOne('/api/boards/board-1/columns').flush(columns);
    httpTesting.expectOne('/api/boards/board-1/tasks').flush([todoTask]);
    fixture.detectChanges();

    const select = compiled.querySelector<HTMLSelectElement>('.task-actions select')!;
    expect(select.value).toBe('todo');
    select.value = 'in-progress';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    Array.from(compiled.querySelectorAll<HTMLButtonElement>('.task-actions .secondary-button'))
      .find((button) => button.textContent?.includes('Deplacer'))!
      .click();

    const moveRequest = httpTesting.expectOne('/api/tasks/task-1/move');
    expect(moveRequest.request.method).toBe('PATCH');
    expect(moveRequest.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(moveRequest.request.body).toEqual({
      columnId: 'in-progress',
      position: 0,
    });
    moveRequest.flush(movedTask);
    httpTesting.expectOne('/api/boards/board-1/tasks').flush([movedTask]);
    fixture.detectChanges();

    expect(compiled.querySelector<HTMLSelectElement>('.task-actions select')!.value).toBe('in-progress');
  });
});
