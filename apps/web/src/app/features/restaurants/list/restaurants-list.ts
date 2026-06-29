import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  RestaurantDto,
  RestaurantMemberDto,
  UserDto,
  UserRole,
} from '@restaurante/shared-types';
import { RestaurantsApi } from '../../../core/data/restaurants.api';
import { UsersApi } from '../../../core/data/users.api';
import { NotificationService } from '../../../core/services/notification.service';
import { Icon } from '../../../shared/components/icon/icon';
import { EnumLabelPipe } from '../../../shared/pipes/enum-label.pipe';

interface NewRestaurantForm {
  slug: string;
  name: string;
  address: string;
  phone: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

@Component({
  selector: 'app-restaurants-list',
  standalone: true,
  imports: [FormsModule, Icon, EnumLabelPipe],
  templateUrl: './restaurants-list.html',
  styleUrl: './restaurants-list.scss',
})
export class RestaurantsListPage implements OnInit {
  private readonly api = inject(RestaurantsApi);
  private readonly usersApi = inject(UsersApi);
  private readonly notify = inject(NotificationService);

  readonly UserRole = UserRole;

  readonly restaurants = signal<RestaurantDto[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly members = signal<RestaurantMemberDto[]>([]);
  readonly users = signal<UserDto[]>([]);

  readonly loadingRestaurants = signal(true);
  readonly loadingMembers = signal(false);
  readonly showCreate = signal(false);
  readonly saving = signal(false);

  readonly newRestaurant = signal<NewRestaurantForm>(this.emptyForm());
  readonly newMemberUserId = signal('');
  readonly newMemberRole = signal<UserRole>(UserRole.OPERATOR);

  readonly selectedRestaurant = computed<RestaurantDto | null>(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.restaurants().find((r) => r.id === id) ?? null;
  });

  readonly availableUsers = computed<UserDto[]>(() => {
    const taken = new Set(this.members().map((m) => m.userId));
    return this.users().filter((u) => !taken.has(u.id));
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadRestaurants(), this.loadUsers()]);
  }

  async loadRestaurants(): Promise<void> {
    this.loadingRestaurants.set(true);
    try {
      this.restaurants.set(await this.api.listAll());
    } catch {
      // interceptor
    } finally {
      this.loadingRestaurants.set(false);
    }
  }

  async loadUsers(): Promise<void> {
    try {
      this.users.set(await this.usersApi.list());
    } catch {
      // ignore
    }
  }

  select(id: string): void {
    this.selectedId.set(id);
    this.newMemberUserId.set('');
    this.newMemberRole.set(UserRole.OPERATOR);
    void this.loadMembers(id);
  }

  async loadMembers(restaurantId: string): Promise<void> {
    this.loadingMembers.set(true);
    try {
      this.members.set(await this.api.listMembers(restaurantId));
    } catch {
      this.members.set([]);
    } finally {
      this.loadingMembers.set(false);
    }
  }

  // ----- Crear local -----

  toggleCreate(): void {
    this.showCreate.update((v) => !v);
    this.newRestaurant.set(this.emptyForm());
  }

  async createRestaurant(): Promise<void> {
    const form = this.newRestaurant();
    if (!form.slug.trim() || !form.name.trim()) {
      this.notify.error('El slug y el nombre son obligatorios.');
      return;
    }
    this.saving.set(true);
    try {
      const body: Record<string, string> = {
        slug: form.slug.trim().toLowerCase(),
        name: form.name.trim(),
      };
      if (form.address.trim()) body.address = form.address.trim();
      if (form.phone.trim()) body.phone = form.phone.trim();
      if (form.primaryColor.trim()) body.primaryColor = form.primaryColor.trim();
      if (form.secondaryColor.trim()) body.secondaryColor = form.secondaryColor.trim();
      if (form.logoUrl.trim()) body.logoUrl = form.logoUrl.trim();
      await this.api.create(body as never);
      this.notify.success('Local creado');
      this.showCreate.set(false);
      await this.loadRestaurants();
    } catch {
      // interceptor
    } finally {
      this.saving.set(false);
    }
  }

