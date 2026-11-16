const AppError = require('../utils/AppError');

// Ngôn ngữ gốc (nội dung nhập ở trường name/description/location của công trình)
const SOURCE_LANGUAGE = 'vi';

// Ngôn ngữ mặc định, dùng khi database chưa có danh sách ngôn ngữ (và khi chạy test không có database).
// speech: mã ngôn ngữ cho giọng đọc của trình duyệt; provider: mã gửi cho dịch vụ dịch
const DEFAULT_LANGUAGES = [
    { code: 'vi', label: 'Tiếng Việt', speech: 'vi-VN', provider: 'vi', isActive: true },
    { code: 'en', label: 'English', speech: 'en-US', provider: 'en', isActive: true },
    { code: 'ja', label: '日本語', speech: 'ja-JP', provider: 'ja', isActive: true },
    { code: 'ko', label: '한국어', speech: 'ko-KR', provider: 'ko', isActive: true },
    { code: 'zh', label: '中文', speech: 'zh-CN', provider: 'zh-CN', isActive: true },
];

// Danh sách đang dùng. Admin thêm/sửa ngôn ngữ thì language.service gọi setLanguages() để nạp lại.
// Các mảng dưới đây được SỬA TẠI CHỖ (không gán mảng mới) để module khác đã import vẫn thấy dữ liệu mới.
const LANGUAGES = [];
const ALL_CODES = [];
const TARGET_CODES = []; // các ngôn ngữ cần dịch sang (mọi ngôn ngữ trừ ngôn ngữ gốc)

function replaceContents(target, items) {
    target.splice(0, target.length, ...items);
}

function setLanguages(list) {
    const cleaned = list
        .filter((l) => l && typeof l.code === 'string' && l.code)
        .map((l) => ({
            code: l.code,
            label: l.label || l.name || l.code,
            speech: l.speech || l.code,
            provider: l.provider || l.code,
            isActive: l.code === SOURCE_LANGUAGE ? true : l.isActive !== false,
        }));
    // Ngôn ngữ gốc luôn có mặt và đứng đầu
    if (!cleaned.some((l) => l.code === SOURCE_LANGUAGE)) cleaned.unshift({ ...DEFAULT_LANGUAGES[0] });
    cleaned.sort((a, b) => (a.code === SOURCE_LANGUAGE ? -1 : b.code === SOURCE_LANGUAGE ? 1 : 0));

    replaceContents(LANGUAGES, cleaned);
    replaceContents(ALL_CODES, cleaned.map((l) => l.code));
    replaceContents(TARGET_CODES, ALL_CODES.filter((c) => c !== SOURCE_LANGUAGE));
}

setLanguages(DEFAULT_LANGUAGES);

// Ngôn ngữ đang bật (hiển thị cho du khách)
function activeLanguages() {
    return LANGUAGES.filter((l) => l.isActive);
}

// Chuẩn hóa tham số ?lang= (en-US -> en, ZH-cn -> zh). Bỏ trống thì dùng ngôn ngữ gốc.
function parseLanguage(raw) {
    if (raw === undefined || raw === '') return SOURCE_LANGUAGE;
    if (typeof raw !== 'string') throw new AppError(400, 'Tham số lang không hợp lệ');
    const code = raw.trim().toLowerCase().split('-')[0].split('_')[0];
    if (!ALL_CODES.includes(code)) {
        throw new AppError(400, `Ngôn ngữ không được hỗ trợ. Chọn một trong: ${ALL_CODES.join(', ')}`);
    }
    return code;
}

// Dùng cho trường hợp chỉ cho phép ngôn ngữ đích (không phải ngôn ngữ gốc)
function parseTargetLanguage(raw) {
    const code = parseLanguage(raw);
    if (code === SOURCE_LANGUAGE) {
        throw new AppError(400, 'Ngôn ngữ gốc (vi) được sửa trực tiếp ở công trình, không có bản dịch');
    }
    return code;
}

function getLanguage(code) {
    return LANGUAGES.find((l) => l.code === code);
}

module.exports = {
    SOURCE_LANGUAGE, DEFAULT_LANGUAGES, LANGUAGES, ALL_CODES, TARGET_CODES,
    setLanguages, activeLanguages, parseLanguage, parseTargetLanguage, getLanguage,
};
