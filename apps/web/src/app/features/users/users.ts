import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserDto, UserRole } from '@restaurante/shared-types';
import { CreateUserPayload, UpdateUserPayload, UsersApi } from '../../core/data/users.api';
import { NotificationService } from '../../core/services/notification.service';
import { EnumLabelPipe } from '../../shared/pipes/enum-label.pipe';

interface EditState {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
  password: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, EnumLabelPipe],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class UsersPage implements OnInit {
  private readonly usersApi = inject(UsersApi);
  private readonly notify = inject(NotificationService);

  readonly UserRole = UserRole;

  readonly users = signal<UserDto[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly showCreate = signal(false);
  readonly editing = signal<EditState | null>(null);

  readonly newUser = signal<CreateUserPayload>(this.emptyCreate());

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.users.set(await this.usersApi.list());
    } finally {
      this.loading.set(false);
    }
  }

  // ----- Crear -----
  toggleCreate(): void {
    this.editing.set(null);
    this.newUser.set(this.emptyCreate());
    this.showCreate.update((v) => !v);
  }

  async create(): Promise<void> {
    const payload = this.newUser();
    this.saving.set(true);
    try {
      await this.usersApi.create(payload);
      this.notify.success('Usuario creado');
      this.showCreate.set(false);
      this.newUser.set(this.emptyCreate());
      await this.load();
    } catch {
      // El interceptor muestra el toast de error.
    } finally {
      this.saving.set(false);
    }
  }

  // ----- Editar -----
  startEdit(user: UserDto): void {
    this.showCreate.set(false);
    this.editing.set({
      id: user.id,
      name: user.name,
      role: user.role,
      active: user.active,
      password: '',
    });
  }

  cancelEdit(): void {
    this.editing.set(null);
  }

  async saveEdit(): Promise<void> {
    const state = this.editing();
    if (!state) return;
    const payload: UpdateUserPayload = {
      name: state.name,
      role: state.role,
      active: state.active,
    };
    if (state.password.trim()) {
      payload.password = state.password;
    }
    this.saving.set(true);
    try {
      await this.usersApi.update(state.id, payload);
      this.notify.success('Usuario actualizado');
      this.editing.set(null);
      await this.load();
    } catch {
      // El interceptor muestra el toast de error.
    } finally {
      this.saving.set(false);
    }
  }

  // ----- Activar / Desactivar -----
  async toggleActive(user: UserDto): Promise<void> {
    const action = user.active ? 'desactivar' : 'reactivar';
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} al usuario "${user.name}"?`)) {
      return;
    }
    try {
      await this.usersApi.update(user.id, { active: !user.active });
      this.notify.success(user.active ? 'Usuario desactivado' : 'Usuario reactivado');
      await this.load();
    } catch {
      // El interceptor muestra el toast de error (p. ej. autodesactivación).
    }
  }

  // Setters de campo (las plantillas de Angular no admiten literales de objeto).
  setNewEmail(v: string): void { this.newUser.update((u) => ({ ...u, email: v })); }
  setNewName(v: string): void { this.newUser.update((u) => ({ ...u, name: v })); }
  setNewPassword(v: string): void { this.newUser.update((u) => ({ ...u, password: v })); }
  setNewRole(v: UserRole): void { this.newUser.update((u) => ({ ...u, role: v })); }

  setEditName(v: string): void { this.editing.update((e) => (e ? { ...e, name: v } : e)); }
  setEditRole(v: UserRole): void { this.editing.update((e) => (e ? { ...e, role: v } : e)); }
  setEditActive(v: boolean): void { this.editing.update((e) => (e ? { ...e, active: v } : e)); }
  setEditPassword(v: string): void { this.editing.update((e) => (e ? { ...e, password: v } : e)); }

  private emptyCreate(): CreateUserPayload {
    return { email: '', name: '', password: '', role: UserRole.OPERATOR };
  }
}
