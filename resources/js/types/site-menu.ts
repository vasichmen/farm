import { z } from 'zod';

export const siteMenuItemSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    url: z.string().min(1),
    active: z.boolean(),
});

export const siteMenuContactLinkSchema = z.object({
    label: z.string().min(1),
    href: z.string().min(1),
});

export const siteMenuSocialSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    url: z.string().min(1).nullable(),
});

export const siteMenuContactsSchema = z.object({
    address: z.string().min(1),
    phone: siteMenuContactLinkSchema,
    email: siteMenuContactLinkSchema,
    socials: z.array(siteMenuSocialSchema).length(2),
});

export const siteMenuSchema = z
    .object({
        items: z.array(siteMenuItemSchema).length(5),
        contacts: siteMenuContactsSchema,
    })
    .superRefine((data, context) => {
        const ids = new Set<string>();
        let activeCount = 0;

        data.items.forEach((item, index) => {
            if (ids.has(item.id)) {
                context.addIssue({
                    code: 'custom',
                    message: `Пункт меню с id "${item.id}" повторяется.`,
                    path: ['items', index, 'id'],
                });
            }

            ids.add(item.id);

            if (item.active) {
                activeCount += 1;
            }
        });

        if (activeCount > 1) {
            context.addIssue({
                code: 'custom',
                message: 'Активным может быть не более одного пункта меню.',
                path: ['items'],
            });
        }
    });

export type SiteMenuItem = z.infer<typeof siteMenuItemSchema>;
export type SiteMenuContactLink = z.infer<typeof siteMenuContactLinkSchema>;
export type SiteMenuSocial = z.infer<typeof siteMenuSocialSchema>;
export type SiteMenuContacts = z.infer<typeof siteMenuContactsSchema>;
export type SiteMenuProps = z.infer<typeof siteMenuSchema>;
