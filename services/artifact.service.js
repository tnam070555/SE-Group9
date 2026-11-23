const QRCode = require('qrcode');
const artifactRepository = require('../repositories/artifact.repository');
const translationService = require('./translation.service');
const categoryService = require('./category.service');
const AppError = require('../utils/AppError');
const { getPublicBaseUrl } = require('../utils/network');
const { SOURCE_LANGUAGE, TARGET_CODES, parseTargetLanguage } = require('../config/languages');

// Chỉ nhận các trường này từ client (chặn client tự gán _id, quyền...)
const ALLOWED_FIELDS = ['name', 'code', 'description', 'location', 'categorySlug', 'imageUrl', 'audioUrl'];
// Các trường có bản dịch
const TRANSLATABLE_FIELDS = ['name', 'description', 'location'];

// Tọa độ GPS: nhận { lat, lng } (số hoặc chuỗi số). null hoặc chuỗi rỗng = xóa tọa độ.
// Trả về undefined nếu client không gửi trường geo, null nếu muốn xóa, hoặc { lat, lng } đã kiểm tra.
function parseGeo(raw) {
    if (raw === undefined) return undefined;
    if (raw === null || raw === '') return null;
    if (typeof raw !== 'object' || Array.isArray(raw)) throw new AppError(400, 'Tọa độ (geo) phải có dạng { lat, lng }');
    const blank = (v) => v === undefined || v === null || (typeof v === 'string' && !v.trim());
    if (blank(raw.lat) && blank(raw.lng)) return null;
    if (blank(raw.lat) || blank(raw.lng)) throw new AppError(400, 'Cần nhập cả vĩ độ (lat) và kinh độ (lng)');
    const toNumber = (v) => (typeof v === 'number' ? v : (typeof v === 'string' ? Number(v.trim()) : NaN));
    const lat = toNumber(raw.lat);
    const lng = toNumber(raw.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new AppError(400, 'Vĩ độ (lat) phải là số từ -90 đến 90');
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new AppError(400, 'Kinh độ (lng) phải là số từ -180 đến 180');
    // Làm tròn 6 chữ số thập phân (~0,1 m), đủ chính xác cho bản đồ
    const round = (v) => Math.round(v * 1e6) / 1e6;
    return { lat: round(lat), lng: round(lng) };
}

// Đường dẫn trang thuyết minh của một công trình (nội dung của mã QR)
function qrLinkFor(code, base) {
    return `${base}/detail.html?code=${encodeURIComponent(code)}`;
}

// Địa chỉ gốc lưu vào QR trong database: PUBLIC_BASE_URL, không có thì IP LAN, cuối cùng là localhost
function storedQrBase() {
    return normalizeBaseUrl(getPublicBaseUrl() || `http://localhost:${process.env.PORT || 5000}`);
}

// Tạo { qrLink, qrImage } để lưu cùng công trình trong MongoDB
async function buildQrFields(code) {
    const qrLink = qrLinkFor(code, storedQrBase());
    const qrImage = await QRCode.toDataURL(qrLink, { width: 320, margin: 2 });
    return { qrLink, qrImage };
}

function pickFields(data) {
    const picked = {};
    for (const field of ALLOWED_FIELDS) {
        if (data && data[field] !== undefined) picked[field] = data[field];
    }
    return picked;
}

function cleanStrings(picked) {
    for (const [field, value] of Object.entries(picked)) {
        if (typeof value !== 'string') throw new AppError(400, `Trường ${field} phải là chuỗi`);
        picked[field] = value.trim();
    }
    if (picked.code) picked.code = picked.code.toUpperCase();
    // Ảnh: để trống, link http/https, hoặc đường dẫn trong trang (/img/...). Chặn javascript:, data:...
    if (picked.imageUrl && !/^(https?:\/\/|\/(?!\/))\S+$/i.test(picked.imageUrl)) {
        throw new AppError(400, 'Link ảnh phải bắt đầu bằng http://, https:// hoặc / (VD: /img/anh.jpg)');
    }
    return picked;
}

// Khu vực phải tồn tại (để trống = chưa phân loại)
async function checkCategory(picked) {
    if (picked.categorySlug && !(await categoryService.existsSlug(picked.categorySlug))) {
        throw new AppError(400, `Khu vực "${picked.categorySlug}" không tồn tại`);
    }
}

// Chấp nhận cả document Mongoose lẫn object thường
function toPlain(doc) {
    return doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
}

// Chỉ chấp nhận địa chỉ http/https; bỏ phần đường dẫn, chỉ giữ gốc (VD: http://192.168.1.10:5000)
function normalizeBaseUrl(raw) {
    if (typeof raw !== 'string' || !raw.trim()) throw new AppError(400, 'Thiếu địa chỉ server để tạo QR');
    let url;
    try {
        url = new URL(raw.trim());
    } catch (err) {
        throw new AppError(400, 'Địa chỉ server không hợp lệ');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new AppError(400, 'Địa chỉ server phải bắt đầu bằng http:// hoặc https://');
    }
    return url.origin;
}

// Trả công trình theo ngôn ngữ yêu cầu. Chưa có bản dịch thì dùng tiếng Việt và đánh dấu fallback.
function localize(doc, lang) {
    const a = toPlain(doc);
    const translations = a.translations || {};
    const available = [SOURCE_LANGUAGE, ...TARGET_CODES.filter((c) => translations[c] && translations[c].description)];
    const wanted = lang !== SOURCE_LANGUAGE ? translations[lang] : null;
    const served = wanted && wanted.description ? lang : SOURCE_LANGUAGE;
    const t = served === SOURCE_LANGUAGE ? {} : wanted;

    return {
        _id: a._id,
        code: a.code,
        categorySlug: a.categorySlug,
        name: t.name || a.name,
        description: t.description || a.description,
        location: t.location || a.location,
        imageUrl: a.imageUrl,
        audioUrl: a.audioUrl,
        geo: a.geo && Number.isFinite(a.geo.lat) && Number.isFinite(a.geo.lng) ? { lat: a.geo.lat, lng: a.geo.lng } : null,
        language: served,
        fallback: served !== lang,
        availableLanguages: available,
    };
}

class ArtifactService {
    async create(data) {
        const picked = cleanStrings(pickFields(data));
        if (!picked.name) throw new AppError(400, 'Tên là bắt buộc');
        if (!picked.code) throw new AppError(400, 'Mã (code) là bắt buộc');
        const geo = parseGeo(data && data.geo);
        if (geo) picked.geo = geo;
        await checkCategory(picked);
        Object.assign(picked, await buildQrFields(picked.code));
        return artifactRepository.create(picked);
    }

    async getAll(lang = SOURCE_LANGUAGE) {
        const list = await artifactRepository.findAll();
        return list.map((doc) => localize(doc, lang));
    }

    async getById(id) {
        const artifact = await artifactRepository.findById(id);
        if (!artifact) throw new AppError(404, 'Không tìm thấy công trình');
        return artifact;
    }

    async getByCode(code) {
        const artifact = await artifactRepository.findByCode(String(code).trim().toUpperCase());
        if (!artifact) throw new AppError(404, 'Không tìm thấy công trình');
        return artifact;
    }

    async getLocalizedByCode(code, lang = SOURCE_LANGUAGE) {
        return localize(await this.getByCode(code), lang);
    }

    // Sinh ảnh QR (PNG) trỏ tới trang thuyết minh của công trình, không lưu vào database
    // nên đổi địa chỉ server (IP máy, tên miền khi deploy) thì QR vẫn đúng.
    async getQrPng(code, baseUrl) {
        const artifact = await this.getByCode(code);
        
        let targetBase = baseUrl;
        // Thêm đoạn điều kiện này vào: Nếu là localhost hoặc 127.0.0.1, tự ép sang IP Wi-Fi
        if (!targetBase || targetBase.includes('localhost') || targetBase.includes('127.0.0.1')) {
            targetBase = getPublicBaseUrl() || targetBase || 'http://localhost:5000';
        }

        const base = normalizeBaseUrl(targetBase);
        const link = qrLinkFor(artifact.code, base);
        return QRCode.toBuffer(link, { type: 'png', width: 320, margin: 2 });
    }

    // Mã QR dẫn tới trang du khách. Không lưu database, sinh theo yêu cầu.
    async getSiteQrPng(baseUrl) {
        const base = normalizeBaseUrl(baseUrl);
        return QRCode.toBuffer(`${base}/`, { type: 'png', width: 400, margin: 2 });
    }

    async update(id, data) {
        const picked = cleanStrings(pickFields(data));
        const geo = parseGeo(data && data.geo);
        if (Object.keys(picked).length === 0 && geo === undefined) throw new AppError(400, 'Không có dữ liệu để cập nhật');
        if ('name' in picked && !picked.name) throw new AppError(400, 'Tên không được để trống');
        if ('code' in picked && !picked.code) throw new AppError(400, 'Mã (code) không được để trống');
        await checkCategory(picked);

        // Trường tiếng Việt nào bị đổi nội dung thì bản dịch của trường đó đã lỗi thời -> xóa để dịch lại
        const existing = toPlain(await artifactRepository.findById(id));
        if (!existing) throw new AppError(404, 'Không tìm thấy công trình');
        const unset = {};
        if (geo) picked.geo = geo;
        else if (geo === null) unset.geo = 1;
        for (const field of TRANSLATABLE_FIELDS) {
            if (field in picked && picked[field] !== existing[field]) {
                for (const lang of TARGET_CODES) unset[`translations.${lang}.${field}`] = 1;
            }
        }
        // Đổi mã công trình thì tạo lại mã QR lưu trong database
        if ('code' in picked && picked.code !== existing.code) Object.assign(picked, await buildQrFields(picked.code));
        const update = Object.keys(unset).length ? { ...picked, $unset: unset } : picked;

        const updated = await artifactRepository.updateById(id, update);
        if (!updated) throw new AppError(404, 'Không tìm thấy công trình');
        return updated;
    }

    // Admin nhập/sửa tay bản dịch cho một ngôn ngữ
    async setTranslation(id, lang, data) {
        const target = parseTargetLanguage(lang);
        if (!data || typeof data !== 'object') throw new AppError(400, 'Thiếu dữ liệu bản dịch');
        const set = {};
        for (const field of TRANSLATABLE_FIELDS) {
            if (data[field] === undefined) continue;
            if (typeof data[field] !== 'string') throw new AppError(400, `Trường ${field} phải là chuỗi`);
            if (data[field].trim()) set[`translations.${target}.${field}`] = data[field].trim();
        }
        if (Object.keys(set).length === 0) throw new AppError(400, 'Cần ít nhất một trong các trường: name, description, location');

        const updated = await artifactRepository.updateById(id, { $set: set });
        if (!updated) throw new AppError(404, 'Không tìm thấy công trình');
        return updated;
    }

    // Dịch tự động các trường tiếng Việt sang các ngôn ngữ đích. Mặc định chỉ dịch phần còn thiếu.
    async translate(id, options = {}) {
        const artifact = toPlain(await artifactRepository.findById(id));
        if (!artifact) throw new AppError(404, 'Không tìm thấy công trình');

        const requested = options.languages === undefined ? TARGET_CODES : options.languages;
        if (!Array.isArray(requested) || requested.length === 0) throw new AppError(400, 'languages phải là mảng, ví dụ ["en","ja"]');
        const targets = [...new Set(requested.map(parseTargetLanguage))];
        const force = options.force === true;

        const set = {};
        const report = {};
        for (const lang of targets) {
            let translated = 0;
            let skipped = 0;
            try {
                for (const field of TRANSLATABLE_FIELDS) {
                    if (!artifact[field]) continue;
                    const current = artifact.translations && artifact.translations[lang] && artifact.translations[lang][field];
                    if (current && !force) { skipped += 1; continue; }
                    set[`translations.${lang}.${field}`] = await translationService.translateText(artifact[field], lang);
                    translated += 1;
                }
                report[lang] = translated ? `đã dịch ${translated} trường` : 'đã có bản dịch, bỏ qua';
            } catch (err) {
                report[lang] = `lỗi: ${err.message}`;
            }
        }

        let result = artifact;
        if (Object.keys(set).length) result = await artifactRepository.updateById(id, { $set: set });
        return { artifact: result, report };
    }

    // Gọi khi server khởi động: công trình chưa có QR, hoặc QR trỏ tới địa chỉ cũ (đổi Wi-Fi, đổi IP,
    // đặt PUBLIC_BASE_URL) thì tạo lại và lưu vào MongoDB. Trả về số công trình đã cập nhật.
    async syncQrCodes() {
        const base = storedQrBase();
        let updated = 0;
        for (const a of await artifactRepository.findAllForQr()) {
            if (a.qrLink === qrLinkFor(a.code, base)) continue;
            await artifactRepository.updateById(a._id, await buildQrFields(a.code));
            updated += 1;
        }
        return updated;
    }

    async delete(id) {
        const deleted = await artifactRepository.deleteById(id);
        if (!deleted) throw new AppError(404, 'Không tìm thấy công trình');
    }
}

module.exports = new ArtifactService();
module.exports.localize = localize;
module.exports.parseGeo = parseGeo;
