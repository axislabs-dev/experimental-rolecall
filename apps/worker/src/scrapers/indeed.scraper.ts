import {
  PlaywrightCrawler,
  ProxyConfiguration,
  type PlaywrightCrawlingContext,
} from 'crawlee';
import { BaseScraper, type ScrapeParams } from './base-scraper';
import type { ScrapedJob } from '@jobflow/shared/types';
import { parseSalary } from '@jobflow/shared/utils';

/**
 * Indeed AU scraper.
 * Uses Playwright for JS rendering + stealth. Requires residential proxy.
 */
export class IndeedScraper extends BaseScraper {
  readonly board = 'indeed' as const;
  readonly name = 'Indeed AU';

  buildSearchUrl(params: ScrapeParams): string {
    const keyword = params.keywords.join(' ');
    const encoded = encodeURIComponent(keyword);
    const location = encodeURIComponent(params.location);
    const radius = params.radiusKm;
    return `https://au.indeed.com/jobs?q=${encoded}&l=${location}&radius=${radius}`;
  }

  private getProxyConfig(): ProxyConfiguration | undefined {
    const host = process.env.WEBSHARE_PROXY_HOST;
    const port = process.env.WEBSHARE_PROXY_PORT;
    const user = process.env.WEBSHARE_PROXY_USER;
    const pass = process.env.WEBSHARE_PROXY_PASS;

    if (!host || !port || !user || !pass) {
      console.warn('[indeed] No proxy configured, running without proxy');
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
      // Randomized delays to appear human
      preNavigationHooks: [
        async () => {
          const delay = 2000 + Math.random() * 3000; // 2-5 seconds
          await new Promise((r) => setTimeout(r, delay));
        },
      ],

      async requestHandler({ page, request }: PlaywrightCrawlingContext) {
        if (request.label === 'DETAIL') {
          // Parse individual job page
          await page.waitForSelector('h1', { timeout: 10000 });

          const title = await page
            .locator('h1')
            .first()
            .textContent()
            .catch(() => '');
          const company = await page
            .locator('[data-testid="inlineHeader-companyName"], .css-1saizt3')
            .first()
            .textContent()
            .catch(() => '');
          const locationRaw = await page
            .locator(
              '[data-testid="inlineHeader-companyLocation"], [data-testid="job-location"]'
            )
            .first()
            .textContent()
            .catch(() => '');
          const description = await page
            .locator('#jobDescriptionText, .jobsearch-jobDescriptionText')
            .first()
            .textContent()
            .catch(() => '');
          const salaryRaw = await page
            .locator('#salaryInfoAndJobType, [data-testid="attribute_snippet_testid"]')
            .first()
            .textContent()
            .catch(() => '');

          const salary = parseSalary(salaryRaw ?? '');
          const urlObj = new URL(request.url);
          const externalId =
            urlObj.searchParams.get('jk') ??
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
              sourceBoard: 'indeed',
              salaryDisplay: salary.display || undefined,
              salaryMin: salary.min,
              salaryMax: salary.max,
              salaryType:
                salary.type !== 'unknown' ? salary.type : undefined,
            });
          }
          return;
        }

        // Parse search results page
        await page.waitForSelector('.job_seen_beacon, .jobsearch-ResultsList', {
          timeout: 15000,
        });

        const jobCards = await page.$$('.job_seen_beacon, [data-jk]');
        for (const card of jobCards) {
          const linkEl = await card.$('a[data-jk], h2 a');
          if (linkEl) {
            const href = await linkEl.getAttribute('href');
            if (href) {
              const fullUrl = href.startsWith('http')
                ? href
                : `https://au.indeed.com${href}`;
              await crawler.addRequests([
                { url: fullUrl, label: 'DETAIL' },
              ]);
            }
          }
        }

        // Pagination
        const nextBtn = await page.$('a[data-testid="pagination-page-next"]');
        if (nextBtn) {
          const nextHref = await nextBtn.getAttribute('href');
          if (nextHref) {
            const fullUrl = nextHref.startsWith('http')
              ? nextHref
              : `https://au.indeed.com${nextHref}`;
            await crawler.addRequests([{ url: fullUrl }]);
          }
        }
      },
    });

    await crawler.run([searchUrl]);
    return jobs;
  }
}
