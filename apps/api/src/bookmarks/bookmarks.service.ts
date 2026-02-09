import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';
import { QueryBookmarksDto } from './dto/query-bookmarks.dto';
import * as crypto from 'crypto';
import { SettingsService } from '../settings/settings.service';
import { GeminiService } from '../ai/gemini.service';

@Injectable()
export class BookmarksService {
    constructor(
        private prisma: PrismaService,
        private settingsService: SettingsService,
        private geminiService: GeminiService,
    ) { }

    async create(userId: string, organizationId: string, createBookmarkDto: CreateBookmarkDto) {
        const { url, tags, ...rest } = createBookmarkDto;

        // Generate URL hash for duplicate detection
        const urlHash = this.generateUrlHash(url);

        // Check for duplicate
        const existingBookmark = await this.prisma.bookmark.findUnique({
            where: {
                userId_urlHash: { userId, urlHash },
            },
        });

        if (existingBookmark && !existingBookmark.deletedAt) {
            throw new ConflictException('Bookmark with this URL already exists');
        }

        // Extract domain from URL
        const domain = this.extractDomain(url);

        // Load settings
        const settings = await this.settingsService.getOrCreate(userId);

        // AI auto-categorize
        let aiCategory: string | null = null;
        let aiTags: string[] = [];
        if (settings.aiEnabled && (settings.categories?.length || 0) > 0) {
            const ai = await this.geminiService.categorize({
                title: rest.title,
                url,
                description: rest.description || '',
                categories: settings.categories || [],
            });
            aiCategory = ai.category;
            aiTags = ai.tags;
        }

        // Decide folder based on category if no folderId provided
        let folderId = rest.folderId;
        let suggestedFolderName: string | null = null;
        let suggestedFolderColor: string | null = null;
        if (!folderId && aiCategory) {
            const existingFolder = await this.prisma.folder.findFirst({
                where: {
                    userId,
                    name: aiCategory,
                },
            });
            if (existingFolder) {
                folderId = existingFolder.id;
            } else {
                suggestedFolderName = aiCategory;
                suggestedFolderColor = this.getBrandColor(domain, settings.brandColorMap);
            }
        }

        // Merge tags: user + ai
        const mergedTags = Array.from(
            new Set([...(tags || []), ...(aiTags || [])].map((t) => t.trim()).filter(Boolean))
        );

        // Handle tags: find or create
        let tagConnections: { tagId: string }[] = [];
        if (mergedTags.length > 0) {
            tagConnections = await this.getOrCreateTags(
                userId,
                organizationId,
                mergedTags,
                this.getBrandColor(domain, settings.brandColorMap)
            );
        }

        if (existingBookmark && existingBookmark.deletedAt) {
            // Restore soft-deleted bookmark instead of creating a duplicate
            await this.prisma.bookmarkTag.deleteMany({
                where: { bookmarkId: existingBookmark.id },
            });
            const restored = await this.prisma.bookmark.update({
                where: { id: existingBookmark.id },
                data: {
                    ...rest,
                    url,
                    urlHash,
                    domain,
                    organizationId,
                    folderId: folderId || null,
                    category: aiCategory || null,
                    aiTags,
                    deletedAt: null,
                    tags: {
                        create: tagConnections.map(t => ({ tagId: t.tagId })),
                    },
                },
                include: {
                    folder: { select: { id: true, name: true, color: true } },
                    tags: {
                        include: { tag: { select: { id: true, name: true, color: true } } },
                    },
                },
            });

            return {
                ...this.transformBookmark(restored),
                suggestedFolderName,
                suggestedFolderColor,
            };
        }

        const created = await this.prisma.bookmark.create({
            data: {
                ...rest,
                url,
                urlHash,
                domain,
                userId,
                organizationId,
                folderId: folderId || null,
                category: aiCategory || null,
                aiTags,
                tags: {
                    create: tagConnections.map(t => ({ tagId: t.tagId })),
                },
            },
            include: {
                folder: { select: { id: true, name: true, color: true } },
                tags: {
                    include: { tag: { select: { id: true, name: true, color: true } } },
                },
            },
        });

        return {
            ...this.transformBookmark(created),
            suggestedFolderName,
            suggestedFolderColor,
        };
    }

