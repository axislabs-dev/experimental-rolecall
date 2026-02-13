import { CheerioCrawler, type CheerioCrawlingContext } from 'crawlee';
import { BaseScraper, type ScrapeParams } from './base-scraper';
import type { ScrapedJob } from '@jobflow/shared/types';
import { parseSalary } from '@jobflow/shared/utils';

/**
 * EthicalJobs scraper.
 * Easy tier — simple HTML, NFP/community sector. Cheerio is sufficient.
 */
export class EthicalJobsScraper extends BaseScraper {
  readonly board = 'ethical-jobs' as const;
  readonly name = 'EthicalJobs';

  buildSearchUrl(params: ScrapeParams): string {
    const keyword = params.keywords.join(' ');
    const encoded = encodeURIComponent(keyword);
    const location = encodeURIComponent(params.location);
    return `https://www.ethicaljobs.com.au/jobs?keywords=${encoded}&location=${location}`;
  }

  async scrape(params: ScrapeParams): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];
    const searchUrl = this.buildSearchUrl(params);

    const crawler = new CheerioCrawler({
      maxRequestsPerCrawl: 50,
      maxConcurrency: 1,
      requestHandlerTimeoutSecs: 30,

      async requestHandler({ $, request }: CheerioCrawlingContext) {
        if (request.label === 'DETAIL') {
          const title = $('h1').first().text().trim();
          const company = $('.organisation-name, .employer-name')
            .first()
            .text()
            .trim();
          const description = $(
            '.job-description, .job-content, [class*="description"]'
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
            '.job-salary, [class*="salary"]'
          )
            .first()
            .text()
            .trim();
          const employmentType = $(
            '.job-type, [class*="work-type"]'
          )
            .first()
            .text()
            .trim();

          const salary = parseSalary(salaryRaw);
          const externalId =
            request.url.match(/\/jobs\/(\d+)/)?.[1] ?? request.url;

          if (title) {
            jobs.push({
              externalId,
              title,
              company: company || 'Unknown Organisation',
              description,
              locationRaw,
              sourceUrl: request.url,
              sourceBoard: 'ethical-jobs',
              salaryDisplay: salary.display || undefined,
              salaryMin: salary.min,
              salaryMax: salary.max,
              salaryType: salary.type !== 'unknown' ? salary.type : undefined,
              employmentType: employmentType || undefined,
              category: 'Not-for-profit',
            });
          }
          return;
        }

        // Parse search results
        const jobCards = $(
          'a[href*="/jobs/"], .job-listing a, .search-result a'
        );
        jobCards.each((_, el) => {
          const href = $(el).attr('href');
          if (href && /\/jobs\/\d+/.test(href)) {
            const fullUrl = href.startsWith('http')
              ? href
              : `https://www.ethicaljobs.com.au${href}`;
            crawler.addRequests([{ url: fullUrl, label: 'DETAIL' }]);
          }
        });

        // Pagination
        const nextPage = $('a[rel="next"], .pagination a.next').attr('href');
        if (nextPage) {
          const fullUrl = nextPage.startsWith('http')
            ? nextPage
            : `https://www.ethicaljobs.com.au${nextPage}`;
          crawler.addRequests([{ url: fullUrl }]);
        }
      },
    });

    await crawler.run([searchUrl]);
    return jobs;
  }
}
