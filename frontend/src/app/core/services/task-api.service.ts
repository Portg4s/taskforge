import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CreateTaskRequest, MoveTaskRequest, Task, UpdateTaskRequest } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskApiService {
  private readonly http = inject(HttpClient);

  listBoardTasks(boardId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`/api/boards/${boardId}/tasks`);
  }

  listColumnTasks(columnId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`/api/board-columns/${columnId}/tasks`);
  }

  createTask(columnId: string, request: CreateTaskRequest): Observable<Task> {
    return this.http.post<Task>(`/api/board-columns/${columnId}/tasks`, request);
  }

  updateTask(taskId: string, request: UpdateTaskRequest): Observable<Task> {
    return this.http.patch<Task>(`/api/tasks/${taskId}`, request);
  }

  moveTask(taskId: string, request: MoveTaskRequest): Observable<Task> {
    return this.http.patch<Task>(`/api/tasks/${taskId}/move`, request);
  }

  deleteTask(taskId: string): Observable<void> {
    return this.http.delete<void>(`/api/tasks/${taskId}`);
  }
}
