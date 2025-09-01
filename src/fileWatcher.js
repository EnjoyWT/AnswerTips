const chokidar = require("chokidar");
const fs = require("fs-extra");
const path = require("path");

class FileWatcher {
  constructor(config, ocrService, resultProcessor) {
    this.config = config;
    this.ocrService = ocrService;
    this.resultProcessor = resultProcessor;
    this.watcher = null;
    this.isRunning = false;
  }

  // 处理新增的图片文件
  async handleNewImage(filePath) {
    // 等待文件完全写入
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      // 检查文件是否存在且可读
      await fs.access(filePath, fs.constants.R_OK);

      if (this.config.isImageFile(filePath)) {
        console.log(`📁 检测到新图片: ${path.basename(filePath)}`);

        // 执行OCR识别
        const ocrResult = await this.ocrService.performOCR(filePath);

        // 使用结果处理器处理OCR结果和大模型调用
        if (this.resultProcessor) {
          await this.resultProcessor.processOCRResult(filePath, ocrResult);
        }
      }
    } catch (error) {
      console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
    }
  }

  // 启动文件监听
  startWatching() {
    const watchFolder = this.config.get("watchFolder");
    console.log(`👀 开始监听文件夹: ${watchFolder}`);

    // 确保监听目录存在
    if (!fs.existsSync(watchFolder)) {
      console.error(`❌ 监听目录不存在: ${watchFolder}`);
      process.exit(1);
    }

    this.watcher = chokidar.watch(watchFolder, {
      ignored: /(^|[\/\\])\../, // 忽略隐藏文件
      persistent: true,
      ignoreInitial: true, // 忽略启动时已存在的文件
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
    });

    this.watcher
      .on("add", (filePath) => {
        this.handleNewImage(filePath);
      })
      .on("error", (error) => {
        console.error("❌ 文件监听错误:", error);
      });

    this.isRunning = true;
    console.log("✅ 文件监听已启动，等待新图片...");
  }

  // 停止监听
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.isRunning = false;
    console.log("⏹️  文件监听已停止");
  }

  // 获取运行状态
  getStatus() {
    return this.isRunning;
  }
}

module.exports = FileWatcher;
