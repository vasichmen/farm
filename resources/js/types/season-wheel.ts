import { z } from 'zod';

/**
 * Порядок сезонов по часовой стрелке: лето → осень → зима → весна.
 * Не совпадает с sort_order из БД (там годовая цепочка начинается с весны).
 */
export const WHEEL_ORDER = ['summer', 'autumn', 'winter', 'spring'] as const;

export type WheelSeasonSlug = (typeof WHEEL_ORDER)[number];

export const wheelProductSchema = z.object({
    name: z.string().min(1),
    icon: z.string().min(1),
});

export const wheelSeasonSchema = z.object({
    slug: z.enum(WHEEL_ORDER),
    name: z.string().min(1),
    sub: z.string().max(7),
    url: z.string().min(1),
    products_count: z.number().int().nonnegative(),
    products: z.array(wheelProductSchema),
});

export const seasonWheelSchema = z
    .object({
        active_season: z.enum(WHEEL_ORDER),
        seasons: z.array(wheelSeasonSchema).length(WHEEL_ORDER.length),
    })
    .superRefine((data, context) => {
        const slugs = new Set(data.seasons.map((season) => season.slug));

        if (slugs.size !== WHEEL_ORDER.length || WHEEL_ORDER.some((slug) => !slugs.has(slug))) {
            context.addIssue({
                code: 'custom',
                message: 'Колесо должно содержать четыре уникальных сезона из WHEEL_ORDER.',
                path: ['seasons'],
            });
        }

        if (!slugs.has(data.active_season)) {
            context.addIssue({
                code: 'custom',
                message: 'Активный сезон должен присутствовать в списке сезонов колеса.',
                path: ['active_season'],
            });
        }
    });

export type WheelProduct = z.infer<typeof wheelProductSchema>;
export type WheelSeason = z.infer<typeof wheelSeasonSchema>;
export type SeasonWheelProps = z.infer<typeof seasonWheelSchema>;
