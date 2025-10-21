/**
 * User Management Services Test Script
 * Tests UserService, CronJobService, and CronJobExecutionService
 */

import { initializeDatabase, closeDatabase } from '@/database';
import { UserService, CronJobService } from '@/services/userService';
import { CronJobExecutionService } from '@/services/cronJobExecutionService';
import config from '@/config';

async function testUserManagementServices(): Promise<void> {
  console.log('🧪 Starting user management services tests...\n');

  try {
    // Initialize database
    initializeDatabase(config.database);
    console.log('✅ Database initialized\n');

    // Initialize services
    const userService = new UserService();
    const cronJobService = new CronJobService();
    const cronJobExecutionService = new CronJobExecutionService();

    // Test 1: Register user
    console.log('📝 Test 1: Registering test user...');
    const userResult = await userService.registerOrGetUser({
      chatId: 987654321,
      username: 'testuser2',
      firstName: 'Test',
      lastName: 'User 2',
    });

    if (!userResult.success) {
      throw new Error(`Failed to register user: ${userResult.error}`);
    }
    console.log('✅ User registered:', userResult.data);
    const userId = userResult.data!.id;

    // Test 2: Setup cron job
    console.log('\n📝 Test 2: Setting up cron job...');
    const cronJobResult = await cronJobService.setupCronJob({
      userId,
      plate: '51K99999',
      vehicleType: '2',
    });

    if (!cronJobResult.success) {
      throw new Error(`Failed to setup cron job: ${cronJobResult.error}`);
    }
    console.log('✅ Cron job setup:', cronJobResult.data);

    // Test 3: Validate cron job data
    console.log('\n📝 Test 3: Validating cron job data...');
    const validationResult = cronJobService.validateCronJobData({
      userId,
      plate: '51K88888',
      vehicleType: '1',
    });

    if (!validationResult.valid) {
      throw new Error(`Validation failed: ${validationResult.error}`);
    }
    console.log('✅ Validation passed');

    // Test 4: Get cron job status
    console.log('\n📝 Test 4: Getting cron job status...');
    const statusResult = await cronJobService.getCronJobStatus(987654321);
    console.log('✅ Cron job status:', statusResult);

    // Test 5: Get user stats
    console.log('\n📝 Test 5: Getting user stats...');
    const userStats = await userService.getUserStats(987654321);
    console.log('✅ User stats:', userStats);

    // Test 6: Update cron job
    console.log('\n📝 Test 6: Updating cron job...');
    const updateResult = await cronJobService.updateCronJob(userId, {
      plate: '51K77777',
      vehicleType: '1',
    });

    if (!updateResult.success) {
      throw new Error(`Failed to update cron job: ${updateResult.error}`);
    }
    console.log('✅ Cron job updated:', updateResult.data);

    // Test 7: Get all active cron jobs
    console.log('\n📝 Test 7: Getting all active cron jobs...');
    const activeJobsResult = await cronJobService.getAllActiveCronJobs();
    if (!activeJobsResult.success) {
      throw new Error(`Failed to get active cron jobs: ${activeJobsResult.error}`);
    }
    console.log('✅ Active cron jobs:', activeJobsResult.data);

    // Test 8: Test cron job execution (mock)
    console.log('\n📝 Test 8: Testing cron job execution...');
    const cronJob = cronJobResult.data!;

    // Mock execution result
    const executionResult = await cronJobExecutionService.executeCronJob(cronJob);
    console.log('✅ Execution result:', {
      success: executionResult.success,
      hasNewViolations: executionResult.hasNewViolations,
      error: executionResult.error,
    });

    // Test 9: Get execution stats
    console.log('\n📝 Test 9: Getting execution stats...');
    const executionStats = await cronJobExecutionService.getExecutionStats();
    console.log('✅ Execution stats:', executionStats);

    // Test 10: Disable cron job
    console.log('\n📝 Test 10: Disabling cron job...');
    const disableResult = await cronJobService.disableCronJob(userId);
    if (!disableResult.success) {
      throw new Error(`Failed to disable cron job: ${disableResult.error}`);
    }
    console.log('✅ Cron job disabled:', disableResult.data);

    console.log('\n🎉 All user management services tests passed successfully!');
  } catch (error) {
    console.error('❌ User management services test failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    closeDatabase();
    console.log('\n📊 Database connection closed');
  }
}

// Run tests
testUserManagementServices().catch(console.error);
