const AppError = require('../utils/AppError');

// Ngôn ngữ gốc (nội dung nhập ở trường name/description/location của công trình)
const SOURCE_LANGUAGE = 'vi';

// speech: mã ngôn ngữ cho giọng đọc của trình duyệt; provider: mã gửi cho dịch vụ dịch
const LANGUAGES = [
    { code: 'vi', label: 'Tiếng Việt', speech: 'vi-VN', provider: 'vi' },
    { code: 'en', label: 'English', speech: 'en-US', provider: 'en' },
    { code: 'ja', label: '日本語', speech: 'ja-JP', provider: 'ja' },
    { code: 'ko', label: '한국어', speech: 'ko-KR', provider: 'ko' },
    { code: 'zh', label: '中文', speech: 'zh-CN', provider: 'zh-CN' },
];

const ALL_CODES = LANGUAGES.map((l) => l.code);
const TARGET_CODES = ALL_CODES.filter((c) => c !== SOURCE_LANGUAGE); // các ngôn ngữ cần dịch sang

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

module.exports = { SOURCE_LANGUAGE, LANGUAGES, ALL_CODES, TARGET_CODES, parseLanguage, parseTargetLanguage, getLanguage };