    async findAll(userId: string, query: QueryBookmarksDto) {
        const { page = 1, limit = 50, folderId, search, isFavorite, isArchived, tags } = query;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {
            userId,
            deletedAt: null,
        };

        if (folderId) {
            where.folderId = folderId;
        }

        if (isFavorite !== undefined) {
            where.isFavorite = isFavorite;
        }

        if (isArchived !== undefined) {
            where.isArchived = isArchived;
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { url: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (tags) {
            const tagNames = tags.split(',').map(t => t.trim());
            where.tags = {
                some: {
                    tag: {
                        name: { in: tagNames },
                    },
                },
            };
        }

        const [bookmarks, total] = await Promise.all([
            this.prisma.bookmark.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    folder: { select: { id: true, name: true, color: true } },
                    tags: {
                        include: { tag: { select: { id: true, name: true, color: true } } },
                    },
                },
            }),
            this.prisma.bookmark.count({ where }),
        ]);

        return {
            data: bookmarks.map(this.transformBookmark),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string, userId: string) {
        const bookmark = await this.prisma.bookmark.findFirst({
            where: { id, userId, deletedAt: null },
            include: {
                folder: { select: { id: true, name: true, color: true } },
                tags: {
                    include: { tag: { select: { id: true, name: true, color: true } } },
                },
            },
        });

        if (!bookmark) {
            throw new NotFoundException('Bookmark not found');
        }

        return this.transformBookmark(bookmark);
    }

    async update(id: string, userId: string, organizationId: string, updateBookmarkDto: UpdateBookmarkDto) {
        const bookmark = await this.prisma.bookmark.findFirst({
            where: { id, userId, deletedAt: null },
        });

        if (!bookmark) {
            throw new NotFoundException('Bookmark not found');
        }

        const { url, tags, ...rest } = updateBookmarkDto;
        const updateData: any = { ...rest };

        // If URL is being updated, regenerate hash and domain
        if (url && url !== bookmark.url) {
            const urlHash = this.generateUrlHash(url);

            // Check for duplicate with new URL
            const existingBookmark = await this.prisma.bookmark.findFirst({
                where: {
                    userId,
                    urlHash,
                    NOT: { id },
                    deletedAt: null,
                },
            });

            if (existingBookmark) {
                throw new ConflictException('Bookmark with this URL already exists');
            }

            updateData.url = url;
            updateData.urlHash = urlHash;
            updateData.domain = this.extractDomain(url);
        }

        // Handle tags update
        if (tags !== undefined) {
            // Delete existing tag connections
            await this.prisma.bookmarkTag.deleteMany({
                where: { bookmarkId: id },
            });

            // Create new tag connections
            if (tags.length > 0) {
                const tagConnections = await this.getOrCreateTags(userId, organizationId, tags);
                await this.prisma.bookmarkTag.createMany({
                    data: tagConnections.map(t => ({
                        bookmarkId: id,
                        tagId: t.tagId,
                    })),
                });
            }
        }

        return this.prisma.bookmark.update({
            where: { id },
            data: updateData,
            include: {
                folder: { select: { id: true, name: true, color: true } },
                tags: {
                    include: { tag: { select: { id: true, name: true, color: true } } },
                },
            },
        }).then(this.transformBookmark);
    }

    async remove(id: string, userId: string) {
        const bookmark = await this.prisma.bookmark.findFirst({
            where: { id, userId, deletedAt: null },
        });

        if (!bookmark) {
            throw new NotFoundException('Bookmark not found');
        }

        // Collect tag ids linked to this bookmark
        const tagLinks = await this.prisma.bookmarkTag.findMany({
            where: { bookmarkId: id },
            select: { tagId: true },
        });
        const tagIds = tagLinks.map((t) => t.tagId);

        // Soft delete and remove tag links
        await this.prisma.$transaction([
            this.prisma.bookmarkTag.deleteMany({ where: { bookmarkId: id } }),
            this.prisma.bookmark.update({
                where: { id },
                data: { deletedAt: new Date() },
            }),
        ]);

        // Remove tags that are no longer referenced
        if (tagIds.length > 0) {
            for (const tagId of tagIds) {
                const remaining = await this.prisma.bookmarkTag.count({
                    where: { tagId },
                });
                if (remaining === 0) {
                    await this.prisma.tag.delete({ where: { id: tagId } });
                }
            }
        }

        return { message: 'Bookmark deleted successfully' };
    }

