// ================================================================
// scripts/backfill-search-index.ts
// Backfill script for FULLTEXT search index
// ================================================================

import { config } from 'dotenv';
import { DatabaseUtils } from '@/utils/database';
import { Book } from '@/models/Book';
import { getLogger } from '@my-many-books/shared-logging';

// Load environment variables
config();

const logger = getLogger();

interface BackfillProgress {
  totalRecords: number;
  processedRecords: number;
  batchNumber: number;
  startTime: number;
  lastProcessedId?: number;
}

const BATCH_SIZE = 100;

/**
 * Backfill search index for books
 * - Processes books in batches
 * - Idempotent (can be run multiple times)
 * - Supports resume from last processed ID
 */
async function backfillSearchIndex(resumeFromId?: number): Promise<void> {
  try {
    logger.info('Starting search index backfill...');

    // Initialize database connection
    await DatabaseUtils.initialize();

    // Get total count
    const totalCount = await Book.count();
    logger.info(`Total books to process: ${totalCount}`);

    if (totalCount === 0) {
      logger.info('No books to process. Exiting.');
      process.exit(0);
    }

    const progress: BackfillProgress = {
      totalRecords: totalCount,
      processedRecords: 0,
      batchNumber: 0,
      startTime: Date.now(),
      lastProcessedId: resumeFromId,
    };

    // Process in batches
    let hasMore = true;
    while (hasMore) {
      hasMore = await processBatch(progress);
    }

    const duration = ((Date.now() - progress.startTime) / 1000).toFixed(2);
    logger.info('========================================');
    logger.info('Search index backfill completed successfully!');
    logger.info(`Total records processed: ${progress.processedRecords}`);
    logger.info(`Total batches: ${progress.batchNumber}`);
    logger.info(`Duration: ${duration}s`);
    logger.info('========================================');

    process.exit(0);
  } catch (error) {
    logger.error('Search index backfill failed:', error);
    process.exit(1);
  }
}

/**
 * Process a single batch of books
 */
async function processBatch(progress: BackfillProgress): Promise<boolean> {
  progress.batchNumber++;

  // Build where clause for resumability
  const whereClause = progress.lastProcessedId ? { id: { $gt: progress.lastProcessedId } } : {};

  // Fetch batch
  const books = await Book.findAll({
    where: whereClause as any,
    limit: BATCH_SIZE,
    order: [['id', 'ASC']],
    attributes: ['id', 'title', 'notes'],
  });

  if (books.length === 0) {
    return false; // No more records
  }

  logger.info(
    `Processing batch ${progress.batchNumber}: ${books.length} books (IDs ${books[0].id} - ${books[books.length - 1].id})`
  );

  // Update each book to trigger any search index updates
  // This is idempotent - touching the record ensures it's in the FULLTEXT index
  for (const book of books) {
    await book.save({ silent: true });
    progress.processedRecords++;
    progress.lastProcessedId = book.id;
  }

  const percentComplete = ((progress.processedRecords / progress.totalRecords) * 100).toFixed(2);
  const elapsed = ((Date.now() - progress.startTime) / 1000).toFixed(2);
  logger.info(
    `Progress: ${progress.processedRecords}/${progress.totalRecords} (${percentComplete}%) - Elapsed: ${elapsed}s`
  );

  return books.length === BATCH_SIZE; // Continue if full batch
}

// Parse command line arguments
const args = process.argv.slice(2);
const resumeFromIdArg = args.find(arg => arg.startsWith('--resume-from-id='));
const resumeFromId = resumeFromIdArg
  ? parseInt(resumeFromIdArg.split('=')[1], 10)
  : undefined;

// Run if called directly
if (require.main === module) {
  if (resumeFromId) {
    logger.info(`Resuming from book ID: ${resumeFromId}`);
  }
  backfillSearchIndex(resumeFromId);
}

export { backfillSearchIndex };
