import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_BRAND_COLORS, DEFAULT_CATEGORIES } from './settings.constants';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) {}

    async getOrCreate(userId: string) {
        let settings = await this.prisma.userSettings.findUnique({
            where: { userId },
        });
        if (!settings) {
            settings = await this.prisma.userSettings.create({
                data: {
                    userId,
                    aiEnabled: true,
                    categories: DEFAULT_CATEGORIES,
                    brandColorMap: DEFAULT_BRAND_COLORS,
                },
            });
        }
        return settings;
    }

    async update(userId: string, dto: UpdateSettingsDto) {
        const existing = await this.getOrCreate(userId);
        return this.prisma.userSettings.update({
            where: { id: existing.id },
            data: {
                aiEnabled: dto.aiEnabled ?? existing.aiEnabled,
                categories: dto.categories ?? existing.categories,
                brandColorMap: dto.brandColorMap ?? existing.brandColorMap,
            },
        });
    }
}
