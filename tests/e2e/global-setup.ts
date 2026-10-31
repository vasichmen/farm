import { request } from '@playwright/test';

export default async function globalSetup(): Promise<void> {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8000';
    const context = await request.newContext();

    try {
        const response = await context.get(baseURL, { timeout: 5000 });

        if (!response.ok()) {
            throw new Error(`Главная страница ответила статусом ${response.status()}.`);
        }
    } catch (error) {
        throw new Error(
            `Не удалось открыть ${baseURL}. Запустите "composer dev" и повторите тесты.`,
            { cause: error },
        );
    } finally {
        await context.dispose();
    }
}
