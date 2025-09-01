// 测试应用启动
const Application = require('./src/app');

async function testStartup() {
  console.log('🚀 测试应用启动...\n');

  const app = new Application();

  try {
    // 启动应用（但立即停止以避免长时间运行）
    console.log('启动应用...');
    
    // 设置5秒后自动停止
    setTimeout(async () => {
      console.log('\n⏰ 5秒测试时间到，停止应用...');
      await app.stop();
      process.exit(0);
    }, 5000);

    await app.start();

  } catch (error) {
    console.error('❌ 应用启动测试失败:', error.message);
    process.exit(1);
  }
}

testStartup();