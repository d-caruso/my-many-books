// ================================================================
// scripts/backfill-search-index.ts
// Backfill script for FULLTEXT search index
// ================================================================

import { config } from 'dotenv';
import { DatabaseUtils } from '@/utils/database';
import { Book } from '@/models/Book';
import { getLogger } from '@my-many-books/shared-logging';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config();

const logger = getLogger();

// Progress file for resume capability
const PROGRESS_FILE = path.join(__dirname, '.backfill-progress.json');

interface BackfillProgress {
  totalRecords: number;
  processedRecords: number;
  batchNumber: number;
  startTime: number;
  lastProcessedId?: number;
  completed: boolean;
}

const BATCH_SIZE = 100;

/**
 * Load progress from file (for resume capability)
 */
function loadProgress(): BackfillProgress | null {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      return JSON.parse(data) as BackfillProgress;
    }
  } catch (error) {
    logger.warn('Failed to load progress file, starting fresh:', error);
  }
  return null;
}

/**
 * Save progress to file (for resume capability)
 */
function saveProgress(progress: BackfillProgress): void {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Failed to save progress file:', error);
  }
}

/**
 * Delete progress file
 */
function deleteProgress(): void {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
    }
  } catch (error) {
    logger.error('Failed to delete progress file:', error);
  }
}

/**
 * Backfill search index for books
 * - Processes books in batches
 * - Idempotent (can be run multiple times)
 * - Supports resume from last processed ID
 */
async function backfillSearchIndex(resumeFromId?: number, fresh = false): Promise<void> {
  try {
    logger.info('========================================');
    logger.info('Search Index Backfill Script');
    logger.info('========================================');

    // Initialize database connection
    await DatabaseUtils.initialize();

    // Load previous progress or start fresh
    let progress: BackfillProgress | null = null;

    if (!fresh && !resumeFromId) {
      progress = loadProgress();
      if (progress && progress.completed) {
        logger.info('Previous backfill already completed. Use --fresh to start over.');
        process.exit(0);
      }
      if (progress && !progress.completed) {
        logger.info(`Resuming from previous run (last ID: ${progress.lastProcessedId})`);
      }
    }

    // Get total count
    const totalCount = await Book.count();
    logger.info(`Total books in database: ${totalCount}`);

    if (totalCount === 0) {
      logger.info('No books to process. Exiting.');
      process.exit(0);
    }

    // Initialize or resume progress
    if (!progress) {
      progress = {
        totalRecords: totalCount,
        processedRecords: 0,
        batchNumber: 0,
        startTime: Date.now(),
        lastProcessedId: resumeFromId,
        completed: false,
      };
      logger.info('Starting fresh backfill...');
    } else {
      // Update total records in case new books were added
      progress.totalRecords = totalCount;
    }

    // Process in batches
    let hasMore = true;
    while (hasMore) {
      hasMore = await processBatch(progress);
      saveProgress(progress); // Save after each batch
    }

    // Mark as completed
    progress.completed = true;
    saveProgress(progress);

    const duration = ((Date.now() - progress.startTime) / 1000).toFixed(2);
    logger.info('========================================');
    logger.info('✓ Search index backfill completed successfully!');
    logger.info(`  Total records processed: ${progress.processedRecords}`);
    logger.info(`  Total batches: ${progress.batchNumber}`);
    logger.info(`  Duration: ${duration}s`);
    logger.info(`  Average: ${(progress.processedRecords / parseFloat(duration)).toFixed(2)} records/second`);
    logger.info('========================================');

    // Clean up progress file
    deleteProgress();

    process.exit(0);
  } catch (error) {
    logger.error('========================================');
    logger.error('✗ Search index backfill failed:', error);
    logger.error('========================================');
    logger.info('Progress has been saved. Run the script again to resume.');
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
const freshArg = args.includes('--fresh');
const helpArg = args.includes('--help') || args.includes('-h');

const resumeFromId = resumeFromIdArg
  ? parseInt(resumeFromIdArg.split('=')[1], 10)
  : undefined;

// Show help
if (helpArg) {
  console.log('');
  console.log('Usage: npx ts-node scripts/backfill-search-index.ts [options]');
  console.log('');
  console.log('Options:');
  console.log('  --fresh                  Start fresh (ignore previous progress)');
  console.log('  --resume-from-id=<id>    Resume from specific book ID');
  console.log('  --help, -h               Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  npx ts-node scripts/backfill-search-index.ts');
  console.log('  npx ts-node scripts/backfill-search-index.ts --fresh');
  console.log('  npx ts-node scripts/backfill-search-index.ts --resume-from-id=1000');
  console.log('');
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  backfillSearchIndex(resumeFromId, freshArg);
}

export { backfillSearchIndex };
