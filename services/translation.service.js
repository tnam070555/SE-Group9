const AppError = require('../utils/AppError');
const { getLanguage } = require('../config/languages');

const MAX_CHUNK_BYTES = 400; // MyMemory giới hạn khoảng 500 byte mỗi lần gọi

// Giải mã vài ký tự HTML mà một số dịch vụ trả về
function decodeEntities(text) {
    return text
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

// Cắt văn bản dài thành các đoạn <= maxBytes, ưu tiên cắt theo câu rồi theo từ
function splitIntoChunks(text, maxBytes = MAX_CHUNK_BYTES) {
    const bytes = (s) => Buffer.byteLength(s, 'utf8');
    const sentences = text.split(/(?<=[.!?。！？])\s+/).filter(Boolean);
    const pieces = [];
    for (const sentence of sentences) {
        if (bytes(sentence) <= maxBytes) { pieces.push(sentence); continue; }
        let current = '';
        for (const word of sentence.split(/\s+/)) {
            const next = current ? `${current} ${word}` : word;
            if (bytes(next) > maxBytes && current) { pieces.push(current); current = word; } else { current = next; }
        }
        if (current) pieces.push(current);
    }
    const chunks = [];
    let buffer = '';
    for (const piece of pieces) {
        const next = buffer ? `${buffer} ${piece}` : piece;
        if (bytes(next) > maxBytes && buffer) { chunks.push(buffer); buffer = piece; } else { buffer = next; }
    }
    if (buffer) chunks.push(buffer);
    return chunks;
}

function providerCode(target) {
    const language = getLanguage(target);
    if (!language) throw new AppError(400, 'Ngôn ngữ đích không được hỗ trợ');
    return language.provider;
}

// ---------- Các nhà cung cấp dịch (gọi dịch vụ bên ngoài) ----------

// MyMemory: miễn phí, không cần khóa (có hạn mức theo ngày; thêm MYMEMORY_EMAIL để tăng hạn mức)
async function mymemory(text, target) {
    const params = new URLSearchParams({ q: text, langpair: `vi|${providerCode(target)}` });
    if (process.env.MYMEMORY_EMAIL) params.set('de', process.env.MYMEMORY_EMAIL);

    const res = await fetch(`https://api.mymemory.translated.net/get?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new AppError(502, `Dịch vụ dịch trả lỗi ${res.status}`);
    const data = await res.json();

    const translated = data && data.responseData && data.responseData.translatedText;
    // Khi hết hạn mức, MyMemory vẫn trả HTTP 200 nhưng kèm cảnh báo trong nội dung
    if (Number(data && data.responseStatus) !== 200 || !translated || /^MYMEMORY WARNING/i.test(translated)) {
        throw new AppError(502, 'Dịch vụ dịch không dịch được (có thể đã hết hạn mức trong ngày)');
    }
    return decodeEntities(translated);
}

// Google Cloud Translation (cần GOOGLE_TRANSLATE_API_KEY)
async function google(text, target) {
    const key = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!key) throw new AppError(503, 'Thiếu GOOGLE_TRANSLATE_API_KEY trong .env');

    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: 'vi', target: providerCode(target), format: 'text' }),
        signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new AppError(502, `Dịch vụ dịch trả lỗi ${res.status}`);
    const data = await res.json();

    const translated = data && data.data && data.data.translations && data.data.translations[0]
        && data.data.translations[0].translatedText;
    if (!translated) throw new AppError(502, 'Dịch vụ dịch trả về dữ liệu không hợp lệ');
    return translated;
}

// Gom vào một đối tượng để test có thể thay thế bằng bản giả
const providers = { mymemory, google };

// Dịch văn bản tiếng Việt sang ngôn ngữ đích bằng nhà cung cấp trong TRANSLATE_PROVIDER
async function translateText(text, target) {
    const name = (process.env.TRANSLATE_PROVIDER || 'mymemory').toLowerCase();
    if (name === 'none') throw new AppError(503, 'Dịch tự động đang tắt (TRANSLATE_PROVIDER=none)');
    if (!providers[name]) throw new AppError(503, `TRANSLATE_PROVIDER không hợp lệ: ${name}`);

    const parts = [];
    for (const chunk of splitIntoChunks(text)) {
        parts.push((await providers[name](chunk, target)).trim());
    }
    // Tiếng Nhật/Trung không dùng khoảng trắng giữa các câu
    return parts.join(target === 'ja' || target === 'zh' ? '' : ' ');
}

module.exports = { translateText, splitIntoChunks, providers };
