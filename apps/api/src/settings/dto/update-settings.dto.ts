import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
    @IsBoolean()
    @IsOptional()
    aiEnabled?: boolean;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    categories?: string[];

    @IsOptional()
    brandColorMap?: Record<string, string>;
}
