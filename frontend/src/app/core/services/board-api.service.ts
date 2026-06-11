import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { BoardColumn } from '../models/board-column.model';
import { Board, CreateBoardRequest } from '../models/board.model';

@Injectable({ providedIn: 'root' })
export class BoardApiService {
  private readonly http = inject(HttpClient);

  listBoards(projectId: string): Observable<Board[]> {
    return this.http.get<Board[]>(`/api/projects/${projectId}/boards`);
  }

  createBoard(projectId: string, request: CreateBoardRequest): Observable<Board> {
    return this.http.post<Board>(`/api/projects/${projectId}/boards`, request);
  }

  getBoard(boardId: string): Observable<Board> {
    return this.http.get<Board>(`/api/boards/${boardId}`);
  }

  listColumns(boardId: string): Observable<BoardColumn[]> {
    return this.http.get<BoardColumn[]>(`/api/boards/${boardId}/columns`);
  }
}
