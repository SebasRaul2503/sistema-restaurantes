// Contratos de respuesta de la API consumidos por la web. Los montos se
// serializan como `number` (soles). Las fechas como ISO string.

import {
  CashMovementType,
  CashSessionStatus,
  OrderItemStatus,
  OrderStatus,
  PaymentMethod,
  TableStatus,
  UserRole,
} from './enums';

export interface AuthUser {
  id: string;
  /** Email opcional (puede ser null si el usuario solo tiene username). */
  email: string | null;
  /** Username opcional (puede ser null si el usuario solo tiene email). */
  username: string | null;
  name: string;
  role: UserRole;
}

/**
 * El access token vive en memoria del cliente (signal). El refresh token
 * viaja como cookie httpOnly: el browser lo envía solo a /api/auth/* y el
 * backend lo lee de la cookie. No se expone al JS ni a XSS.
 */
export interface AuthTokens {
  accessToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

// --- Multi-local: Locales (establecimientos) y membresías ---

/** Local/establecimiento. La marca puede sobreescribir la del tenant. */
export interface RestaurantDto {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Resumen del local con el rol del usuario actual DENTRO de él. */
export interface MyRestaurantDto extends RestaurantDto {
  /** Rol del usuario en este local. Null = superadmin (ve todo sin membresía). */
  role: UserRole | null;
  memberActive: boolean | null;
}

/** Membresía de un usuario en un local. */
export interface RestaurantMemberDto {
  id: string;
  userId: string;
  userName: string;
  /** Email del usuario si tiene; si no, null. */
  userEmail: string | null;
  /** Username del usuario si tiene; si no, null. */
  userUsername: string | null;
  restaurantId: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

/** Payload para crear un local. */
export interface CreateRestaurantDto {
  slug: string;
  name: string;
  address?: string;
  phone?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

/** Payload para actualizar un local. */
export interface UpdateRestaurantDto {
  slug?: string;
  name?: string;
  address?: string;
  phone?: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoUrl?: string | null;
  active?: boolean;
}

/** Payload para asignar un miembro. */
export interface CreateMemberDto {
  userId: string;
  role: UserRole;
}

/** Payload para actualizar un miembro. */
export interface UpdateMemberDto {
  role?: UserRole;
  active?: boolean;
}

/** Marca efectiva para un local (override o tenant). */
export interface RestaurantThemeDto {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

/** Respuesta extendida de `/api/auth/me`: usuario + locales disponibles. */
export interface MeResponse {
  user: AuthUser;
  restaurants: MyRestaurantDto[];
  /**
   * Local activo persistido o null. Lo decide el backend según el header
   * `X-Restaurant-Id` enviado por la web; si no viene o el usuario no tiene
   * acceso, devuelve null.
   */
  activeRestaurantId: string | null;
  /** true si el usuario es superadmin (rol ADMIN sin membresías). */
  isSuperAdmin: boolean;
}

export interface UserDto {
  id: string;
  email: string | null;
  username: string | null;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface RestaurantSettingsDto {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  address: string | null;
  phone: string | null;
  businessInfo: string | null;
  currency: string;
  updatedAt: string;
}

export interface TableDto {
  id: string;
  number: number;
  name: string | null;
  capacity: number;
  status: TableStatus;
  posX: number | null;
  posY: number | null;
  active: boolean;
  /** Resumen del pedido activo si la mesa está ocupada. */
  activeOrder?: OrderSummaryDto | null;
}

export interface MenuCategoryDto {
  id: string;
  name: string;
  sortOrder: number;
  isSystem: boolean;
  active: boolean;
}

export interface DishDto {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  active: boolean;
  categoryId: string;
  category?: MenuCategoryDto;
}

export interface OrderItemDto {
  id: string;
  dishId: string;
  dishName: string;
  unitPrice: number;
  quantity: number;
  notes: string | null;
  status: OrderItemStatus;
  isModified: boolean;
  replacesItemId: string | null;
  deliveredAt: string | null;
  subtotal: number;
}

export interface OrderSummaryDto {
  id: string;
  code: number;
  tableId: string;
  tableNumber: number;
  status: OrderStatus;
  itemCount: number;
  total: number;
  paid: number;
  balance: number;
  openedAt: string;
}

export interface OrderDto extends OrderSummaryDto {
  notes: string | null;
  openedByName: string;
  closedAt: string | null;
  items: OrderItemDto[];
  billGroups: BillGroupDto[];
  payments: PaymentDto[];
}

export interface BillGroupItemDto {
  id: string;
  orderItemId: string;
  dishName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface BillGroupDto {
  id: string;
  name: string;
  fixedAmount: number | null;
  items: BillGroupItemDto[];
  total: number;
  paid: number;
  balance: number;
}

export interface KitchenItemDto {
  id: string;
  orderId: string;
  orderCode: number;
  tableNumber: number;
  dishName: string;
  quantity: number;
  notes: string | null;
  status: OrderItemStatus;
  /** true si es un reemplazo de un plato corregido. */
  isReplacement: boolean;
  createdAt: string;
}

export interface PaymentDto {
  id: string;
  orderId: string;
  billGroupId: string | null;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  createdByName: string;
  createdAt: string;
}

export interface CashMovementDto {
  id: string;
  type: CashMovementType;
  amount: number;
  description: string;
  createdByName: string;
  createdAt: string;
}

export interface CashSessionDto {
  id: string;
  openingAmount: number;
  expectedAmount: number | null;
  actualAmount: number | null;
  difference: number | null;
  status: CashSessionStatus;
  notes: string | null;
  openedByName: string;
  openedAt: string;
  closedAt: string | null;
  movements: CashMovementDto[];
  /** Totales calculados de la sesión en curso. */
  cashSales?: number;
  totalIncome?: number;
  totalExpense?: number;
}

export interface AuditLogDto {
  id: string;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// --- Reportes ---

export interface DashboardDto {
  tablesFree: number;
  tablesOccupied: number;
  tablesReserved: number;
  tablesOutOfService: number;
  activeOrders: number;
  itemsPending: number;
  itemsPreparing: number;
  itemsDelivered: number;
  revenueToday: number;
  revenueMonth: number;
}

export interface RevenuePointDto {
  date: string;
  total: number;
}

export interface TopDishDto {
  dishId: string;
  dishName: string;
  quantity: number;
  total: number;
}

export interface TopTableDto {
  tableId: string;
  tableNumber: number;
  orderCount: number;
  total: number;
}

export interface RevenueByMethodDto {
  method: PaymentMethod;
  total: number;
  count: number;
}