  setNewSlug(v: string): void { this.newRestaurant.update((r) => ({ ...r, slug: v })); }
  setNewName(v: string): void { this.newRestaurant.update((r) => ({ ...r, name: v })); }
  setNewAddress(v: string): void { this.newRestaurant.update((r) => ({ ...r, address: v })); }
  setNewPhone(v: string): void { this.newRestaurant.update((r) => ({ ...r, phone: v })); }
  setNewPrimary(v: string): void { this.newRestaurant.update((r) => ({ ...r, primaryColor: v })); }
  setNewSecondary(v: string): void { this.newRestaurant.update((r) => ({ ...r, secondaryColor: v })); }
  setNewLogo(v: string): void { this.newRestaurant.update((r) => ({ ...r, logoUrl: v })); }

  // ----- Activar/Desactivar -----

  async toggleActive(r: RestaurantDto): Promise<void> {
    const msg = r.active
      ? `¿Desactivar el local "${r.name}"? Los usuarios miembros no podrán operar en él.`
      : `¿Reactivar el local "${r.name}"?`;
    if (!confirm(msg)) return;
    try {
      await this.api.update(r.id, { active: !r.active });
      this.notify.success(r.active ? 'Local desactivado' : 'Local reactivado');
      await this.loadRestaurants();
      if (this.selectedId() === r.id) {
        void this.loadMembers(r.id);
      }
    } catch {
      // interceptor
    }
  }

  // ----- Miembros -----

  async addMember(): Promise<void> {
    const restaurantId = this.selectedId();
    const userId = this.newMemberUserId();
    if (!restaurantId || !userId) {
      this.notify.error('Seleccione un usuario.');
      return;
    }
    try {
      await this.api.addMember(restaurantId, { userId, role: this.newMemberRole() });
      this.notify.success('Miembro agregado');
      this.newMemberUserId.set('');
      this.newMemberRole.set(UserRole.OPERATOR);
      await this.loadMembers(restaurantId);
      void this.loadUsers();
    } catch {
      // interceptor
    }
  }

  async changeMemberRole(member: RestaurantMemberDto, role: UserRole): Promise<void> {
    try {
      await this.api.updateMember(member.restaurantId, member.id, { role });
      this.notify.success('Rol actualizado');
      await this.loadMembers(member.restaurantId);
    } catch {
      // interceptor
    }
  }

  async toggleMemberActive(member: RestaurantMemberDto): Promise<void> {
    try {
      await this.api.updateMember(member.restaurantId, member.id, { active: !member.active });
      this.notify.success(member.active ? 'Miembro desactivado' : 'Miembro reactivado');
      await this.loadMembers(member.restaurantId);
    } catch {
      // interceptor
    }
  }

  async removeMember(member: RestaurantMemberDto): Promise<void> {
    if (
      !confirm(
        `¿Quitar a "${member.userName}" del local? El usuario seguirá existiendo y podrá reasignarse.`,
      )
    ) {
      return;
    }
    try {
      await this.api.removeMember(member.restaurantId, member.id);
      this.notify.success('Miembro quitado del local');
      await this.loadMembers(member.restaurantId);
      void this.loadUsers();
    } catch {
      // interceptor
    }
  }

  setNewMemberUser(v: string): void { this.newMemberUserId.set(v); }
  setNewMemberRole(v: UserRole): void { this.newMemberRole.set(v); }

  initials(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  // Helpers para leer valores de eventos de input/select en Angular.
  asInputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
  asSelectValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }
  asRoleValue(event: Event): UserRole {
    const v = (event.target as HTMLSelectElement).value;
    return v === UserRole.ADMIN ? UserRole.ADMIN : UserRole.OPERATOR;
  }

  private emptyForm(): NewRestaurantForm {
    return {
      slug: '',
      name: '',
      address: '',
      phone: '',
      primaryColor: '',
      secondaryColor: '',
      logoUrl: '',
    };
  }
}
