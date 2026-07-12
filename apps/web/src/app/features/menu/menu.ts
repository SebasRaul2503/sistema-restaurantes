import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DishDto, MenuCategoryDto } from '@restaurante/shared-types';
import { CategoryPayload, DishPayload, MenuApi } from '../../core/data/menu.api';
import { ActiveRestaurantService } from '../../core/services/active-restaurant.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { SolesPipe } from '../../shared/pipes/soles.pipe';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, SolesPipe, Icon],
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
})
export class MenuPage {
  private readonly menu = inject(MenuApi);
  private readonly active = inject(ActiveRestaurantService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  readonly categories = signal<MenuCategoryDto[]>([]);
  readonly dishes = signal<DishDto[]>([]);
  readonly loadingCategories = signal(true);
  readonly loadingDishes = signal(true);
  readonly saving = signal(false);

  /** null = "Todas". */
  readonly selectedCategoryId = signal<string | null>(null);

  // --- Formulario de categoría (creación o edición inline) ---
  /** 'new' para crear, el id de la categoría para editar, o null si está cerrado. */
  readonly categoryFormMode = signal<'new' | string | null>(null);
  readonly catName = signal('');
  readonly catSortOrder = signal<number | null>(null);
  readonly catActive = signal(true);

  // --- Formulario de plato (creación o edición inline) ---
  /** 'new' para crear, el id del plato para editar, o null si está cerrado. */
  readonly dishFormMode = signal<'new' | string | null>(null);
  readonly dishName = signal('');
  readonly dishDescription = signal('');
  readonly dishPrice = signal<number | null>(null);
  readonly dishCategoryId = signal('');
  readonly dishImageUrl = signal('');

  readonly selectedCategoryName = computed(() => {
    const id = this.selectedCategoryId();
    if (!id) return 'Todas';
    return this.categories().find((c) => c.id === id)?.name ?? 'Todas';
  });

  constructor() {
    effect(() => {
      this.active.activeRestaurantId();
      untracked(() => {
        // Al cambiar de local, resetea el filtro de categoría (la id
        // pertenece al local anterior) y recarga carta + platos.
        this.selectedCategoryId.set(null);
        void this.loadCategories();
        void this.loadDishes();
      });
    });
  }

  categoryName(id: string): string {
    return this.categories().find((c) => c.id === id)?.name ?? '—';
  }

  // ===== Carga de datos =====

  async loadCategories(): Promise<void> {
    this.loadingCategories.set(true);
    try {
      this.categories.set(await this.menu.listCategories());
    } catch {
      // El interceptor muestra el toast de error.
    } finally {
      this.loadingCategories.set(false);
    }
  }

  async loadDishes(): Promise<void> {
    this.loadingDishes.set(true);
    try {
      const categoryId = this.selectedCategoryId() ?? undefined;
      this.dishes.set(await this.menu.listDishes(categoryId ? { categoryId } : undefined));
    } catch {
      // El interceptor muestra el toast de error.
    } finally {
      this.loadingDishes.set(false);
    }
  }

  // ===== Categorías =====

  selectCategory(id: string | null): void {
    this.selectedCategoryId.set(id);
    void this.loadDishes();
  }

  openCategoryForm(): void {
    this.catName.set('');
    this.catSortOrder.set(null);
    this.catActive.set(true);
    this.categoryFormMode.set('new');
  }

  editCategory(category: MenuCategoryDto): void {
    this.catName.set(category.name);
    this.catSortOrder.set(category.sortOrder);
    this.catActive.set(category.active);
    this.categoryFormMode.set(category.id);
  }

  cancelCategoryForm(): void {
    this.categoryFormMode.set(null);
  }

  async saveCategory(): Promise<void> {
    const mode = this.categoryFormMode();
    const name = this.catName().trim();
    if (!mode || !name) return;

    this.saving.set(true);
    try {
      if (mode === 'new') {
        const payload: CategoryPayload = { name };
        if (this.catSortOrder() !== null) payload.sortOrder = this.catSortOrder()!;
        await this.menu.createCategory(payload);
        this.notify.success('Categoría creada');
      } else {
        const payload: Partial<CategoryPayload> = {
          name,
          sortOrder: this.catSortOrder() ?? undefined,
          active: this.catActive(),
        };
        await this.menu.updateCategory(mode, payload);
        this.notify.success('Categoría actualizada');
      }
      this.cancelCategoryForm();
      await this.loadCategories();
    } catch {
      // El interceptor muestra el toast de error.
    } finally {
      this.saving.set(false);
    }
  }

  async removeCategory(category: MenuCategoryDto): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar categoría',
      message: `¿Eliminar la categoría "${category.name}"? Si tiene platos asociados, se desactiva en lugar de eliminarse.`,
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    this.saving.set(true);
    try {
      await this.menu.deleteCategory(category.id);
      this.notify.success('Categoría eliminada');
      if (this.selectedCategoryId() === category.id) {
        this.selectedCategoryId.set(null);
        await this.loadDishes();
      }
      await this.loadCategories();
    } catch {
      // El interceptor bloquea/avisa: categorías del sistema o con platos.
    } finally {
      this.saving.set(false);
    }
  }

