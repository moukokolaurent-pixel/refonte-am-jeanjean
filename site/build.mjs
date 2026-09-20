import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";

const SRC = "/app/_src/extracted/am-jeanjean-source-medias-locaux";
const SITE = "/app/site";
const DIST = "/app/site/dist";
const PROD = "https://am-jeanjean.com";

const reactUMD = fs.readFileSync(path.join(SITE, "node_modules/react/umd/react.production.min.js"), "utf8");
const reactDomClientUMD = fs.readFileSync(path.join(SITE, "node_modules/react-dom/umd/react-dom.production.min.js"), "utf8");
const reactDomServerUMD = fs.readFileSync(path.join(SITE, "node_modules/react-dom/umd/react-dom-server-legacy.browser.production.min.js"), "utf8");
const dccore = fs.readFileSync(path.join(SITE, "dccore.js"), "utf8");
const bootjs = fs.readFileSync(path.join(SITE, "boot.js"), "utf8");

// route filename base -> slug
const LINKMAP = {
  "Anne-Marie Jeanjean - Accueil": "/",
  "Poesie": "/poesie/",
  "Livres": "/livres/",
  "Expositions": "/expositions/",
  "Revue Textuerre": "/revue-textuerre/",
  "La saveur du vent": "/la-saveur-du-vent/",
  "Tardigradeditions": "/tardigradeeditions/",
  "Actualites": "/actualites/",
  "Contact": "/contact/",
};

const ROUTES = [
  { base: "Anne-Marie Jeanjean - Accueil", out: "index.html", data: [],
    title: "Anne-Marie Jeanjean — poète, plasticienne & Tardigradéditions",
    desc: "Site officiel d'Anne-Marie Jeanjean : poésie visuelle et auditive, livres, expositions, revue Textuerre et éditions d'art Tardigradéditions.",
    ogimg: "/media/2023/08/Portrait-cal-AMJ.jpg" },
  { base: "Poesie", out: "poesie/index.html", data: [],
    title: "Poésies visuelles & auditives — Anne-Marie Jeanjean",
    desc: "Poésie sonore et visuelle d'Anne-Marie Jeanjean : montages audio, collages, œuvres graphiques et écriture expérimentale.",
    ogimg: "/media/2023/08/walser1.jpg" },
  { base: "Livres", out: "livres/index.html", data: [],
    title: "Livres — Anne-Marie Jeanjean",
    desc: "La bibliothèque d'Anne-Marie Jeanjean : ouvrages personnels, ouvrages collectifs, éditions limitées et travaux à quatre mains avec Shanshan Sun.",
    ogimg: "/media/2023/09/Dans-le-souffle-du-sabre.jpg" },
  { base: "Expositions", out: "expositions/index.html", data: [],
    title: "Expositions — Anne-Marie Jeanjean",
    desc: "Expositions et installations d'Anne-Marie Jeanjean : poésie visuelle, collages et œuvres plastiques présentés en France et à l'étranger.",
    ogimg: "/media/2023/08/ailleurs.jpg" },
  { base: "Revue Textuerre", out: "revue-textuerre/index.html", data: [],
    title: "Revue Textuerre — Anne-Marie Jeanjean",
    desc: "Textuerre, la revue de poésie fondée et animée par Anne-Marie Jeanjean : une aventure éditoriale au long cours.",
    ogimg: "/media/2023/08/Portrait-cal-AMJ.jpg" },
  { base: "La saveur du vent", out: "la-saveur-du-vent/index.html", data: ["saveur-data-1.js", "saveur-data-2.js"],
    title: "La saveur du vent — notes de lecture d'Anne-Marie Jeanjean",
    desc: "La saveur du vent : chroniques et notes de lecture d'Anne-Marie Jeanjean autour de la poésie, des livres et des rencontres d'écriture.",
    ogimg: "/media/2024/10/cheval-Shan.jpg" },
  { base: "Tardigradeditions", out: "tardigradeeditions/index.html", data: [],
    title: "Tardigradéditions — livres d'artiste faits main",
    desc: "Tardigradéditions : maison d'édition d'art d'Anne-Marie Jeanjean, livres réalisés à la main en tirages très limités.",
    ogimg: "/media/2023/10/21lettres.jpg" },
  { base: "Actualites", out: "actualites/index.html", data: ["actualites-data.js"],
    title: "Actualités — Anne-Marie Jeanjean",
    desc: "Actualités d'Anne-Marie Jeanjean : lectures, rencontres, expositions, interviews et parutions récentes.",
    ogimg: "/media/2023/09/Dans-le-souffle-du-sabre.jpg" },
  { base: "Contact", out: "contact/index.html", data: [],
    title: "Contact — Anne-Marie Jeanjean",
    desc: "Écrire à Anne-Marie Jeanjean : un mot sur un livre, une exposition, une collaboration éditoriale ou une commande Tardigradéditions.",
    ogimg: "/media/2023/08/Portrait-cal-AMJ.jpg" },
];

