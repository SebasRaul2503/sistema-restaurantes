import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  CreateRestaurantDto,
  CreateMemberDto,
  MyRestaurantDto,
  RestaurantDto,
  RestaurantMemberDto,
  RestaurantThemeDto,
  UpdateMemberDto,
  UpdateRestaurantDto,
} from '@restaurante/shared-types';
import { ApiService } from '../services/api.service';

/** Acceso a la API de locales (restaurantes) y membresías. */
@Injectable({ providedIn: 'root' })
export class RestaurantsApi {
  private readonly api = inject(ApiService);

  // --- Mis locales (selector) ---
  listMine(): Promise<MyRestaurantDto[]> {
    return firstValueFrom(this.api.get<MyRestaurantDto[]>('/my-restaurants'));
  }

  // --- Marca efectiva del local ---
  getTheme(id: string): Promise<RestaurantThemeDto> {
    return firstValueFrom(this.api.get<RestaurantThemeDto>(`/restaurants/${id}/theme`));
  }

  // --- Gestión (ADMIN) ---
  listAll(): Promise<RestaurantDto[]> {
    return firstValueFrom(this.api.get<RestaurantDto[]>('/restaurants'));
  }

  getOne(id: string): Promise<RestaurantDto> {
    return firstValueFrom(this.api.get<RestaurantDto>(`/restaurants/${id}`));
  }

  create(dto: CreateRestaurantDto): Promise<RestaurantDto> {
    return firstValueFrom(this.api.post<RestaurantDto>('/restaurants', dto));
  }

  update(id: string, dto: UpdateRestaurantDto): Promise<RestaurantDto> {
    return firstValueFrom(this.api.patch<RestaurantDto>(`/restaurants/${id}`, dto));
  }

  // --- Membresías (ADMIN) ---
  listMembers(restaurantId: string): Promise<RestaurantMemberDto[]> {
    return firstValueFrom(
      this.api.get<RestaurantMemberDto[]>(`/restaurants/${restaurantId}/members`),
    );
  }

  addMember(restaurantId: string, dto: CreateMemberDto): Promise<RestaurantMemberDto> {
    return firstValueFrom(
      this.api.post<RestaurantMemberDto>(`/restaurants/${restaurantId}/members`, dto),
    );
  }

  updateMember(
    restaurantId: string,
    memberId: string,
    dto: UpdateMemberDto,
  ): Promise<RestaurantMemberDto> {
    return firstValueFrom(
      this.api.patch<RestaurantMemberDto>(`/restaurants/${restaurantId}/members/${memberId}`, dto),
    );
  }
}
