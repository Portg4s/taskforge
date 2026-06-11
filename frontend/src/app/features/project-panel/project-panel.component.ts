import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { CreateProjectRequest, Project } from '../../core/models/project.model';

@Component({
  selector: 'app-project-panel',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './project-panel.component.html',
})
export class ProjectPanelComponent {
  @Input({ required: true }) projects: Project[] = [];
  @Input() selectedProject: Project | null = null;
  @Input() loading = false;
  @Input() saving = false;

  @Output() refresh = new EventEmitter<void>();
  @Output() projectCreate = new EventEmitter<CreateProjectRequest>();
  @Output() projectSelect = new EventEmitter<Project>();

  protected readonly projectName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(160)],
  });
  protected readonly projectDescription = new FormControl('', { nonNullable: true });

  protected submitProject(): void {
    const name = this.projectName.value.trim();
    if (this.projectName.invalid || name.length === 0) {
      this.projectName.markAsTouched();
      return;
    }

    const description = this.projectDescription.value.trim();
    this.projectCreate.emit({
      name,
      description: description.length > 0 ? description : null,
    });
    this.projectName.reset('');
    this.projectDescription.reset('');
  }
}
