import { z } from 'zod';

/**
 * Данные острова карусели: только идентификатор серверного трека.
 * Карточки остаются в HTML, остров управляет прокруткой соседнего региона.
 */
export const catalogCarouselSchema = z.object({
    track_id: z.string().min(1),
});

export type CatalogCarouselProps = z.infer<typeof catalogCarouselSchema>;
