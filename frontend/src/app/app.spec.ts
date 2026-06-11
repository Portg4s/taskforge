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
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Board Produit');
    expect(compiled.textContent).toContain('Todo');
    expect(compiled.textContent).not.toContain('Creation...');
    expect(input!.value).toBe('');
  });
});