function rewriteLinks(s) {
  for (const [base, slug] of Object.entries(LINKMAP)) {
    const enc = encodeURIComponent(base).replace(/%20/g, "%20"); // spaces -> %20
    const encSpace = base.replace(/ /g, "%20");
    // encoded form
    s = s.split(`"${encSpace}.dc.html"`).join(`"${slug}"`);
    s = s.split(`'${encSpace}.dc.html'`).join(`'${slug}'`);
    // raw form (with real spaces)
    s = s.split(`"${base}.dc.html"`).join(`"${slug}"`);
    s = s.split(`'${base}.dc.html'`).join(`'${slug}'`);
    // fully percent-encoded dashes etc (encodeURIComponent keeps '-' but encodes spaces already handled)
  }
  return s;
}

function rewriteAssets(s) {
  // logos referenced relatively -> absolute
  s = s.split('"logo-amj-noir.png"').join('"/logo-amj-noir.png"');
  s = s.split('"logo-amj-blanc.png"').join('"/logo-amj-blanc.png"');
  // self-host audio (was on the WordPress being replaced)
  s = s.split("https://am-jeanjean.com/wp-content/uploads/").join("/media/");
  s = s.split("http://am-jeanjean.com/wp-content/uploads/").join("/media/");
  s = s.split("https://i0.wp.com/am-jeanjean.com/wp-content/uploads/").join("/media/");
  return s;
}

function extract(fileBase) {
  const raw = fs.readFileSync(path.join(SRC, fileBase + ".dc.html"), "utf8");
  const open = raw.indexOf("<x-dc>");
  const close = raw.lastIndexOf("</x-dc>");
  let template = raw.slice(open + "<x-dc>".length, close);
  // capture helmet inline <style> blocks
  const helmetMatch = /<helmet[\s\S]*?<\/helmet>/i.exec(template);
  let inlineStyles = "";
  if (helmetMatch) {
    const styleRe = /<style>([\s\S]*?)<\/style>/gi;
    let m;
    while ((m = styleRe.exec(helmetMatch[0]))) inlineStyles += m[1] + "\n";
  }
  // strip helmet from template (head handled statically)
  template = template.replace(/<helmet[\s\S]*?<\/helmet>/i, "");
  // logic script
  const logicMatch = /<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/i.exec(raw);
  const logic = logicMatch ? logicMatch[1] : "";
  return { template, inlineStyles, logic };
}

