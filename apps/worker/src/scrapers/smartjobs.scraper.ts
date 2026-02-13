import { CheerioCrawler, type CheerioCrawlingContext } from 'crawlee';
import { BaseScraper, type ScrapeParams } from './base-scraper';
import type { ScrapedJob } from '@jobflow/shared/types';
import { parseSalary } from '@jobflow/shared/utils';

/**
 * SmartJobs QLD (smartjobs.qld.gov.au) scraper.
 * Government site — simple HTML, no anti-bot, Cheerio is sufficient.
 */
export class SmartJobsScraper extends BaseScraper {
  readonly board = 'smartjobs' as const;
  readonly name = 'SmartJobs QLD';

  buildSearchUrl(params: ScrapeParams): string {
    const keyword = params.keywords.join(' ');
    const encoded = encodeURIComponent(keyword);
    // SmartJobs search URL pattern
    return `https://smartjobs.qld.gov.au/jobs/search?query=${encoded}&location=${encodeURIComponent(params.location)}`;
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
          // Parse individual job page
          const title = $('h1').first().text().trim();
          const description = $('.job-detail__content, .job-description')
            .text()
            .trim();
          const details = $('.job-detail__info, .job-details');

          const locationRaw =
            details.find('[data-field="location"]').text().trim() ||
            $('meta[name="location"]').attr('content') ||
            '';

          const salaryRaw =
            details.find('[data-field="salary"]').text().trim() || '';
          const salary = parseSalary(salaryRaw);

          const employmentType =
            details.find('[data-field="position-type"]').text().trim() || '';

          const company =
            details.find('[data-field="department"]').text().trim() ||
            'Queensland Government';

          const jobRefMatch = request.url.match(/QLD-(\d+)/);
          const externalId = jobRefMatch ? jobRefMatch[1] : request.url;

          jobs.push({
            externalId,
            title,
            company,
            description,
            locationRaw,
            sourceUrl: request.url,
            sourceBoard: 'smartjobs',
            salaryDisplay: salary.display || undefined,
            salaryMin: salary.min,
            salaryMax: salary.max,
            salaryType: salary.type !== 'unknown' ? salary.type : undefined,
            employmentType: employmentType || undefined,
            category: 'Government',
          });
          return;
        }

        // Parse search results page
        const jobCards = $('a[href*="/jobs/QLD-"], .search-result__item a');
        jobCards.each((_, el) => {
          const href = $(el).attr('href');
          if (href && href.includes('/jobs/')) {
            const fullUrl = href.startsWith('http')
              ? href
              : `https://smartjobs.qld.gov.au${href}`;
            crawler.addRequests([
              { url: fullUrl, label: 'DETAIL' },
            ]);
          }
        });

        // Handle pagination
        const nextPage = $('a[rel="next"], .pagination__next a').attr('href');
        if (nextPage) {
          const fullUrl = nextPage.startsWith('http')
            ? nextPage
            : `https://smartjobs.qld.gov.au${nextPage}`;
          crawler.addRequests([{ url: fullUrl }]);
        }
      },
    });

    await crawler.run([searchUrl]);
    return jobs;
  }
}
