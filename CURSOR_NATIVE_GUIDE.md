# Trip Kit — Cursor 一键转原生 iOS & Android（Capacitor + 原生相册静默索引）施工指南

当你把本项目文件夹下载到本地电脑并用 **Cursor** 打开后，无需手动修改前端业务逻辑——项目中已经预埋好了：
1. **原生相册桥接层**：`src/services/nativePhotoBridge.ts`（自动检测 `window.Capacitor.Plugins.TripPhotoScanner`，未打包前自动使用浏览器本地 EXIF 解析，打包成 App 后自动切换为苹果 `PhotoKit` / 安卓 `MediaStore` 静默按行程日期索引）。
2. **云端 API 路由兼容**：`resolveApiUrl()` 自动读取环境变量 `VITE_API_BASE_URL`。

---

## 一、复制给 Cursor 的一键施工指令（直接粘贴到 Cursor 对话框）

```text
请阅读根目录下的 CURSOR_NATIVE_GUIDE.md，按以下步骤帮我把当前 Vite + React 项目封装为支持 iOS 和 Android 的 Capacitor 原生工程：

1. 安装 @capacitor/core, @capacitor/cli, @capacitor/ios, @capacitor/android，初始化 Capacitor（appName: "Trip Kit", appId: "com.bagail.tripkit", webDir: "dist"）。
2. 创建 .env.production，配置 VITE_API_BASE_URL 为我的云端后端地址，确保手机端调用 /api/ai/* 接口直连云端服务。
3. 执行 npm run build 并 npx cap add ios && npx cap add android。
4. 按照 CURSOR_NATIVE_GUIDE.md 中的接口协议（src/services/nativePhotoBridge.ts 里的 TripPhotoScannerPlugin），在 ios/App/App 下用 Swift + PhotoKit (PHAsset) 编写 TripPhotoScannerPlugin，并在 Info.plist 添加 NSPhotoLibraryUsageDescription；在 android/app/src/main/java 下用 Kotlin + MediaStore 编写同名插件，并在 AndroidManifest.xml 添加 READ_MEDIA_IMAGES 权限，实现按行程起止日期自动静默扫描手机本地旅行照片、读取拍摄时间与 GPS 经纬度并返回压缩缩略图。
```

---

## 二、你需要提前准备的 4 项基础资料

1. **App 名称与唯一包名（Bundle ID）**
   - 名称：`Trip Kit`
   - 包名：`com.bagail.tripkit`（iOS App Store 与 Google Play 通用）
2. **高清图标源文件**
   - 准备一张 `1024 × 1024` 无透明圆角的正方形 PNG，放在根目录 `assets/icon.png`，让 Cursor 运行 `npx @capacitor/assets generate` 自动切出全部尺寸。
3. **云端 API 地址（`VITE_API_BASE_URL`）**
   - 在本地新建 `.env.production`：
     ```env
     VITE_API_BASE_URL=https://你的云端部署域名.run.app
     ```
   - 说明：Firebase Firestore 数据库本身就是云端直连，无需额外代理；配置 `VITE_API_BASE_URL` 后，AI 故事排版、小票识别、行程生成在手机 App 内即可直接联通。
4. **真机测试与上架环境**
   - **iOS**：Mac 电脑 + Xcode（用个人免费 Apple ID 连数据线即可真机测试相册索引；正式上架 App Store 需 $99/年 Apple Developer 账号）。
   - **Android**：Android Studio（Mac / Windows 均可直接编译 `.apk` 安装包测试；上架 Google Play 需一次性 $25 开发者账号）。

---

## 三、原生插件协议（供 Cursor 自动生成 Swift / Kotlin 代码对齐）

前端 `src/services/nativePhotoBridge.ts` 已严格定义以下调用签名：

- 插件注册名：`TripPhotoScanner`
- 方法 1：`requestPermissions() -> Promise<{ photos: 'granted' | 'limited' | 'denied' }>`
  - iOS 调用 `PHPhotoLibrary.requestAuthorization(for: .readWrite)`
  - Android 13+ 请求 `Manifest.permission.READ_MEDIA_IMAGES`（Android 14+ 支持部分照片授权 `READ_MEDIA_VISUAL_USER_SELECTED`）
- 方法 2：`scanPhotosByDateRanges({ ranges: [{ tripId, startDateIso, endDateIso }], limitPerTrip }) -> Promise<{ assets: NativeScannedAsset[] }>`
  - iOS 使用 `PHFetchOptions.predicate = NSPredicate(format: "creationDate >= %@ AND creationDate <= %@", startDate, endDate)`，通过 `PHImageManager.default().requestImage` 在手机端本地生成 `680px` 缩略图与 `location?.coordinate` 经纬度，**全程零云端上传**。
  - Android 使用 `MediaStore.Images.Media.EXTERNAL_CONTENT_URI` 按 `DATE_TAKEN BETWEEN ? AND ?` 查询本地相册，并通过 `ExifInterface` 读取经纬度。
- 方法 3：`getHighResPhotoBase64({ localIdentifier, maxDimension }) -> Promise<{ dataUrl, width, height }>`
  - 仅在客户导出 **300DPI 印刷级含 3mm 出血位 PDF** 时，按需提取已入册精选照片的高清原图（`2480px+`），日常浏览不占内存。