function ssr(template, logic, dataFiles) {
  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`, { runScripts: "dangerously" });
  const { window } = dom;
  // jsdom lacks these; react-dom/server (browser build) needs them
  window.TextEncoder = TextEncoder;
  window.TextDecoder = TextDecoder;
  if (typeof window.MessageChannel === "undefined" && typeof MessageChannel !== "undefined") window.MessageChannel = MessageChannel;
  const inject = (code) => { const sc = window.document.createElement("script"); sc.textContent = code; window.document.head.appendChild(sc); };
  inject(reactUMD);
  inject(reactDomServerUMD);
  for (const df of dataFiles) inject(rewriteAssets(fs.readFileSync(path.join(SRC, df), "utf8")));
  inject(dccore);
  if (!window.React || !window.ReactDOMServer || !window.DCCORE) {
    throw new Error("SSR globals missing: React=" + !!window.React + " RDS=" + !!window.ReactDOMServer + " DCCORE=" + !!window.DCCORE);
  }
  const rules = [];
  const Comp = window.DCCORE.buildComponent({ template, logicSrc: logic, defaultProps: {}, pseudoSink: (r) => rules.push(r) });
  const html = window.ReactDOMServer.renderToString(window.React.createElement(Comp));
  dom.window.close();
  return { html, pseudoCSS: rules.join("\n") };
}

const REDUCED_MOTION_CSS = `
html,body{height:100%;margin:0}
#dc-root,#dc-root>.sc-host{min-height:100%}
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;animation-delay:0ms!important;transition-duration:.001ms!important;scroll-behavior:auto!important}
  [data-amj-deco]{translate:none!important}
  [data-amj-reveal]{opacity:1!important}
}`;

function pageHTML(route, ssrHtml, inlineStyles, pseudoCSS, tplB64, logicB64, dataFiles) {
  const canonical = PROD + LINKMAP[route.base];
  const ogimg = PROD + route.ogimg;
  const preloadFonts = [
    "/assets/fonts/CormorantGaramond-600-normal-latin.woff2",
    "/assets/fonts/Lora-400-normal-latin.woff2",
  ].map((f) => `<link rel="preload" as="font" type="font/woff2" href="${f}" crossorigin>`).join("\n");
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Anne-Marie Jeanjean",
    url: PROD + "/",
    inLanguage: "fr-FR",
    author: { "@type": "Person", name: "Anne-Marie Jeanjean", jobTitle: "Poète et plasticienne" },
    publisher: { "@type": "Organization", name: "Tardigradéditions" },
  };
  const dataScripts = dataFiles.map((df) => `<script src="/assets/data/${df}"></script>`).join("\n");
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${route.title}</title>
<meta name="description" content="${route.desc.replace(/"/g, "&quot;")}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Anne-Marie Jeanjean">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${route.title.replace(/"/g, "&quot;")}">
<meta property="og:description" content="${route.desc.replace(/"/g, "&quot;")}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogimg}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${route.title.replace(/"/g, "&quot;")}">
<meta name="twitter:description" content="${route.desc.replace(/"/g, "&quot;")}">
<meta name="twitter:image" content="${ogimg}">
<link rel="icon" type="image/png" href="/logo-amj-noir.png">
${preloadFonts}
<link rel="stylesheet" href="/assets/fonts.css">
<link rel="stylesheet" href="/assets/styles.css">
<style id="dc-motion">${REDUCED_MOTION_CSS}</style>
<style id="dc-inline">${inlineStyles}</style>
<style id="dc-pseudo">${pseudoCSS}</style>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<div id="dc-root">${ssrHtml}</div>
<script id="dc-template" type="text/plain">${tplB64}</script>
<script id="dc-logic" type="text/plain">${logicB64}</script>
${dataScripts}
<script src="/assets/react.production.min.js"></script>
<script src="/assets/react-dom.production.min.js"></script>
<script src="/assets/dccore.js"></script>
<script src="/assets/boot.js"></script>
</body>
</html>`;
}

function ensureDir(p) { fs.mkdirSync(path.dirname(p), { recursive: true }); }

