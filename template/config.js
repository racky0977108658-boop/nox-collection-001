/* NOX 互動 3D 作品集模板 — 只改這個檔案
   路徑都相對 index.html。用本機伺服器預覽，不要直接點開檔案。
   最後一項後面不要加逗號。 */

window.PORTFOLIO_CONFIG = {
  name: "NOX",
  tagline: "互動 3D 作品集模板",
  location: "TAIPEI",

  /* atelier = 暗色展廳、暖金、襯線標題
     void    = 冷光、左文右景的英雄區 */
  theme: "atelier",

  /* 交給客戶時改成 false，就不會出現主題切換 */
  showThemeToggle: true,

  /* 留空代表沿用主題預設。要改品牌色再填十六進位色碼。 */
  colors: {
    ink: "",
    bone: "",
    accent: "",
    accentSoft: ""
  },

  hero: {
    eyebrow: "STUDIO TEMPLATE",
    titleLead: "光，",
    title: "先落在\n作品上。",
    lede: "拖曳可以環視。點一件作品，舞台就換成雕塑、圖片或 GLB。",
    cta: "觀看作品",
    /* 有 model 時會先顯示 form，模型載入後再換上。 */
    form: "monolith",
    model: "",
    image: ""
  },

  worksIntro: {
    eyebrow: "SELECTED WORK",
    title: "作品",
    lede: "封面用圖片。舞台優先用 GLB；沒有模型就用 form 的占位雕塑。form 也留空時，改把圖片立在台上。"
  },

  about: {
    eyebrow: "ABOUT",
    title: "一份設定，一座展廳。",
    body: "這是給品牌與創作者的靜態作品集。名稱、短句、作品、聯絡與色彩都在 config.js，推上 GitHub Pages 就能上線，不用建置。\n\n舞台沿用展廳的看法：暗色空間、金環基座、游標環視，停下之後緩慢自轉。另一個主題把版面改成左文右景的冷光英雄區。"
  },

  contact: {
    eyebrow: "CONTACT",
    title: "把這座展廳換成你的名字。",
    note: "下面的連結是占位，交付前記得換掉。",
    links: [
      { label: "Email", href: "mailto:hello@example.com" },
      { label: "GitHub", href: "https://github.com/racky0977108658-boop" }
    ]
  },

  /* form 可用：monolith、vessel、crystal、knot、rings
     image：卡片封面（也可在沒有 model / form 時立上舞台）
     model：相對路徑的 .glb，點開該作品才下載 */
  works: [
    {
      title: "墮落與飛升",
      year: "2026",
      tag: "雕塑",
      description: "範例。暗室裡的主雕塑：游標帶動視角，停下後自己慢慢轉。",
      image: "assets/cover-monolith.svg",
      model: "",
      form: "monolith"
    },
    {
      title: "星塵門戶",
      year: "2026",
      tag: "策展",
      description: "範例。骨白與暖金的策展語氣，收成一件可以點開的作品。",
      image: "assets/cover-crystal.svg",
      model: "",
      form: "crystal"
    },
    {
      title: "冷光分欄",
      year: "2026",
      tag: "英雄區",
      description: "範例。切到「冷光」時，文字在左、物體在右，適合產品或角色模型。",
      image: "assets/cover-rings.svg",
      model: "",
      form: "rings"
    },
    {
      title: "可替換棱晶",
      year: "2026",
      tag: "GLB",
      description: "範例。點開才下載模型。這支棱晶是模板自帶的占位，請換成你的 GLB。",
      image: "assets/cover-prism.svg",
      model: "assets/sample-prism.glb",
      form: "knot"
    }
  ]
};
