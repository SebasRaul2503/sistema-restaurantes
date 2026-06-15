import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DishDto, MenuCategoryDto } from '@restaurante/shared-types';
import { ApiService } from '../services/api.service';

export interface CategoryPayload {
  name: string;
  sortOrder?: number;
  active?: boolean;
}
export interface DishPayload {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class MenuApi {
  private readonly api = inject(ApiService);

  listCategories(): Promise<MenuCategoryDto[]> {
    return firstValueFrom(this.api.get<MenuCategoryDto[]>('/menu/categories'));
  }
  createCategory(p: CategoryPayload): Promise<MenuCategoryDto> {
    return firstValueFrom(this.api.post<MenuCategoryDto>('/menu/categories', p));
  }
  updateCategory(id: string, p: Partial<CategoryPayload>): Promise<MenuCategoryDto> {
    return firstValueFrom(this.api.patch<MenuCategoryDto>(`/menu/categories/${id}`, p));
  }
  deleteCategory(id: string): Promise<void> {
    return firstValueFrom(this.api.delete<void>(`/menu/categories/${id}`));
  }

  listDishes(filter?: { categoryId?: string; active?: boolean }): Promise<DishDto[]> {
    return firstValueFrom(this.api.get<DishDto[]>('/menu/dishes', filter));
  }
  createDish(p: DishPayload): Promise<DishDto> {
    return firstValueFrom(this.api.post<DishDto>('/menu/dishes', p));
  }
  updateDish(id: string, p: Partial<DishPayload>): Promise<DishDto> {
    return firstValueFrom(this.api.patch<DishDto>(`/menu/dishes/${id}`, p));
  }
  deleteDish(id: string): Promise<DishDto> {
    return firstValueFrom(this.api.delete<DishDto>(`/menu/dishes/${id}`));
  }
}
