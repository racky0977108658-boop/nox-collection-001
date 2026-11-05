/* 展廳程式。客戶改 config.js，不必改這個檔案。 */

const cfg = window.PORTFOLIO_CONFIG;
const loader = document.getElementById("loader");
const loaderMark = document.getElementById("loader-mark");
const loaderBar = document.getElementById("loader-bar");
const app = document.getElementById("app");

const FORMS = ["monolith", "vessel", "crystal", "knot", "rings"];

function fail(message) {
  loader.classList.remove("done");
  if (loaderMark) loaderMark.textContent = "NOX";
  let note = loader.querySelector(".loader-error");
  if (!note) {
    note = document.createElement("p");
    note.className = "loader-error";
    loader.append(note);
  }
  note.textContent = message;
}

if (!cfg || !cfg.hero || !Array.isArray(cfg.works)) {
  fail("找不到設定。請確認 config.js 沒有語法錯誤，並用本機伺服器開啟（不要直接點開檔案）。");
} else {
  boot().catch((err) => {
    console.error(err);
    fail("展廳無法啟動。請用本機伺服器開啟這個資料夾，不要直接點開檔案。");
  });
}

function prefersReduced() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function resolveUrl(path) {
  if (!path) return "";
  try {
    return new URL(path, document.baseURI).href;
  } catch (err) {
    return "";
  }
}

function safeHref(href) {
  try {
    const url = new URL(href, document.baseURI);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
      return url.href;
    }
  } catch (err) {}
  return "";
}

function formName(value, index) {
  return FORMS.includes(value) ? value : FORMS[index % FORMS.length];
}

function applyColorOverrides() {
  const root = document.documentElement;
  const colors = cfg.colors || {};
  const map = { ink: "--ink", bone: "--bone", accent: "--accent", accentSoft: "--accent-2" };
  Object.entries(map).forEach(([key, variable]) => {
    const value = String(colors[key] || "").trim();
    if (value) root.style.setProperty(variable, value);
    else root.style.removeProperty(variable);
  });
  const accent = String(colors.accent || "").trim();
  if (accent) root.style.setProperty("--ring", accent);
  else root.style.removeProperty("--ring");
}

function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", cssVar("--ink", "#050b07"));
}

