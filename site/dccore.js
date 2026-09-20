/* dccore.js — faithful subset of the Design-Component runtime (extracted verbatim
   from support.js: parse/expr/encode/compile/pseudo/logic/component).
   Runs in both jsdom (build-time SSR) and the browser (hydration), using window.React.
   No Babel, no CDN, no network. Attaches window.DCCORE. */
(function () {
  "use strict";
  function getReact() {
    var R = window.React;
    if (!R) throw new Error("dccore: window.React missing");
    return R;
  }
  var h = function () { return getReact().createElement.apply(null, arguments); };

  /* ---------------- expr.ts ---------------- */
  var IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*/;
  var NUMBER_RE = /^-?\d+(\.\d+)?$/;
  function resolve(vals, src) {
    var expr = String(src).trim();
    if (!expr) return void 0;
    if (expr[0] === "(" && expr[expr.length - 1] === ")" && parensWrapWhole(expr)) return resolve(vals, expr.slice(1, -1));
    var eq = findTopLevelEquality(expr);
    if (eq) {
      var lv = resolve(vals, expr.slice(0, eq.index));
      var rv = resolve(vals, expr.slice(eq.index + eq.op.length));
      switch (eq.op) { case "===": return lv === rv; case "!==": return lv !== rv; case "==": return lv == rv; default: return lv != rv; }
    }
    if (expr[0] === "!") return !resolve(vals, expr.slice(1));
    if (expr === "true") return true;
    if (expr === "false") return false;
    if (expr === "null") return null;
    if (expr === "undefined") return void 0;
    if (NUMBER_RE.test(expr)) return Number(expr);
    if (expr.length >= 2 && (expr[0] === '"' || expr[0] === "'") && expr[expr.length - 1] === expr[0]) return expr.slice(1, -1);
    return resolvePath(vals, expr);
  }
  function parensWrapWhole(expr) {
    var depth = 0;
    for (var i = 0; i < expr.length - 1; i++) {
      if (expr[i] === "(") depth++;
      else if (expr[i] === ")") { depth--; if (depth === 0) return false; }
    }
    return true;
  }
  function findTopLevelEquality(expr) {
    var depth = 0;
    for (var i = 0; i < expr.length; i++) {
      var c = expr[i];
      if (c === "[" || c === "(") depth++;
      else if (c === "]" || c === ")") depth--;
      else if (depth === 0 && (c === "=" || c === "!") && expr[i + 1] === "=") {
        if (i > 0 && (expr[i - 1] === "=" || expr[i - 1] === "!")) continue;
        if (!expr.slice(0, i).trim()) continue;
        var op = expr[i + 2] === "=" ? c + "==" : c + "=";
        return { index: i, op: op };
      }
    }
    return null;
  }
  function resolvePath(vals, expr) {
    var head = expr.match(IDENT_RE);
    if (!head) return void 0;
    var cur = vals == null ? void 0 : vals[head[0]];
    var i = head[0].length;
    while (i < expr.length) {
      if (expr[i] === ".") {
        var m = expr.slice(i + 1).match(IDENT_RE) || expr.slice(i + 1).match(/^\d+/);
        if (!m) return void 0;
        cur = cur == null ? void 0 : cur[m[0]];
        i += 1 + m[0].length;
      } else if (expr[i] === "[") {
        var depth = 1, j = i + 1;
        while (j < expr.length && depth > 0) { if (expr[j] === "[") depth++; else if (expr[j] === "]") { depth--; if (depth === 0) break; } j++; }
        if (depth !== 0) return void 0;
        var key = resolve(vals, expr.slice(i + 1, j));
        cur = cur == null ? void 0 : cur[key];
        i = j + 1;
      } else return void 0;
    }
    return cur;
  }

  /* ---------------- encode.ts ---------------- */
  var CAMEL_ATTR = "sc-camel-";
  var INLINE_TEXT_TAGS = new Set("a abbr b bdi bdo br cite code del dfn em i ins kbd mark q s samp small span strike strong sub sup u var wbr".split(" "));
  var RAW_WRAP = { select: "sc-raw-select", table: "sc-raw-table", tbody: "sc-raw-tbody", thead: "sc-raw-thead", tfoot: "sc-raw-tfoot", tr: "sc-raw-tr", td: "sc-raw-td", th: "sc-raw-th", caption: "sc-raw-caption" };
  var RAW_UNWRAP = {}; Object.keys(RAW_WRAP).forEach(function (k) { RAW_UNWRAP[RAW_WRAP[k]] = k; });
  var EVENT_MAP = { onclick: "onClick", onchange: "onChange", oninput: "onInput", onsubmit: "onSubmit", onkeydown: "onKeyDown", onkeyup: "onKeyUp", onkeypress: "onKeyPress", onmousedown: "onMouseDown", onmouseup: "onMouseUp", onmouseenter: "onMouseEnter", onmouseleave: "onMouseLeave", onfocus: "onFocus", onblur: "onBlur", ondoubleclick: "onDoubleClick", oncontextmenu: "onContextMenu", onmousemove: "onMouseMove", onmouseover: "onMouseOver", onmouseout: "onMouseOut", onpointerdown: "onPointerDown", onpointerup: "onPointerUp", onpointermove: "onPointerMove", onpointerenter: "onPointerEnter", onpointerleave: "onPointerLeave", onpointercancel: "onPointerCancel", onpointerover: "onPointerOver", onpointerout: "onPointerOut", ongotpointercapture: "onGotPointerCapture", onlostpointercapture: "onLostPointerCapture", ontouchstart: "onTouchStart", ontouchend: "onTouchEnd", ontouchmove: "onTouchMove", ontouchcancel: "onTouchCancel", ondragstart: "onDragStart", ondragend: "onDragEnd", ondragenter: "onDragEnter", ondragleave: "onDragLeave", ondragover: "onDragOver", onanimationstart: "onAnimationStart", onanimationend: "onAnimationEnd", onanimationiteration: "onAnimationIteration", ontransitionend: "onTransitionEnd" };
  var CAMEL_ATTR_RE = /(\s)([a-z]+[A-Z][A-Za-z0-9]*)(\s*=)/g;
  function encodeCamelAttrs(html) { return html.replace(CAMEL_ATTR_RE, function (_, sp, name, eq) { return sp + CAMEL_ATTR + name.replace(/[A-Z]/g, function (c) { return "-" + c.toLowerCase(); }) + eq; }); }
  function encodeCase(html) {
    html = html.replace(/<helmet(\s|>)/gi, "<sc-helmet$1");
    html = html.replace(/<\/helmet\s*>/gi, "</sc-helmet>");
    html = encodeCamelAttrs(html);
    Object.keys(RAW_WRAP).forEach(function (real) {
      var alias = RAW_WRAP[real];
      html = html.replace(new RegExp("(</?)" + real + "(?=[\\s>])", "gi"), "$1" + alias);
    });
    return html;
  }
  function kebabToCamel(s) { return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }
  function cssToObj(css) {
    var o = {};
    css.split(";").forEach(function (decl) {
      var i = decl.indexOf(":");
      if (i < 0) return;
      var prop = decl.slice(0, i).trim();
      o[prop.indexOf("--") === 0 ? prop : kebabToCamel(prop)] = decl.slice(i + 1).trim();
    });
    return o;
  }
  function compileAttr(raw) {
    var whole = raw.match(/^\s*\{\{([\s\S]+?)\}\}\s*$/);
    if (whole) { var path = whole[1]; return function (vals) { return resolve(vals, path); }; }
    if (raw.indexOf("{{") !== -1) {
      var parts = raw.split(/\{\{([\s\S]+?)\}\}/g);
      return function (vals) { return parts.map(function (s, i) { return i & 1 ? (resolve(vals, s) != null ? resolve(vals, s) : "") : s; }).join(""); };
    }
    return function () { return raw; };
  }

  /* ---------------- pseudo.ts ---------------- */
  function scanUnquotedUrl(css, i) {
    if ((css[i] !== "u" && css[i] !== "U") || css.slice(i, i + 4).toLowerCase() !== "url(" || /[a-z0-9_-]/i.test(css[i - 1] || "")) return -1;
    var j = i + 4;
    while (j < css.length && /\s/.test(css[j])) j++;
    if (css[j] === '"' || css[j] === "'") return -1;
    while (j < css.length && css[j] !== ")") { if (css[j] === "\\") j++; j++; }
    return j < css.length ? j + 1 : css.length;
  }
  function stripComments(css) {
    var out = "", quote = "";
    for (var i = 0; i < css.length; i++) {
      var c = css[i];
      if (quote) { if (c === "\\") { out += c + (css[i + 1] || ""); i++; continue; } if (c === quote) quote = ""; out += c; }
      else if (c === "'" || c === '"') { quote = c; out += c; }
      else if (c === "/" && css[i + 1] === "*") { var end = css.indexOf("*/", i + 2); i = end === -1 ? css.length : end + 1; out += " "; }
      else { var e = scanUnquotedUrl(css, i); if (e === -1) out += c; else { out += css.slice(i, e); i = e - 1; } }
    }
    return out;
  }
  function importantify(css) {
    css = stripComments(css);
    var decls = [], start = 0, depth = 0, quote = "";
    for (var i = 0; i < css.length; i++) {
      var c = css[i];
      if (quote) { if (c === "\\") i++; else if (c === quote) quote = ""; }
      else if (c === "'" || c === '"') quote = c;
      else if (c === "(") depth++;
      else if (c === ")") depth = Math.max(0, depth - 1);
      else if (c === ";" && depth === 0) { decls.push(css.slice(start, i)); start = i + 1; }
      else { var e = scanUnquotedUrl(css, i); if (e !== -1) i = e - 1; }
    }
    decls.push(css.slice(start));
    return decls.map(function (d) { return d.trim(); }).filter(Boolean).map(function (d) { return /!\s*important$/i.test(d) ? d : d + " !important"; }).join(";");
  }
  // Recording pseudo sheet: returns className and records the CSS rule text.
  function createPseudoSheet(sink) {
    var cache = {}, n = 0;
    return function (pseudo, css) {
      var k = pseudo + "|" + css;
      if (cache[k]) return cache[k];
      var cls = "scp" + (n++).toString(36);
      var isEl = pseudo === "before" || pseudo === "after";
      var sel = isEl ? "." + cls + "::" + pseudo : "." + cls + ":" + pseudo;
      sink(sel + "{" + (isEl ? css : importantify(css)) + "}");
      cache[k] = cls;
      return cls;
    };
  }

  /* ---------------- compile.ts ---------------- */
  function collectProps(node, kind, host) {
    var propGetters = [], pseudoClasses = [];
    var attrs = Array.prototype.slice.call(node.attributes);
    for (var a = 0; a < attrs.length; a++) {
      var name = attrs[a].name, value = attrs[a].value;
      if (name === "sc-name" || name === "data-dc-tpl") continue;
      var key = name;
      if (key.indexOf(CAMEL_ATTR) === 0) key = kebabToCamel(key.slice(CAMEL_ATTR.length));
      if (key === "hint-size") continue;
      if (key.indexOf("style-") === 0) { pseudoClasses.push(host.pseudoClass(key.slice(6), value)); continue; }
      if (kind !== "dom") {
        if (key.indexOf("-") !== -1) key = kebabToCamel(key);
      } else {
        if (key === "class") key = "className";
        else if (key === "for") key = "htmlFor";
        else if (key.indexOf("on") === 0) key = EVENT_MAP[key] || "on" + key[2].toUpperCase() + key.slice(3);
      }
      propGetters.push([key, compileAttr(value)]);
    }
    return { propGetters: propGetters, pseudoClasses: pseudoClasses };
  }
  function compileTemplate(html, host) {
    var tpl = document.createElement("template");
    tpl.innerHTML = encodeCase(html);
    var tplN = 0;
    (function stamp(node) {
      if (node.nodeType === 1) node.setAttribute("data-dc-tpl", String(tplN++));
      for (var i = 0; i < node.childNodes.length; i++) stamp(node.childNodes[i]);
    })(tpl.content);
    var builders = walkChildren(tpl.content, host);
    var render = function (vals, ctx) { return builders.map(function (b, i) { return b(vals || {}, ctx, i); }); };
    return render;
  }
  function walkChildren(node, host) {
    return Array.prototype.slice.call(node.childNodes).map(function (c) { return walk(c, host); }).filter(function (b) { return b != null; });
  }
  function walk(node, host) {
    if (node.nodeType === 3) return walkText(node);
    if (node.nodeType !== 1) return null;
    var tag = node.tagName.toLowerCase();
    if (tag === "sc-for") return walkFor(node, host);
    if (tag === "sc-if") return walkIf(node, host);
    if (tag === "sc-helmet") return function () { return null; };
    return walkElement(node, host);
  }
  function walkText(node) {
    var txt = node.nodeValue || "";
    if (txt.indexOf("{{") === -1) {
      if (!txt.trim() && txt.indexOf(" ") === -1) return null;
      return function () { return txt; };
    }
    var parts = txt.split(/\{\{([\s\S]+?)\}\}/g);
    return function (vals, ctx, key) {
      return h.apply(null, [getReact().Fragment, { key: key }].concat(parts.map(function (p, i) {
        if (!(i & 1)) return p;
        var v = resolve(vals, p);
        if (v === void 0) return null;
        if (getReact().isValidElement(v) || Array.isArray(v)) return h(getReact().Fragment, { key: i }, v);
        if (v === null || typeof v === "boolean") return null;
        return h("span", { key: i, className: "sc-interp" }, String(v));
      })));
    };
  }
  function walkFor(el, host) {
    var listGet = compileAttr(el.getAttribute("list") || "");
    var asName = el.getAttribute("as") || "item";
    var kids = walkChildren(el, host);
    return function (vals, ctx, key) {
      var list = listGet(vals);
      if (!Array.isArray(list)) list = [];
      return h(getReact().Fragment, { key: key }, list.map(function (item, i) {
        var sub = Object.assign({}, vals); sub[asName] = item; sub.$index = i;
        return h(getReact().Fragment, { key: i }, kids.map(function (b, j) { return b(sub, ctx, j); }));
      }));
    };
  }
  function walkIf(el, host) {
    var valGet = compileAttr(el.getAttribute("value") || "");
    var kids = walkChildren(el, host);
    return function (vals, ctx, key) {
      var v = valGet(vals);
      return v ? h(getReact().Fragment, { key: key }, kids.map(function (b, j) { return b(vals, ctx, j); })) : null;
    };
  }
  var NEVER_CONTENT_KEYED = new Set("script style textarea option title select canvas iframe video audio".split(" "));
  var NOT_INLINE_SELECTOR = ":not(" + Array.from(INLINE_TEXT_TAGS).join(",") + ")";
  function contentKey(el) {
    var clone = el.cloneNode(true);
    var all = clone.querySelectorAll("*");
    for (var d = 0; d < all.length; d++) { while (all[d].attributes.length) all[d].removeAttribute(all[d].attributes[0].name); }
    var s = clone.innerHTML, h2 = 5381;
    for (var i = 0; i < s.length; i++) h2 = (h2 << 5) + h2 + s.charCodeAt(i) | 0;
    return s.length + "." + (h2 >>> 0).toString(36);
  }
  function walkElement(el, host) {
    var realTag = RAW_UNWRAP[el.localName] || el.localName;
    var tplId = el.getAttribute("data-dc-tpl");
    var inlineOnly = el.childNodes.length > 0 && !NEVER_CONTENT_KEYED.has(realTag) && el.querySelector(NOT_INLINE_SELECTOR) === null;
    var keySuffix = inlineOnly ? "|" + contentKey(el) : "";
    var cp = collectProps(el, "dom", host);
    var propGetters = cp.propGetters, pseudoClasses = cp.pseudoClasses;
    var kids = walkChildren(el, host);
    return function (vals, ctx, key) {
      var props = { key: key + keySuffix, "data-dc-tpl": tplId };
      for (var i = 0; i < propGetters.length; i++) {
        var k = propGetters[i][0], v = propGetters[i][1](vals);
        if (k === "style" && typeof v === "string") v = cssToObj(v);
        if ((k === "value" || k === "checked") && v === void 0) v = k === "checked" ? false : "";
        props[k] = v;
      }
      if (pseudoClasses.length) props.className = [props.className].concat(pseudoClasses).filter(Boolean).join(" ");
      return h.apply(null, [realTag, props].concat(kids.map(function (b, j) { return b(vals, ctx, j); })));
    };
  }

  /* ---------------- logic.ts ---------------- */
  function StreamableLogic(props) { this.props = props || {}; this.state = {}; this.__host = null; }
  StreamableLogic.prototype.setState = function (u, cb) { this.__host && this.__host.__setLogicState(u, cb); };
  StreamableLogic.prototype.forceUpdate = function () { this.__host && this.__host.forceUpdate(); };
  StreamableLogic.prototype.componentDidMount = function () {};
  StreamableLogic.prototype.componentDidUpdate = function () {};
  StreamableLogic.prototype.componentWillUnmount = function () {};
  StreamableLogic.prototype.renderVals = function () { return {}; };
  function evalDcLogic(src) {
    var fn = new Function("DCLogic", "StreamableLogic", "React", src + '\n;return (typeof Component!=="undefined"&&Component)||undefined;');
    return fn(StreamableLogic, StreamableLogic, getReact());
  }

  /* ---------------- component wrapper ---------------- */
  function buildComponent(opts) {
    // opts: { template, logicSrc, defaultProps, pseudoSink }
    var React = getReact();
    var host = { pseudoClass: createPseudoSheet(opts.pseudoSink || function () {}) };
    var tpl = compileTemplate(opts.template, host);
    var LogicClass = evalDcLogic(opts.logicSrc) || StreamableLogic;
    var defaults = opts.defaultProps || {};

    function DCRoot(props) { React.Component.call(this, props); this.state = { __v: 0 }; this.__makeLogic(); }
    DCRoot.prototype = Object.create(React.Component.prototype);
    DCRoot.prototype.constructor = DCRoot;
    DCRoot.prototype.__userProps = function () { return this.props; };
    DCRoot.prototype.__makeLogic = function () {
      try { this.logic = new LogicClass(this.__userProps()); }
      catch (e) { console.error(e); this.logic = new StreamableLogic(this.__userProps()); }
      this.logic.__host = this;
    };
    DCRoot.prototype.__setLogicState = function (update, cb) {
      var prev = this.logic.state;
      var patch = typeof update === "function" ? update(prev) : update;
      this.logic.state = Object.assign({}, prev, patch);
      this.setState(function (s) { return { __v: s.__v + 1 }; }, cb);
    };
    DCRoot.prototype.componentDidMount = function () { try { this.logic.componentDidMount(); } catch (e) { console.error(e); } };
    DCRoot.prototype.componentDidUpdate = function (prevProps) { this.logic.props = this.__userProps(); try { this.logic.componentDidUpdate(prevProps); } catch (e) { console.error(e); } };
    DCRoot.prototype.componentWillUnmount = function () { try { this.logic.componentWillUnmount(); } catch (e) { console.error(e); } };
    DCRoot.prototype.render = function () {
      var userProps = this.__userProps();
      this.logic.props = userProps;
      var vals = userProps;
      try { vals = Object.assign({}, userProps, this.logic.renderVals() || {}); }
      catch (e) { console.error(e); }
      return h.apply(null, [ "div", { className: "sc-host" } ].concat(tpl(vals, this)));
    };

    function Wrapped() { return h(DCRoot, defaults); }
    return Wrapped;
  }

  window.DCCORE = { buildComponent: buildComponent, StreamableLogic: StreamableLogic };
})();