  // ===== Platos =====

  openDishForm(): void {
    this.dishName.set('');
    this.dishDescription.set('');
    this.dishPrice.set(null);
    this.dishCategoryId.set(this.selectedCategoryId() ?? '');
    this.dishImageUrl.set('');
    this.dishFormMode.set('new');
  }

  editDish(dish: DishDto): void {
    this.dishName.set(dish.name);
    this.dishDescription.set(dish.description ?? '');
    this.dishPrice.set(dish.price);
    this.dishCategoryId.set(dish.categoryId);
    this.dishImageUrl.set(dish.imageUrl ?? '');
    this.dishFormMode.set(dish.id);
  }

  cancelDishForm(): void {
    this.dishFormMode.set(null);
  }

  private buildDishPayload(): DishPayload | null {
    const name = this.dishName().trim();
    const price = this.dishPrice();
    const categoryId = this.dishCategoryId();
    if (!name || price === null || !categoryId) return null;

    const payload: DishPayload = { name, price, categoryId };
    const description = this.dishDescription().trim();
    const imageUrl = this.dishImageUrl().trim();
    if (description) payload.description = description;
    if (imageUrl) payload.imageUrl = imageUrl;
    return payload;
  }

  async saveDish(): Promise<void> {
    const mode = this.dishFormMode();
    const payload = this.buildDishPayload();
    if (!mode || !payload) return;

    this.saving.set(true);
    try {
      if (mode === 'new') {
        await this.menu.createDish(payload);
        this.notify.success('Plato creado');
      } else {
        await this.menu.updateDish(mode, payload);
        this.notify.success('Plato actualizado');
      }
      this.cancelDishForm();
      await this.loadDishes();
    } catch {
      // El interceptor muestra el toast de error.
    } finally {
      this.saving.set(false);
    }
  }

  async toggleDishActive(dish: DishDto): Promise<void> {
    this.saving.set(true);
    try {
      await this.menu.updateDish(dish.id, { active: !dish.active });
      this.notify.success(dish.active ? 'Plato desactivado' : 'Plato activado');
      await this.loadDishes();
    } catch {
      // El interceptor muestra el toast de error.
    } finally {
      this.saving.set(false);
    }
  }

  async removeDish(dish: DishDto): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar plato',
      message: `¿Eliminar el plato "${dish.name}"? El plato se desactiva (preserva el historial de pedidos).`,
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (!ok) return;
    this.saving.set(true);
    try {
      await this.menu.deleteDish(dish.id);
      this.notify.success('Plato desactivado');
      await this.loadDishes();
    } catch {
      // El interceptor muestra el toast de error.
    } finally {
      this.saving.set(false);
    }
  }
}
