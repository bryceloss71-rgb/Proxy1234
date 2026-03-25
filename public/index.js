"use strict";

document.addEventListener("DOMContentLoaded", () => {

/* ─── Taglines ─── */
const taglines = [
	"Evading internet censorship, one request at a time.",
	"Your gateway to the open web.",
	"Bypass filters. Browse freely.",
	"Privacy-first browsing, powered by service workers.",
	"The web without walls.",
	"Unlocking the internet for everyone.",
	"Fast. Private. Unrestricted.",
];
let taglineIndex = 0;
const taglineEl = document.getElementById("tagline");
if (taglineEl) {
	taglineEl.textContent = taglines[0];
	taglineEl.style.transition = "opacity 0.4s";
	setInterval(() => {
		taglineEl.style.opacity = "0";
		setTimeout(() => {
			taglineIndex = (taglineIndex + 1) % taglines.length;
			taglineEl.textContent = taglines[taglineIndex];
			taglineEl.style.opacity = "1";
		}, 400);
	}, 4000);
}

/* ─── Snow ─── */
const snowCanvas = document.getElementById("snow-canvas");
if (snowCanvas) {
	const ctx = snowCanvas.getContext("2d");
	const flakes = [];
	function resize() {
		snowCanvas.width = window.innerWidth;
		snowCanvas.height = window.innerHeight;
	}
	resize();
	window.addEventListener("resize", resize);
	function mkFlake() {
		return {
			x: Math.random() * snowCanvas.width,
			y: -8,
			r: Math.random() * 2.2 + 0.8,
			speed: Math.random() * 0.7 + 0.25,
			drift: (Math.random() - 0.5) * 0.35,
			opacity: Math.random() * 0.45 + 0.15,
		};
	}
	for (let i = 0; i < 130; i++) {
		const f = mkFlake(); f.y = Math.random() * snowCanvas.height; flakes.push(f);
	}
	(function animate() {
		ctx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
		for (const f of flakes) {
			ctx.beginPath();
			ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(200,210,255,${f.opacity})`;
			ctx.fill();
			f.y += f.speed; f.x += f.drift;
			if (f.y > snowCanvas.height + 10) Object.assign(f, mkFlake());
		}
		requestAnimationFrame(animate);
	})();
}

/* ─── Core elements ─── */
const form           = document.getElementById("uv-form");
const address        = document.getElementById("uv-address");
const searchEngine   = document.getElementById("uv-search-engine");
const errorEl        = document.getElementById("uv-error");
const errorCode      = document.getElementById("uv-error-code");
const uvFrame        = document.getElementById("uv-frame");
const homePage       = document.getElementById("home-page");
const navSearchInput = document.querySelector(".nav-search-input");
const navSearchBtn   = document.querySelector(".nav-search-button");

let connection;
try { connection = new BareMux.BareMuxConnection("/baremux/worker.js"); } catch {}

async function regSW() {
	try { if (typeof registerSW === "function") await registerSW(); }
	catch (err) {
		if (errorEl) errorEl.textContent = "Failed to register service worker.";
		if (errorCode) errorCode.textContent = String(err);
		throw err;
	}
}

async function loadUrl(url) {
	try { await regSW(); } catch { return; }
	try {
		const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
		if (connection && (await connection.getTransport()) !== "/epoxy/index.mjs") {
			await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
		}
		uvFrame.src = __uv$config.prefix + __uv$config.encodeUrl(url);
	} catch (e) {
		if (errorEl) errorEl.textContent = "Failed to load URL: " + e;
		return;
	}
	uvFrame.style.display = "block";
	homePage.style.display = "none";
}

/* ─── Tabs ─── */
let tabs = [];
let activeTabId = null;
let nextTabId = 1;

const tabList   = document.getElementById("tab-list");
const newTabBtn = document.getElementById("new-tab-btn");

function esc(s) {
	return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function renderTabs() {
	tabList.innerHTML = "";
	for (const tab of tabs) {
		const el = document.createElement("div");
		el.className = "tab-item" + (tab.id === activeTabId ? " active" : "");
		el.innerHTML =
			`<span class="tab-title">${esc(tab.title)}</span>` +
			`<button class="tab-close" title="Close tab"><i class="fas fa-xmark"></i></button>`;
		el.addEventListener("click", e => {
			if (!e.target.closest(".tab-close")) switchTab(tab.id);
		});
		el.querySelector(".tab-close").addEventListener("click", e => {
			e.stopPropagation();
			closeTab(tab.id);
		});
		tabList.appendChild(el);
	}
}

function switchTab(id) {
	activeTabId = id;
	renderTabs();
	const tab = tabs.find(t => t.id === id);
	if (!tab) return;
	if (tab.url) {
		try {
			uvFrame.src = __uv$config.prefix + __uv$config.encodeUrl(tab.url);
		} catch {}
		uvFrame.style.display = "block";
		homePage.style.display = "none";
		navSearchInput.value = tab.url;
	} else {
		showHome();
	}
}

function createTab(title, url) {
	const id = nextTabId++;
	const tab = { id, title: title || "New Tab", url: url || null };
	tabs.push(tab);
	activeTabId = id;
	renderTabs();
	if (url) {
		loadUrl(url);
	} else {
		showHome();
	}
	return id;
}

function closeTab(id) {
	const idx = tabs.findIndex(t => t.id === id);
	if (idx === -1) return;
	tabs.splice(idx, 1);
	if (tabs.length === 0) {
		createTab();
		return;
	}
	const next = tabs[Math.min(idx, tabs.length - 1)];
	switchTab(next.id);
}

function updateActiveTab(title, url) {
	const tab = tabs.find(t => t.id === activeTabId);
	if (!tab) return;
	tab.title = title || url || "Tab";
	tab.url = url;
	renderTabs();
}

function showHome() {
	uvFrame.style.display = "none";
	uvFrame.src = "about:blank";
	navSearchInput.value = "";
	if (address) address.value = "";
	homePage.style.display = "";
	const tab = tabs.find(t => t.id === activeTabId);
	if (tab) { tab.url = null; tab.title = "New Tab"; renderTabs(); }
}

newTabBtn.addEventListener("click", () => createTab());

// Spawn first tab immediately
createTab("New Tab", null);

/* ─── Nav buttons ─── */
document.getElementById("back-button").addEventListener("click", () => {
	try { uvFrame.contentWindow.history.back(); } catch { showHome(); }
});
document.getElementById("refresh-button").addEventListener("click", () => {
	try { uvFrame.contentWindow.location.reload(true); } catch {}
});
document.getElementById("home-button").addEventListener("click", showHome);

navSearchBtn.addEventListener("click", async () => {
	const v = navSearchInput.value.trim();
	if (!v) return;
	await loadUrl(search(v, searchEngine.value));
});
navSearchInput.addEventListener("keydown", async e => {
	if (e.key === "Enter") {
		e.preventDefault();
		const v = navSearchInput.value.trim();
		if (v) await loadUrl(search(v, searchEngine.value));
	}
});

form.addEventListener("submit", async e => {
	e.preventDefault();
	const v = address.value.trim();
	if (!v) return;
	await loadUrl(search(v, searchEngine.value));
});

uvFrame.addEventListener("load", () => {
	try {
		const href = uvFrame.contentWindow.location.href;
		if (!href || href === "about:blank") { navSearchInput.value = ""; return; }
		if (typeof __uv$config !== "undefined" && href.startsWith(__uv$config.prefix)) {
			const decoded = __uv$config.decodeUrl(href.slice(__uv$config.prefix.length));
			navSearchInput.value = decoded;
			let title = decoded;
			try { title = new URL(decoded).hostname; } catch {}
			updateActiveTab(title, decoded);
		} else {
			navSearchInput.value = href;
		}
	} catch {}
});

/* ─── Bookmarks ─── */
let bookmarks = [];
try { bookmarks = JSON.parse(localStorage.getItem("cr_bookmarks") || "[]"); } catch {}

const bookmarkPanel  = document.getElementById("bookmark-panel");
const bookmarkList   = document.getElementById("bookmark-list");
const bmToggleBtn    = document.getElementById("bookmark-toggle-btn");
const closeBookmark  = document.getElementById("close-bookmark-btn");
const addBookmarkBtn = document.getElementById("add-bookmark-btn");

function saveBookmarks() {
	try { localStorage.setItem("cr_bookmarks", JSON.stringify(bookmarks)); } catch {}
}

function renderBookmarks() {
	bookmarkList.innerHTML = "";
	if (!bookmarks.length) {
		bookmarkList.innerHTML = '<p class="bookmark-empty">No bookmarks yet.</p>';
		return;
	}
	bookmarks.forEach((bm, i) => {
		const el = document.createElement("div");
		el.className = "bookmark-item";
		el.innerHTML =
			`<div class="bookmark-info">` +
				`<div class="bm-title">${esc(bm.title)}</div>` +
				`<div class="bm-url">${esc(bm.url)}</div>` +
			`</div>` +
			`<button class="bm-del" title="Remove"><i class="fas fa-trash-can"></i></button>`;
		el.querySelector(".bookmark-info").addEventListener("click", () => {
			loadUrl(bm.url);
			bookmarkPanel.classList.remove("open");
		});
		el.querySelector(".bm-del").addEventListener("click", e => {
			e.stopPropagation();
			bookmarks.splice(i, 1);
			saveBookmarks();
			renderBookmarks();
		});
		bookmarkList.appendChild(el);
	});
}

bmToggleBtn.addEventListener("click", () => {
	bookmarkPanel.classList.toggle("open");
	renderBookmarks();
});
closeBookmark.addEventListener("click", () => bookmarkPanel.classList.remove("open"));

addBookmarkBtn.addEventListener("click", () => {
	const tab = tabs.find(t => t.id === activeTabId);
	if (!tab || !tab.url) { alert("No page loaded to bookmark."); return; }
	if (bookmarks.find(b => b.url === tab.url)) { alert("Already bookmarked!"); return; }
	bookmarks.push({ title: tab.title, url: tab.url });
	saveBookmarks();
	const icon = addBookmarkBtn.querySelector("i");
	icon.className = "fas fa-bookmark";
	setTimeout(() => { icon.className = "far fa-bookmark"; }, 1500);
});

renderBookmarks();

/* ─── Quick Launch ─── */
document.querySelectorAll(".quick-btn[data-url]").forEach(btn => {
	btn.addEventListener("click", () => loadUrl(btn.dataset.url));
});

/* ─── Add Link Modal ─── */
let customLinks = [];
try { customLinks = JSON.parse(localStorage.getItem("cr_custom_links") || "[]"); } catch {}

const customLinksContainer = document.getElementById("custom-links-container");
const addLinkModal  = document.getElementById("add-link-modal");
const linkNameInput = document.getElementById("link-name-input");
const linkUrlInput  = document.getElementById("link-url-input");
const addLinkBtn    = document.getElementById("add-link-btn");
const modalCancel   = document.getElementById("modal-cancel");
const modalSave     = document.getElementById("modal-save");

function saveCustomLinks() {
	try { localStorage.setItem("cr_custom_links", JSON.stringify(customLinks)); } catch {}
}

function renderCustomLinks() {
	customLinksContainer.innerHTML = "";
	customLinks.forEach((cl, i) => {
		const btn = document.createElement("button");
		btn.className = "custom-quick-btn";
		let iconHtml;
		try {
			const host = new URL(/^https?:\/\//i.test(cl.url) ? cl.url : "https://" + cl.url).hostname;
			iconHtml = `<img src="https://www.google.com/s2/favicons?sz=32&domain=${host}" width="24" height="24" style="border-radius:5px;display:block" onerror="this.style.display='none'" />`;
		} catch {
			iconHtml = `<i class="fas fa-globe"></i>`;
		}
		btn.innerHTML =
			`<div class="qb-icon">${iconHtml}</div>` +
			`<span>${esc(cl.name)}</span>` +
			`<button class="rm-link" title="Remove"><i class="fas fa-xmark"></i></button>`;
		btn.addEventListener("click", e => {
			if (e.target.closest(".rm-link")) return;
			const url = /^https?:\/\//i.test(cl.url) ? cl.url : "https://" + cl.url;
			loadUrl(url);
		});
		btn.querySelector(".rm-link").addEventListener("click", e => {
			e.stopPropagation();
			customLinks.splice(i, 1);
			saveCustomLinks();
			renderCustomLinks();
		});
		customLinksContainer.appendChild(btn);
	});
}

function openModal() {
	linkNameInput.value = "";
	linkUrlInput.value = "";
	addLinkModal.classList.add("open");
	setTimeout(() => linkNameInput.focus(), 50);
}
function closeModal() {
	addLinkModal.classList.remove("open");
}

addLinkBtn.addEventListener("click", openModal);
modalCancel.addEventListener("click", closeModal);
addLinkModal.addEventListener("click", e => { if (e.target === addLinkModal) closeModal(); });
modalSave.addEventListener("click", () => {
	const name = linkNameInput.value.trim();
	let url = linkUrlInput.value.trim();
	if (!name || !url) {
		linkNameInput.style.borderColor = name ? "" : "var(--danger)";
		linkUrlInput.style.borderColor = url ? "" : "var(--danger)";
		return;
	}
	if (!/^https?:\/\//i.test(url)) url = "https://" + url;
	customLinks.push({ name, url });
	saveCustomLinks();
	renderCustomLinks();
	closeModal();
});
// Also allow Enter key in modal inputs
[linkNameInput, linkUrlInput].forEach(inp => {
	inp.addEventListener("keydown", e => { if (e.key === "Enter") modalSave.click(); });
});

renderCustomLinks();

/* ─── Settings ─── */
const settingsOverlay = document.getElementById("settings-overlay");
const settingsBtn = document.getElementById("settings-fab");
const settingsBackBtn = document.getElementById("settings-back-btn");
const settingsNavItems = document.querySelectorAll(".settings-nav-item");
const settingsSections = document.querySelectorAll(".settings-section");

// Load saved settings
let appSettings = {};
try { appSettings = JSON.parse(localStorage.getItem("cr_settings") || "{}"); } catch {}

function saveAppSettings() {
	try { localStorage.setItem("cr_settings", JSON.stringify(appSettings)); } catch {}
}

function applyTheme(theme) {
	document.body.setAttribute("data-theme", theme);
	document.querySelectorAll(".theme-btn").forEach(b => {
		const active = b.dataset.theme === theme;
		b.classList.toggle("active", active);
		let check = b.querySelector(".theme-check");
		if (active && !check) {
			check = document.createElement("i");
			check.className = "fas fa-check theme-check";
			b.appendChild(check);
		} else if (!active && check) {
			check.remove();
		}
	});
}

function applyMode(mode) {
	document.body.setAttribute("data-mode", mode);
	document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
}

// Apply on load
applyTheme(appSettings.theme || "violet");
applyMode(appSettings.mode || "dark");

// Snow toggle
const snowCheckbox = document.getElementById("snow-checkbox");
if (snowCheckbox) {
	const snowEnabled = appSettings.snow !== false;
	snowCheckbox.checked = snowEnabled;
	if (snowCanvas) snowCanvas.style.display = snowEnabled ? "" : "none";
	snowCheckbox.addEventListener("change", () => {
		appSettings.snow = snowCheckbox.checked;
		saveAppSettings();
		if (snowCanvas) snowCanvas.style.display = snowCheckbox.checked ? "" : "none";
	});
}

// Open / close settings
settingsBtn.addEventListener("click", () => {
	settingsOverlay.classList.add("open");
	settingsBtn.classList.add("open");
	homePage.style.display = "none";
	uvFrame.style.display = "none";
});
settingsBackBtn.addEventListener("click", () => {
	settingsOverlay.classList.remove("open");
	settingsBtn.classList.remove("open");
	showHome();
});

// Section nav
settingsNavItems.forEach(item => {
	item.addEventListener("click", () => {
		settingsNavItems.forEach(i => i.classList.remove("active"));
		settingsSections.forEach(s => s.classList.remove("active"));
		item.classList.add("active");
		document.getElementById("section-" + item.dataset.section)?.classList.add("active");
	});
});

// Theme picker
document.querySelectorAll(".theme-btn").forEach(btn => {
	btn.addEventListener("click", () => {
		appSettings.theme = btn.dataset.theme;
		saveAppSettings();
		applyTheme(btn.dataset.theme);
	});
});

// Mode picker
document.querySelectorAll(".mode-btn").forEach(btn => {
	btn.addEventListener("click", () => {
		appSettings.mode = btn.dataset.mode;
		saveAppSettings();
		applyMode(btn.dataset.mode);
	});
});

// Search engine radios
const seRadios = document.querySelectorAll("input[name='searchengine']");
const savedSE = appSettings.searchEngine || "https://duckduckgo.com/?q=%s";
seRadios.forEach(r => {
	if (r.value === savedSE) r.checked = true;
	r.addEventListener("change", () => {
		appSettings.searchEngine = r.value;
		saveAppSettings();
		if (searchEngine) searchEngine.value = r.value;
	});
});
if (searchEngine) searchEngine.value = savedSE;

// Tab cloaking
const cloakCheckbox = document.getElementById("cloak-checkbox");
const cloakInputs = document.getElementById("cloak-inputs");
const cloakTitleInput = document.getElementById("cloak-title");
const cloakIconInput = document.getElementById("cloak-icon");
const applyCloakBtn = document.getElementById("apply-cloak");

function applyCloak(title, icon) {
	if (title) { document.title = title; appSettings.cloakTitle = title; }
	if (icon) {
		let link = document.querySelector("link[rel='shortcut icon']") || document.createElement("link");
		link.rel = "shortcut icon"; link.href = icon;
		document.head.appendChild(link);
		appSettings.cloakIcon = icon;
	}
	appSettings.cloak = true;
	saveAppSettings();
}

if (appSettings.cloak) {
	cloakCheckbox.checked = true;
	cloakInputs.style.display = "flex";
	if (appSettings.cloakTitle) { document.title = appSettings.cloakTitle; cloakTitleInput.value = appSettings.cloakTitle; }
	if (appSettings.cloakIcon) {
		let link = document.querySelector("link[rel='shortcut icon']") || document.createElement("link");
		link.rel = "shortcut icon"; link.href = appSettings.cloakIcon;
		document.head.appendChild(link);
		cloakIconInput.value = appSettings.cloakIcon;
	}
	// Mark active preset
	document.querySelectorAll(".cloak-preset-btn").forEach(b => {
		if (b.dataset.title === appSettings.cloakTitle) b.classList.add("active");
	});
}

cloakCheckbox?.addEventListener("change", () => {
	cloakInputs.style.display = cloakCheckbox.checked ? "flex" : "none";
	if (!cloakCheckbox.checked) {
		appSettings.cloak = false;
		saveAppSettings();
		location.reload();
	}
});

// Preset buttons
document.querySelectorAll(".cloak-preset-btn").forEach(btn => {
	btn.addEventListener("click", () => {
		const title = btn.dataset.title;
		const icon = btn.dataset.icon;
		cloakTitleInput.value = title;
		cloakIconInput.value = icon;
		document.querySelectorAll(".cloak-preset-btn").forEach(b => b.classList.remove("active"));
		btn.classList.add("active");
		applyCloak(title, icon);
	});
});

applyCloakBtn?.addEventListener("click", () => {
	const t = cloakTitleInput.value.trim();
	const ic = cloakIconInput.value.trim();
	// Clear active presets since it's now custom
	document.querySelectorAll(".cloak-preset-btn").forEach(b => b.classList.remove("active"));
	applyCloak(t, ic);
});

// Data actions
document.getElementById("export-bookmarks-btn")?.addEventListener("click", () => {
	const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: "application/json" });
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = "clearroute-bookmarks.json";
	a.click();
});
document.getElementById("clear-bookmarks-btn")?.addEventListener("click", () => {
	if (confirm("Clear all bookmarks?")) {
		bookmarks.length = 0;
		saveBookmarks();
		renderBookmarks();
	}
});
document.getElementById("clear-links-btn")?.addEventListener("click", () => {
	if (confirm("Clear all custom links?")) {
		customLinks.length = 0;
		saveCustomLinks();
		renderCustomLinks();
	}
});
document.getElementById("clear-all-btn")?.addEventListener("click", () => {
	if (confirm("Delete ALL ClearRoute data? This cannot be undone.")) {
		localStorage.removeItem("cr_bookmarks");
		localStorage.removeItem("cr_custom_links");
		localStorage.removeItem("cr_settings");
		location.reload();
	}
});

// Alt keyboard shortcuts
document.addEventListener("keydown", e => {
	if (!e.altKey) return;
	const key = e.key.toLowerCase();
	if (key === "h") { e.preventDefault(); showHome(); }
	else if (key === "t") { e.preventDefault(); createTab(); }
	else if (key === "w") { e.preventDefault(); if (activeTabId) closeTab(activeTabId); }
	else if (key === "b") { e.preventDefault(); bookmarkPanel.classList.toggle("open"); renderBookmarks(); }
	else if (key === "d") { e.preventDefault(); navSearchInput.focus(); navSearchInput.select(); }
	else if (key === "r") { e.preventDefault(); try { uvFrame.contentWindow.location.reload(true); } catch {} }
	else if (key === "arrowleft") { e.preventDefault(); try { uvFrame.contentWindow.history.back(); } catch { showHome(); } }
	else if (key === "s") { e.preventDefault(); settingsBtn.click(); }
});

// Panic key
const panicCheckbox = document.getElementById("panic-checkbox");
const panicConfig = document.getElementById("panic-config");
const panicKeyInput = document.getElementById("panic-key-input");
const panicUrlInput = document.getElementById("panic-url-input");
const applyPanicBtn = document.getElementById("apply-panic-btn");

if (appSettings.panic) {
	panicCheckbox.checked = true;
	panicConfig.style.display = "flex";
	panicKeyInput.value = appSettings.panicKey || "";
	panicUrlInput.value = appSettings.panicUrl || "";
}
panicCheckbox?.addEventListener("change", () => {
	panicConfig.style.display = panicCheckbox.checked ? "flex" : "none";
	if (!panicCheckbox.checked) { appSettings.panic = false; saveAppSettings(); }
});
applyPanicBtn?.addEventListener("click", () => {
	const k = panicKeyInput.value.trim();
	const u = panicUrlInput.value.trim();
	if (!k || !u) return;
	appSettings.panic = true;
	appSettings.panicKey = k;
	appSettings.panicUrl = u;
	saveAppSettings();
});
document.addEventListener("keydown", e => {
	if (!appSettings.panic || !appSettings.panicKey) return;
	const pk = appSettings.panicKey.toLowerCase();
	if (e.key.toLowerCase() === pk || e.code.toLowerCase() === pk) {
		const url = /^https?:\/\//i.test(appSettings.panicUrl) ? appSettings.panicUrl : "https://" + appSettings.panicUrl;
		window.location.replace(url);
	}
});

// Custom tagline
const customTaglineCheckbox = document.getElementById("custom-tagline-checkbox");
const customTaglineWrap = document.getElementById("custom-tagline-input-wrap");
const customTaglineInput = document.getElementById("custom-tagline-input");
const applyTaglineBtn = document.getElementById("apply-tagline-btn");

if (appSettings.customTagline && taglineEl) {
	customTaglineCheckbox.checked = true;
	customTaglineWrap.style.display = "flex";
	customTaglineInput.value = appSettings.customTagline;
	taglineEl.textContent = appSettings.customTagline;
}
customTaglineCheckbox?.addEventListener("change", () => {
	customTaglineWrap.style.display = customTaglineCheckbox.checked ? "flex" : "none";
	if (!customTaglineCheckbox.checked) { appSettings.customTagline = ""; saveAppSettings(); }
});
applyTaglineBtn?.addEventListener("click", () => {
	const t = customTaglineInput.value.trim();
	if (!t) return;
	appSettings.customTagline = t;
	saveAppSettings();
	if (taglineEl) taglineEl.textContent = t;
});

// About — SW check and transport value
const aboutSwVal = document.getElementById("about-sw-val");
const aboutTransportVal = document.getElementById("about-transport-val");
if (aboutSwVal) {
	navigator.serviceWorker?.getRegistrations().then(regs => {
		aboutSwVal.textContent = regs.length > 0 ? "✓ Active" : "✗ Not registered";
		aboutSwVal.style.color = regs.length > 0 ? "#10b981" : "#ef4444";
	}).catch(() => { aboutSwVal.textContent = "Unknown"; });
}
if (aboutTransportVal) {
	const t = appSettings.transport || "epoxy";
	aboutTransportVal.textContent = t.charAt(0).toUpperCase() + t.slice(1);
}

// Diagnostics
document.getElementById("run-diag-btn")?.addEventListener("click", async () => {
	const out = document.getElementById("diag-output");
	out.style.display = "block";
	out.textContent = "";
	const log = (msg, ok) => {
		const line = document.createElement("div");
		line.textContent = (ok === true ? "✓ " : ok === false ? "✗ " : "· ") + msg;
		line.style.color = ok === true ? "#10b981" : ok === false ? "#ef4444" : "var(--text-muted)";
		out.appendChild(line);
	};
	log("Checking service worker…", null);
	try {
		const regs = await navigator.serviceWorker.getRegistrations();
		log("Service worker: " + (regs.length > 0 ? "registered" : "not found"), regs.length > 0);
	} catch { log("Service worker: error checking", false); }
	log("Checking UV config…", null);
	try {
		if (typeof __uv$config !== "undefined") log("UV config loaded (__uv$config found)", true);
		else log("UV config missing", false);
	} catch { log("UV config: error", false); }
	log("Checking BareMux…", null);
	try {
		if (typeof BareMux !== "undefined") log("BareMux available", true);
		else log("BareMux not found", false);
	} catch { log("BareMux: error", false); }
	log("Done.", null);
});

}); // end DOMContentLoaded
