const { execSync } = require('child_process');
const path = require('path');

class NotificationService {
  constructor(logger, errorHandler) {
    this.logger = logger;
    this.errorHandler = errorHandler;
  }

  async showNotification(title, message, options = {}) {
    try {
      // 尝试多种通知方式
      const success = await this._tryMultipleNotificationMethods(title, message, options);
      
      if (success) {
        this.logger.info("系统通知显示成功", { title });
        return true;
      } else {
        throw new Error("所有通知方式都失败了");
      }
    } catch (error) {
      const notificationError = this.errorHandler.createServiceError(
        `显示通知失败: ${error.message}`,
        error
      );
      
      this.errorHandler.handle(notificationError, "系统通知");
      return false;
    }
  }

  async _tryMultipleNotificationMethods(title, message, options = {}) {
    const methods = [
      () => this._showWithDialog(title, message, options),
      () => this._showWithNotificationCenter(title, message, options),
      () => this._showWithTerminalNotifier(title, message, options),
      () => this._showWithConsoleLog(title, message, options)
    ];

    for (const method of methods) {
      try {
        await method();
        return true;
      } catch (error) {
        this.logger.debug("通知方式失败，尝试下一种", { error: error.message });
        continue;
      }
    }
    
    return false;
  }

  // 方法1: 使用对话框（强制显示，录屏时也能看到）
  async _showWithDialog(title, message, options = {}) {
    const script = this._buildDialogScript(title, message, options);
    this.logger.debug("使用对话框显示通知", { title });
    
    execSync(`osascript -e '${script}'`, { timeout: 5000 });
  }

  // 方法2: 使用通知中心（原有方式）
  async _showWithNotificationCenter(title, message, options = {}) {
    const script = this._buildAppleScript(title, message, options);
    this.logger.debug("使用通知中心显示通知", { title });
    
    execSync(`osascript -e '${script}'`, { timeout: 5000 });
  }

  // 方法3: 使用terminal-notifier（如果安装了）
  async _showWithTerminalNotifier(title, message, options = {}) {
    let cmd = `terminal-notifier -title "${title.replace(/"/g, '\\"')}" -message "${message.replace(/"/g, '\\"')}"`;
    
    if (options.sound) {
      cmd += ` -sound "${options.sound}"`;
    }
    
    this.logger.debug("使用terminal-notifier显示通知", { title });
    execSync(cmd, { timeout: 5000 });
  }

  // 方法4: 控制台日志备用方案
  async _showWithConsoleLog(title, message, options = {}) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] 🔔 ${title}: ${message}`;
    
    console.log('\n' + '='.repeat(60));
    console.log(logMessage);
    console.log('='.repeat(60) + '\n');
    
    this.logger.info("通知已显示在控制台", { title });
  }

  async showResult(result) {
    try {
      const fileName = path.basename(result.imagePath);
      let title, message;

      if (result.status === 'completed' && result.llmResult) {
        title = `✅ 处理完成 - ${fileName}`;
        message = this._truncateText(result.llmResult, 200);
      } else if (result.status === 'completed' && result.ocrText) {
        title = `📝 OCR完成 - ${fileName}`;
        message = this._truncateText(result.ocrText, 200);
      } else if (result.status === 'failed') {
        title = `❌ 处理失败 - ${fileName}`;
        message = result.error ? result.error.message : '未知错误';
      } else {
        title = `🔄 处理中 - ${fileName}`;
        message = '正在处理图片...';
      }

      return await this.showNotification(title, message, {
        sound: result.status === 'completed' ? 'Glass' : 'Basso'
      });
    } catch (error) {
      this.errorHandler.handle(error, "显示结果通知");
      return false;
    }
  }

  async showStats(stats) {
    // try {
    //   const title = "📊 处理统计";
    //   const message = `总计: ${stats.total} | 成功: ${stats.successful} | 失败: ${stats.failed} | 成功率: ${stats.successRate}`;
      
    //   return await this.showNotification(title, message, {
    //     sound: 'Ping'
    //   });
    // } catch (error) {
    //   this.errorHandler.handle(error, "显示统计通知");
    //   return false;
    // }
  }

  // 检查通知功能是否可用
  async checkAvailability() {
    try {
      // 测试是否可以执行osascript
      execSync('which osascript', { timeout: 2000 });
      
      this.logger.info("系统通知功能可用");
      return true;
    } catch (error) {
      this.logger.warn("系统通知功能不可用", { error: error.message });
      return false;
    }
  }

  _buildAppleScript(title, message, options = {}) {
    // 转义单引号
    const escapedTitle = title.replace(/'/g, "\\'");
    const escapedMessage = message.replace(/'/g, "\\'");
    
    let script = `display notification "${escapedMessage}" with title "${escapedTitle}"`;
    
    if (options.sound) {
      script += ` sound name "${options.sound}"`;
    }
    
    return script;
  }

  _truncateText(text, maxLength = 200) {
    if (!text) return '';
    
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength - 3) + '...';
  }

  // 显示欢迎通知
  async showWelcome() {
    return await this.showNotification(
      "🚀 AnswerTips 启动",
      "OCR图片识别工具已启动，开始监听文件夹...",
      { sound: 'Glass' }
    );
  }

  // 显示错误通知
  async showError(error, context = '') {
    const title = `❌ 系统错误${context ? ' - ' + context : ''}`;
    const message = error.message || '未知错误';
    
    return await this.showNotification(title, message, {
      sound: 'Basso'
    });
  }
}

module.exports = NotificationService;