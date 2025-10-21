/**
 * Database Test Script
 * Tests all database operations for cron job functionality
 */

import { initializeDatabase, closeDatabase } from '@/database';
import config from '@/config';

async function testDatabase(): Promise<void> {
  console.log('🧪 Starting database tests...\n');

  try {
    // Initialize database
    const db = initializeDatabase(config.database);
    console.log('✅ Database initialized\n');

    // Test 1: Create a test user
    console.log('📝 Test 1: Creating test user...');
    const userResult = await db.createUser(123456789, 'testuser', 'Test', 'User');
    if (!userResult.success) {
      throw new Error(`Failed to create user: ${userResult.error}`);
    }
    console.log('✅ User created:', userResult.data);
    const userId = userResult.data!.id;

    // Test 2: Create a cron job for the user
    console.log('\n📝 Test 2: Creating cron job...');
    const cronJobResult = await db.createCronJob(userId, '51K12345', '1');
    if (!cronJobResult.success) {
      throw new Error(`Failed to create cron job: ${cronJobResult.error}`);
    }
    console.log('✅ Cron job created:', cronJobResult.data);

    // Test 3: Get user by chat ID
    console.log('\n📝 Test 3: Getting user by chat ID...');
    const getUserResult = await db.getUserByChatId(123456789);
    if (!getUserResult.success) {
      throw new Error(`Failed to get user: ${getUserResult.error}`);
    }
    console.log('✅ User retrieved:', getUserResult.data);

    // Test 4: Get cron job by user ID
    console.log('\n📝 Test 4: Getting cron job by user ID...');
    const getCronJobResult = await db.getCronJobByUserId(userId);
    if (!getCronJobResult.success) {
      throw new Error(`Failed to get cron job: ${getCronJobResult.error}`);
    }
    console.log('✅ Cron job retrieved:', getCronJobResult.data);

    // Test 5: Create lookup history
    console.log('\n📝 Test 5: Creating lookup history...');
    const mockViolations = [
      {
        plate: '51K12345',
        violationNumber: 1,
        violationTime: '2024-01-15 10:30:00',
        location: 'Test Location',
        violation: 'Test Violation',
        fine: '500000',
        status: 'Chưa nộp phạt',
      },
    ];

    const historyResult = await db.createLookupHistory(
      cronJobResult.data!.id,
      mockViolations,
      1,
      0,
      1,
      true,
    );
    if (!historyResult.success) {
      throw new Error(`Failed to create lookup history: ${historyResult.error}`);
    }
    console.log('✅ Lookup history created:', historyResult.data);

    // Test 6: Get latest lookup history
    console.log('\n📝 Test 6: Getting latest lookup history...');
    const latestHistoryResult = await db.getLatestLookupHistory(cronJobResult.data!.id);
    if (!latestHistoryResult.success) {
      throw new Error(`Failed to get latest history: ${latestHistoryResult.error}`);
    }
    console.log('✅ Latest history retrieved:', latestHistoryResult.data);

    // Test 7: Update cron job
    console.log('\n📝 Test 7: Updating cron job...');
    const updateResult = await db.updateCronJob(userId, {
      plate: '51K67890',
      lastRun: new Date(),
    });
    if (!updateResult.success) {
      throw new Error(`Failed to update cron job: ${updateResult.error}`);
    }
    console.log('✅ Cron job updated:', updateResult.data);

    // Test 8: Get all active cron jobs
    console.log('\n📝 Test 8: Getting all active cron jobs...');
    const activeJobsResult = await db.getAllActiveCronJobs();
    if (!activeJobsResult.success) {
      throw new Error(`Failed to get active cron jobs: ${activeJobsResult.error}`);
    }
    console.log('✅ Active cron jobs:', activeJobsResult.data);

    // Test 9: Get cron job statistics
    console.log('\n📝 Test 9: Getting cron job statistics...');
    const statsResult = await db.getCronJobStats();
    if (!statsResult.success) {
      throw new Error(`Failed to get stats: ${statsResult.error}`);
    }
    console.log('✅ Statistics:', statsResult.data);

    console.log('\n🎉 All database tests passed successfully!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    closeDatabase();
    console.log('\n📊 Database connection closed');
  }
}

// Run tests
testDatabase().catch(console.error);
