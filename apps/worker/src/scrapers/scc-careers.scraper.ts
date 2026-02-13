import { CheerioCrawler, type CheerioCrawlingContext } from 'crawlee';
import { BaseScraper, type ScrapeParams } from './base-scraper';
import type { ScrapedJob } from '@jobflow/shared/types';
import { parseSalary } from '@jobflow/shared/utils';

/**
 * Sunshine Coast Council Careers scraper.
 * Easy tier — government site, simple HTML. Cheerio is sufficient.
 */
export class SccCareersScraper extends BaseScraper {
  readonly board = 'scc-careers' as const;
  readonly name = 'SCC Careers';

  buildSearchUrl(_params: ScrapeParams): string {
    // SCC Careers has a simpler search — may not support keyword filtering via URL
    // We scrape all current listings and filter in post-processing
    return 'https://careers.sunshinecoast.qld.gov.au/jobs';
  }

  async scrape(params: ScrapeParams): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];
    const searchUrl = this.buildSearchUrl(params);
    const keywordsLower = params.keywords.map((k) => k.toLowerCase());

    const crawler = new CheerioCrawler({
      maxRequestsPerCrawl: 50,
      maxConcurrency: 1,
      requestHandlerTimeoutSecs: 30,

      async requestHandler({ $, request }: CheerioCrawlingContext) {
        if (request.label === 'DETAIL') {
          const title = $('h1, .job-title').first().text().trim();
          const description = $(
            '.job-description, .job-content, .job-detail__content'
          )
            .text()
            .trim();
          const locationRaw = $(
            '.job-location, [class*="location"]'
          )
            .first()
            .text()
            .trim();
          const salaryRaw = $(
            '.job-salary, [class*="salary"], [class*="classification"]'
          )
            .first()
            .text()
            .trim();
          const employmentType = $(
            '.job-type, [class*="employment"], [class*="work-type"]'
          )
            .first()
            .text()
            .trim();

          const salary = parseSalary(salaryRaw);
          const externalId =
            request.url.match(/\/jobs\/(\d+)/)?.[1] ??
            request.url.match(/\/([^/]+)\/?$/)?.[1] ??
            request.url;

          // Post-processing: only include if title/description matches keywords
          const titleLower = title.toLowerCase();
          const descLower = description.toLowerCase();
          const matchesKeyword = keywordsLower.some(
            (kw) => titleLower.includes(kw) || descLower.includes(kw)
          );

          if (title && matchesKeyword) {
            jobs.push({
              externalId,
              title,
              company: 'Sunshine Coast Council',
              description,
              locationRaw: locationRaw || 'Sunshine Coast, QLD',
              sourceUrl: request.url,
              sourceBoard: 'scc-careers',
              salaryDisplay: salary.display || undefined,
              salaryMin: salary.min,
              salaryMax: salary.max,
              salaryType: salary.type !== 'unknown' ? salary.type : undefined,
              employmentType: employmentType || undefined,
              category: 'Local Government',
            });
          }
          return;
        }

        // Parse job listing page
        const jobCards = $(
          'a[href*="/jobs/"], .job-listing a, .vacancy a'
        );
        jobCards.each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            const fullUrl = href.startsWith('http')
              ? href
              : `https://careers.sunshinecoast.qld.gov.au${href}`;
            crawler.addRequests([{ url: fullUrl, label: 'DETAIL' }]);
          }
        });

        // Pagination
        const nextPage = $('a[rel="next"], .pagination a.next').attr('href');
        if (nextPage) {
          const fullUrl = nextPage.startsWith('http')
            ? nextPage
            : `https://careers.sunshinecoast.qld.gov.au${nextPage}`;
          crawler.addRequests([{ url: fullUrl }]);
        }
      },
    });

    await crawler.run([searchUrl]);
    return jobs;
  }
}
