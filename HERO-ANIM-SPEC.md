# Hero 动画接入规格

> 页面：`https://climbing2the.top/`（仓库 `bizhonggeng/my-dashboard-welcome`）
> 交付物：**一个完整的 three.js 场景**（自包含 JS，不是视频/图片/shader 片段）
> 当前状态：Hero 已是静态占位，`#heroCanvas` 为空挂载点，等场景接入

**本文档只管主题适配与技术接口，不管视觉。**
动画的表达方式、构图、节奏、材质、颜色倾向，全部由你决定，这里不预设视觉方向。

以下是接入前必须满足的前提，不满足就得返工。

---

## 一、页面背景

一个**投资仪表盘的欢迎页**。静态站、无构建工具、单文件 `index.html`，three.js 以 UMD 形式本地引入并挂在全局 `window.THREE`。

Hero 是首屏整块，动画渲染在其中的 `#heroCanvas` 里。Hero 上方只有导航，下方是正文区。

**动画是背景层，不是主体** —— 页面主体是几句文案和一个"进入系统"按钮。

---

## 二、主题适配（最容易漏，务必先读）

站点有 `light` / `dark` 两套主题，靠根元素属性切换：

```html
<html data-theme="light">  或  <html data-theme="dark">
```

**动画必须在两套主题下都成立。只做深色版的方案会被退回。**

### 2.1 色值表

| 用途 | 浅色 | 深色 |
|---|---|---|
| 页面底色 `--bg` | `#F7F9FC` | `#0B1220` |
| 主文字 `--text` | `#14202F` | `#E8EDF7` |
| 次文字 `--text-2` | `#4E5F78` | `#9FB0CC` |
| 三级文字 `--text-3` | `#8494AB` | `#6B7C9B` |
| 主强调色 `--left` | `#2E5FD4` | `#4A7DFF` |
| 副强调色 `--right` | `#B57800` | `#F0B429` |

### 2.2 推荐做法

- 渲染器用 `alpha: true` + `setClearColor(0x000000, 0)` 保持透明，让 CSS 底色透上来。这样主题切换时背景自动跟随，不需要在 WebGL 里画背景。
- 监听主题变化，更新材质颜色与光照强度：

```js
var isDark = document.documentElement.getAttribute('data-theme') === 'dark';

new MutationObserver(function(){
  var nowDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (nowDark === isDark) return;
  isDark = nowDark;
  // 更新 material.color / emissive / light.intensity 等
}).observe(document.documentElement, {
  attributes: true, attributeFilter: ['data-theme']
});
```

### 2.3 一条实测教训

**浅色底上做发光会糊成一片脏。** 深色下好用的 additive blending、强自发光、光晕，放在浅色底上会让元素边缘发散、失去轮廓。

建议按主题给两套参数：深色可以发光，浅色改用实色 + 明暗对比表达层次。这是在本页面上实际踩过的坑，不是通用理论。

---

## 三、技术约束

### 3.1 运行环境

```
WebGL        three.js，r134（UMD，全局 window.THREE）
             不要 import，不要 bundler，不要 CDN
循环         单个 requestAnimationFrame
物理         不引入物理引擎（cannon / ammo / rapier 都不行）
相机         固定不动（可以有极小视差，但不能绕场景旋转）
```

### 3.2 性能

```
DPR 上限      1.5 ~ 2.0（超出请自行 clamp）
移动端        降粒子数（建议 40% 左右），关阴影
阴影          桌面可选，移动端必须关
后处理        bloom 可以有但要克制；不要堆后处理链
目标          桌面 60fps，中端手机 ≥ 30fps
```

达不到就减粒子或降精度，**不要靠降低更新频率**（会看起来卡）。

### 3.3 降级

```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // 渲染一帧静态构图，不启动循环
  renderer.render(scene, camera);
  return;
}
```

必须是"一张安静的静态图"，不是"暂停的动画"。

### 3.4 清理

页面卸载时释放所有资源，避免 WebGL 上下文泄漏：

```js
window.addEventListener('pagehide', dispose);
window.addEventListener('beforeunload', dispose);
// dispose 内：geometry.dispose() / material.dispose() /
//             texture.dispose() / renderer.dispose() / forceContextLoss()
```

### 3.5 可调参数

文件顶部用注释集中标出所有可调参数（粒子数、尺寸、颜色、时长等），不要散落在代码各处。后续维护要能一眼改。

---

## 四、页面接口

### 4.1 挂载点

```html
<section class="hero" id="hero">
  <canvas id="heroCanvas" aria-hidden="true"></canvas>
  <div class="hero-stage"> ...静态占位 SVG... </div>
  <div class="wrap"> ...文案 + CTA... </div>
</section>
```

