import { Module } from '@nestjs/common';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { GeminiService } from '../ai/gemini.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
    imports: [SettingsModule],
    controllers: [BookmarksController],
    providers: [BookmarksService, GeminiService],
    exports: [BookmarksService],
})
export class BookmarksModule { }