async function boot() {
  if (loaderMark) loaderMark.textContent = cfg.name || "NOX";
  document.title = [cfg.name, cfg.tagline].filter(Boolean).join(" — ");
  const description = document.querySelector('meta[name="description"]');
  if (description && cfg.about && cfg.about.body) {
    description.setAttribute("content", String(cfg.about.body).replace(/\s+/g, " ").slice(0, 150));
  }
  applyColorOverrides();
  syncThemeColor();

  const ui = buildPage();
  const params = new URLSearchParams(location.search);
  const tier = deviceTier();
  const forceStatic = params.has("lite") || tier === "low" || !hasWebGL();

  let engine = null;
  if (!forceStatic) {
    try {
      loaderBar.style.width = "35%";
      engine = await Promise.race([
        startEngine(ui.stage, tier),
        new Promise((_, reject) => setTimeout(() => reject(new Error("webgl-timeout")), 12000))
      ]);
      loaderBar.style.width = "100%";
    } catch (err) {
      console.warn("WebGL unavailable, using poster.", err);
      engine = null;
    }
  }

  let stageApi = engine || mountPoster(ui.stage);
  document.documentElement.dataset.engine = engine ? "webgl" : "static";
  if (engine) {
    engine.onLost = () => {
      stageApi = mountPoster(ui.stage);
      document.documentElement.dataset.engine = "static";
      ui.hintMouse.textContent = "平面模式";
      ui.hintTouch.textContent = "平面模式";
      stageApi.showForm((current && current.form) || "monolith");
    };
  }
  if (!engine) {
    ui.hintMouse.textContent = "平面模式";
    ui.hintTouch.textContent = "平面模式";
  }

  let token = 0;
  let current = null;

  function heroSpec() {
    return {
      kind: "hero",
      workIndex: null,
      form: formName(cfg.hero.form, 0),
      model: String(cfg.hero.model || "").trim(),
      image: String(cfg.hero.image || "").trim(),
      eyebrow: cfg.hero.eyebrow || "",
      titleLead: cfg.hero.titleLead || "",
      title: cfg.hero.title || cfg.name || "",
      lede: cfg.hero.lede || ""
    };
  }

  function workSpec(index) {
    const work = cfg.works[index];
    return {
      kind: "work",
      workIndex: index,
      form: formName(work.form, index),
      model: String(work.model || "").trim(),
      image: String(work.image || "").trim(),
      eyebrow: [work.year, work.tag].filter(Boolean).join(" · "),
      titleLead: "",
      title: work.title || "未命名作品",
      lede: work.description || ""
    };
  }

  function paintCopy(spec) {
    const isWork = spec.kind === "work";
    ui.heroBlock.hidden = isWork;
    ui.focus.hidden = !isWork;
    if (!isWork) {
      ui.heroEyebrow.textContent = spec.eyebrow;
      ui.heroTitle.replaceChildren();
      if (spec.titleLead) {
        const em = document.createElement("em");
        em.textContent = spec.titleLead;
        ui.heroTitle.append(em);
      }
      String(spec.title || "").split("\n").forEach((line, index) => {
        if (index) ui.heroTitle.append(document.createElement("br"));
        ui.heroTitle.append(document.createTextNode(line));
      });
      ui.heroLede.textContent = spec.lede;
      ui.heroCta.textContent = cfg.hero.cta || "觀看作品";
    } else {
      ui.focusEyebrow.textContent = spec.eyebrow;
      ui.focusTitle.textContent = spec.title;
      ui.focusDesc.textContent = spec.lede;
      ui.focusStatus.textContent = "";
    }
    ui.cards.forEach((card, index) => {
      card.setAttribute("aria-pressed", String(isWork && index === spec.workIndex));
    });
  }

  async function present(spec, fromHash) {
    current = spec;
    const mine = ++token;
    paintCopy(spec);
    if (!fromHash) {
      const next = spec.kind === "work" ? "#w-" + spec.workIndex : location.pathname + location.search;
      history.replaceState(null, "", next);
      if (spec.kind === "work") {
        ui.hero.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
      }
    }
    const kind = spec.model ? "model" : (spec.form ? "form" : (spec.image ? "image" : "form"));
    const staticMode = document.documentElement.dataset.engine !== "webgl";
    try {
      if (kind === "model" && staticMode) {
        stageApi.showForm(spec.form);
        if (spec.kind === "work") ui.focusStatus.textContent = "平面模式以占位雕塑代替模型。";
        return;
      }
      if (kind === "model") {
        stageApi.showForm(spec.form);
        if (spec.kind === "work") ui.focusStatus.textContent = "載入模型…";
        await stageApi.showModel(spec.model, () => mine !== token, (ratio) => {
          if (mine !== token || spec.kind !== "work") return;
          ui.focusStatus.textContent = "載入模型 " + Math.round(ratio * 100) + "%";
        });
        if (mine === token && spec.kind === "work") ui.focusStatus.textContent = "";
      } else if (kind === "image") {
        if (spec.kind === "work") ui.focusStatus.textContent = "載入圖片…";
        await stageApi.showImage(spec.image, () => mine !== token);
        if (mine === token && spec.kind === "work") ui.focusStatus.textContent = "";
      } else {
        stageApi.showForm(spec.form);
      }
    } catch (err) {
      console.error(err);
      if (mine !== token) return;
      stageApi.showForm(spec.form || "monolith");
      if (spec.kind === "work") {
        ui.focusStatus.textContent = kind === "model"
          ? "模型載入失敗，先顯示占位雕塑。"
          : "圖片無法放上舞台，改顯示占位雕塑。";
      }
    }
  }

  function showHero(fromHash) {
    return present(heroSpec(), fromHash);
  }

  ui.cards.forEach((card, index) => {
    card.addEventListener("click", () => present(workSpec(index), false));
  });
  ui.focusClose.addEventListener("click", () => showHero(false));
  ui.brand.addEventListener("click", (event) => {
    event.preventDefault();
    showHero(false);
    window.scrollTo({ top: 0, behavior: prefersReduced() ? "auto" : "smooth" });
  });
  ui.themeBtn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "void" ? "atelier" : "void";
    document.documentElement.dataset.theme = next;
    applyColorOverrides();
    syncThemeColor();
    ui.themeBtn.textContent = next === "void" ? "展廳" : "冷光";
    ui.themeBtn.setAttribute("aria-label", next === "void" ? "切換到展廳主題" : "切換到冷光主題");
    if (stageApi.syncLook) stageApi.syncLook();
    if (current && !current.model) present(current, true);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && current && current.kind === "work") showHero(false);
  });
  window.addEventListener("hashchange", () => {
    const index = readHash();
    if (index == null) showHero(true);
    else present(workSpec(index), true);
  });

  const initial = readHash();
  if (initial == null) await showHero(true);
  else await present(workSpec(initial), true);

  requestAnimationFrame(() => {
    loader.classList.add("done");
    document.body.classList.add("ready");
  });
}

