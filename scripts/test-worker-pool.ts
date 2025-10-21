import { tesseractWorkerManager } from '@/utils/tesseractWorker';
import { WorkerPoolManager } from '@/utils/workerPoolManager';
import fs from 'fs';
import path from 'path';

/**
 * Test script to check worker pool functionality
 */
async function testWorkerPool(): Promise<void> {
  console.log('🚀 Testing Tesseract Worker Pool...\n');

  try {
    // 1. Initialize worker pool
    console.log('1. Initializing worker pool...');
    await WorkerPoolManager.initialize();
    console.log('✅ Worker pool initialized\n');

    // 2. Check status
    console.log('2. Checking worker pool status...');
    const status = WorkerPoolManager.getStatus();
    console.log('📊 Status:', status);
    console.log('✅ Status check completed\n');

    // 3. Test with a captcha image (if available)
    const captchaPath = path.join(__dirname, '../captcha.png');
    if (fs.existsSync(captchaPath)) {
      console.log('3. Testing OCR with captcha image...');
      const imageBuffer = fs.readFileSync(captchaPath);

      const startTime = Date.now();
      const result = await tesseractWorkerManager.recognize(imageBuffer);
      const endTime = Date.now();

      console.log('📝 OCR Result:', result.text);
      console.log('🎯 Confidence:', result.confidence);
      console.log('⏱️  Processing time:', endTime - startTime, 'ms');
      console.log('✅ OCR test completed\n');
    } else {
      console.log('3. No captcha image found, skipping OCR test\n');
    }

    // 4. Test concurrent processing
    console.log('4. Testing concurrent processing...');
    const concurrentTests = Array.from({ length: 5 }, async (_, index) => {
      const startTime = Date.now();
      const result = await tesseractWorkerManager.recognize(Buffer.from('test'));
      const endTime = Date.now();
      console.log(`   Test ${index + 1}: ${endTime - startTime}ms`);
      return result;
    });

    await Promise.all(concurrentTests);
    console.log('✅ Concurrent processing test completed\n');

    // 5. Check performance metrics
    console.log('5. Checking performance metrics...');
    const performance = WorkerPoolManager.getPerformanceInfo();
    console.log('📈 Performance:', performance);
    console.log('✅ Performance check completed\n');

    // 6. Cleanup
    console.log('6. Cleaning up...');
    await WorkerPoolManager.cleanup();
    console.log('✅ Cleanup completed\n');

    console.log('🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test if file is called directly
if (require.main === module) {
  testWorkerPool();
}

export { testWorkerPool };
