/**
 * ============================================================================
 * Hero 3D Scene — 杠铃策略监控系统 (Barbell Strategy Monitor)
 * 视觉主题：《非对称天平 · 双极再平衡 (Asymmetric Equilibrium)》
 * 运行环境：Three.js r134 (UMD, window.THREE)，零外部资源依赖
 * ============================================================================
 *
 * 【顶部可调参数指南】
 * 所有核心视觉、布局、两端大小比例、开场收缩归位动画、鼠标跟随粒子、主题色值
 * 均集中在下方 CONFIG 对象中。修改对应数值即可快速微调效果。
 */
(function () {
  'use strict';

  /* ==========================================================================
     1. 集中可调参数 (CONFIG)
     ========================================================================== */
  var CONFIG = {
    // 响应式断点与性能控制
    performance: {
      mobileBreakpoint: 861,       // 与站点 CSS @media (max-width: 860px) 严格对齐
      maxDprDesktop: 1.75,         // 桌面端最大设备像素比（规范要求 <= 2.0）
      maxDprMobile: 1.5,           // 移动端最大设备像素比
      mobileParticleRatio: 0.42,   // 移动端粒子保留比例（约 40%）
      antialias: true
    },

    // 相机与开场动画 -> 顶部区域归位布局参数
    layout: {
      cameraFov: 34,
      cameraZ: 11.4,
      cameraY: 0.16,

      // 桌面端：先在舞台中央大尺寸播放开场动画，随后缩小并归位至顶部（右上方）区域循环播放
      desktop: {
        // 开场态（大尺寸、在画面正中央展开）
        introViewOffsetX: -0.02,   // 开场位于画面正中央
        introViewOffsetY: 0.0,
        introOffsetY: -0.12,
        introScale: 1.42,          // 开场大尺寸全屏感
        introPitchZ: 0.06,         // 开场近乎水平展开，随归位逐渐扬起

        // 归位循环态（明显缩小并上移收拢至顶部/右上方区域，与下方及左侧文案错落呼应）
        dockedViewOffsetX: -0.235, // 光学中心右移至右侧舞台，留出充裕图文间距
        dockedViewOffsetY: 0.0,
        dockedOffsetY: 0.78,       // 世界坐标显著上移至 Hero 顶部区域
        dockedScale: 0.75,         // 缩小至精致的顶部监控器尺寸
        dockedPitchZ: 0.21,        // 杠铃右上仰角

        yawY: -0.20,               // 水平偏航角
        rollX: 0.16                // 俯仰立体倾角
      },

      // 移动端：开场居中于全屏（无文字遮罩态），随后缩小并上移归位至画面顶端区域
      mobile: {
        introScale: 1.04,          // 开场全屏居中时的饱满尺寸
        introPitchZ: 0.05,

        dockedOffsetX: 0.0,
        dockedScale: 0.78,         // 收缩至顶端后的精致尺寸
        dockedPitchZ: 0.13,
        yawY: -0.14,
        rollX: 0.15
      },

      // 桌面端整体微视差（克制阻尼，不旋转相机）
      parallax: {
        enabledDesktop: true,
        maxRotX: 0.028,
        maxRotY: 0.042,
        damping: 0.06
      }
    },

    // 杠铃两端与中轴几何尺寸参数（左大右小：直观体现 85%~90% 稳健底仓 vs 10%~15% 凸性小仓位）
    geometry: {
      leftPoleX: -2.18,            // 左极（稳健压舱石）局部 X 坐标
      rightPoleX: 2.38,            // 右极（凸性探针）局部 X 坐标
      bridgeStartX: -0.44,         // 中段真空带起点 X（紧贴大型左极外缘）
      bridgeEndX: 1.66,            // 中段真空带终点 X（衔接精悍右极内缘）

      // 左极：压舱石（显著放大，体量厚重沉稳）
      leftCoreRadius: 0.94,        // 主二十面体晶格半径（原 0.68 -> 0.94，体积放大约 2.6 倍）
      leftInnerCoreRadius: 0.62,   // 内层高密度核心半径
      leftCageRadius: 1.03,        // 外层精密线框半径
      leftShieldRadius: 1.32,      // 主刻度护盾环半径
      leftOuterGimbal1: 1.54,      // 正交陀螺仪环 1 半径
      leftOuterGimbal2: 1.72,      // 正交陀螺仪环 2 半径

      // 右极：凸性引擎（显著缩小，精悍锐利如高能探针）
      rightCoreRadius: 0.25,       // 锐利八面棱锥核心半径（原 0.44 -> 0.25，体量仅为左极的约 1/50）
      rightCoreStretchX: 1.56,     // 向右上长尾方向的非对称拉伸比
      rightInnerGimbalRadius: 0.36,// 右极核心内层精密环半径
      rightOrbits: [
        // 3 条紧凑高偏心率椭圆跃迁轨道（围绕精悍右极，向右上长尾方向延展）
        { a: 0.78, b: 0.33, offsetX: 0.22, rotX: 0.52,  rotY: 0.24,  rotZ: 0.30,  speed: 1.05 },
        { a: 0.92, b: 0.29, offsetX: 0.28, rotX: -0.66, rotY: -0.28, rotZ: 0.16,  speed: 0.86 },
        { a: 0.66, b: 0.38, offsetX: 0.16, rotX: 1.10,  rotY: 0.12,  rotZ: -0.40, speed: 1.24 }
      ]
    },

    // 粒子系统与鼠标跟随交互参数
    particles: {
      harvestCount: 36,            // 上轨：右极(金) -> 左极(蓝) 超额收益收割回流粒子数
      budgetCount: 22,             // 下轨：左极(蓝) -> 右极(金) 风险预算输送粒子数
      rightTailSwarmCount: 28,     // 右极外围：凸性长尾跃迁微粒数
      ambientCount: 48,            // 空间景深微粒数（支持鼠标引力场扰动）
      cursorFollowCount: 32,       // 专属鼠标跟随星云/轨迹粒子数
      baseCurveLines: 7,           // 底部双分布曲率基准线数量
      baseCurveSegments: 64,       // 每条曲率基准线采样段数

      // 鼠标跟随物理参数
      mouseFieldRadius: 2.35,      // 鼠标对再平衡流与环境粒子的磁吸影响半径
      mouseDeflectStrength: 0.68,  // 鼠标对过路粒子的牵引强度
      followerSpringMin: 0.032,    // 跟随粒子群最小弹簧刚度（形成长短尾迹层次）
      followerSpringMax: 0.13,     // 跟随粒子群最大弹簧刚度
      followerDamping: 0.83,       // 跟随粒子速度阻尼
      followerOrbitRadius: 0.68    // 跟随粒子围绕鼠标游标的星云散布半径
    },

    // 动画时间轴与速率参数
    animation: {
      maxDeltaSeconds: 0.05,       // 切后台防跳帧最大单帧时间差（50ms）
      introHoldSeconds: 0.75,      // 阶段 1：开场大尺寸中央展开持续时间（秒）
      introShrinkSeconds: 1.20,    // 阶段 2：从中央大尺寸平滑缩小归位至顶部区域耗时（秒）
      themeLerpSpeed: 7.5,         // 主题切换平滑过渡速率
      staticPoseTime: 5.0,         // prefers-reduced-motion 静态构图采样时刻（直接取归位后状态）
      leftSpinSpeed: 0.14,         // 左极稳健自转基准角速度（低频厚重）
      rightSpinSpeed: 0.62,        // 右极凸性核心自转基准角速度（高能敏锐）
      harvestFlowSpeed: 0.38,      // 金 -> 蓝 再平衡回流速度
      budgetFlowSpeed: 0.23,       // 蓝 -> 金 风险预算输送速度
      pulseCycleSeconds: 5.2,      // 再平衡脉冲波周期（与天平摆动周期同步）

      // 天平 / 跷跷板上下缓慢摆动参数
      seesawPeriodSeconds: 5.2,    // 天平完整上下倾摆周期（秒，缓慢沉稳的呼吸式摆动）
      seesawAmplitudeRad: 0.105,   // 主梁上下倾摆角幅度（弧度，约 ±6°，带动两端反向升降）
      seesawLeftBobAmp: 0.075,     // 左侧重型压舱石附加阻尼沉降幅度（局部 Y 轴）
      seesawRightBobAmp: 0.135     // 右侧轻型凸性探针附加弹性跳动幅度（局部 Y 轴，左稳右灵）
    },

    // 双主题色板配置（严格对齐 HERO-ANIM-SPEC.md 2.1 色值表与 2.3 实测规范）
    themes: {
      // 深色主题（底色 #0B1220）
      dark: {
        leftPrimary: '#4A7DFF',
        leftSolid: '#234DB0',
        leftEmissive: '#102458',
        leftWire: '#8AB0FF',
        leftRing: '#4A7DFF',
        leftAccent: '#B8CEFF',

        rightPrimary: '#F0B429',
        rightSolid: '#D99B16',
        rightEmissive: '#4D3000',
        rightWire: '#FFE08A',
        rightOrbit: '#F0B429',
        rightApex: '#FFF0C2',

        neutralLine: '#6B7C9B',
        neutralMuted: '#33476B',
        cursorColor: '#E8EDF7',
        gridLeft: '#385EB2',
        gridMid: '#223250',
        gridRight: '#946E19',

        ambientLightColor: '#8CA8D8',
        ambientIntensity: 0.62,
        keyLightColor: '#FFFFFF',
        keyLightIntensity: 1.05,
        fillLightColor: '#4A7DFF',
        fillLightIntensity: 0.55,
        rimLightColor: '#F0B429',
        rimLightIntensity: 0.65,

        wireOpacity: 0.76,
        ringOpacity: 0.68,
        orbitOpacity: 0.74,
        bridgeOpacity: 0.48,
        gridOpacity: 0.28,
        particleOpacity: 0.92,
        useAdditive: true
      },

      // 浅色主题（底色 #F7F9FC）：实色高对比 + 几何明暗棱面，无泛光不发糊
      light: {
        leftPrimary: '#2E5FD4',
        leftSolid: '#2653C0',
        leftEmissive: '#071330',
        leftWire: '#10255A',
        leftRing: '#224BB0',
        leftAccent: '#14202F',

        rightPrimary: '#B57800',
        rightSolid: '#C48206',
        rightEmissive: '#261500',
        rightWire: '#5C3A00',
        rightOrbit: '#A86E00',
        rightApex: '#7A4D00',

        neutralLine: '#4E5F78',
        neutralMuted: '#7B8CA6',
        cursorColor: '#14202F',
        gridLeft: '#5D82D8',
        gridMid: '#C8D3E3',
        gridRight: '#C4942D',

        ambientLightColor: '#EBF1FA',
        ambientIntensity: 0.56,
        keyLightColor: '#FFFFFF',
        keyLightIntensity: 0.92,
        fillLightColor: '#B8CEF5',
        fillLightIntensity: 0.42,
        rimLightColor: '#F5C451',
        rimLightIntensity: 0.45,

        wireOpacity: 0.80,
        ringOpacity: 0.78,
        orbitOpacity: 0.84,
        bridgeOpacity: 0.58,
        gridOpacity: 0.35,
        particleOpacity: 0.90,
        useAdditive: false
      }
    }
  };

  /* ==========================================================================
     2. 环境前置检查与静态占位立即清除
     ========================================================================== */
  var canvas = document.getElementById('heroCanvas');
  var THREE = window.THREE;
  if (!canvas || !THREE) return;

  var reducedMotionQuery = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };
  var isReducedMotion = !!reducedMotionQuery.matches;

  var disposables = {
    geometries: [],
    materials: [],
    textures: []
  };

  function trackGeometry(geo) {
    if (geo) disposables.geometries.push(geo);
    return geo;
  }
  function trackMaterial(mat) {
    if (mat) disposables.materials.push(mat);
    return mat;
  }
  function trackTexture(tex) {
    if (tex) disposables.textures.push(tex);
    return tex;
  }

  /* ==========================================================================
     3. 渲染器、场景与相机初始化
     ========================================================================== */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: CONFIG.performance.antialias,
      powerPreference: 'high-performance'
    });
  } catch (e) {
    return;
  }

  // WebGL 确认可用后，立即隐藏旧版静态占位（彻底消除“左侧圆筒右侧三角”在首屏 0.8s 淡出残留）
  var legacyStage = document.getElementById('heroStage') || document.querySelector('.hero-stage');
  if (legacyStage) {
    legacyStage.style.transition = 'none';
    legacyStage.style.opacity = '0';
    legacyStage.style.visibility = 'hidden';
  }

  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(
    CONFIG.layout.cameraFov,
    1,
    0.1,
    100
  );
  camera.position.set(0, CONFIG.layout.cameraY, CONFIG.layout.cameraZ);
  camera.lookAt(0, 0, 0);

  var stageRoot = new THREE.Group();
  scene.add(stageRoot);

  var parallaxGroup = new THREE.Group();
  stageRoot.add(parallaxGroup);

  var barbellGroup = new THREE.Group();
  parallaxGroup.add(barbellGroup);

  var envGroup = new THREE.Group();
  parallaxGroup.add(envGroup);

  /* ==========================================================================
     4. 主题状态与平滑插值器
     ========================================================================== */
  function detectDarkTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  var isDark = detectDarkTheme();
  var themeTransitionNeedRender = false;

  var COLOR_KEYS = [
    'leftPrimary', 'leftSolid', 'leftEmissive', 'leftWire', 'leftRing', 'leftAccent',
    'rightPrimary', 'rightSolid', 'rightEmissive', 'rightWire', 'rightOrbit', 'rightApex',
    'neutralLine', 'neutralMuted', 'cursorColor', 'gridLeft', 'gridMid', 'gridRight',
    'ambientLightColor', 'keyLightColor', 'fillLightColor', 'rimLightColor'
  ];
  var SCALAR_KEYS = [
    'ambientIntensity', 'keyLightIntensity', 'fillLightIntensity', 'rimLightIntensity',
    'wireOpacity', 'ringOpacity', 'orbitOpacity', 'bridgeOpacity',
    'gridOpacity', 'particleOpacity'
  ];

  var currentTheme = { colors: {}, scalars: {}, useAdditive: isDark };
  var targetTheme = { colors: {}, scalars: {}, useAdditive: isDark };

  function syncThemeTarget(darkFlag, immediate) {
    var src = darkFlag ? CONFIG.themes.dark : CONFIG.themes.light;
    targetTheme.useAdditive = !!src.useAdditive;
    for (var i = 0; i < COLOR_KEYS.length; i++) {
      var ck = COLOR_KEYS[i];
      if (!targetTheme.colors[ck]) {
        targetTheme.colors[ck] = new THREE.Color(src[ck]);
      } else {
        targetTheme.colors[ck].set(src[ck]);
      }
      if (immediate || !currentTheme.colors[ck]) {
        currentTheme.colors[ck] = new THREE.Color(src[ck]);
      }
    }
    for (var j = 0; j < SCALAR_KEYS.length; j++) {
      var sk = SCALAR_KEYS[j];
      targetTheme.scalars[sk] = src[sk];
      if (immediate || typeof currentTheme.scalars[sk] !== 'number') {
        currentTheme.scalars[sk] = src[sk];
      }
    }
    if (immediate) {
      currentTheme.useAdditive = targetTheme.useAdditive;
    }
  }

  syncThemeTarget(isDark, true);

  /* ==========================================================================
     5. 灯光系统
     ========================================================================== */
  var ambientLight = new THREE.AmbientLight(
    currentTheme.colors.ambientLightColor,
    currentTheme.scalars.ambientIntensity
  );
  scene.add(ambientLight);

  var keyLight = new THREE.DirectionalLight(
    currentTheme.colors.keyLightColor,
    currentTheme.scalars.keyLightIntensity
  );
  keyLight.position.set(5.5, 6.5, 6.0);
  scene.add(keyLight);

  var fillLight = new THREE.DirectionalLight(
    currentTheme.colors.fillLightColor,
    currentTheme.scalars.fillLightIntensity
  );
  fillLight.position.set(-6.0, 2.0, 4.5);
  scene.add(fillLight);

  var rimLight = new THREE.DirectionalLight(
    currentTheme.colors.rimLightColor,
    currentTheme.scalars.rimLightIntensity
  );
  rimLight.position.set(3.5, -4.5, -5.0);
  scene.add(rimLight);

  /* ==========================================================================
     6. 程序化粒子纹理
     ========================================================================== */
  function createParticleTexture() {
    var size = 64;
    var c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    var ctx = c.getContext('2d');
    var half = size / 2;

    var grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.46, 'rgba(255, 255, 255, 0.98)');
    grad.addColorStop(0.70, 'rgba(255, 255, 255, 0.38)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    var texture = new THREE.CanvasTexture(c);
    texture.needsUpdate = true;
    return trackTexture(texture);
  }

  var particleTexture = createParticleTexture();

  /* ==========================================================================
     7. 共享材质创建
     ========================================================================== */
  var materials = {
    // 左极（大型稳健防守端）
    leftCoreSolid: trackMaterial(new THREE.MeshStandardMaterial({
      color: currentTheme.colors.leftSolid,
      emissive: currentTheme.colors.leftEmissive,
      roughness: 0.34,
      metalness: 0.22,
      flatShading: true
    })),
    leftRingSolid: trackMaterial(new THREE.MeshStandardMaterial({
      color: currentTheme.colors.leftPrimary,
      emissive: currentTheme.colors.leftEmissive,
      roughness: 0.30,
      metalness: 0.28
    })),
    leftWire: trackMaterial(new THREE.LineBasicMaterial({
      color: currentTheme.colors.leftWire,
      transparent: true,
      opacity: currentTheme.scalars.wireOpacity
    })),
    leftRingLine: trackMaterial(new THREE.LineBasicMaterial({
      color: currentTheme.colors.leftRing,
      transparent: true,
      opacity: currentTheme.scalars.ringOpacity
    })),
    leftRipple: trackMaterial(new THREE.LineBasicMaterial({
      color: currentTheme.colors.rightPrimary,
      transparent: true,
      opacity: 0.0
    })),

    // 右极（小型精悍高凸性进攻端）
    rightCoreSolid: trackMaterial(new THREE.MeshStandardMaterial({
      color: currentTheme.colors.rightSolid,
      emissive: currentTheme.colors.rightEmissive,
      roughness: 0.26,
      metalness: 0.24,
      flatShading: true
    })),
    rightRingSolid: trackMaterial(new THREE.MeshStandardMaterial({
      color: currentTheme.colors.rightPrimary,
      emissive: currentTheme.colors.rightEmissive,
      roughness: 0.28,
      metalness: 0.30
    })),
    rightWire: trackMaterial(new THREE.LineBasicMaterial({
      color: currentTheme.colors.rightWire,
      transparent: true,
      opacity: currentTheme.scalars.wireOpacity
    })),
    rightOrbitLine: trackMaterial(new THREE.LineBasicMaterial({
      color: currentTheme.colors.rightOrbit,
      transparent: true,
      opacity: currentTheme.scalars.orbitOpacity
    })),
    rightApexArc: trackMaterial(new THREE.LineBasicMaterial({
      color: currentTheme.colors.rightApex,
      transparent: true,
      opacity: Math.min(1, currentTheme.scalars.orbitOpacity + 0.18)
    })),
    rightRayLine: trackMaterial(new THREE.LineBasicMaterial({
      color: currentTheme.colors.rightPrimary,
      transparent: true,
      opacity: currentTheme.scalars.orbitOpacity * 0.60
    })),

    // 中轴（纪律真空带与再平衡游标）
    bridgeLine: trackMaterial(new THREE.LineBasicMaterial({
      color: currentTheme.colors.neutralLine,
      transparent: true,
      opacity: currentTheme.scalars.bridgeOpacity
    })),
    bridgeMutedLine: trackMaterial(new THREE.LineBasicMaterial({
      color: currentTheme.colors.neutralMuted,
      transparent: true,
      opacity: currentTheme.scalars.bridgeOpacity * 0.72
    })),
    cursorLine: trackMaterial(new THREE.LineBasicMaterial({
      color: currentTheme.colors.cursorColor,
      transparent: true,
      opacity: 0.84
    })),
    cursorSolid: trackMaterial(new THREE.MeshStandardMaterial({
      color: currentTheme.colors.rightPrimary,
      emissive: currentTheme.colors.rightEmissive,
      roughness: 0.28,
      metalness: 0.25,
      flatShading: true
    })),

    // 粒子与环境基准线
    harvestParticles: trackMaterial(new THREE.PointsMaterial({
      color: currentTheme.colors.rightPrimary,
      map: particleTexture,
      size: 0.15,
      transparent: true,
      opacity: currentTheme.scalars.particleOpacity,
      depthWrite: false,
      blending: currentTheme.useAdditive ? THREE.AdditiveBlending : THREE.NormalBlending
    })),
    budgetParticles: trackMaterial(new THREE.PointsMaterial({
      color: currentTheme.colors.leftPrimary,
      map: particleTexture,
      size: 0.115,
      transparent: true,
      opacity: currentTheme.scalars.particleOpacity * 0.9,
      depthWrite: false,
      blending: currentTheme.useAdditive ? THREE.AdditiveBlending : THREE.NormalBlending
    })),
    rightSwarmParticles: trackMaterial(new THREE.PointsMaterial({
      color: currentTheme.colors.rightOrbit,
      map: particleTexture,
      size: 0.11,
      transparent: true,
      opacity: currentTheme.scalars.particleOpacity * 0.85,
      depthWrite: false,
      blending: currentTheme.useAdditive ? THREE.AdditiveBlending : THREE.NormalBlending
    })),
    cursorFollowParticles: trackMaterial(new THREE.PointsMaterial({
      vertexColors: true,
      map: particleTexture,
      size: 0.135,
      transparent: true,
      opacity: currentTheme.scalars.particleOpacity * 0.92,
      depthWrite: false,
      blending: currentTheme.useAdditive ? THREE.AdditiveBlending : THREE.NormalBlending
    })),
    ambientParticles: trackMaterial(new THREE.PointsMaterial({
      color: currentTheme.colors.neutralLine,
      map: particleTexture,
      size: 0.085,
      transparent: true,
      opacity: currentTheme.scalars.gridOpacity * 1.15,
      depthWrite: false,
      blending: THREE.NormalBlending
    })),
    baseGridLine: trackMaterial(new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: currentTheme.scalars.gridOpacity
    }))
  };

  /* ==========================================================================
     8. 几何辅助构造函数
     ========================================================================== */
  function createCircleLineGeometry(radius, segments, arcAngle, startAngle) {
    var segs = segments || 72;
    var span = typeof arcAngle === 'number' ? arcAngle : Math.PI * 2;
    var offset = startAngle || 0;
    var positions = new Float32Array((segs + 1) * 3);
    for (var i = 0; i <= segs; i++) {
      var theta = offset + (i / segs) * span;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.sin(theta) * radius;
      positions[i * 3 + 2] = 0;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return trackGeometry(geo);
  }

  function createRadialTicksGeometry(innerR, outerR, count, majorEvery) {
    var positions = new Float32Array(count * 2 * 3);
    for (var i = 0; i < count; i++) {
      var theta = (i / count) * Math.PI * 2;
      var isMajor = majorEvery && (i % majorEvery === 0);
      var r0 = isMajor ? innerR - (outerR - innerR) * 0.45 : innerR;
      var r1 = isMajor ? outerR + (outerR - innerR) * 0.25 : outerR;
      var cos = Math.cos(theta);
      var sin = Math.sin(theta);
      var idx = i * 6;
      positions[idx] = cos * r0;
      positions[idx + 1] = sin * r0;
      positions[idx + 2] = 0;
      positions[idx + 3] = cos * r1;
      positions[idx + 4] = sin * r1;
      positions[idx + 5] = 0;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return trackGeometry(geo);
  }

  function createDashedSegmentGeometry(x0, x1, y, z, dashCount, dutyRatio) {
    var step = (x1 - x0) / dashCount;
    var dashLen = step * (dutyRatio || 0.52);
    var positions = new Float32Array(dashCount * 2 * 3);
    for (var i = 0; i < dashCount; i++) {
      var sx = x0 + i * step + (step - dashLen) * 0.5;
      var ex = sx + dashLen;
      var idx = i * 6;
      positions[idx] = sx;
      positions[idx + 1] = y;
      positions[idx + 2] = z;
      positions[idx + 3] = ex;
      positions[idx + 4] = y;
      positions[idx + 5] = z;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return trackGeometry(geo);
  }

  /* ==========================================================================
     9. 构建左极：大型压舱石 · 全天候稳健核心 (Massive Left Defensive Anchor)
     ========================================================================== */
  var leftPoleGroup = new THREE.Group();
  leftPoleGroup.position.set(CONFIG.geometry.leftPoleX, 0, 0);
  barbellGroup.add(leftPoleGroup);

  // 9.1 实心重型二十面体晶格核心（放大至 0.94）
  var leftCoreGeo = trackGeometry(new THREE.IcosahedronGeometry(CONFIG.geometry.leftCoreRadius, 1));
  var leftCoreMesh = new THREE.Mesh(leftCoreGeo, materials.leftCoreSolid);
  leftPoleGroup.add(leftCoreMesh);

  // 9.2 外层精密几何线框套嵌 + 内部子午承重环
  var leftCageBaseGeo = trackGeometry(new THREE.IcosahedronGeometry(CONFIG.geometry.leftCageRadius, 1));
  var leftCageEdgesGeo = trackGeometry(new THREE.EdgesGeometry(leftCageBaseGeo));
  var leftCageLines = new THREE.LineSegments(leftCageEdgesGeo, materials.leftWire);
  leftPoleGroup.add(leftCageLines);

  var leftMeridianRingGeo = createCircleLineGeometry(CONFIG.geometry.leftCageRadius * 1.04, 72);
  var leftMeridian1 = new THREE.Line(leftMeridianRingGeo, materials.leftWire);
  var leftMeridian2 = new THREE.Line(leftMeridianRingGeo, materials.leftWire);
  leftMeridian2.rotation.y = Math.PI * 0.5;
  leftCageLines.add(leftMeridian1);
  leftCageLines.add(leftMeridian2);

  // 9.3 稳健主护盾环与 60 格精密罗盘刻度盘（半径 1.32）
  var leftShieldGroup = new THREE.Group();
  leftShieldGroup.rotation.set(0.38, 0.22, -0.15);
  leftPoleGroup.add(leftShieldGroup);

  var leftTorusGeo = trackGeometry(new THREE.TorusGeometry(CONFIG.geometry.leftShieldRadius, 0.045, 16, 84));
  var leftTorusMesh = new THREE.Mesh(leftTorusGeo, materials.leftRingSolid);
  leftShieldGroup.add(leftTorusMesh);

  var leftTicksGeo = createRadialTicksGeometry(
    CONFIG.geometry.leftShieldRadius - 0.17,
    CONFIG.geometry.leftShieldRadius - 0.07,
    60,
    5
  );
  var leftTicksLines = new THREE.LineSegments(leftTicksGeo, materials.leftWire);
  leftShieldGroup.add(leftTicksLines);

  // 9.4 双层大型正交陀螺仪环（半径 1.54 & 1.72）
  var leftGimbal1 = new THREE.Group();
  leftGimbal1.rotation.set(1.12, -0.32, 0.2);
  leftPoleGroup.add(leftGimbal1);

  var gimbal1CircleGeo = createCircleLineGeometry(CONFIG.geometry.leftOuterGimbal1, 96);
  leftGimbal1.add(new THREE.Line(gimbal1CircleGeo, materials.leftRingLine));

  var gimbal1InnerGeo = createCircleLineGeometry(CONFIG.geometry.leftOuterGimbal1 - 0.07, 96);
  leftGimbal1.add(new THREE.Line(gimbal1InnerGeo, materials.leftWire));

  // 陀螺环上的 6 个重型配重锚点块
  var anchorBoxGeo = trackGeometry(new THREE.BoxGeometry(0.095, 0.095, 0.14));
  for (var aIdx = 0; aIdx < 6; aIdx++) {
    var aAngle = (aIdx / 6) * Math.PI * 2;
    var anchorMesh = new THREE.Mesh(anchorBoxGeo, materials.leftRingSolid);
    anchorMesh.position.set(
      Math.cos(aAngle) * CONFIG.geometry.leftOuterGimbal1,
      Math.sin(aAngle) * CONFIG.geometry.leftOuterGimbal1,
      0
    );
    anchorMesh.rotation.z = aAngle;
    leftGimbal1.add(anchorMesh);
  }

  var leftGimbal2 = new THREE.Group();
  leftGimbal2.rotation.set(-0.52, 0.82, -0.4);
  leftPoleGroup.add(leftGimbal2);

  var gimbal2ArcA = createCircleLineGeometry(CONFIG.geometry.leftOuterGimbal2, 56, Math.PI * 0.74, 0.13);
  var gimbal2ArcB = createCircleLineGeometry(CONFIG.geometry.leftOuterGimbal2, 56, Math.PI * 0.74, Math.PI + 0.13);
  leftGimbal2.add(new THREE.Line(gimbal2ArcA, materials.leftRingLine));
  leftGimbal2.add(new THREE.Line(gimbal2ArcB, materials.leftRingLine));

  var gimbal2TicksGeo = createRadialTicksGeometry(
    CONFIG.geometry.leftOuterGimbal2 - 0.08,
    CONFIG.geometry.leftOuterGimbal2 + 0.035,
    36,
    6
  );
  leftGimbal2.add(new THREE.LineSegments(gimbal2TicksGeo, materials.leftWire));

  // 9.5 再平衡收割涟漪环
  var leftRippleGeo = createCircleLineGeometry(1.12, 72);
  var leftRippleLine = new THREE.Line(leftRippleGeo, materials.leftRipple);
  leftRippleLine.rotation.y = Math.PI * 0.42;
  leftPoleGroup.add(leftRippleLine);

  /* ==========================================================================
     10. 构建右极：小型精悍凸性探针 · 非对称长尾核心 (Compact Right Convexity Probe)
     ========================================================================== */
  var rightPoleGroup = new THREE.Group();
  rightPoleGroup.position.set(CONFIG.geometry.rightPoleX, 0, 0);
  barbellGroup.add(rightPoleGroup);

  // 10.1 紧凑锐利的非对称八面体探针核心（半径 0.25，与左侧 0.94 形成强烈大小对比）
  var rightCoreContainer = new THREE.Group();
  rightCoreContainer.rotation.z = 0.22;
  rightPoleGroup.add(rightCoreContainer);

  var rightCoreGeo = trackGeometry(new THREE.OctahedronGeometry(CONFIG.geometry.rightCoreRadius, 0));
  var rightCoreMesh = new THREE.Mesh(rightCoreGeo, materials.rightCoreSolid);
  rightCoreMesh.scale.set(CONFIG.geometry.rightCoreStretchX, 0.84, 0.84);
  rightCoreContainer.add(rightCoreMesh);

  var rightCoreEdgesGeo = trackGeometry(new THREE.EdgesGeometry(rightCoreGeo));
  var rightCoreEdgeLines = new THREE.LineSegments(rightCoreEdgesGeo, materials.rightWire);
  rightCoreMesh.add(rightCoreEdgeLines);

  // 紧凑反向交错星芒线框
  var rightStarBaseGeo = trackGeometry(new THREE.OctahedronGeometry(CONFIG.geometry.rightCoreRadius * 1.24, 0));
  var rightStarEdgesGeo = trackGeometry(new THREE.EdgesGeometry(rightStarBaseGeo));
  var rightStarWire1 = new THREE.LineSegments(rightStarEdgesGeo, materials.rightWire);
  rightStarWire1.scale.set(CONFIG.geometry.rightCoreStretchX, 0.88, 0.88);
  rightCoreContainer.add(rightStarWire1);

  var rightStarWire2 = new THREE.LineSegments(rightStarEdgesGeo, materials.rightWire);
  rightStarWire2.rotation.set(Math.PI * 0.25, Math.PI * 0.25, 0);
  rightStarWire2.scale.set(1.06, 1.0, 1.0);
  rightCoreContainer.add(rightStarWire2);

  // 内层微型加速环（半径 0.36）
  var rightInnerRingGeo = trackGeometry(new THREE.TorusGeometry(CONFIG.geometry.rightInnerGimbalRadius, 0.014, 12, 56));
  var rightInnerRingMesh = new THREE.Mesh(rightInnerRingGeo, materials.rightRingSolid);
  rightInnerRingMesh.rotation.set(0.85, 0.35, -0.25);
  rightCoreContainer.add(rightInnerRingMesh);

  // 10.2 三条紧凑高偏心率椭圆跃迁轨道 + 微型跃迁卫星节点
  var orbitControllers = [];
  var satOctaGeo = trackGeometry(new THREE.OctahedronGeometry(0.052, 0));
  var satOctaEdgesGeo = trackGeometry(new THREE.EdgesGeometry(satOctaGeo));
  var satRingGeo = createCircleLineGeometry(0.092, 20);

  for (var oIdx = 0; oIdx < CONFIG.geometry.rightOrbits.length; oIdx++) {
    var oCfg = CONFIG.geometry.rightOrbits[oIdx];
    var orbitPlane = new THREE.Group();
    orbitPlane.rotation.set(oCfg.rotX, oCfg.rotY, oCfg.rotZ);
    rightPoleGroup.add(orbitPlane);

    var ellipseSegs = 72;
    var ellipsePos = new Float32Array((ellipseSegs + 1) * 3);
    for (var e = 0; e <= ellipseSegs; e++) {
      var ang = (e / ellipseSegs) * Math.PI * 2;
      ellipsePos[e * 3] = Math.cos(ang) * oCfg.a + oCfg.offsetX;
      ellipsePos[e * 3 + 1] = Math.sin(ang) * oCfg.b;
      ellipsePos[e * 3 + 2] = 0;
    }
    var ellipseGeo = trackGeometry(new THREE.BufferGeometry());
    ellipseGeo.setAttribute('position', new THREE.BufferAttribute(ellipsePos, 3));
    orbitPlane.add(new THREE.Line(ellipseGeo, materials.rightOrbitLine));

    // 远日点高亮加粗弧段
    var apexSegs = 24;
    var apexPos = new Float32Array((apexSegs + 1) * 3);
    var apexSpan = Math.PI * 0.55;
    for (var ap = 0; ap <= apexSegs; ap++) {
      var aAng = -apexSpan * 0.5 + (ap / apexSegs) * apexSpan;
      apexPos[ap * 3] = Math.cos(aAng) * (oCfg.a + 0.022) + oCfg.offsetX;
      apexPos[ap * 3 + 1] = Math.sin(aAng) * (oCfg.b + 0.022);
      apexPos[ap * 3 + 2] = 0;
    }
    var apexGeo = trackGeometry(new THREE.BufferGeometry());
    apexGeo.setAttribute('position', new THREE.BufferAttribute(apexPos, 3));
    orbitPlane.add(new THREE.Line(apexGeo, materials.rightApexArc));

    var satGroup = new THREE.Group();
    var satMesh = new THREE.Mesh(satOctaGeo, materials.rightCoreSolid);
    satMesh.add(new THREE.LineSegments(satOctaEdgesGeo, materials.rightWire));
    var satHalo = new THREE.Line(satRingGeo, materials.rightWire);
    satGroup.add(satMesh);
    satGroup.add(satHalo);
    orbitPlane.add(satGroup);

    orbitControllers.push({
      cfg: oCfg,
      plane: orbitPlane,
      satellite: satGroup,
      mesh: satMesh,
      halo: satHalo,
      phaseOffset: oIdx * 2.15
    });
  }

  // 10.3 右侧长尾凸性矢量射线（从精悍核心射向右上长尾空间）
  var rayAngles = [
    { y: 0.26,  z: 0.14,  len: 1.28 },
    { y: 0.44,  z: -0.16, len: 1.12 },
    { y: -0.28, z: 0.20,  len: 1.06 },
    { y: 0.10,  z: -0.34, len: 1.18 },
    { y: -0.42, z: -0.10, len: 0.98 }
  ];
  var rayPositions = [];
  for (var rIdx = 0; rIdx < rayAngles.length; rIdx++) {
    var ra = rayAngles[rIdx];
    var dirX = Math.cos(ra.y) * Math.cos(ra.z);
    var dirY = Math.sin(ra.y);
    var dirZ = Math.cos(ra.y) * Math.sin(ra.z);
    var rStart = 0.42;
    var rEnd = ra.len;
    rayPositions.push(
      dirX * rStart, dirY * rStart, dirZ * rStart,
      dirX * rEnd, dirY * rEnd, dirZ * rEnd
    );
    var tickRatios = [0.42, 0.68, 0.94];
    for (var tIdx = 0; tIdx < tickRatios.length; tIdx++) {
      var tr = rStart + (rEnd - rStart) * tickRatios[tIdx];
      var tx = dirX * tr;
      var ty = dirY * tr;
      var tz = dirZ * tr;
      var tickHalf = 0.032 * (1 + tIdx * 0.35);
      rayPositions.push(tx, ty - tickHalf, tz, tx, ty + tickHalf, tz);
    }
  }
  var rightRaysGeo = trackGeometry(new THREE.BufferGeometry());
  rightRaysGeo.setAttribute('position', new THREE.Float32BufferAttribute(rayPositions, 3));
  var rightRaysLines = new THREE.LineSegments(rightRaysGeo, materials.rightRayLine);
  rightPoleGroup.add(rightRaysLines);

  // 10.4 凸性彩票渔网弧面（呼应实盘系统 Tier 2「凸性彩票渔网」：在右侧远端长尾张网捕捞极端高赔率机会）
  var netPositions = [];
  var netRadius = 1.06;
  var latCount = 4;
  var lonCount = 6;
  var latSegs = 20;
  var latMin = -0.46, latMax = 0.52;
  var lonMin = -0.62, lonMax = 0.62;

  for (var li = 0; li <= latCount; li++) {
    var lat = latMin + (li / latCount) * (latMax - latMin);
    var cosLat = Math.cos(lat);
    var sinLat = Math.sin(lat);
    for (var s = 0; s < latSegs; s++) {
      var lon0 = lonMin + (s / latSegs) * (lonMax - lonMin);
      var lon1 = lonMin + ((s + 1) / latSegs) * (lonMax - lonMin);
      netPositions.push(
        netRadius * cosLat * Math.cos(lon0) + 0.12, netRadius * sinLat, netRadius * cosLat * Math.sin(lon0),
        netRadius * cosLat * Math.cos(lon1) + 0.12, netRadius * sinLat, netRadius * cosLat * Math.sin(lon1)
      );
    }
  }
  for (var lj = 0; lj <= lonCount; lj++) {
    var lon = lonMin + (lj / lonCount) * (lonMax - lonMin);
    var cosLon = Math.cos(lon);
    var sinLon = Math.sin(lon);
    for (var s2 = 0; s2 < latSegs; s2++) {
      var la0 = latMin + (s2 / latSegs) * (latMax - latMin);
      var la1 = latMin + ((s2 + 1) / latSegs) * (latMax - latMin);
      netPositions.push(
        netRadius * Math.cos(la0) * cosLon + 0.12, netRadius * Math.sin(la0), netRadius * Math.cos(la0) * sinLon,
        netRadius * Math.cos(la1) * cosLon + 0.12, netRadius * Math.sin(la1), netRadius * Math.cos(la1) * sinLon
      );
    }
  }
  var lotteryNetGeo = trackGeometry(new THREE.BufferGeometry());
  lotteryNetGeo.setAttribute('position', new THREE.Float32BufferAttribute(netPositions, 3));
  var lotteryNetLines = new THREE.LineSegments(lotteryNetGeo, materials.rightRayLine);
  rightPoleGroup.add(lotteryNetLines);

  /* ==========================================================================
     11. 构建中轴：纪律真空带与再平衡游标 (The Vacuum Span & Rebalance Bridge)
     ========================================================================== */
  var bridgeGroup = new THREE.Group();
  barbellGroup.add(bridgeGroup);

  var bStartX = CONFIG.geometry.bridgeStartX;
  var bEndX = CONFIG.geometry.bridgeEndX;
  var bMidX = (bStartX + bEndX) * 0.5;

  // 11.1 左右两端实线锚杆
  var solidAxisGeo = trackGeometry(new THREE.BufferGeometry());
  solidAxisGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    CONFIG.geometry.leftPoleX + 0.94, 0, 0,
    bStartX, 0, 0,
    bEndX, 0, 0,
    CONFIG.geometry.rightPoleX - 0.36, 0, 0
  ], 3));
  bridgeGroup.add(new THREE.LineSegments(solidAxisGeo, materials.bridgeLine));

  // 11.2 真空带边界准直法兰环（左侧法兰更大，右侧法兰更小，呼应左大右小比例）
  var leftCollarGeo = createCircleLineGeometry(0.24, 6);
  var leftCollar = new THREE.Line(leftCollarGeo, materials.leftRingLine);
  leftCollar.position.set(bStartX, 0, 0);
  leftCollar.rotation.y = Math.PI * 0.5;
  bridgeGroup.add(leftCollar);

  var rightCollarGeo = createCircleLineGeometry(0.14, 6);
  var rightCollar = new THREE.Line(rightCollarGeo, materials.rightOrbitLine);
  rightCollar.position.set(bEndX, 0, 0);
  rightCollar.rotation.y = Math.PI * 0.5;
  bridgeGroup.add(rightCollar);

  // 11.3 中段虚线真空带
  var centerDashedGeo = createDashedSegmentGeometry(bStartX + 0.08, bEndX - 0.08, 0, 0, 15, 0.48);
  bridgeGroup.add(new THREE.LineSegments(centerDashedGeo, materials.bridgeLine));

  // 上下两条极细张力导轨（从左宽向右窄渐缩，强化左大右小的透视张力）
  var upperRailGeo = createDashedSegmentGeometry(bStartX + 0.05, bEndX - 0.05, 0.14, 0, 22, 0.35);
  var lowerRailGeo = createDashedSegmentGeometry(bStartX + 0.05, bEndX - 0.05, -0.14, 0, 22, 0.35);
  bridgeGroup.add(new THREE.LineSegments(upperRailGeo, materials.bridgeMutedLine));
  bridgeGroup.add(new THREE.LineSegments(lowerRailGeo, materials.bridgeMutedLine));

  // 11.4 再平衡游标（位于真空带中心 bMidX）
  var cursorGroup = new THREE.Group();
  cursorGroup.position.set(bMidX, 0, 0);
  bridgeGroup.add(cursorGroup);

  var cursorFrameGeo = trackGeometry(new THREE.BufferGeometry());
  cursorFrameGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, -0.30, 0,   0, -0.09, 0,
    0,  0.09, 0,   0,  0.30, 0,
    -0.07, 0.38, 0,  0.07, 0.38, 0,
     0.07, 0.38, 0,  0.00, 0.28, 0,
     0.00, 0.28, 0, -0.07, 0.38, 0,
    0,  0.11, 0,   0.11, 0, 0,
    0.11, 0,  0,   0, -0.11, 0,
    0, -0.11, 0,  -0.11, 0, 0,
   -0.11, 0,  0,   0,  0.11, 0
  ], 3));
  cursorGroup.add(new THREE.LineSegments(cursorFrameGeo, materials.cursorLine));

  var cursorCoreGeo = trackGeometry(new THREE.OctahedronGeometry(0.048, 0));
  var cursorCoreMesh = new THREE.Mesh(cursorCoreGeo, materials.cursorSolid);
  cursorGroup.add(cursorCoreMesh);

  /* ==========================================================================
     12. 双向再平衡粒子流、右极凸性粒子群与鼠标跟随星云
     ========================================================================== */
  // 12.1 上轨：金 -> 蓝 超额收益收割回流流
  var maxHarvest = CONFIG.particles.harvestCount;
  var harvestPositions = new Float32Array(maxHarvest * 3);
  var harvestSeeds = [];
  for (var h = 0; h < maxHarvest; h++) {
    var cluster = Math.floor(h / 7) / Math.ceil(maxHarvest / 7);
    var jitter = (h % 7) * 0.032;
    harvestSeeds.push({
      phase: (cluster + jitter) % 1.0,
      arcHeight: 0.24 + (h % 5) * 0.045,
      zSpread: ((h % 7) - 3) * 0.042,
      speedScale: 0.92 + (h % 3) * 0.08
    });
  }
  var harvestGeo = trackGeometry(new THREE.BufferGeometry());
  harvestGeo.setAttribute('position', new THREE.BufferAttribute(harvestPositions, 3));
  var harvestPoints = new THREE.Points(harvestGeo, materials.harvestParticles);
  barbellGroup.add(harvestPoints);

  // 12.2 下轨：蓝 -> 金 风险预算输送流
  var maxBudget = CONFIG.particles.budgetCount;
  var budgetPositions = new Float32Array(maxBudget * 3);
  var budgetSeeds = [];
  for (var b = 0; b < maxBudget; b++) {
    budgetSeeds.push({
      phase: b / maxBudget,
      arcDepth: -0.17 - (b % 3) * 0.025,
      zSpread: ((b % 5) - 2) * 0.024
    });
  }
  var budgetGeo = trackGeometry(new THREE.BufferGeometry());
  budgetGeo.setAttribute('position', new THREE.BufferAttribute(budgetPositions, 3));
  var budgetPoints = new THREE.Points(budgetGeo, materials.budgetParticles);
  barbellGroup.add(budgetPoints);

  // 12.3 右极长尾跃迁微粒群（匹配缩小后的精悍右极）
  var maxSwarm = CONFIG.particles.rightTailSwarmCount;
  var swarmPositions = new Float32Array(maxSwarm * 3);
  var swarmSeeds = [];
  for (var s = 0; s < maxSwarm; s++) {
    var sTheta = (s / maxSwarm) * Math.PI * 2;
    var sPhi = ((s * 1.6180339) % 1.0 - 0.5) * Math.PI * 0.85;
    swarmSeeds.push({
      theta: sTheta,
      phi: sPhi,
      radiusBase: 0.46 + (s % 6) * 0.12,
      speed: 0.52 + (s % 5) * 0.16,
      eccentricBias: 0.16 + (s % 4) * 0.09
    });
  }
  var swarmGeo = trackGeometry(new THREE.BufferGeometry());
  swarmGeo.setAttribute('position', new THREE.BufferAttribute(swarmPositions, 3));
  var swarmPoints = new THREE.Points(swarmGeo, materials.rightSwarmParticles);
  rightPoleGroup.add(swarmPoints);

  // 12.4 专属鼠标跟随粒子簇 (Interactive Cursor-Following Particle Cloud)
  var maxFollow = CONFIG.particles.cursorFollowCount;
  var followPositions = new Float32Array(maxFollow * 3);
  var followColors = new Float32Array(maxFollow * 3);
  var followParticles = [];

  for (var fp = 0; fp < maxFollow; fp++) {
    var ratio = fp / Math.max(1, maxFollow - 1);
    var springK = CONFIG.particles.followerSpringMin +
      (1.0 - ratio) * (CONFIG.particles.followerSpringMax - CONFIG.particles.followerSpringMin);
    var initX = (ratio - 0.5) * 3.0;
    var initY = Math.sin(fp * 1.7) * 0.4;
    var initZ = Math.cos(fp * 2.3) * 0.3;

    followParticles.push({
      x: initX,
      y: initY,
      z: initZ,
      vx: 0,
      vy: 0,
      vz: 0,
      spring: springK,
      orbitRadius: (0.08 + (fp % 7) * 0.055) * (CONFIG.particles.followerOrbitRadius / 0.42),
      orbitSpeed: (fp % 2 === 0 ? 1 : -1) * (1.2 + (fp % 5) * 0.35),
      orbitPhase: fp * 1.15,
      isGold: fp % 3 !== 0 // 蓝金双色交织星云
    });
    followPositions[fp * 3] = initX;
    followPositions[fp * 3 + 1] = initY;
    followPositions[fp * 3 + 2] = initZ;
  }

  var followGeo = trackGeometry(new THREE.BufferGeometry());
  followGeo.setAttribute('position', new THREE.BufferAttribute(followPositions, 3));
  var followColorAttr = new THREE.BufferAttribute(followColors, 3);
  followGeo.setAttribute('color', followColorAttr);
  var followPoints = new THREE.Points(followGeo, materials.cursorFollowParticles);
  barbellGroup.add(followPoints);

  function rebuildFollowParticleColors() {
    var cBlue = currentTheme.colors.leftPrimary;
    var cGold = currentTheme.colors.rightPrimary;
    for (var i = 0; i < maxFollow; i++) {
      var col = followParticles[i].isGold ? cGold : cBlue;
      followColors[i * 3] = col.r;
      followColors[i * 3 + 1] = col.g;
      followColors[i * 3 + 2] = col.b;
    }
    followColorAttr.needsUpdate = true;
  }
  rebuildFollowParticleColors();

  /* ==========================================================================
     13. 环境层：双分布曲率基准线与空间景深微粒（含鼠标引力弹道）
     ========================================================================== */
  var baseLinesCount = CONFIG.particles.baseCurveLines;
  var baseSegs = CONFIG.particles.baseCurveSegments;
  var baseTotalVertices = baseLinesCount * baseSegs * 2;
  var baseLinePositions = new Float32Array(baseTotalVertices * 3);
  var baseLineColors = new Float32Array(baseTotalVertices * 3);

  function evaluateDistributionHeight(xNorm, zRowNorm) {
    // 左侧 (-0.54 附近)：更高更宽的稳健峰（呼应更大的左极）；中间平坦真空；右侧陡峭长尾上扬
    var leftBell = Math.exp(-Math.pow((xNorm + 0.54) / 0.22, 2)) * 0.42;
    var rightTail = xNorm > 0.25
      ? Math.pow((xNorm - 0.25) / 0.75, 2.25) * 0.56
      : 0;
    var depthAtten = 1.0 - Math.abs(zRowNorm) * 0.55;
    return (leftBell + rightTail) * depthAtten;
  }

  function rebuildBaseGridColors() {
    var cLeft = currentTheme.colors.gridLeft;
    var cMid = currentTheme.colors.gridMid;
    var cRight = currentTheme.colors.gridRight;
    var tempColor = new THREE.Color();

    var ptr = 0;
    for (var row = 0; row < baseLinesCount; row++) {
      for (var seg = 0; seg < baseSegs; seg++) {
        for (var endPt = 0; endPt < 2; endPt++) {
          var sIdx = seg + endPt;
          var t = sIdx / baseSegs;
          var xNorm = (t - 0.5) * 2.0;
          if (xNorm < -0.05) {
            var kL = Math.min(1, (-xNorm - 0.05) / 0.75);
            tempColor.copy(cMid).lerp(cLeft, kL);
          } else if (xNorm > 0.20) {
            var kR = Math.min(1, (xNorm - 0.20) / 0.80);
            tempColor.copy(cMid).lerp(cRight, kR);
          } else {
            tempColor.copy(cMid);
          }
          baseLineColors[ptr * 3] = tempColor.r;
          baseLineColors[ptr * 3 + 1] = tempColor.g;
          baseLineColors[ptr * 3 + 2] = tempColor.b;
          ptr++;
        }
      }
    }
  }

  (function buildBaseGridGeometry() {
    var spanX = 7.4;
    var baseY = -1.88;
    var ptr = 0;
    for (var row = 0; row < baseLinesCount; row++) {
      var zRowNorm = (row / Math.max(1, baseLinesCount - 1) - 0.5) * 2.0;
      var zVal = zRowNorm * 1.10 - 0.35;
      for (var seg = 0; seg < baseSegs; seg++) {
        for (var endPt = 0; endPt < 2; endPt++) {
          var sIdx = seg + endPt;
          var t = sIdx / baseSegs;
          var xNorm = (t - 0.5) * 2.0;
          var xVal = xNorm * (spanX * 0.5);
          var yVal = baseY + evaluateDistributionHeight(xNorm, zRowNorm);
          baseLinePositions[ptr * 3] = xVal;
          baseLinePositions[ptr * 3 + 1] = yVal;
          baseLinePositions[ptr * 3 + 2] = zVal;
          ptr++;
        }
      }
    }
    rebuildBaseGridColors();
  })();

  var baseGridGeo = trackGeometry(new THREE.BufferGeometry());
  baseGridGeo.setAttribute('position', new THREE.BufferAttribute(baseLinePositions, 3));
  var baseGridColorAttr = new THREE.BufferAttribute(baseLineColors, 3);
  baseGridGeo.setAttribute('color', baseGridColorAttr);
  var baseGridLines = new THREE.LineSegments(baseGridGeo, materials.baseGridLine);
  envGroup.add(baseGridLines);

  // 13.2 空间环境微粒（带弹簧物理状态，支持鼠标经过时吸附跟随）
  var maxAmbient = CONFIG.particles.ambientCount;
  var ambientPositions = new Float32Array(maxAmbient * 3);
  var ambientSeeds = [];
  for (var am = 0; am < maxAmbient; am++) {
    var u1 = ((am * 0.6180339887) % 1.0);
    var u2 = ((am * 0.3819660112) % 1.0);
    var u3 = ((am * 0.7548776662) % 1.0);
    var ax = (u1 - 0.5) * 7.2;
    var ay = (u2 - 0.5) * 3.5;
    var az = (u3 - 0.5) * 2.6 - 0.6;
    ambientSeeds.push({
      homeX: ax,
      homeY: ay,
      homeZ: az,
      dx: 0,
      dy: 0,
      vx: 0,
      vy: 0,
      speed: 0.25 + (am % 5) * 0.08,
      phase: am * 1.13
    });
    ambientPositions[am * 3] = ax;
    ambientPositions[am * 3 + 1] = ay;
    ambientPositions[am * 3 + 2] = az;
  }
  var ambientGeo = trackGeometry(new THREE.BufferGeometry());
  ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPositions, 3));
  var ambientPoints = new THREE.Points(ambientGeo, materials.ambientParticles);
  envGroup.add(ambientPoints);

  /* ==========================================================================
     14. 响应式尺寸、开场 -> 顶部归位插值与移动端降粒子逻辑
     ========================================================================== */
  var isMobileViewport = false;
  var canvasWidth = 1;
  var canvasHeight = 1;
  var currentDockProgress = isReducedMotion ? 1.0 : 0.0;
  var currentBasePitchZ = CONFIG.layout.desktop.dockedPitchZ;
  var currentBaseRollX = CONFIG.layout.desktop.rollX;
  var currentBaseYawY = CONFIG.layout.desktop.yawY;

  var activeHarvestCount = maxHarvest;
  var activeBudgetCount = maxBudget;
  var activeSwarmCount = maxSwarm;
  var activeAmbientCount = maxAmbient;
  var activeFollowCount = maxFollow;

  function applyLayoutForDockState(dockT) {
    if (!canvasWidth || !canvasHeight) return;
    var aspect = canvasWidth / canvasHeight;
    camera.aspect = aspect;

    // Quintic Ease-In-Out 曲线：让“开场中央大动画 -> 缩小收拢到顶部区域”柔顺丝滑
    var smoothDock = dockT < 0.5
      ? 16 * dockT * dockT * dockT * dockT * dockT
      : 1 - Math.pow(-2 * dockT + 2, 5) / 2;

    if (isMobileViewport) {
      var mCfg = CONFIG.layout.mobile;
      // 移动端顶端目标区域高度（对应 CSS min(62vw, 246px)）
      var topSlotH = Math.min(canvasWidth * 0.62, 246);
      // 开场时位于屏幕正中央，归位时上移至顶端区域正中央
      var winH = window.innerHeight || canvasHeight;
      var headerOffset = 60;
      var introCenterY = Math.max(topSlotH * 0.85, Math.min(canvasHeight * 0.52, (winH * 0.5) - headerOffset));
      var dockedCenterY = topSlotH * 0.50;
      var curCenterY = introCenterY + (dockedCenterY - introCenterY) * smoothDock;
      var viewOffsetYMobile = (canvasHeight * 0.5) - curCenterY;

      camera.setViewOffset(
        canvasWidth,
        canvasHeight,
        0,
        viewOffsetYMobile,
        canvasWidth,
        canvasHeight
      );
      camera.updateProjectionMatrix();

      // 保持无论 #hero 总高度如何变化，3D 杠铃像素尺寸始终以 topSlotH 为基准且不发生水平裁切
      var heightNorm = topSlotH / Math.max(1, canvasHeight);
      var refAspect = canvasWidth / Math.max(1, topSlotH);
      var aspectScaleM = Math.min(1.08, Math.max(0.80, refAspect / 1.56));
      var curScaleM = (mCfg.introScale + (mCfg.dockedScale - mCfg.introScale) * smoothDock) * aspectScaleM * heightNorm;
      var curPitchM = mCfg.introPitchZ + (mCfg.dockedPitchZ - mCfg.introPitchZ) * smoothDock;

      currentBasePitchZ = curPitchM;
      currentBaseRollX = mCfg.rollX;
      currentBaseYawY = mCfg.yawY;

      stageRoot.position.set(mCfg.dockedOffsetX, 0, 0);
      stageRoot.scale.setScalar(curScaleM);
      barbellGroup.rotation.set(mCfg.rollX, mCfg.yawY, curPitchM);
      envGroup.rotation.set(mCfg.rollX * 0.5, mCfg.yawY * 0.6, curPitchM * 0.35);
    } else {
      var dCfg = CONFIG.layout.desktop;
      var curViewOffX = dCfg.introViewOffsetX + (dCfg.dockedViewOffsetX - dCfg.introViewOffsetX) * smoothDock;
      var curViewOffY = dCfg.introViewOffsetY + (dCfg.dockedViewOffsetY - dCfg.introViewOffsetY) * smoothDock;

      camera.setViewOffset(
        canvasWidth,
        canvasHeight,
        canvasWidth * curViewOffX,
        canvasHeight * curViewOffY,
        canvasWidth,
        canvasHeight
      );
      camera.updateProjectionMatrix();

      var aspectScaleD = Math.min(1.06, Math.max(0.76, aspect / 2.15));
      var curScaleD = (dCfg.introScale + (dCfg.dockedScale - dCfg.introScale) * smoothDock) * aspectScaleD;
      var curYDesktop = dCfg.introOffsetY + (dCfg.dockedOffsetY - dCfg.introOffsetY) * smoothDock;
      var curPitchD = dCfg.introPitchZ + (dCfg.dockedPitchZ - dCfg.introPitchZ) * smoothDock;

      currentBasePitchZ = curPitchD;
      currentBaseRollX = dCfg.rollX;
      currentBaseYawY = dCfg.yawY;

      stageRoot.position.set(0, curYDesktop, 0);
      stageRoot.scale.setScalar(curScaleD);
      barbellGroup.rotation.set(dCfg.rollX, dCfg.yawY, curPitchD);
      envGroup.rotation.set(dCfg.rollX * 0.5, dCfg.yawY * 0.6, curPitchD * 0.35);
    }
  }

  function updateViewportAndLayout() {
    var width = canvas.clientWidth;
    var height = canvas.clientHeight;
    if (!width || !height) return;

    canvasWidth = width;
    canvasHeight = height;

    var winW = window.innerWidth || width;
    isMobileViewport = winW < CONFIG.performance.mobileBreakpoint;

    // 1. DPR 钳制（桌面 <= 1.75，移动 <= 1.5）
    var rawDpr = window.devicePixelRatio || 1;
    var maxDpr = isMobileViewport
      ? CONFIG.performance.maxDprMobile
      : CONFIG.performance.maxDprDesktop;
    var clampedDpr = Math.min(rawDpr, maxDpr);
    renderer.setPixelRatio(clampedDpr);
    renderer.setSize(width, height, false);

    // 2. 应用当前归位进度的相机与空间布局
    applyLayoutForDockState(currentDockProgress);

    // 3. 移动端粒子数降至 40%
    var pRatio = isMobileViewport ? CONFIG.performance.mobileParticleRatio : 1.0;
    activeHarvestCount = Math.max(6, Math.round(maxHarvest * pRatio));
    activeBudgetCount = Math.max(5, Math.round(maxBudget * pRatio));
    activeSwarmCount = Math.max(8, Math.round(maxSwarm * pRatio));
    activeAmbientCount = Math.max(10, Math.round(maxAmbient * pRatio));
    activeFollowCount = Math.max(10, Math.round(maxFollow * pRatio));

    harvestGeo.setDrawRange(0, activeHarvestCount);
    budgetGeo.setDrawRange(0, activeBudgetCount);
    swarmGeo.setDrawRange(0, activeSwarmCount);
    ambientGeo.setDrawRange(0, activeAmbientCount);
    followGeo.setDrawRange(0, activeFollowCount);
  }

  updateViewportAndLayout();

  var resizeObserver = null;
  var onWindowResizeFallback = null;

  if (typeof window.ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(function () {
      updateViewportAndLayout();
      if (isReducedMotion) {
        updateSceneKinematics(CONFIG.animation.staticPoseTime, 1.0, 0.016);
        renderer.render(scene, camera);
      }
    });
    resizeObserver.observe(canvas);
  } else {
    onWindowResizeFallback = function () {
      updateViewportAndLayout();
      if (isReducedMotion) {
        updateSceneKinematics(CONFIG.animation.staticPoseTime, 1.0, 0.016);
        renderer.render(scene, camera);
      }
    };
    window.addEventListener('resize', onWindowResizeFallback, { passive: true });
  }

  /* ==========================================================================
     15. 主题材质同步与平滑插值更新
     ========================================================================== */
  function applyCurrentThemeToScene() {
    var c = currentTheme.colors;
    var s = currentTheme.scalars;

    ambientLight.color.copy(c.ambientLightColor);
    ambientLight.intensity = s.ambientIntensity;
    keyLight.color.copy(c.keyLightColor);
    keyLight.intensity = s.keyLightIntensity;
    fillLight.color.copy(c.fillLightColor);
    fillLight.intensity = s.fillLightIntensity;
    rimLight.color.copy(c.rimLightColor);
    rimLight.intensity = s.rimLightIntensity;

    materials.leftCoreSolid.color.copy(c.leftSolid);
    materials.leftCoreSolid.emissive.copy(c.leftEmissive);
    materials.leftRingSolid.color.copy(c.leftPrimary);
    materials.leftRingSolid.emissive.copy(c.leftEmissive);
    materials.leftWire.color.copy(c.leftWire);
    materials.leftWire.opacity = s.wireOpacity;
    materials.leftRingLine.color.copy(c.leftRing);
    materials.leftRingLine.opacity = s.ringOpacity;
    materials.leftRipple.color.copy(c.rightPrimary);

    materials.rightCoreSolid.color.copy(c.rightSolid);
    materials.rightCoreSolid.emissive.copy(c.rightEmissive);
    materials.rightRingSolid.color.copy(c.rightPrimary);
    materials.rightRingSolid.emissive.copy(c.rightEmissive);
    materials.rightWire.color.copy(c.rightWire);
    materials.rightWire.opacity = s.wireOpacity;
    materials.rightOrbitLine.color.copy(c.rightOrbit);
    materials.rightOrbitLine.opacity = s.orbitOpacity;
    materials.rightApexArc.color.copy(c.rightApex);
    materials.rightApexArc.opacity = Math.min(1.0, s.orbitOpacity + 0.18);
    materials.rightRayLine.color.copy(c.rightPrimary);
    materials.rightRayLine.opacity = s.orbitOpacity * 0.60;

    materials.bridgeLine.color.copy(c.neutralLine);
    materials.bridgeLine.opacity = s.bridgeOpacity;
    materials.bridgeMutedLine.color.copy(c.neutralMuted);
    materials.bridgeMutedLine.opacity = s.bridgeOpacity * 0.72;
    materials.cursorLine.color.copy(c.cursorColor);
    materials.cursorSolid.color.copy(c.rightPrimary);
    materials.cursorSolid.emissive.copy(c.rightEmissive);

    var targetBlending = currentTheme.useAdditive
      ? THREE.AdditiveBlending
      : THREE.NormalBlending;

    var blendMats = [
      materials.harvestParticles,
      materials.budgetParticles,
      materials.rightSwarmParticles,
      materials.cursorFollowParticles
    ];
    for (var bm = 0; bm < blendMats.length; bm++) {
      if (blendMats[bm].blending !== targetBlending) {
        blendMats[bm].blending = targetBlending;
        blendMats[bm].needsUpdate = true;
      }
    }

    materials.harvestParticles.color.copy(c.rightPrimary);
    materials.harvestParticles.opacity = s.particleOpacity;
    materials.budgetParticles.color.copy(c.leftPrimary);
    materials.budgetParticles.opacity = s.particleOpacity * 0.90;
    materials.rightSwarmParticles.color.copy(c.rightOrbit);
    materials.rightSwarmParticles.opacity = s.particleOpacity * 0.85;
    materials.cursorFollowParticles.opacity = s.particleOpacity * 0.92;
    materials.ambientParticles.color.copy(c.neutralLine);
    materials.ambientParticles.opacity = s.gridOpacity * 1.15;

    rebuildFollowParticleColors();

    materials.baseGridLine.opacity = s.gridOpacity;
    rebuildBaseGridColors();
    baseGridColorAttr.needsUpdate = true;
  }

  function stepThemeInterpolation(dt) {
    if (!themeTransitionNeedRender) return false;
    var factor = Math.min(1.0, dt * CONFIG.animation.themeLerpSpeed);
    var maxDiff = 0;

    for (var i = 0; i < COLOR_KEYS.length; i++) {
      var ck = COLOR_KEYS[i];
      var curC = currentTheme.colors[ck];
      var dstC = targetTheme.colors[ck];
      curC.lerp(dstC, factor);
      var dr = Math.abs(curC.r - dstC.r) + Math.abs(curC.g - dstC.g) + Math.abs(curC.b - dstC.b);
      if (dr > maxDiff) maxDiff = dr;
    }

    for (var j = 0; j < SCALAR_KEYS.length; j++) {
      var sk = SCALAR_KEYS[j];
      var curS = currentTheme.scalars[sk];
      var dstS = targetTheme.scalars[sk];
      var nextS = curS + (dstS - curS) * factor;
      currentTheme.scalars[sk] = nextS;
      var ds = Math.abs(nextS - dstS);
      if (ds > maxDiff) maxDiff = ds;
    }

    currentTheme.useAdditive = targetTheme.useAdditive;
    applyCurrentThemeToScene();

    if (maxDiff < 0.002) {
      syncThemeTarget(isDark, true);
      applyCurrentThemeToScene();
      themeTransitionNeedRender = false;
    }
    return true;
  }

  var themeObserver = new MutationObserver(function () {
    var nowDark = detectDarkTheme();
    if (nowDark === isDark) return;
    isDark = nowDark;

    if (isReducedMotion) {
      syncThemeTarget(isDark, true);
      applyCurrentThemeToScene();
      renderer.render(scene, camera);
    } else {
      syncThemeTarget(isDark, false);
      themeTransitionNeedRender = true;
    }
  });

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });

  /* ==========================================================================
     16. 鼠标/指针 3D 空间投影与跟随力场解算
     ========================================================================== */
  var pointerTargetX = 0;
  var pointerTargetY = 0;
  var pointerCurrentX = 0;
  var pointerCurrentY = 0;

  // 鼠标在 barbellGroup 局部空间中的三维投影坐标
  var mouseActive = false;
  var mouseNdcX = 0;
  var mouseNdcY = 0;
  var mouseLocalTarget = new THREE.Vector3(0.4, 0.1, 0);
  var mouseLocalSmooth = new THREE.Vector3(0.4, 0.1, 0);
  var unprojectVec = new THREE.Vector3();
  var rayDirVec = new THREE.Vector3();
  var worldHitVec = new THREE.Vector3();

  function updateMouse3DTarget(elapsed) {
    if (mouseActive) {
      // 将屏幕 NDC 坐标反投影至 z = 0 世界平面，再转换到杠铃局部坐标系
      unprojectVec.set(mouseNdcX, mouseNdcY, 0.5);
      unprojectVec.unproject(camera);
      rayDirVec.copy(unprojectVec).sub(camera.position).normalize();
      if (Math.abs(rayDirVec.z) > 0.0001) {
        var dist = -camera.position.z / rayDirVec.z;
        worldHitVec.copy(camera.position).addScaledVector(rayDirVec, dist);
        barbellGroup.updateMatrixWorld();
        mouseLocalTarget.copy(worldHitVec);
        barbellGroup.worldToLocal(mouseLocalTarget);
        // 限制合理活动边界，防止鼠标移出极远区域时粒子飞散
        mouseLocalTarget.x = Math.max(-4.5, Math.min(4.2, mouseLocalTarget.x));
        mouseLocalTarget.y = Math.max(-2.6, Math.min(2.6, mouseLocalTarget.y));
        mouseLocalTarget.z = Math.max(-1.2, Math.min(1.2, mouseLocalTarget.z));
      }
    } else {
      // 鼠标未进入或离开窗口时：引导点沿杠铃双极之间做优雅的8字巡航
      var idlePhase = elapsed * 0.65;
      mouseLocalTarget.set(
        Math.sin(idlePhase) * 1.85 + 0.15,
        Math.sin(idlePhase * 2.0) * 0.32,
        Math.cos(idlePhase) * 0.25
      );
    }
    mouseLocalSmooth.lerp(mouseLocalTarget, 0.16);
  }

  function onPointerMove(e) {
    if (isReducedMotion) return;

    var rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      var relX = (e.clientX - rect.left) / rect.width;
      var relY = (e.clientY - rect.top) / rect.height;
      if (relX >= -0.05 && relX <= 1.05 && relY >= -0.05 && relY <= 1.05) {
        mouseActive = true;
        mouseNdcX = relX * 2.0 - 1.0;
        mouseNdcY = -(relY * 2.0 - 1.0);
      } else {
        mouseActive = false;
      }
    }

    if (!isMobileViewport && CONFIG.layout.parallax.enabledDesktop) {
      var vw = window.innerWidth || 1;
      var vh = window.innerHeight || 1;
      var nx = (e.clientX / vw - 0.5) * 2.0;
      var ny = (e.clientY / vh - 0.5) * 2.0;
      pointerTargetY = nx * CONFIG.layout.parallax.maxRotY;
      pointerTargetX = ny * CONFIG.layout.parallax.maxRotX;
    }
  }

  function onPointerLeave() {
    mouseActive = false;
    pointerTargetX = 0;
    pointerTargetY = 0;
  }

  if (!isReducedMotion) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave, { passive: true });
  }

  /* ==========================================================================
     17. 场景运动学、开场收缩归位与粒子跟随解算 (Kinematics Solver)
     ========================================================================== */
  function updateSceneKinematics(elapsed, dockProgress, dt) {
    // 17.1 开场展开与顶部归位布局更新
    if (Math.abs(dockProgress - currentDockProgress) > 0.0001) {
      currentDockProgress = dockProgress;
      applyLayoutForDockState(currentDockProgress);
    }

    // 开场前 0.75s 的双极从中心向两侧舒展张开效果（与真实墙钟时间同步）
    var genesisProgress = isReducedMotion
      ? 1.0
      : Math.min(1.0, wallElapsedSeconds / 0.75);
    var easeGenesis = 1.0 - Math.pow(1.0 - genesisProgress, 3);
    var poleSpread = 0.62 + 0.38 * easeGenesis;
    leftPoleGroup.position.x = CONFIG.geometry.leftPoleX * poleSpread;
    rightPoleGroup.position.x = CONFIG.geometry.rightPoleX * poleSpread;
    bridgeGroup.scale.x = poleSpread;

    // 开场期间自转与脉冲速度轻微提速，归位后进入沉稳巡航节奏
    var introBoost = 1.0 + (1.0 - dockProgress) * 0.85;

    // 17.2 视差阻尼与整体微悬浮呼吸
    var damp = CONFIG.layout.parallax.damping;
    pointerCurrentX += (pointerTargetX - pointerCurrentX) * damp;
    pointerCurrentY += (pointerTargetY - pointerCurrentY) * damp;

    var breathY = Math.sin(elapsed * 0.85) * 0.036;
    var breathRoll = Math.sin(elapsed * 0.55) * 0.011;
    parallaxGroup.position.y = breathY;
    parallaxGroup.rotation.x = pointerCurrentX;
    parallaxGroup.rotation.y = pointerCurrentY;
    parallaxGroup.rotation.z = breathRoll;

    // 17.3 左极：大型压舱石（极低频、稳重、匀速自转 + 陀螺仪正交守护）
    var lSpeed = CONFIG.animation.leftSpinSpeed * introBoost;
    leftCoreMesh.rotation.y = elapsed * lSpeed;
    leftCoreMesh.rotation.x = elapsed * (lSpeed * 0.45);
    leftCageLines.rotation.y = -elapsed * (lSpeed * 0.65);
    leftCageLines.rotation.z = elapsed * (lSpeed * 0.35);

    leftShieldGroup.rotation.z = -0.15 + elapsed * (lSpeed * 0.5);
    leftGimbal1.rotation.z = 0.2 + elapsed * (lSpeed * 0.85);
    leftGimbal1.rotation.x = 1.12 + Math.sin(elapsed * 0.4) * 0.07;
    leftGimbal2.rotation.y = 0.82 - elapsed * (lSpeed * 0.72);

    // 再平衡能量抵达左极时的防护涟漪反馈
    var pulsePhase = (elapsed / CONFIG.animation.pulseCycleSeconds) % 1.0;
    var rippleScale = 1.0 + pulsePhase * 0.52;
    leftRippleLine.scale.setScalar(rippleScale);
    var rippleAlpha = Math.sin(pulsePhase * Math.PI) * (1.0 - pulsePhase) * 0.75;
    materials.leftRipple.opacity = rippleAlpha * currentTheme.scalars.ringOpacity;

    // 17.4 右极：精悍凸性探针（高活力自转 + 紧凑椭圆轨道卫星跃迁）
    var rSpeed = CONFIG.animation.rightSpinSpeed * introBoost;
    rightCoreMesh.rotation.x = elapsed * rSpeed;
    rightCoreMesh.rotation.y = elapsed * (rSpeed * 0.78);
    rightStarWire1.rotation.x = -elapsed * (rSpeed * 0.92);
    rightStarWire1.rotation.z = elapsed * (rSpeed * 0.55);
    rightStarWire2.rotation.y = elapsed * (rSpeed * 1.15);
    rightInnerRingMesh.rotation.z = -elapsed * (rSpeed * 1.35);
    rightInnerRingMesh.rotation.x = 0.85 + Math.sin(elapsed * 0.9) * 0.15;

    for (var o = 0; o < orbitControllers.length; o++) {
      var oc = orbitControllers[o];
      var rawTheta = elapsed * oc.cfg.speed + oc.phaseOffset;
      var nonLinearTheta = rawTheta + 0.28 * Math.sin(rawTheta);
      var sx = Math.cos(nonLinearTheta) * oc.cfg.a + oc.cfg.offsetX;
      var sy = Math.sin(nonLinearTheta) * oc.cfg.b;
      oc.satellite.position.set(sx, sy, 0);
      oc.mesh.rotation.x = elapsed * 2.4 + o;
      oc.mesh.rotation.y = elapsed * 1.9;
      var apexProximity = Math.max(0, Math.cos(nonLinearTheta));
      var satScale = 0.86 + apexProximity * 0.46;
      oc.satellite.scale.setScalar(satScale);
    }

    // 17.5 中轴再平衡游标与法兰准直环微动
    var cursorShift = Math.sin(elapsed * (Math.PI * 2 / CONFIG.animation.pulseCycleSeconds)) * 0.10;
    cursorGroup.position.x = bMidX + cursorShift;
    cursorCoreMesh.rotation.y = elapsed * 1.2;
    cursorCoreMesh.rotation.z = elapsed * 0.8;
    leftCollar.rotation.x = elapsed * 0.32;
    rightCollar.rotation.x = -elapsed * 0.72;

    // 17.6 更新鼠标 3D 投影坐标与专属鼠标跟随粒子簇 (Cursor-Following Cloud)
    updateMouse3DTarget(elapsed);

    var fPosArr = followGeo.attributes.position.array;
    var fDamp = CONFIG.particles.followerDamping;
    for (var fp = 0; fp < activeFollowCount; fp++) {
      var p = followParticles[fp];
      var orbitAng = elapsed * p.orbitSpeed + p.orbitPhase;
      // 采用双频李萨如（Lissajous）三维星云轨迹，鼠标悬停时自然舒展流动，不聚成死板圆圈
      var radMod = p.orbitRadius * (0.65 + 0.55 * Math.sin(elapsed * 0.9 + fp * 0.7));
      var targetX = mouseLocalSmooth.x + Math.cos(orbitAng) * radMod * 1.25;
      var targetY = mouseLocalSmooth.y + Math.sin(orbitAng * 1.3 + fp) * radMod * 0.85;
      var targetZ = mouseLocalSmooth.z + Math.sin(orbitAng * 0.7 + fp) * (radMod * 0.65);

      p.vx = (p.vx + (targetX - p.x) * p.spring) * fDamp;
      p.vy = (p.vy + (targetY - p.y) * p.spring) * fDamp;
      p.vz = (p.vz + (targetZ - p.z) * p.spring) * fDamp;

      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;

      fPosArr[fp * 3] = p.x;
      fPosArr[fp * 3 + 1] = p.y;
      fPosArr[fp * 3 + 2] = p.z;
    }
    followGeo.attributes.position.needsUpdate = true;

    // 17.7 上轨粒子流：右极(金) -> 左极(蓝) 超额收益收割回流（叠加鼠标磁吸弯曲）
    var startRightX = rightPoleGroup.position.x - 0.22;
    var endLeftX = leftPoleGroup.position.x + 0.78;
    var spanLen = startRightX - endLeftX;
    var hPosArr = harvestGeo.attributes.position.array;
    var mRadiusSq = CONFIG.particles.mouseFieldRadius * CONFIG.particles.mouseFieldRadius;
    var mStrength = CONFIG.particles.mouseDeflectStrength;

    for (var h = 0; h < activeHarvestCount; h++) {
      var hs = harvestSeeds[h];
      var prog = (hs.phase + elapsed * CONFIG.animation.harvestFlowSpeed * hs.speedScale) % 1.0;
      var smoothT = prog * prog * (3.0 - 2.0 * prog);
      var hx = startRightX - smoothT * spanLen;
      var arch = Math.sin(prog * Math.PI);
      var hy = 0.14 + arch * hs.arcHeight;
      var hz = Math.sin(prog * Math.PI * 2.0 + h) * hs.zSpread * arch;

      // 鼠标接近时产生柔和磁吸偏转
      if (mouseActive) {
        var mdx = mouseLocalSmooth.x - hx;
        var mdy = mouseLocalSmooth.y - hy;
        var distSq = mdx * mdx + mdy * mdy;
        if (distSq < mRadiusSq) {
          var pull = (1.0 - distSq / mRadiusSq) * mStrength * arch;
          hx += mdx * pull * 0.45;
          hy += mdy * pull;
        }
      }

      hPosArr[h * 3] = hx;
      hPosArr[h * 3 + 1] = hy;
      hPosArr[h * 3 + 2] = hz;
    }
    harvestGeo.attributes.position.needsUpdate = true;

    // 17.8 下轨粒子流：左极(蓝) -> 右极(金) 定额风险预算输送（叠加鼠标磁吸弯曲）
    var bPosArr = budgetGeo.attributes.position.array;
    for (var b = 0; b < activeBudgetCount; b++) {
      var bs = budgetSeeds[b];
      var bProg = (bs.phase + elapsed * CONFIG.animation.budgetFlowSpeed) % 1.0;
      var bx = endLeftX + bProg * spanLen;
      var bArch = Math.sin(bProg * Math.PI);
      var by = -0.12 + bArch * bs.arcDepth;
      var bz = Math.cos(bProg * Math.PI + b) * bs.zSpread * bArch;

      if (mouseActive) {
        var bdx = mouseLocalSmooth.x - bx;
        var bdy = mouseLocalSmooth.y - by;
        var bDistSq = bdx * bdx + bdy * bdy;
        if (bDistSq < mRadiusSq) {
          var bPull = (1.0 - bDistSq / mRadiusSq) * mStrength * bArch;
          bx += bdx * bPull * 0.45;
          by += bdy * bPull;
        }
      }

      bPosArr[b * 3] = bx;
      bPosArr[b * 3 + 1] = by;
      bPosArr[b * 3 + 2] = bz;
    }
    budgetGeo.attributes.position.needsUpdate = true;

    // 17.9 右极外围凸性长尾粒子群
    var sPosArr = swarmGeo.attributes.position.array;
    for (var s = 0; s < activeSwarmCount; s++) {
      var ss = swarmSeeds[s];
      var sAng = ss.theta + elapsed * ss.speed;
      var rPulse = ss.radiusBase + Math.sin(elapsed * 1.4 + s) * 0.08;
      var tailBoost = Math.max(0, Math.cos(sAng)) * ss.eccentricBias;
      var rx = (Math.cos(sAng) * Math.cos(ss.phi) * rPulse) + tailBoost + 0.14;
      var ry = Math.sin(sAng) * Math.cos(ss.phi) * (rPulse * 0.78) + tailBoost * 0.24;
      var rz = Math.sin(ss.phi + Math.sin(elapsed * 0.6 + s) * 0.14) * (rPulse * 0.72);

      sPosArr[s * 3] = rx;
      sPosArr[s * 3 + 1] = ry;
      sPosArr[s * 3 + 2] = rz;
    }
    swarmGeo.attributes.position.needsUpdate = true;

    // 17.10 空间环境微粒缓慢漂浮 + 鼠标经过时的引力涟漪跟随
    var aPosArr = ambientGeo.attributes.position.array;
    for (var am = 0; am < activeAmbientCount; am++) {
      var as = ambientSeeds[am];
      var baseX = as.homeX + Math.sin(elapsed * as.speed + as.phase) * 0.09;
      var baseY = as.homeY + Math.cos(elapsed * as.speed * 0.8 + as.phase) * 0.09;

      if (mouseActive) {
        var adx = mouseLocalSmooth.x - (baseX + as.dx);
        var ady = mouseLocalSmooth.y - (baseY + as.dy);
        var aDistSq = adx * adx + ady * ady;
        if (aDistSq < mRadiusSq * 1.35) {
          var aForce = (1.0 - aDistSq / (mRadiusSq * 1.35)) * 0.028;
          as.vx += adx * aForce;
          as.vy += ady * aForce;
        }
      }

      // 弹簧回弹与阻尼
      as.vx = (as.vx - as.dx * 0.06) * 0.86;
      as.vy = (as.vy - as.dy * 0.06) * 0.86;
      as.dx += as.vx;
      as.dy += as.vy;

      aPosArr[am * 3] = baseX + as.dx;
      aPosArr[am * 3 + 1] = baseY + as.dy;
      aPosArr[am * 3 + 2] = as.homeZ;
    }
    ambientGeo.attributes.position.needsUpdate = true;
  }

  /* ==========================================================================
     18. 接管协议与渲染循环（含开场大动画 -> 顶部归位状态机）
     ========================================================================== */
  var rafId = null;
  var isDisposed = false;
  var elapsedSeconds = 0;
  var wallElapsedSeconds = 0;
  var startWallTimestamp = 0;
  var lastTimestamp = 0;

  function markHeroReady() {
    if (document.body && !document.body.classList.contains('hero-ready')) {
      document.body.classList.add('hero-ready');
    }
  }

  function markHeroDocked() {
    if (document.body && !document.body.classList.contains('hero-docked')) {
      document.body.classList.add('hero-docked');
    }
  }

  if (isReducedMotion) {
    // 无障碍降级：直接解算至归位完成后的黄金静态构图帧
    currentDockProgress = 1.0;
    wallElapsedSeconds = CONFIG.animation.staticPoseTime;
    applyLayoutForDockState(1.0);
    updateSceneKinematics(CONFIG.animation.staticPoseTime, 1.0, 0.016);
    renderer.render(scene, camera);
    markHeroReady();
    markHeroDocked();
  } else {
    // 首帧：以中央大尺寸开场姿态启动（此时不加 hero-docked，页面无任何文字，纯享居中开场动画）
    currentDockProgress = 0.0;
    applyLayoutForDockState(0.0);
    updateSceneKinematics(0, 0.0, 0.016);
    renderer.render(scene, camera);
    markHeroReady();

    startWallTimestamp = performance.now();
    lastTimestamp = startWallTimestamp;

    var animate = function (now) {
      if (isDisposed) return;
      rafId = window.requestAnimationFrame(animate);

      var rawDt = (now - lastTimestamp) * 0.001;
      lastTimestamp = now;
      var dt = Math.max(0.0, Math.min(rawDt, CONFIG.animation.maxDeltaSeconds));

      elapsedSeconds += dt;
      wallElapsedSeconds = (now - startWallTimestamp) * 0.001;

      // 使用真实墙钟时间驱动“开场中央大动画 -> 缩小归位至顶部区域”
      var holdT = CONFIG.animation.introHoldSeconds;
      var shrinkT = CONFIG.animation.introShrinkSeconds;
      var dockProg = 0.0;
      if (wallElapsedSeconds > holdT) {
        dockProg = Math.min(1.0, (wallElapsedSeconds - holdT) / Math.max(0.1, shrinkT));
      }

      // 当 3D 杠铃即将收缩归位至顶端时（进度 >= 0.72），触发 hero-docked 让页面文字平滑浮现
      if (dockProg >= 0.72) {
        markHeroDocked();
      }

      stepThemeInterpolation(dt);
      updateSceneKinematics(elapsedSeconds, dockProg, dt);
      renderer.render(scene, camera);
    };

    rafId = window.requestAnimationFrame(animate);
  }

  /* ==========================================================================
     19. 资源清理与防 WebGL 上下文泄漏 (dispose)
     ========================================================================== */
  function dispose() {
    if (isDisposed) return;
    isDisposed = true;

    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (onWindowResizeFallback) {
      window.removeEventListener('resize', onWindowResizeFallback);
      onWindowResizeFallback = null;
    }
    if (themeObserver) {
      themeObserver.disconnect();
      themeObserver = null;
    }

    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('mouseleave', onPointerLeave);
    window.removeEventListener('pagehide', dispose);
    window.removeEventListener('beforeunload', dispose);

    for (var i = 0; i < disposables.geometries.length; i++) {
      if (disposables.geometries[i] && disposables.geometries[i].dispose) {
        disposables.geometries[i].dispose();
      }
    }
    for (var j = 0; j < disposables.materials.length; j++) {
      if (disposables.materials[j] && disposables.materials[j].dispose) {
        disposables.materials[j].dispose();
      }
    }
    for (var k = 0; k < disposables.textures.length; k++) {
      if (disposables.textures[k] && disposables.textures[k].dispose) {
        disposables.textures[k].dispose();
      }
    }

    disposables.geometries.length = 0;
    disposables.materials.length = 0;
    disposables.textures.length = 0;

    if (renderer) {
      renderer.dispose();
      if (typeof renderer.forceContextLoss === 'function') {
        renderer.forceContextLoss();
      }
    }
  }

  window.addEventListener('pagehide', dispose);
  window.addEventListener('beforeunload', dispose);
})();