function readHash() {
  const match = /^#w-(\d+)$/.exec(location.hash);
  if (!match) return null;
  const index = Number(match[1]);
  return cfg.works[index] ? index : null;
}

function buildPage() {
  const header = el("header");
  const brand = el("a", { class: "brand", href: "#hero" });
  brand.append(el("b", { text: cfg.name || "NOX" }));
  const nav = el("nav", { "aria-label": "主要" });
  [["#works", "作品"], ["#about", "關於"], ["#contact", "聯絡"]].forEach(([href, label]) => {
    nav.append(el("a", { href, text: label }));
  });
  const themeBtn = el("button", {
    class: "theme-btn",
    type: "button",
    text: document.documentElement.dataset.theme === "void" ? "展廳" : "冷光",
    "aria-label": document.documentElement.dataset.theme === "void" ? "切換到展廳主題" : "切換到冷光主題"
  });
  nav.append(themeBtn);
  header.append(brand, nav);

  const hero = el("section", { id: "hero" });
  const stage = el("div", { id: "stage", tabindex: "0", "aria-label": "作品舞台，可用方向鍵旋轉" });
  const copy = el("div", { class: "hero-copy" });
  const heroBlock = el("div", { id: "hero-rest" });
  const heroEyebrow = el("p", { class: "eyebrow" });
  const heroTitle = el("h1");
  const heroEm = el("em");
  const heroTitleText = document.createTextNode("");
  heroTitle.append(heroEm, heroTitleText);
  const heroLede = el("p", { class: "lede" });
  const heroCta = el("a", { class: "cta", href: "#works" });
  heroBlock.append(heroEyebrow, heroTitle, heroLede, heroCta);

  const focus = el("div", { id: "focus", hidden: "" });
  const focusEyebrow = el("p", { class: "eyebrow" });
  const focusTitle = el("h2");
  const focusDesc = el("p", { class: "desc" });
  const focusStatus = el("p", { class: "status", "aria-live": "polite" });
  const focusClose = el("button", { class: "ghost", type: "button", text: "返回總覽" });
  focus.append(focusEyebrow, focusTitle, focusDesc, focusStatus, focusClose);
  copy.append(heroBlock, focus);

  const hint = el("p", { class: "hint" });
  const hintMouse = el("span", { class: "hint-mouse", text: "拖曳環視" });
  const hintTouch = el("span", { class: "hint-touch", text: "左右拖曳旋轉" });
  hint.append(hintMouse, hintTouch);
  hero.append(stage, copy, hint);

  const works = el("section", { class: "section", id: "works" });
  const worksWrap = el("div", { class: "wrap" });
  const intro = cfg.worksIntro || {};
  worksWrap.append(
    el("p", { class: "eyebrow", text: intro.eyebrow || "WORKS" }),
    el("h2", { text: intro.title || "作品" }),
    el("p", { class: "intro", text: intro.lede || "" })
  );
  const grid = el("div", { class: "grid" });
  const cards = [];
  if (!cfg.works.length) {
    grid.append(el("p", { class: "intro", text: "在 config.js 的 works 加上作品。" }));
  }
  cfg.works.forEach((work, index) => {
    const card = el("button", { class: "card", type: "button", "aria-pressed": "false" });
    const tint = work.tint || ["#1c2a22", "#1a2433", "#16161a", "#241f16"][index % 4];
    const cover = el("span", { class: "cover" });
    cover.style.setProperty("--tint", tint);
    if (work.image) {
      const img = el("img", { alt: "", src: resolveUrl(work.image), loading: "lazy", decoding: "async" });
      img.addEventListener("error", () => img.remove());
      cover.append(img);
    }
    const meta = el("span", { class: "meta" });
    meta.append(
      el("span", { class: "tag", text: [String(index + 1).padStart(2, "0"), work.tag].filter(Boolean).join("  ") }),
      el("h3", { text: work.title || "未命名作品" }),
      el("p", { text: work.description || "" })
    );
    card.append(cover, meta);
    cards.push(card);
    grid.append(card);
  });
  worksWrap.append(grid);
  works.append(worksWrap);

  const aboutCfg = cfg.about || {};
  const about = el("section", { class: "section about", id: "about" });
  const aboutWrap = el("div", { class: "wrap" });
  aboutWrap.append(
    el("p", { class: "eyebrow", text: aboutCfg.eyebrow || "ABOUT" }),
    el("h2", { text: aboutCfg.title || "關於" })
  );
  String(aboutCfg.body || "").split(/\n\s*\n/).filter(Boolean).forEach((paragraph) => {
    aboutWrap.append(el("p", { text: paragraph.trim() }));
  });
  about.append(aboutWrap);

  const contactCfg = cfg.contact || {};
  const contact = el("section", { class: "section", id: "contact" });
  const contactWrap = el("div", { class: "wrap" });
  contactWrap.append(
    el("p", { class: "eyebrow", text: contactCfg.eyebrow || "CONTACT" }),
    el("h2", { text: contactCfg.title || "聯絡" })
  );
  const links = el("div", { class: "links" });
  (contactCfg.links || []).forEach((link) => {
    const href = safeHref(link.href || "");
    if (!href || !link.label) return;
    const anchor = el("a", { href, text: link.label });
    if (!href.startsWith("mailto:")) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    }
    links.append(anchor);
  });
  contactWrap.append(links);
  if (contactCfg.note) contactWrap.append(el("p", { class: "note", text: contactCfg.note }));
  contact.append(contactWrap);

  const footer = el("footer");
  footer.append(
    el("span", { text: ["© " + (cfg.name || "NOX"), cfg.location].filter(Boolean).join(" · ") }),
    el("span", { text: "STATIC TEMPLATE" })
  );

  app.append(header, hero, works, about, contact, footer);
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  return {
    hero, stage, brand, themeBtn, cards, hintMouse, hintTouch,
    heroBlock, heroEyebrow, heroTitle, heroLede, heroCta,
    focus, focusEyebrow, focusTitle, focusDesc, focusStatus, focusClose
  };
}

