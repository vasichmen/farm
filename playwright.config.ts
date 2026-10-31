import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8000';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: 'list',
    use: {
        baseURL,
        trace: 'on-first-retry',
        launchOptions: {
            // Перехват HTML в тестах переводит документ в «public» address space,
            // и Chromium блокирует загрузку ресурсов Vite с loopback. Отключаем PNA только в тестах.
            args: [
                '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults,BlockInsecurePrivateNetworkRequests',
            ],
        },
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    globalSetup: './tests/e2e/global-setup.ts',
});
