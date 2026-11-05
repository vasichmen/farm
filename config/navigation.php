<?php

/**
 * Единый источник навигации сайта: шапка, меню и подписи разделов.
 *
 * `route` — имя маршрута Laravel, `in_header` — пункт показывается в шапке,
 * `in_menu` — пункт показывается в открытом меню.
 */
return [
    'items' => [
        [
            'id' => 'about',
            'label' => 'О семье',
            'route' => 'about',
            'in_header' => true,
            'in_menu' => true,
        ],
        [
            'id' => 'seasons',
            'label' => 'Сезоны',
            'route' => 'home',
            'in_header' => true,
            'in_menu' => true,
        ],
        [
            'id' => 'preorder',
            'label' => 'Предзаказ',
            'route' => 'preorder',
            'in_header' => false,
            'in_menu' => true,
        ],
        [
            'id' => 'how-to-order',
            'label' => 'Как заказать',
            'route' => 'how-to-order',
            'in_header' => true,
            'in_menu' => true,
        ],
        [
            'id' => 'contacts',
            'label' => 'Контакты',
            'route' => 'contacts',
            'in_header' => false,
            'in_menu' => true,
        ],
    ],

    'contacts' => [
        'address' => 'Московская область, деревня Лыково',
        'phone' => [
            'label' => '+7 900 000-00-00',
            'href' => 'tel:+79000000000',
        ],
        'email' => [
            'label' => 'hello@lykovo.example',
            'href' => 'mailto:hello@lykovo.example',
        ],
        'socials' => [
            [
                'id' => 'telegram',
                'label' => 'Telegram',
                'url' => null,
            ],
            [
                'id' => 'vk',
                'label' => 'VK',
                'url' => null,
            ],
        ],
    ],
];
