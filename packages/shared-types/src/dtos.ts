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
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

export interface UserDto {
  id: string;
  email: string;
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
