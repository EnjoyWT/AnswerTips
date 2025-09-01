const Application = require("./src/app");

// 启动应用
const app = new Application();
app.start().catch((error) => {
  console.error("❌ 应用启动失败:", error);
  process.exit(1);
});
