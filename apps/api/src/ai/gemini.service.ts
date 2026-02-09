import { Injectable } from '@nestjs/common';

@Injectable()
export class GeminiService {
    private apiKey = process.env.GEMINI_API_KEY || '';
    private model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

    async categorize(input: {
        title: string;
        url: string;
        description?: string | null;
        categories: string[];
    }): Promise<{ category: string | null; tags: string[] }> {
        if (!this.apiKey) {
            return { category: null, tags: [] };
        }

        const prompt = [
            'You are a categorization assistant.',
            `Allowed categories: ${input.categories.join(', ')}`,
            'Return a JSON object with keys: category (string), tags (string array).',
            'Use only allowed categories. If unsure, pick the closest.',
            '',
            `Title: ${input.title}`,
            `URL: ${input.url}`,
            `Description: ${input.description || ''}`,
        ].join('\n');

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: prompt }],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 256,
                    },
                }),
            }
        );

        if (!res.ok) {
            return { category: null, tags: [] };
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            return { category: null, tags: [] };
        }

        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const json = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
            const category = typeof json.category === 'string' ? json.category : null;
            const tags = Array.isArray(json.tags) ? json.tags.filter((t) => typeof t === 'string') : [];
            return { category, tags };
        } catch {
            return { category: null, tags: [] };
        }
    }
}
