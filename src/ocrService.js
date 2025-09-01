const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs-extra");

class OCRService {
  constructor(config) {
    this.config = config;
  }

  // 检查OCR服务是否可用
  async checkService() {
    try {
      const response = await axios.get(this.config.get("healthCheckUrl"), {
        timeout: 5000,
      });
      console.log("✅ OCR服务健康检查通过");
      return true;
    } catch (error) {
      console.error("❌ OCR服务不可用:", error.message);
      return false;
    }
  }

  // 获取OCR服务信息
  async getServiceInfo() {
    try {
      const response = await axios.get("http://localhost:7321/api/v1/ocr/info");
      console.log("📋 OCR服务信息:", response.data);
    } catch (error) {
      console.log("⚠️  无法获取OCR服务信息:", error.message);
    }
  }

  // 调用OCR识别接口
  async performOCR(imagePath) {
    try {
      console.log(`🔍 开始识别图片: ${require("path").basename(imagePath)}`);

      const formData = new FormData();
      formData.append("image", fs.createReadStream(imagePath));

      const response = await axios.post(
        this.config.get("ocrApiUrl"),
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          params: {
            language: this.config.get("language"),
          },
          timeout: 30000,
        }
      );
      console.log("🔍 识别结果:", response);

      if (response.data && response.data.data.text) {
        console.log("📝 识别结果:");
        console.log("=".repeat(50));
        console.log(response.data.data.text);
        console.log("=".repeat(50));

        return response.data.data.text;
      } else {
        console.log("⚠️  未识别到文字内容");
        return null;
      }
    } catch (error) {
      console.error("❌ OCR识别失败:", error.message);
      if (error.response) {
        console.error("响应状态:", error.response.status);
        console.error("响应数据:", error.response.data);
      }
      return null;
    }
  }
}

module.exports = OCRService;
