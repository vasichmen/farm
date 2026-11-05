export interface PriceUnitView {
    id: string;
    name?: string;
}

const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;
const NBSP = String.fromCharCode(0xa0);

/**
 * Цена по правилам Blade-компонента catalog.price: целые рубли,
 * неразрывный пробел между тысячами и суффикс единицы.
 */
export function formatPrice(price: number, unit: PriceUnitView | null | undefined): string {
    const amount = Math.trunc(price).toString().replace(THOUSANDS, NBSP);
    const suffix = unit?.id === 'rub_per_kg' ? ' ₽/кг' : ' ₽';

    return `${amount}${suffix}`;
}
