# 监控器 - Android APK 构建指南

## 项目修复说明

本项目已修复以下关键问题：
1. ✅ 移除了 `index.html` 中与 Vite 冲突的 CDN importmap
2. ✅ 统一了 Capacitor 版本（全部升级到 v6）
3. ✅ 添加了完整的 Android 原生项目结构
4. ✅ 修复了 Tailwind CSS 配置（从 CDN 改为本地构建）
5. ✅ 移除了对 `@google/genai` 的外部依赖（改为本地计算）
6. ✅ 修复了 Vite `base` 路径（`./` 确保 APK 内资源路径正确）
7. ✅ 添加了 `network_security_config.xml` 和完整 `AndroidManifest.xml`

---

## 环境要求

| 工具 | 版本要求 |
|------|----------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| JDK | 17 或 21 |
| Android SDK | compileSdk 34, minSdk 22 |
| Android Studio | 最新稳定版（推荐） |

---

## 一键构建 APK（推荐）

### 步骤 1：安装依赖
```bash
npm install
```

### 步骤 2：构建 Web 资源
```bash
npm run build
```

### 步骤 3：同步到 Android 项目
```bash
npx cap sync android
```

### 步骤 4：用 Android Studio 构建 APK
```bash
npx cap open android
```
在 Android Studio 中：
- 点击菜单 **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- APK 位于：`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 命令行构建 APK（不用 Android Studio）

确保设置了 ANDROID_HOME 环境变量，然后：

```bash
# 1. 安装依赖并构建
npm install
npm run build
npx cap sync android

# 2. 在 android 目录下用 Gradle 构建 debug APK
cd android
./gradlew assembleDebug

# APK 输出位置：
# android/app/build/outputs/apk/debug/app-debug.apk
```

**Windows 用户：**
```cmd
cd android
gradlew.bat assembleDebug
```

---

## 安装 APK 到手机

### 方法 1：直接传输
将 `app-debug.apk` 发送到手机（微信、邮件、USB等），点击安装即可。

> 注意：需要在手机「设置 → 安全」中允许「安装未知来源应用」

### 方法 2：ADB 安装（需要开启开发者模式）
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 常见问题

### Q: 安装时提示「解析包时出现问题」
**原因：** APK 损坏或 minSdk 版本不匹配（本项目 minSdk=22，即 Android 5.1+）  
**解决：** 确保手机 Android 版本 ≥ 5.1，重新构建 APK

### Q: 白屏或黑屏
**原因：** Web 资源路径问题  
**解决：** 确认 `vite.config.ts` 中 `base: './'` 已设置，重新 `npm run build && npx cap sync android`

### Q: 网络请求失败
**原因：** Android 网络安全限制  
**解决：** 项目已配置 `network_security_config.xml`，确保 sync 后重新构建

### Q: `@google/genai` 相关错误
**已修复：** 套利分析功能已改为本地计算，不再依赖 Gemini API

---

## 应用功能

- 📊 **套利扫描仪**：实时监控 Binance 现货/U本位/币本位期货价差
- 📈 **行情列表**：实时行情数据展示  
- 🔔 **价格预警**：可配置价差阈值和波动率预警通知
- 🌏 **中英双语**：支持中文/English 切换
