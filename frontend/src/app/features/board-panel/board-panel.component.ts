import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { Board } from '../../core/models/board.model';
import { Project } from '../../core/models/project.model';

@Component({
  selector: 'app-board-panel',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './board-panel.component.html',
})
export class BoardPanelComponent {
  @Input() selectedProject: Project | null = null;
  @Input({ required: true }) boards: Board[] = [];
  @Input() selectedBoard: Board | null = null;
  @Input() loading = false;
  @Input() saving = false;

  @Output() boardCreate = new EventEmitter<string>();
  @Output() boardSelect = new EventEmitter<Board>();

  protected readonly boardName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(160)],
  });

  protected submitBoard(): void {
    const name = this.boardName.value.trim();
    if (this.boardName.invalid || name.length === 0) {
      this.boardName.markAsTouched();
      return;
    }

    this.boardCreate.emit(name);
    this.boardName.reset('');
  }
}
