import { Injectable } from '@nestjs/common';
import { RestaurantSettings } from '@prisma/client';
import { RestaurantSettingsDto } from '@restaurante/shared-types';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateRestaurantSettingsDto } from './dto/update-restaurant-settings.dto';

@Injectable()
export class RestaurantSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(): Promise<RestaurantSettingsDto> {
    const settings = await this.getOrCreate();
    return this.toDto(settings);
  }

  async update(
    dto: UpdateRestaurantSettingsDto,
    actorId: string,
  ): Promise<RestaurantSettingsDto> {
    const settings = await this.getOrCreate();

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;
    if (dto.primaryColor !== undefined) data.primaryColor = dto.primaryColor;
    if (dto.secondaryColor !== undefined) data.secondaryColor = dto.secondaryColor;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.businessInfo !== undefined) data.businessInfo = dto.businessInfo;
    if (dto.currency !== undefined) data.currency = dto.currency;

    const updated = await this.prisma.restaurantSettings.update({
      where: { id: settings.id },
      data,
    });

    await this.audit.record({
      userId: actorId,
      action: 'SETTINGS_UPDATED',
      entity: 'RestaurantSettings',
      entityId: settings.id,
      metadata: { changed: Object.keys(data) },
    });

    return this.toDto(updated);
  }

  private async getOrCreate(): Promise<RestaurantSettings> {
    const existing = await this.prisma.restaurantSettings.findFirst();
    if (existing) {
      return existing;
    }
    return this.prisma.restaurantSettings.create({ data: {} });
  }

  private toDto(settings: RestaurantSettings): RestaurantSettingsDto {
    return {
      id: settings.id,
      name: settings.name,
      logoUrl: settings.logoUrl,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      address: settings.address,
      phone: settings.phone,
      businessInfo: settings.businessInfo,
      currency: settings.currency,
      updatedAt: settings.updatedAt.toISOString(),
    };
  }
}
