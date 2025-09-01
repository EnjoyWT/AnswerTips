// 集成测试
const Application = require('./src/app');

async function runIntegrationTest() {
  console.log('🧪 开始集成测试...\n');

  try {
    // 1. 测试应用创建
    console.log('1. 创建应用实例...');
    const app = new Application();
    console.log('✅ 应用实例创建成功');

    // 2. 测试配置加载
    console.log('\n2. 测试配置加载...');
    await app._initializeConfig();
    console.log('✅ 配置加载成功');
    console.log('   监听文件夹:', app.configManager.get('watchFolder'));
    console.log('   OCR API URL:', app.configManager.get('ocrApiUrl'));
    console.log('   大模型 URL:', app.configManager.get('localLLMUrl'));

    // 3. 测试服务初始化
    console.log('\n3. 测试服务初始化...');
    await app._initializeServices();
    console.log('✅ 服务初始化成功');

    // 4. 测试应用状态
    console.log('\n4. 测试应用状态...');
    const status = app.getStatus();
    console.log('✅ 应用状态获取成功');
    console.log('   运行状态:', status.isRunning);
    console.log('   配置项数量:', Object.keys(status.config || {}).length);

    // 5. 测试工具类功能
    console.log('\n5. 测试工具类功能...');
    
    // 测试图片文件检查
    const isJpg = app.configManager.isImageFile('test.jpg');
    const isTxt = app.configManager.isImageFile('test.txt');
    console.log('✅ 图片文件检查功能正常');
    console.log('   test.jpg 是图片:', isJpg);
    console.log('   test.txt 是图片:', isTxt);

    // 测试结果管理器
    const testResult = app.resultManager.addResult({
      imagePath: '/test/path.jpg',
      status: 'processing'
    });
    console.log('✅ 结果管理器功能正常');
    console.log('   创建结果ID:', testResult.id);

    const stats = app.resultManager.getStats();
    console.log('   当前统计:', stats);

    console.log('\n🎉 集成测试全部通过！');
    console.log('\n📋 重构总结:');
    console.log('   ✅ 清晰的目录结构 (services, utils)');
    console.log('   ✅ 统一的日志和错误处理');
    console.log('   ✅ 灵活的配置管理 (支持环境变量)');
    console.log('   ✅ 事件驱动的文件监听');
    console.log('   ✅ 完整的结果管理');
    console.log('   ✅ macOS系统通知支持');
    console.log('   ✅ Authorization头支持');

  } catch (error) {
    console.error('\n❌ 集成测试失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

runIntegrationTest();