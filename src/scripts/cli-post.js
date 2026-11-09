import { executePostPipeline } from '../services/scheduler.js';

console.log('========================================================');
console.log('🤖 Running Automated Daily LinkedIn Post Pipeline...');
console.log('Timestamp:', new Date().toISOString());
console.log('========================================================\n');

async function run() {
  const isForce = process.argv.includes('--force');
  try {
    const result = await executePostPipeline({
      isManual: false,
      forcePublish: isForce
    });

    if (result.skipped) {
      console.log('\n========================================================');
      console.log('ℹ️ Duplicate Guard: Post already published today.');
      console.log('Message:', result.message);
      console.log('========================================================');
      process.exit(0);
    }

    console.log('\n========================================================');
    console.log('✅ Pipeline Run Finished Successfully!');
    console.log('Post ID:', result.post?.id);
    console.log('Language:', result.post?.language);
    console.log('Topic:', result.post?.topic);
    console.log('Published to LinkedIn:', result.post?.publishedToLinkedIn);
    console.log('Post URL:', result.post?.postUrl);
    console.log('Media URL:', result.post?.mediaUrl);
    console.log('========================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Pipeline execution encountered an error:', error);
    process.exit(1);
  }
}

run();
