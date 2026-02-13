import type { BaseScraper } from './base-scraper';
import { SmartJobsScraper } from './smartjobs.scraper';
import { IndeedScraper } from './indeed.scraper';
import { SeekScraper } from './seek.scraper';
import { JoraScraper } from './jora.scraper';
import { EthicalJobsScraper } from './ethical-jobs.scraper';
import { SccCareersScraper } from './scc-careers.scraper';

/**
 * Registry of all available scrapers.
 * Workers look up scrapers by board name.
 */
export const scraperRegistry = new Map<string, BaseScraper>();

// Register all scrapers
scraperRegistry.set('smartjobs', new SmartJobsScraper());
scraperRegistry.set('indeed', new IndeedScraper());
scraperRegistry.set('seek', new SeekScraper());
scraperRegistry.set('jora', new JoraScraper());
scraperRegistry.set('ethical-jobs', new EthicalJobsScraper());
scraperRegistry.set('scc-careers', new SccCareersScraper());
