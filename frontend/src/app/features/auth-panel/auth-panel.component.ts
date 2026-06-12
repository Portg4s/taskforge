import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { LoginRequest, RegisterRequest } from '../../core/models/auth.model';

export type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-auth-panel',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-panel.component.html',
})
export class AuthPanelComponent {
  @Input() loading = false;
  @Input() apiErrorMessage = '';

  @Output() loginSubmit = new EventEmitter<LoginRequest>();
  @Output() registerSubmit = new EventEmitter<RegisterRequest>();

  protected mode: AuthMode = 'login';
  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
  protected readonly password = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly displayName = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(120)],
  });
  protected formErrorMessage = '';

  protected setMode(mode: AuthMode): void {
    this.mode = mode;
    this.formErrorMessage = '';
  }

  protected submit(): void {
    this.formErrorMessage = '';
    const email = this.email.value.trim();
    const password = this.password.value;

    if (this.mode === 'login') {
      if (this.email.invalid || this.password.invalid || email.length === 0) {
        this.markTouched();
        return;
      }

      this.loginSubmit.emit({ email, password });
      return;
    }

    const displayName = this.displayName.value.trim();
    if (
      this.email.invalid
      || this.displayName.invalid
      || email.length === 0
      || displayName.length === 0
    ) {
      this.markTouched();
      this.formErrorMessage = 'Verifie les champs du formulaire.';
      return;
    }

    if (this.password.invalid || password.length < 8) {
      this.markTouched();
      this.formErrorMessage = 'Mot de passe trop court.';
      return;
    }

    this.registerSubmit.emit({ email, password, displayName });
  }

  private markTouched(): void {
    this.email.markAsTouched();
    this.password.markAsTouched();
    this.displayName.markAsTouched();
  }
}
