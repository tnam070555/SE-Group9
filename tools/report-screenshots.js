/**
 * Captures UI screenshots for the project report.
 * Run while the server is running (npm start):
 *   npm i --no-save playwright-core@1.48.2
 *   node tools/report-screenshots.js
 * Uses the Microsoft Edge (or Chrome) already installed on the machine, nothing else is downloaded.
 * Output: report/screens/*.png  and report/screens/log.txt
 */
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'report', 'screens');
fs.mkdirSync(OUT, { recursive: true });
const logLines = [];
const log = (...a) => { const s = a.join(' '); console.log(s); logLines.push(s); };

function readEnv() {
    const env = {};
    try {
        for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
            const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
            if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
    } catch (e) { /* no .env */ }
    return env;
}
const ENV = readEnv();
const BASE = process.env.BASE || `http://localhost:${ENV.PORT || 5000}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tomorrow = () => { const d = new Date(Date.now() + 86400000 + 7 * 3600000); return d.toISOString().slice(0, 10); };

async function shot(page, name, opts = {}) {
    try {
        // the pages poll the server (heartbeat / ticket status), so the network is never fully idle: wait briefly only
        await page.waitForLoadState('networkidle', { timeout: 1500 }).catch(() => {});
        await sleep(opts.wait ?? 900);
        await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: !!opts.full });
        log('OK  ', name);
    } catch (e) { log('FAIL', name, e.message.split('\n')[0]); }
}
async function step(name, fn) {
    try { await fn(); } catch (e) { log('FAIL', name, e.message.split('\n')[0]); }
}

async function launch() {
    log('Launching browser...');
    for (const channel of ['msedge', 'chrome']) {
        try { return await chromium.launch({ channel, headless: true }); } catch (e) { log('no', channel); }
    }
    throw new Error('Neither Microsoft Edge nor Google Chrome was found.');
}

(async () => {
    const browser = await launch();
    const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: 'en-US' });
    const api = desk.request;

    // ---------- admin token (credentials are read from .env on this machine) ----------
    let token = '';
    await step('login api', async () => {
        const r = await api.post(BASE + '/api/admin/login', { data: { username: ENV.ADMIN_USERNAME, password: ENV.ADMIN_PASSWORD } });
        const j = await r.json(); token = (j.data && j.data.token) || j.token || '';
        log(token ? 'OK   admin token' : 'FAIL admin token');
    });
    const auth = { Authorization: 'Bearer ' + token };

    // ---------- some traffic so the dashboard is not empty ----------
    await step('traffic', async () => {
        const langs = ['en', 'en', 'en', 'ja', 'ko', 'zh', 'vi', 'vi'];
        for (let i = 0; i < 120; i++) {
            const code = 'DDL-' + String(1 + (i * 7) % 16).padStart(2, '0');
            await api.post(BASE + '/api/track/event', { data: { code, language: langs[i % langs.length], type: i % 3 === 0 ? 'play' : 'view' } });
        }
    });

    log('Taking screenshots, this takes about 2-4 minutes. Progress is printed below.');
    // ================= VISITOR (English) =================
    const p = await desk.newPage();
    await step('index', async () => {
        await p.goto(BASE + '/index.html?lang=en');
        await shot(p, 'v01_home_hero');
        await shot(p, 'v02_home_full', { full: true });
        await p.locator('#explore').scrollIntoViewIfNeeded();
        await shot(p, 'v03_home_explore');
        const chips = p.locator('#areaChips button');
        if (await chips.count() > 2) { await chips.nth(2).click(); await shot(p, 'v04_home_filter_area'); await chips.nth(0).click(); }
        await p.fill('#search', 'tank'); await shot(p, 'v05_home_search');
        await p.fill('#search', 'xyz123'); await shot(p, 'v06_home_search_empty');
        await p.fill('#search', '');
        await p.locator('#grid button').first().click();
        await shot(p, 'v07_home_modal_audio');
        await p.click('#tabQr'); await shot(p, 'v08_home_modal_qr');
        await p.click('#modalClose');
        await p.locator('#siteQrImg').scrollIntoViewIfNeeded(); await shot(p, 'v09_home_site_qr');
    });
    await step('detail', async () => {
        await p.goto(BASE + '/detail.html?code=DDL-01&lang=en'); await shot(p, 'v10_detail_en', { full: true });
        await p.goto(BASE + '/detail.html?code=DDL-07&lang=ja'); await shot(p, 'v11_detail_ja', { full: true });
        await p.goto(BASE + '/detail.html?code=NOTFOUND&lang=en'); await shot(p, 'v12_detail_not_found');
    });

    // Map / GPS / geofence. ?sim= simulates the visitor position (no real GPS needed, works over plain http).
    // Position 9 m north of the Tank 390 point (inside its 20 m geofence).
    const SIM_NEAR = '10.77798,106.69615';
    await step('map', async () => {
        await p.goto(BASE + '/map.html?lang=en'); await shot(p, 'v19_map', { wait: 3500 });
        await p.locator('#list button[data-code="DDL-05"]').click(); await shot(p, 'v20_map_popup', { wait: 2500 });
        await p.goto(BASE + '/map.html?lang=en&sim=' + SIM_NEAR); await shot(p, 'v21_map_geofence', { wait: 3500 });
        await p.click('#gfDismiss'); await p.click('#gfToggle'); await shot(p, 'v22_map_geofence_off', { wait: 800 });
        await p.goto(BASE + '/index.html?lang=en');
        await p.locator('#campus-map').scrollIntoViewIfNeeded(); await shot(p, 'v23_home_map', { wait: 3500 });
    });

    let order = null;
    await step('tickets form', async () => {
        await p.goto(BASE + '/tickets.html?lang=en'); await shot(p, 'v13_tickets_start', { full: true });
        await p.fill('#date', tomorrow());
        await p.dispatchEvent('#date', 'change');
        await p.waitForSelector('#slots button:not([disabled])', { timeout: 8000 });
        await shot(p, 'v14_tickets_slots', { full: true });
        await p.locator('#slots button:not([disabled])').nth(1).click();
        const plus = p.locator('#types button[aria-label^="+"]');
        await plus.nth(0).click(); await plus.nth(0).click(); await plus.nth(1).click();
        await p.fill('#contactName', 'John Smith'); await p.fill('#contactPhone', '0901234567');
        await shot(p, 'v15_tickets_filled', { full: true });
    });
    await step('order api', async () => {
        const slots = (await (await api.get(BASE + '/api/tickets/slots?date=' + tomorrow())).json()).data;
        const s = (slots.slots || slots).find((x) => !x.passed && x.available > 5);
        const r = await api.post(BASE + '/api/tickets/orders', { data: {
            date: tomorrow(), slot: { from: s.from, to: s.to },
            items: [{ type: 'ADULT', quantity: 2 }, { type: 'CHILD', quantity: 1 }],
            contact: { name: 'John Smith', email: 'john.smith@example.com', phone: '0901234567' } } });
        order = (await r.json()).data;
        log('order', order && order.orderCode);
        await p.goto(BASE + '/tickets.html?lang=en&order=' + order.orderId);
        await shot(p, 'v16_tickets_payment', { full: true });
    });

    // ================= ADMIN (UI is Vietnamese only) =================
    const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: 'en-US' });
    const lp = await adminCtx.newPage();
    await step('login page', async () => { await lp.goto(BASE + '/login.html'); await shot(lp, 'a01_login'); });
    await adminCtx.addInitScript((t) => { try { localStorage.setItem('ddl_admin_token', t); } catch (e) {} }, token);
    const a = await adminCtx.newPage();
    const view = async (v) => { await a.evaluate((x) => app.switchView(x), v); await sleep(1200); };
    await step('admin', async () => {
        await a.goto(BASE + '/admin'); await sleep(2500);
        await shot(a, 'a02_dashboard'); await shot(a, 'a03_dashboard_full', { full: true });
        await view('categories'); await shot(a, 'a04_categories', { full: true });
        await a.evaluate(() => categoryManager.openForm()); await shot(a, 'a05_category_form');
        await a.evaluate(() => categoryManager.closeForm());
        await view('artifacts'); await shot(a, 'a06_artifacts', { full: true });
        await a.evaluate(() => artifactManager.openForm()); await shot(a, 'a07_artifact_form_new');
        await a.evaluate(() => artifactManager.closeForm());
        await a.locator('#view-artifacts button[title="Sửa"]').first().click(); await shot(a, 'a08_artifact_form_edit');
        await a.locator('#art-map').scrollIntoViewIfNeeded(); await shot(a, 'a15_artifact_poi_map', { wait: 3000 });
        await a.evaluate(() => artifactManager.closeForm());
        await a.locator('#view-artifacts button[title="Mã QR"]').first().click(); await shot(a, 'a09_artifact_qr');
        await a.evaluate(() => artifactManager.closeQr());
        await view('languages'); await shot(a, 'a10_languages', { full: true });
        await a.evaluate(() => languageManager.openForm()); await shot(a, 'a11_language_form');
        await a.evaluate(() => languageManager.closeForm());
        await view('tickets'); await shot(a, 'a12_orders_pending', { full: true });
    });
    await step('confirm order', async () => {
        const r = await api.post(BASE + `/api/admin/tickets/orders/${order.orderId}/confirm`, { headers: auth });
        log('confirm', r.status());
        await view('tickets'); await a.evaluate(() => ticketManager.load()).catch(() => {}); await shot(a, 'a13_orders_paid', { full: true });
        await view('dashboard'); await shot(a, 'a14_dashboard_after', { full: true });
    });
    await step('tickets issued', async () => {
        await p.goto(BASE + '/tickets.html?lang=en&order=' + order.orderId);
        await shot(p, 'v17_tickets_issued', { full: true });
        const o = (await (await api.get(BASE + '/api/tickets/orders/' + order.orderId)).json()).data;
        const code = o.tickets[0].code;
        await p.goto(BASE + '/tickets.html?lang=en&code=' + encodeURIComponent(code.toLowerCase()));
        await p.locator('#lookup').scrollIntoViewIfNeeded(); await shot(p, 'v18_tickets_lookup');
    });

    // ================= MOBILE =================
    const mob = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' });
    const m = await mob.newPage();
    await step('mobile', async () => {
        await m.goto(BASE + '/index.html?lang=en'); await shot(m, 'm01_home');
        await m.locator('#explore').scrollIntoViewIfNeeded(); await shot(m, 'm02_home_list');
        await m.goto(BASE + '/detail.html?code=DDL-04&lang=en'); await shot(m, 'm03_detail');
        await m.goto(BASE + '/detail.html?code=DDL-04&lang=ko'); await shot(m, 'm04_detail_ko');
        await m.goto(BASE + '/tickets.html?lang=en&order=' + order.orderId); await shot(m, 'm05_ticket');
        await m.goto(BASE + '/tickets.html?lang=en'); await shot(m, 'm06_tickets_start');
        await m.goto(BASE + '/map.html?lang=en&sim=' + SIM_NEAR); await shot(m, 'm07_map_geofence', { wait: 3500 });
    });

    await browser.close();
    fs.writeFileSync(path.join(OUT, 'log.txt'), logLines.join('\n'));
    log('Done. Files in', OUT);
})().catch((e) => { console.error(e); fs.writeFileSync(path.join(OUT, 'log.txt'), logLines.join('\n') + '\n' + e.stack); process.exit(1); });