`#heroCanvas` 现有样式：

```css
position:absolute; inset:0; width:100%; height:100%;
display:block; z-index:0; pointer-events:none;
opacity:0;  /* 默认隐藏，等场景就绪 */
```

### 4.2 接管协议（重要）

场景初始化完成后，**给 `<body>` 加一个类**：

```js
document.body.classList.add('hero-ready');
```

这会让 canvas 淡入（`opacity: 1`）、静态占位自动退场。

**不要自己改 canvas 的 opacity。** 走这个类，主题与降级逻辑才不会被绕过。

### 4.3 不许动的东西

| 属性 | 原因 |
|---|---|
| `canvas` 的 `z-index` | 必须低于文案层，否则压住文字 |
| `canvas` 的 `pointer-events` | 必须是 `none`，否则吃掉 CTA 的点击 |
| `#hero` 的高度 | 由 CSS 控制，动画不要改 |
| `.hero-stage` | 占位层，由 `hero-ready` 协议控制 |

**绝对不要在 canvas 里画任何需要点击的东西。** 所有交互都在 DOM 层。

### 4.4 尺寸与构图重心

| | 桌面（≥861px） | 移动端（<861px） |
|---|---|---|
| Hero 高度 | `min(88vh, 780px)`，典型 **1265 × 507** | 由内容撑开 |
| canvas | 铺满整个 Hero | `top:0; height:min(62vw,250px)`，典型 **390 × 250** |
| 文案位置 | **左侧**，占宽 40% | 下方，占满宽度 |
| 可用区域 | **右侧约 60%** | 顶部整条 |

**桌面端构图请靠右。** 左侧 40% 是文案，动画主体压过去会和文字糊在一起。

**移动端画布很扁**（约 250px 高、宽高比接近 1.56），横向空间窄。不要直接沿用桌面参数，需要单独适配。

### 4.5 尺寸变化

Hero 会在窗口 resize 和移动端地址栏收起时改变尺寸。请监听 canvas 自身的尺寸变化并更新相机投影矩阵，**不要用 `window.innerHeight` 直接算**（移动端地址栏会骗人）。

推荐用 `ResizeObserver` 观察 `#heroCanvas`：

```js
new ResizeObserver(function(){
  // 用 canvas.clientWidth / canvas.clientHeight，不是 window.innerWidth
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
}).observe(canvas);
```

---

## 五、交付形式

一个自包含的 JS 文件，直接 `<script>` 引入即可：

```js
// hero-scene.js
(function(){
  var canvas = document.getElementById('heroCanvas');
  if (!canvas || !window.THREE) return;

  // ... 完整场景 ...

  document.body.classList.add('hero-ready');
})();
```

要求：

1. 不依赖构建工具，不 import，不引外部 CDN
2. 用全局 `window.THREE`（r134）
3. 顶部注释列出可调参数
4. 包含 `prefers-reduced-motion` 分支
5. 包含 `dispose` 逻辑
6. 兼容两套主题

---

## 六、验收清单

接入前请先自检。以下会逐条验证，**任何一条不过都会退回**：

**功能**
- [ ] 桌面端 CTA 可点击，不被 canvas 遮挡
- [ ] 移动端 CTA 可点击，不被 canvas 遮挡
- [ ] 窗口缩放后构图不错位、不被裁切
- [ ] 移动端地址栏收起/展开后不跳变

**主题**
- [ ] 浅色主题下结构清楚、不发灰、不糊
- [ ] 深色主题下层次分明
- [ ] 切换主题时动画平滑过渡，不闪白、不重载

**技术**
- [ ] `prefers-reduced-motion` 下是静态图，不是暂停的动画
- [ ] 切到别的标签页再切回来，动画不加速、不跳帧
- [ ] 控制台无报错、无 WebGL 警告
- [ ] 无外部网络请求（three.js 由站点提供）
- [ ] 页面卸载后无 WebGL 上下文泄漏警告
- [ ] 手机实机 ≥ 30fps

**性能**
- [ ] 桌面 60fps
- [ ] DPR 已 clamp 在 2.0 以内
- [ ] 移动端未开启阴影

---

## 七、其他

- 想看当前占位效果：`https://climbing2the.top/`
- 静态占位的 SVG 写在 `index.html` 的 `.hero-stage` 里。接入后**建议保留**，作为 WebGL 失败时的兜底，比空白好
- three.js 目前**未被引入**（动画移除时一起去掉了）。场景交付时我会加回来，你按 `window.THREE` 写即可
