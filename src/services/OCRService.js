const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs-extra");
const path = require("path");

class OCRService {
  constructor(config, logger, errorHandler) {
    this.config = config;
    this.logger = logger;
    this.errorHandler = errorHandler;
  }

  async checkHealth() {
    try {
      const healthUrl = this.config.get("healthCheckUrl");
      this.logger.debug("检查OCR服务健康状态", { url: healthUrl });
      
      const response = await axios.get(healthUrl, {
        timeout: 5000,
      });
      
      this.logger.info("OCR服务健康检查通过");
      return true;
    } catch (error) {
      this.errorHandler.handle(error, "OCR健康检查");
      return false;
    }
  }

  async getServiceInfo() {
    try {
      const infoUrl = "http://localhost:7321/api/v1/ocr/info";
      const response = await axios.get(infoUrl, { timeout: 5000 });
      
      this.logger.info("获取OCR服务信息成功", response.data);
      return response.data;
    } catch (error) {
      this.logger.warn("无法获取OCR服务信息", { error: error.message });
      return null;
    }
  }

  async recognizeText(imagePath) {
    try {
      const fileName = path.basename(imagePath);
      this.logger.info("开始OCR识别", { file: fileName });

      // 检查文件是否存在
      if (!await fs.pathExists(imagePath)) {
        throw this.errorHandler.createFileError(`图片文件不存在: ${imagePath}`);
      }

      // 创建表单数据
      const formData = new FormData();
      formData.append("image", fs.createReadStream(imagePath));

      const ocrUrl = this.config.get("ocrApiUrl");
      const language = this.config.get("language");

      this.logger.debug("调用OCR API", { url: ocrUrl, language });

      const response = await axios.post(ocrUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        params: {
          language: language,
        },
        timeout: 30000,
      });

      // 解析响应
      if (response.data && response.data.data && response.data.data.text) {
        const recognizedText = response.data.data.text;
        
        this.logger.info("OCR识别成功", { 
          file: fileName,
          textLength: recognizedText.length,
          preview: recognizedText.substring(0, 100) + (recognizedText.length > 100 ? '...' : '')
        });

        return recognizedText;
      } else {
        this.logger.warn("OCR未识别到文字内容", { file: fileName });
        return null;
      }
    } catch (error) {
      if (error.code && error.code.includes('ERROR')) {
        // 已经是我们的自定义错误，直接抛出
        throw error;
      }
      
      // 包装为服务错误
      const serviceError = this.errorHandler.createServiceError(
        `OCR识别失败: ${error.message}`,
        error
      );
      
      this.errorHandler.handle(serviceError, "OCR识别");
      throw serviceError;
    }
  }

  // 批量识别（可选功能）
  async recognizeMultiple(imagePaths) {
    const results = [];
    
    for (const imagePath of imagePaths) {
      try {
        const text = await this.recognizeText(imagePath);
        results.push({ imagePath, text, success: true });
      } catch (error) {
        results.push({ imagePath, error: error.message, success: false });
      }
    }
    
    this.logger.info("批量OCR识别完成", { 
      total: imagePaths.length,
      successful: results.filter(r => r.success).length
    });
    
    return results;
  }
}

module.exports = OCRService;