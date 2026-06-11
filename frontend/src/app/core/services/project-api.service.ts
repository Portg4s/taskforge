import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateProjectRequest, Project } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectApiService {
  private readonly http = inject(HttpClient);

  listProjects(): Observable<Project[]> {
    return this.http.get<Project[]>('/api/projects');
  }

  createProject(request: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>('/api/projects', request);
  }
}