function el(tag, attrs) {
  const node = document.createElement(tag);
  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      if (value == null || value === false) return;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    });
  }
  return node;
}

function deviceTier() {
  const memory = navigator.deviceMemory || 8;
  const saveData = navigator.connection && navigator.connection.saveData;
  if (saveData || memory <= 2) return "low";
  const narrow = matchMedia("(max-width: 860px)").matches;
  const cores = navigator.hardwareConcurrency || 8;
  if (narrow || memory <= 4 || cores <= 4) return "mid";
  return "high";
}

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch (err) {
    return false;
  }
}

function mountPoster(stage) {
  const poster = el("div", { class: "poster", "aria-hidden": "true" });
  const shape = el("div", { class: "poster-shape" });
  const image = el("img", { class: "poster-img", alt: "" });
  image.hidden = true;
  poster.append(el("div", { class: "poster-glow" }), image, shape, el("div", { class: "poster-ring" }));
  stage.replaceChildren(poster);

  function showForm(name) {
    image.hidden = true;
    shape.hidden = false;
    shape.dataset.form = FORMS.includes(name) ? name : "monolith";
  }
  async function showImage(url, cancelled) {
    const abs = resolveUrl(url);
    await new Promise((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("image"));
      image.src = abs;
    });
    if (cancelled()) return;
    image.hidden = false;
    shape.hidden = true;
  }
  async function showModel(url, cancelled, onProgress) {
    if (onProgress) onProgress(1);
    showForm("crystal");
    if (cancelled()) return;
  }
  return { showForm, showImage, showModel, syncLook() {} };
}

