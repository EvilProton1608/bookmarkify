import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    getSettings(@CurrentUser() user: any) {
        return this.settingsService.getOrCreate(user.id);
    }

    @Put()
    updateSettings(@CurrentUser() user: any, @Body() dto: UpdateSettingsDto) {
        return this.settingsService.update(user.id, dto);
    }
}
