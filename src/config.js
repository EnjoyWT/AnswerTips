const fs = require("fs-extra");
const path = require("path");
const os = require("os");

class ConfigManager {
  constructor() {
    this.config = null;
  }

  // 加载配置文件
  loadConfig() {
    try {
      const configPath = path.join(__dirname, "../config.json");
      const config = fs.readJsonSync(configPath);

      // 处理波浪号路径
      if (config.watchFolder.startsWith("~")) {
        config.watchFolder = path.join(
          os.homedir(),
          config.watchFolder.slice(1)
        );
      }

      this.config = config;
      return config;
    } catch (error) {
      console.error("❌ 加载配置文件失败:", error.message);
      process.exit(1);
    }
  }

  // 获取配置
  getConfig() {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config;
  }

  // 获取特定配置项
  get(key) {
    return this.getConfig()[key];
  }

  // 检查文件是否为支持的图片格式
  isImageFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.get("supportedImageExtensions").includes(ext);
  }
}

module.exports = ConfigManager;
