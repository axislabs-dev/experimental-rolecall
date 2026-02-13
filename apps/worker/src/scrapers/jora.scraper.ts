import {
  PlaywrightCrawler,
  ProxyConfiguration,
  type PlaywrightCrawlingContext,
} from 'crawlee';
import { BaseScraper, type ScrapeParams } from './base-scraper';
import type { ScrapedJob } from '@jobflow/shared/types';
import { parseSalary } from '@jobflow/shared/utils';

/**
 * Jora AU scraper.
 * Medium tier — JS-rendered, moderate anti-bot. Uses Playwright with proxy.
 *
 * Jora is an Indeed-owned aggregator. Selectors may change frequently.
 */
export class JoraScraper extends BaseScraper {
  readonly board = 'jora' as const;
  readonly name = 'Jora';

  buildSearchUrl(params: ScrapeParams): string {
    const keyword = params.keywords.join(' ');
    const encoded = encodeURIComponent(keyword);
    const location = encodeURIComponent(params.location);
    return `https://au.jora.com/j?q=${encoded}&l=${location}&r=${params.radiusKm}`;
  }

  private getProxyConfig(): ProxyConfiguration | undefined {
    const host = process.env.WEBSHARE_PROXY_HOST;
    const port = process.env.WEBSHARE_PROXY_PORT;
    const user = process.env.WEBSHARE_PROXY_USER;
    const pass = process.env.WEBSHARE_PROXY_PASS;

    if (!host || !port || !user || !pass) {
      console.warn('[jora] No proxy configured, running without proxy');
      return undefined;
    }

    return new ProxyConfiguration({
      proxyUrls: [`http://${user}:${pass}@${host}:${port}`],
    });
  }

  async scrape(params: ScrapeParams): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];
    const searchUrl = this.buildSearchUrl(params);
    const proxyConfig = this.getProxyConfig();

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 30,
      maxConcurrency: 1,
      navigationTimeoutSecs: 60,
      requestHandlerTimeoutSecs: 60,
      ...(proxyConfig && { proxyConfiguration: proxyConfig }),
      launchContext: {
        launchOptions: {
          headless: true,
        },
      },
      preNavigationHooks: [
        async () => {
          const delay = 2000 + Math.random() * 3000;
          await new Promise((r) => setTimeout(r, delay));
        },
      ],

      async requestHandler({ page, request }: PlaywrightCrawlingContext) {
        if (request.label === 'DETAIL') {
          await page.waitForSelector('h1', { timeout: 10000 });

          const title = await page
            .locator('h1')
            .first()
            .textContent()
            .catch(() => '');
          const company = await page
            .locator('.company, [data-testid="company-name"]')
            .first()
            .textContent()
            .catch(() => '');
          const locationRaw = await page
            .locator('.location, [data-testid="job-location"]')
            .first()
            .textContent()
            .catch(() => '');
          const description = await page
            .locator('.job-description, .desc')
            .first()
            .textContent()
            .catch(() => '');
          const salaryRaw = await page
            .locator('.salary, [data-testid="job-salary"]')
            .first()
            .textContent()
            .catch(() => '');

          const salary = parseSalary(salaryRaw ?? '');
          const externalId =
            request.url.match(/[?&]id=([^&]+)/)?.[1] ??
            request.url.split('/').pop() ??
            '';

          if (title) {
            jobs.push({
              externalId,
              title: title.trim(),
              company: (company ?? '').trim(),
              description: (description ?? '').trim(),
              locationRaw: (locationRaw ?? '').trim(),
              sourceUrl: request.url,
              sourceBoard: 'jora',
              salaryDisplay: salary.display || undefined,
              salaryMin: salary.min,
              salaryMax: salary.max,
              salaryType: salary.type !== 'unknown' ? salary.type : undefined,
            });
          }
          return;
        }

        // Parse search results
        await page.waitForSelector('.result, .job-card', {
          timeout: 15000,
        });

        const jobCards = await page.$$('.result, .job-card');
        for (const card of jobCards) {
          const linkEl = await card.$('a[href*="/j?"]');
          if (linkEl) {
            const href = await linkEl.getAttribute('href');
            if (href) {
              const fullUrl = href.startsWith('http')
                ? href
                : `https://au.jora.com${href}`;
              await crawler.addRequests([
                { url: fullUrl, label: 'DETAIL' },
              ]);
            }
          }
        }

        // Pagination
        const nextBtn = await page.$('a.next, a[rel="next"]');
        if (nextBtn) {
          const nextHref = await nextBtn.getAttribute('href');
          if (nextHref) {
            const fullUrl = nextHref.startsWith('http')
              ? nextHref
              : `https://au.jora.com${nextHref}`;
            await crawler.addRequests([{ url: fullUrl }]);
          }
        }
      },
    });

    await crawler.run([searchUrl]);
    return jobs;
  }
}
