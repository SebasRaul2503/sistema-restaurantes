import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UserDto, UserRole } from '@restaurante/shared-types';
import { ApiService } from '../services/api.service';

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}
export interface UpdateUserPayload {
  name?: string;
  password?: string;
  role?: UserRole;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly api = inject(ApiService);

  list(): Promise<UserDto[]> {
    return firstValueFrom(this.api.get<UserDto[]>('/users'));
  }
  create(payload: CreateUserPayload): Promise<UserDto> {
    return firstValueFrom(this.api.post<UserDto>('/users', payload));
  }
  update(id: string, payload: UpdateUserPayload): Promise<UserDto> {
    return firstValueFrom(this.api.patch<UserDto>(`/users/${id}`, payload));
  }
  deactivate(id: string): Promise<UserDto> {
    return firstValueFrom(this.api.delete<UserDto>(`/users/${id}`));
  }
}
