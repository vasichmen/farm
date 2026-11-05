<div class="catalog-skeleton" aria-hidden="true">
    <div class="catalog-skeleton__title"></div>
    <div class="catalog-skeleton__title catalog-skeleton__title--short"></div>
    <div class="catalog-skeleton__lead"></div>
    <div class="catalog-skeleton__lead catalog-skeleton__lead--short"></div>

    <div class="card-grid catalog-skeleton__grid">
        @for ($index = 0; $index < 8; $index++)
            <div class="catalog-skeleton__card">
                <div class="catalog-skeleton__icon"></div>
                <div class="catalog-skeleton__line"></div>
                <div class="catalog-skeleton__line catalog-skeleton__line--short"></div>
            </div>
        @endfor
    </div>
</div>