    async toggleFavorite(id: string, userId: string) {
        const bookmark = await this.prisma.bookmark.findFirst({
            where: { id, userId, deletedAt: null },
        });

        if (!bookmark) {
            throw new NotFoundException('Bookmark not found');
        }

        return this.prisma.bookmark.update({
            where: { id },
            data: { isFavorite: !bookmark.isFavorite },
            include: {
                folder: { select: { id: true, name: true, color: true } },
                tags: {
                    include: { tag: { select: { id: true, name: true, color: true } } },
                },
            },
        }).then(this.transformBookmark);
    }

    async toggleArchive(id: string, userId: string) {
        const bookmark = await this.prisma.bookmark.findFirst({
            where: { id, userId, deletedAt: null },
        });

        if (!bookmark) {
            throw new NotFoundException('Bookmark not found');
        }

        return this.prisma.bookmark.update({
            where: { id },
            data: { isArchived: !bookmark.isArchived },
            include: {
                folder: { select: { id: true, name: true, color: true } },
                tags: {
                    include: { tag: { select: { id: true, name: true, color: true } } },
                },
            },
        }).then(this.transformBookmark);
    }

    async incrementVisitCount(id: string, userId: string) {
        const bookmark = await this.prisma.bookmark.findFirst({
            where: { id, userId, deletedAt: null },
        });

        if (!bookmark) {
            throw new NotFoundException('Bookmark not found');
        }

        return this.prisma.bookmark.update({
            where: { id },
            data: {
                visitCount: { increment: 1 },
                lastVisitedAt: new Date(),
            },
        });
    }

    private generateUrlHash(url: string): string {
        // Normalize URL before hashing
        const normalizedUrl = this.normalizeUrl(url);
        return crypto.createHash('md5').update(normalizedUrl).digest('hex');
    }

    private normalizeUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            // Remove common tracking parameters
            const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'fbclid', 'gclid'];
            trackingParams.forEach(param => urlObj.searchParams.delete(param));
            // Remove www. prefix
            urlObj.hostname = urlObj.hostname.replace(/^www\./, '');
            // Remove trailing slash
            return urlObj.toString().replace(/\/$/, '');
        } catch {
            return url;
        }
    }

    private extractDomain(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace(/^www\./, '');
        } catch {
            return '';
        }
    }

    private async getOrCreateTags(
        userId: string,
        organizationId: string,
        tagNames: string[],
        color?: string | null,
    ): Promise<{ tagId: string }[]> {
        const result: { tagId: string }[] = [];

        for (const name of tagNames) {
            const trimmedName = name.trim();
            if (!trimmedName) continue;

            let tag = await this.prisma.tag.findUnique({
                where: { userId_name: { userId, name: trimmedName } },
            });

            if (!tag) {
                tag = await this.prisma.tag.create({
                    data: {
                        name: trimmedName,
                        userId,
                        organizationId,
                        color: color || undefined,
                    },
                });
            }

            result.push({ tagId: tag.id });
        }

        return result;
    }

    private transformBookmark(bookmark: any) {
        return {
            ...bookmark,
            tags: bookmark.tags?.map((bt: any) => bt.tag) || [],
        };
    }

    private getBrandColor(domain: string, brandColorMap?: any): string | null {
        if (!domain) return null;
        if (!brandColorMap || typeof brandColorMap !== 'object') return null;
        const entries = Object.entries(brandColorMap) as [string, string][];
        const match = entries.find(([key]) => domain.includes(key));
        return match ? match[1] : null;
    }
}