async function startEngine(stage, tier) {
  const THREE = await import("three");
  let RoomEnvironment = null;
  try {
    ({ RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js"));
  } catch (err) {
    console.warn(err);
  }

  const reduced = prefersReduced();
  const high = tier === "high";
  const renderer = new THREE.WebGLRenderer({
    antialias: high,
    alpha: false,
    powerPreference: high ? "high-performance" : "low-power",
    preserveDrawingBuffer: true
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.setClearColor(cssVar("--ink", "#050b07"), 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, high ? 1.75 : 1.15));
  renderer.setSize(stage.clientWidth || 800, stage.clientHeight || 600, false);
  stage.replaceChildren(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(cssVar("--ink", "#050b07"), 14, 28);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  const look = new THREE.Vector3(0, 1.02, 0);

  const ambient = new THREE.AmbientLight(0xf3eee6, 0.28);
  const key = new THREE.SpotLight(0xfff2dd, 36, 28, Math.PI / 5, 0.55, 1.3);
  key.position.set(2.2, 6.4, 3.8);
  key.target.position.copy(look);
  const rim = new THREE.PointLight(0xd4af37, 16, 16, 1.5);
  rim.position.set(-3.1, 2.5, -2.4);
  const fill = new THREE.PointLight(0x8ea0cc, 9, 18, 1.6);
  fill.position.set(-1.8, 1.1, 3.4);
  scene.add(ambient, key, key.target, rim, fill);

  if (RoomEnvironment) {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const target = pmrem.fromScene(new RoomEnvironment(), 0);
      scene.environment = target.texture || target;
      pmrem.dispose();
    } catch (err) {
      console.warn("environment skipped", err);
    }
  }

  const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x121816, metalness: 0.48, roughness: 0.38 });
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.16, 0.16, high ? 64 : 28), pedestalMat);
  pedestal.position.y = -0.08;
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xe0c57a, metalness: 0.9, roughness: 0.28, emissive: 0xe0c57a, emissiveIntensity: 0.18
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.012, 12, high ? 96 : 48), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.012;
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.45, 40),
    new THREE.MeshBasicMaterial({ map: shadowTexture(THREE), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.001;
  scene.add(pedestal, ring, shadow);

  let dust = null;
  if (high && !reduced) {
    const count = 140;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 1] = Math.random() * 3.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    dust = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xc9a96a, size: 0.016, transparent: true, opacity: 0.45, depthWrite: false
    }));
    scene.add(dust);
  }

  const pivot = new THREE.Group();
  scene.add(pivot);

  function syncLook() {
    const ink = new THREE.Color(cssVar("--ink", "#050b07"));
    scene.fog.color.copy(ink);
    scene.background = ink;
    renderer.setClearColor(ink, 1);
    pedestalMat.color.copy(new THREE.Color(cssVar("--pedestal", "#121816")));
    ringMat.color.copy(new THREE.Color(cssVar("--ring", "#e0c57a")));
    ringMat.emissive.copy(ringMat.color);
    key.color.copy(new THREE.Color(cssVar("--light-key", "#fff2dd")));
    rim.color.copy(new THREE.Color(cssVar("--light-rim", "#d4af37")));
    fill.color.copy(new THREE.Color(cssVar("--light-fill", "#8ea0cc")));
    if (dust) dust.material.color.copy(new THREE.Color(cssVar("--accent", "#c9a96a")));
  }
  syncLook();

  function frameCamera() {
    const width = stage.clientWidth || 1;
    const height = stage.clientHeight || 1;
    camera.aspect = width / height;
    const overlap = getComputedStyle(stage).position === "absolute";
    const portrait = width / height < 0.92;
    if (overlap && portrait) {
      camera.position.set(0.04, 1.95, 7.15);
      look.set(0, 1.62, 0);
    } else if (overlap) {
      camera.position.set(0.28, 1.18, 5.55);
      look.set(0, 1.02, 0);
    } else {
      camera.position.set(0.1, 1.12, 5.15);
      look.set(0, 0.98, 0);
    }
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
  }

  const clock = new THREE.Clock();
  let yaw = 0.45;
  let pitch = 0;
  let parallaxX = 0;
  let parallaxY = 0;
  let idle = 0;
  let lastInteract = performance.now();
  let heroVisible = true;
  let raf = 0;

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!heroVisible || document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    if (!reduced && performance.now() - lastInteract > 2200) idle += dt * 0.22;
    const destYaw = yaw + parallaxX + idle;
    const destPitch = -pitch - parallaxY;
    pivot.rotation.y += (destYaw - pivot.rotation.y) * 0.08;
    pivot.rotation.x += (destPitch - pivot.rotation.x) * 0.08;
    pivot.position.y = reduced ? 0 : Math.sin(t * 0.7) * 0.02;
    if (dust && !reduced) dust.rotation.y = t * 0.02;
    if (!reduced) rim.intensity = 16 + Math.sin(t * 1.4) * 2.5;
    camera.lookAt(look);
    renderer.render(scene, camera);
  }

  function startLoop() {
    if (!raf) loop();
  }
  const observer = new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    if (heroVisible) startLoop();
  }, { threshold: 0.02 });
  observer.observe(stage.parentElement || stage);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) startLoop(); });
  startLoop();

  const drag = { on: false, captured: false, x: 0, y: 0, id: 0 };
  function endDrag(event) {
    if (event && drag.id !== event.pointerId) return;
    drag.on = false;
    drag.captured = false;
  }
  stage.addEventListener("pointerdown", (event) => {
    if (event.button != null && event.button !== 0) return;
    drag.on = true;
    drag.captured = event.pointerType === "mouse";
    drag.x = event.clientX;
    drag.y = event.clientY;
    drag.id = event.pointerId;
    if (drag.captured) stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener("pointermove", (event) => {
    const rect = stage.getBoundingClientRect();
    if (!drag.on) {
      if (event.pointerType === "mouse") {
        parallaxX = ((event.clientX - rect.left) / rect.width * 2 - 1) * 0.26;
        parallaxY = ((event.clientY - rect.top) / rect.height * 2 - 1) * 0.1;
        lastInteract = performance.now();
      }
      return;
    }
    if (event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.captured) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        drag.on = false;
        return;
      }
      drag.captured = true;
      stage.setPointerCapture(event.pointerId);
    }
    yaw += dx * 0.008;
    pitch = Math.max(-0.35, Math.min(0.42, pitch + dy * 0.0035));
    drag.x = event.clientX;
    drag.y = event.clientY;
    lastInteract = performance.now();
  });
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("keydown", (event) => {
    const arrows = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (!arrows.includes(event.key)) return;
    if (event.key === "ArrowLeft") yaw -= 0.2;
    if (event.key === "ArrowRight") yaw += 0.2;
    if (event.key === "ArrowUp") pitch = Math.max(-0.35, pitch - 0.08);
    if (event.key === "ArrowDown") pitch = Math.min(0.42, pitch + 0.08);
    lastInteract = performance.now();
    event.preventDefault();
  });

  const resize = new ResizeObserver(() => frameCamera());
  resize.observe(stage);
  frameCamera();

  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
  });

  const modelCache = new Map();
  let gltfLoader = null;
  function clearPivot() {
    while (pivot.children.length) {
      const child = pivot.children[0];
      pivot.remove(child);
      if (child.userData.procedural) disposeTree(child);
    }
  }
  function place(object) {
    clearPivot();
    pivot.add(object);
    frameCamera();
    renderer.render(scene, camera);
  }
  function showForm(name) {
    place(settle(THREE, buildForm(THREE, formName(name, 0), high), true));
  }
  async function showModel(url, cancelled, onProgress) {
    const abs = resolveUrl(url);
    if (!modelCache.has(abs)) {
      if (!gltfLoader) {
        const mod = await import("three/addons/loaders/GLTFLoader.js");
        gltfLoader = new mod.GLTFLoader();
      }
      const gltf = await new Promise((resolve, reject) => {
        gltfLoader.load(abs, resolve, (event) => {
          if (onProgress && event.total) onProgress(event.loaded / event.total);
        }, reject);
      });
      modelCache.set(abs, gltf.scene);
    } else if (onProgress) onProgress(1);
    if (cancelled()) return;
    place(settle(THREE, modelCache.get(abs).clone(true), false));
  }
  async function showImage(url, cancelled) {
    const tex = await new Promise((resolve, reject) => {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.setCrossOrigin("anonymous");
      textureLoader.load(resolveUrl(url), resolve, undefined, reject);
    });
    if (cancelled()) {
      tex.dispose();
      return;
    }
    tex.colorSpace = THREE.SRGBColorSpace;
    const image = tex.image;
    const aspect = image && image.width && image.height ? image.width / image.height : 0.8;
    const height = 1.65;
    const width = height * Math.min(Math.max(aspect, 0.45), 1.6);
    const group = new THREE.Group();
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.08, height + 0.08, 0.045),
      metalMaterial(THREE)
    );
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.02 })
    );
    face.position.z = 0.03;
    group.add(frame, face);
    place(settle(THREE, group, true));
  }

  const api = { showForm, showModel, showImage, syncLook };
  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    if (api.onLost) api.onLost();
  });

  showForm("monolith");
  return api;
}

function shadowTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 64);
  grad.addColorStop(0, "rgba(0,0,0,0.5)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function stoneMaterial(THREE) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(cssVar("--stone", "#d9d0c2")),
    metalness: 0.06,
    roughness: 0.55,
    envMapIntensity: 0.45
  });
}

function metalMaterial(THREE) {
  const color = new THREE.Color(cssVar("--accent", "#c9a96a"));
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.92,
    roughness: 0.3,
    envMapIntensity: 1,
    emissive: color,
    emissiveIntensity: 0.08
  });
}

function buildForm(THREE, name, high) {
  const group = new THREE.Group();
  const stone = stoneMaterial(THREE);
  const metal = metalMaterial(THREE);
  const segs = high ? 72 : 32;
  if (name === "vessel") {
    const geo = lathe(THREE, [
      [0.02, 0], [0.34, 0], [0.48, 0.12], [0.26, 0.58], [0.2, 0.96],
      [0.36, 1.28], [0.5, 1.52], [0.44, 1.66], [0.16, 1.76]
    ], segs);
    group.add(new THREE.Mesh(geo, stone));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.018, 10, segs), metal);
    band.rotation.x = Math.PI / 2;
    band.position.y = 1.28;
    group.add(band);
  } else if (name === "crystal") {
    const geo = new THREE.IcosahedronGeometry(0.78, 0);
    group.add(new THREE.Mesh(geo, stone));
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: cssVar("--accent", "#c9a96a") })
    );
    edges.scale.setScalar(1.012);
    group.add(edges);
    group.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), metal));
  } else if (name === "knot") {
    group.add(new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.52, 0.15, high ? 180 : 80, 16, 2, 3),
      metal
    ));
  } else if (name === "rings") {
    [0.72, 0.56, 0.4, 0.26].forEach((radius, index) => {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.035, 12, high ? 64 : 32),
        index % 2 ? stone : metal
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = index * 0.34;
      mesh.rotation.z = index * 0.18;
      group.add(mesh);
    });
  } else {
    const geo = lathe(THREE, [
      [0.02, 0], [0.28, 0], [0.55, 0.08], [0.48, 0.32], [0.3, 0.7],
      [0.38, 1.08], [0.24, 1.42], [0.16, 1.7], [0.05, 1.92]
    ], segs);
    lean(geo, 0.05);
    group.add(new THREE.Mesh(geo, stone));
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.016, 10, segs), metal);
    band.rotation.x = Math.PI / 2;
    band.position.y = 1.05;
    group.add(band);
  }
  return group;
}

function lathe(THREE, points, segments) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments);
}

function lean(geometry, amount) {
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) pos.setX(i, pos.getX(i) + pos.getY(i) * amount);
  geometry.computeVertexNormals();
}

function settle(THREE, object, procedural) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  object.position.sub(center);
  const wrap = new THREE.Group();
  wrap.add(object);
  wrap.scale.setScalar(1.72 / Math.max(size.x, size.y, size.z, 0.001));
  wrap.updateMatrixWorld(true);
  wrap.position.y -= new THREE.Box3().setFromObject(wrap).min.y;
  wrap.userData.procedural = !!procedural;
  return wrap;
}

function disposeTree(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    const materials = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
    materials.forEach((material) => {
      if (material.map) material.map.dispose();
      material.dispose();
    });
  });
}
