import { BoardColumn } from './board-column.model';

export interface Board {
  id: string;
  name: string;
  projectId: string;
  columns: BoardColumn[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBoardRequest {
  name: string;
}
