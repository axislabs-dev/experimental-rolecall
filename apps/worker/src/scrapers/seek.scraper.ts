import {
  PlaywrightCrawler,
  ProxyConfiguration,
  type PlaywrightCrawlingContext,
} from 'crawlee';
import { BaseScraper, type ScrapeParams } from './base-scraper';
import type { ScrapedJob } from '@jobflow/shared/types';
import { parseSalary } from '@jobflow/shared/utils';

/**
 * SEEK AU scraper.
 * Hard tier — aggressive anti-bot. Requires Playwright + AU residential proxy.
 *
 * NOTE: This is a stub implementation. SEEK's anti-bot measures are aggressive
 * and will need ongoing maintenance. The selectors below are best-effort and
 * may need updating as SEEK changes their markup.
 */
export class SeekScraper extends BaseScraper {
  readonly board = 'seek' as const;
  readonly name = 'SEEK';

  buildSearchUrl(params: ScrapeParams): string {
    const keyword = params.keywords.join(' ');
    const encoded = encodeURIComponent(keyword);
    const location = encodeURIComponent(params.location);
    return `https://www.seek.com.au/${encoded}-jobs/in-${location}?sortmode=ListedDate`;
  }

  private getProxyConfig(): ProxyConfiguration | undefined {
    const host = process.env.WEBSHARE_PROXY_HOST;
    const port = process.env.WEBSHARE_PROXY_PORT;
    const user = process.env.WEBSHARE_PROXY_USER;
    const pass = process.env.WEBSHARE_PROXY_PASS;

    if (!host || !port || !user || !pass) {
      console.warn('[seek] No proxy configured — SEEK will likely block requests');
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
      maxRequestsPerCrawl: 25,
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
          // Longer delays for SEEK to avoid detection
          const delay = 3000 + Math.random() * 5000;
          await new Promise((r) => setTimeout(r, delay));
        },
      ],

      async requestHandler({ page, request }: PlaywrightCrawlingContext) {
        if (request.label === 'DETAIL') {
          await page.waitForSelector('h1', { timeout: 15000 });

          const title = await page
            .locator('h1[data-automation="job-detail-title"]')
            .first()
            .textContent()
            .catch(() => '');
          const company = await page
            .locator('[data-automation="advertiser-name"]')
            .first()
            .textContent()
            .catch(() => '');
          const locationRaw = await page
            .locator('[data-automation="job-detail-location"]')
            .first()
            .textContent()
            .catch(() => '');
          const description = await page
            .locator('[data-automation="jobAdDetails"]')
            .first()
            .textContent()
            .catch(() => '');
          const salaryRaw = await page
            .locator('[data-automation="job-detail-salary"]')
            .first()
            .textContent()
            .catch(() => '');
          const employmentType = await page
            .locator('[data-automation="job-detail-work-type"]')
            .first()
            .textContent()
            .catch(() => '');

          const externalId =
            request.url.match(/\/job\/(\d+)/)?.[1] ?? request.url;
          const salary = parseSalary(salaryRaw ?? '');

          if (title) {
            jobs.push({
              externalId,
              title: title.trim(),
              company: (company ?? '').trim(),
              description: (description ?? '').trim(),
              locationRaw: (locationRaw ?? '').trim(),
              sourceUrl: request.url,
              sourceBoard: 'seek',
              salaryDisplay: salary.display || undefined,
              salaryMin: salary.min,
              salaryMax: salary.max,
              salaryType: salary.type !== 'unknown' ? salary.type : undefined,
              employmentType: (employmentType ?? '').trim() || undefined,
            });
          }
          return;
        }

        // Parse search results
        await page.waitForSelector('[data-automation="searchResults"]', {
          timeout: 15000,
        });

        const jobCards = await page.$$('article[data-card-type="JobCard"]');
        for (const card of jobCards) {
          const linkEl = await card.$('a[data-automation="jobTitle"]');
          if (linkEl) {
            const href = await linkEl.getAttribute('href');
            if (href) {
              const fullUrl = href.startsWith('http')
                ? href
                : `https://www.seek.com.au${href}`;
              await crawler.addRequests([
                { url: fullUrl, label: 'DETAIL' },
              ]);
            }
          }
        }

        // Pagination
        const nextBtn = await page.$('a[data-automation="page-next"]');
        if (nextBtn) {
          const nextHref = await nextBtn.getAttribute('href');
          if (nextHref) {
            const fullUrl = nextHref.startsWith('http')
              ? nextHref
              : `https://www.seek.com.au${nextHref}`;
            await crawler.addRequests([{ url: fullUrl }]);
          }
        }
      },
    });

    await crawler.run([searchUrl]);
    return jobs;
  }
}
