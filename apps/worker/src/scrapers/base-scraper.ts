import type { ScrapedJob } from '@jobflow/shared/types';
import type { JobBoard } from '@jobflow/shared/constants';

export interface ScrapeParams {
  keywords: string[];
  location: string;
  radiusKm: number;
}

/**
 * Base class for all job board scrapers.
 * Each board implements its own search URL builder and parser.
 */
export abstract class BaseScraper {
  abstract readonly board: JobBoard;
  abstract readonly name: string;

  /**
   * Build the search URL for this board given search parameters.
   */
  abstract buildSearchUrl(params: ScrapeParams): string;

  /**
   * Scrape job listings from this board.
   * Returns an array of scraped jobs.
   */
  abstract scrape(params: ScrapeParams): Promise<ScrapedJob[]>;
}
