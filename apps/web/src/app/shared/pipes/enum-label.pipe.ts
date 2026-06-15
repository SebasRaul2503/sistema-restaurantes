import { Pipe, PipeTransform } from '@angular/core';
import {
  CASH_MOVEMENT_TYPE_LABELS,
  ORDER_ITEM_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  TABLE_STATUS_LABELS,
  USER_ROLE_LABELS,
} from '@restaurante/shared-types';

type LabelKind = 'tableStatus' | 'orderStatus' | 'itemStatus' | 'paymentMethod' | 'movementType' | 'role';

const MAPS: Record<LabelKind, Record<string, string>> = {
  tableStatus: TABLE_STATUS_LABELS,
  orderStatus: ORDER_STATUS_LABELS,
  itemStatus: ORDER_ITEM_STATUS_LABELS,
  paymentMethod: PAYMENT_METHOD_LABELS,
  movementType: CASH_MOVEMENT_TYPE_LABELS,
  role: USER_ROLE_LABELS,
};

/** Traduce un valor de enum a su etiqueta en español. Uso: value | enumLabel:'tableStatus' */
@Pipe({ name: 'enumLabel', standalone: true })
export class EnumLabelPipe implements PipeTransform {
  transform(value: string | null | undefined, kind: LabelKind): string {
    if (!value) return '';
    return MAPS[kind]?.[value] ?? value;
  }
}
