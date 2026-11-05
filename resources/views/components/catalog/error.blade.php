<div class="catalog-state catalog-state--error">
    <span class="catalog-state__icon catalog-state__icon--error">
        <x-ui-icon name="error" />
    </span>
    <h2 class="catalog-state__title">Не получилось загрузить товары</h2>
    <p class="catalog-state__text">
        Проверьте интернет и попробуйте ещё раз. Колесо и сезоны работают, товары подгрузятся.
    </p>
    <a class="catalog-state__button catalog-state__button--filled" href="{{ url()->full() }}">
        ПОВТОРИТЬ
    </a>
</div>