function main() {
  // static assets
  fs.mkdirSync(path.join(DIST, "assets/data"), { recursive: true });
  fs.writeFileSync(path.join(DIST, "assets/react.production.min.js"), reactUMD);
  fs.writeFileSync(path.join(DIST, "assets/react-dom.production.min.js"), reactDomClientUMD);
  fs.writeFileSync(path.join(DIST, "assets/dccore.js"), dccore);
  fs.writeFileSync(path.join(DIST, "assets/boot.js"), bootjs);
  // styles.css with the google-fonts @import stripped
  let styles = fs.readFileSync(path.join(SRC, "_ds/classical-44a30086-e05d-4482-8c91-7ac9ddcb6cef/styles.css"), "utf8");
  styles = styles.replace(/@import url\(['"]https:\/\/fonts\.googleapis\.com[^)]*\);?/g, "/* google fonts import removed — self-hosted */");
  fs.writeFileSync(path.join(DIST, "assets/styles.css"), styles);
  // logos
  fs.copyFileSync(path.join(SRC, "logo-amj-noir.png"), path.join(DIST, "logo-amj-noir.png"));
  fs.copyFileSync(path.join(SRC, "logo-amj-blanc.png"), path.join(DIST, "logo-amj-blanc.png"));
  // data files (asset-rewritten)
  for (const df of ["actualites-data.js", "saveur-data-1.js", "saveur-data-2.js"]) {
    fs.writeFileSync(path.join(DIST, "assets/data/", df), rewriteAssets(fs.readFileSync(path.join(SRC, df), "utf8")));
  }

const CONTACT_EMAIL = "anne-marie.jeanjean5@orange.fr";
const CONTACT_ONSUBMIT_SRC = "onSubmit: (e) => { e.preventDefault(); this.setState({ sent: true }); }";
const CONTACT_ONSUBMIT_MAILTO =
  "onSubmit: (e) => { e.preventDefault(); try { var f = e.target; " +
  "var nom = (f.nom && f.nom.value) || ''; var mail = (f.mail && f.mail.value) || ''; " +
  "var objet = (f.objet && f.objet.value) || ''; var message = (f.message && f.message.value) || ''; " +
  "var subject = 'Message depuis am-jeanjean.com' + (objet ? ' \\u2014 ' + objet : '') + (nom ? ' \\u2014 ' + nom : ''); " +
  "var body = message + '\\n\\n\\u2014 ' + nom + (mail ? ' (' + mail + ')' : ''); " +
  "window.location.href = 'mailto:" + CONTACT_EMAIL + "?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body); " +
  "} catch (err) {} this.setState({ sent: true }); }";

  const report = [];
  for (const route of ROUTES) {
    const { template, inlineStyles, logic } = extract(route.base);
    const tpl2 = rewriteAssets(rewriteLinks(template));
    let logic2 = rewriteAssets(rewriteLinks(logic));
    if (route.base === "Contact") {
      if (!logic2.includes(CONTACT_ONSUBMIT_SRC)) console.warn("WARN: Contact onSubmit source not found for mailto patch");
      logic2 = logic2.replace(CONTACT_ONSUBMIT_SRC, CONTACT_ONSUBMIT_MAILTO);
    }
    const { html, pseudoCSS } = ssr(tpl2, logic2, route.data);
    const tplB64 = Buffer.from(tpl2, "utf8").toString("base64");
    const logicB64 = Buffer.from(logic2, "utf8").toString("base64");
    const pseudoCount = pseudoCSS ? pseudoCSS.split("\n").filter(Boolean).length : 0;
    const out = pageHTML(route, html, inlineStyles, pseudoCSS, tplB64, logicB64, route.data);
    const dest = path.join(DIST, route.out);
    ensureDir(dest);
    fs.writeFileSync(dest, out);
    report.push(`${route.out.padEnd(34)} route=${LINKMAP[route.base].padEnd(22)} hover-rules=${pseudoCount} ssr=${html.length}b`);
  }
  console.log("=== BUILD REPORT ===");
  console.log(report.join("\n"));
}

main();
