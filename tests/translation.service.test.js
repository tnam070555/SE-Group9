const test = require('node:test');
const assert = require('node:assert');
const translationService = require('../services/translation.service');

const { translateText, splitIntoChunks, providers } = translationService;

test.afterEach(() => {
    test.mock.restoreAll();
    delete process.env.TRANSLATE_PROVIDER;
    delete process.env.MYMEMORY_EMAIL;
    delete process.env.GOOGLE_TRANSLATE_API_KEY;
});

// ---------- Cắt đoạn ----------
test('văn bản ngắn giữ nguyên một đoạn', () => {
    assert.deepStrictEqual(splitIntoChunks('Xin chào. Đây là thử nghiệm.'), ['Xin chào. Đây là thử nghiệm.']);
});

test('văn bản dài được cắt, mỗi đoạn không quá giới hạn byte và không mất chữ', () => {
    const sentence = 'Phòng Khánh Tiết là không gian lớn nhất tại Dinh Độc Lập với sức chứa lên đến 500 người.';
    const text = Array(8).fill(sentence).join(' ');
    const chunks = splitIntoChunks(text, 400);
    assert.ok(chunks.length > 1);
    for (const c of chunks) assert.ok(Buffer.byteLength(c, 'utf8') <= 400, 'đoạn quá dài');
    assert.strictEqual(chunks.join(' '), text);
});

test('một câu quá dài vẫn được cắt theo từ', () => {
    const text = Array(200).fill('từ').join(' ');
    const chunks = splitIntoChunks(text, 100);
    for (const c of chunks) assert.ok(Buffer.byteLength(c, 'utf8') <= 100);
    assert.strictEqual(chunks.join(' '), text);
});

// ---------- translateText ----------
test('dịch bằng nhà cung cấp mặc định (mymemory) và ghép các đoạn', async () => {
    const calls = [];
    test.mock.method(providers, 'mymemory', async (text, target) => { calls.push([text, target]); return `[${target}] ${text}`; });
    const out = await translateText('Câu một. Câu hai.', 'en');
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(out, '[en] Câu một. Câu hai.');
});

test('tiếng Nhật/Trung ghép các đoạn không có khoảng trắng', async () => {
    test.mock.method(providers, 'mymemory', async (text) => `X${text.length}`);
    const long = Array(10).fill('Phòng Khánh Tiết là không gian lớn nhất tại Dinh Độc Lập với sức chứa lớn.').join(' ');
    const ja = await translateText(long, 'ja');
    const en = await translateText(long, 'en');
    assert.ok(!ja.includes(' '));
    assert.ok(en.includes(' '));
});

test('TRANSLATE_PROVIDER=none thì lỗi 503', async () => {
    process.env.TRANSLATE_PROVIDER = 'none';
    await assert.rejects(() => translateText('x', 'en'), (err) => err.status === 503);
});

test('TRANSLATE_PROVIDER không hợp lệ thì lỗi 503', async () => {
    process.env.TRANSLATE_PROVIDER = 'khong-co';
    await assert.rejects(() => translateText('x', 'en'), (err) => err.status === 503);
});

// ---------- MyMemory: kiểm tra cách đọc phản hồi (giả lập fetch) ----------
function fakeFetch(body, { ok = true, status = 200 } = {}) {
    return test.mock.method(globalThis, 'fetch', async () => ({ ok, status, json: async () => body }));
}

test('mymemory: đọc bản dịch và giải mã ký tự HTML', async () => {
    const f = fakeFetch({ responseStatus: 200, responseData: { translatedText: 'It&#39;s &quot;big&quot; &amp; old' } });
    assert.strictEqual(await providers.mymemory('Nó lớn', 'en'), `It's "big" & old`);
    const url = f.mock.calls[0].arguments[0];
    assert.ok(url.includes('langpair=vi%7Cen'));
});

test('mymemory: tiếng Trung gửi mã zh-CN và có thể kèm email', async () => {
    process.env.MYMEMORY_EMAIL = 'a@b.com';
    const f = fakeFetch({ responseStatus: 200, responseData: { translatedText: '你好' } });
    await providers.mymemory('Xin chào', 'zh');
    const url = f.mock.calls[0].arguments[0];
    assert.ok(url.includes('vi%7Czh-CN'));
    assert.ok(url.includes('de=a%40b.com'));
});

test('mymemory: hết hạn mức (HTTP 200 nhưng có cảnh báo) thì lỗi 502', async () => {
    fakeFetch({ responseStatus: 200, responseData: { translatedText: 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY' } });
    await assert.rejects(() => providers.mymemory('x', 'en'), (err) => err.status === 502);
});

test('mymemory: responseStatus khác 200 thì lỗi 502', async () => {
    fakeFetch({ responseStatus: 429, responseData: { translatedText: 'x' } });
    await assert.rejects(() => providers.mymemory('x', 'en'), (err) => err.status === 502);
});

test('mymemory: HTTP lỗi thì lỗi 502', async () => {
    fakeFetch({}, { ok: false, status: 500 });
    await assert.rejects(() => providers.mymemory('x', 'en'), (err) => err.status === 502);
});

// ---------- Google ----------
test('google: thiếu khóa thì lỗi 503', async () => {
    await assert.rejects(() => providers.google('x', 'en'), (err) => err.status === 503);
});

test('google: đọc bản dịch từ phản hồi', async () => {
    process.env.GOOGLE_TRANSLATE_API_KEY = 'khoa';
    const f = fakeFetch({ data: { translations: [{ translatedText: '안녕하세요' }] } });
    assert.strictEqual(await providers.google('Xin chào', 'ko'), '안녕하세요');
    const body = JSON.parse(f.mock.calls[0].arguments[1].body);
    assert.deepStrictEqual([body.source, body.target, body.format], ['vi', 'ko', 'text']);
});

test('google: phản hồi thiếu dữ liệu thì lỗi 502', async () => {
    process.env.GOOGLE_TRANSLATE_API_KEY = 'khoa';
    fakeFetch({ data: {} });
    await assert.rejects(() => providers.google('x', 'en'), (err) => err.status === 502);
});
