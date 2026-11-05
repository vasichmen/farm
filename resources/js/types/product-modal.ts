import { z } from 'zod';

/**
 * Поля товара, которые нужны окну. Остальные ключи page-ресурса
 * (id, slug категории, sale_unit, даты) схемой отбрасываются.
 */
export const productStatusIdSchema = z.enum(['in_stock', 'few', 'preorder', 'out']);

export const priceUnitSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
});

export const productModalProductSchema = z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    story_title: z.string().nullable(),
    description: z.string(),
    pack: z.string(),
    facts: z.array(z.string()),
    price: z.number(),
    price_unit: priceUnitSchema,
    status: z.object({
        id: productStatusIdSchema,
        name: z.string().min(1),
    }),
    stock: z.number().int().nullable(),
    icon: z.string(),
    category: z.object({
        name: z.string().min(1),
    }),
    harvest: z.string().nullable(),
});

export const productModalSchema = z.object({
    products: z.array(productModalProductSchema),
    initial_product: productModalProductSchema.nullable(),
    preorder_url: z.string().min(1),
});

export type ProductModalProduct = z.infer<typeof productModalProductSchema>;
export type ProductModalProps = z.infer<typeof productModalSchema>;
export type ProductStatusId = z.infer<typeof productStatusIdSchema>;
