const mongoose = require('mongoose');
const { ALL_CODES, SOURCE_LANGUAGE } = require('../config/languages');

const TRANSLATION_FIELDS = ['name', 'description', 'location'];

// translations: { en: { name, description, location }, fr: {...} }.
// Danh sách ngôn ngữ do admin quản lý nên không cố định trong schema; chỉ giữ ngôn ngữ đang có
// trong hệ thống và 3 trường dạng chuỗi (ngôn ngữ lạ hoặc trường lạ bị bỏ). Chạy trước khi validate.
function cleanTranslations(value) {
    if (!value || typeof value !== 'object') return undefined;
    const cleaned = {};
    for (const [lang, fields] of Object.entries(value)) {
        if (lang === SOURCE_LANGUAGE || !ALL_CODES.includes(lang) || !fields || typeof fields !== 'object') continue;
        const t = {};
        for (const field of TRANSLATION_FIELDS) {
            if (typeof fields[field] === 'string' && fields[field].trim()) t[field] = fields[field].trim();
        }
        if (Object.keys(t).length) cleaned[lang] = t;
    }
    return cleaned;
}

// Công trình / hiện vật tại Dinh Độc Lập
const artifactSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },                 // Tên công trình (tiếng Việt)
    code: {                                                             // Mã định danh, dùng trong đường dẫn QR (VD: DDL-01)
        type: String, required: true, unique: true, trim: true, uppercase: true,
        match: [/^[A-Z0-9_-]+$/, 'Mã (code) chỉ gồm chữ, số, dấu - và _'],
    },
    description: { type: String },                                      // Nội dung thuyết minh gốc (tiếng Việt)
    location: { type: String },                                         // Mô tả vị trí bằng chữ (VD: Tầng trệt), có bản dịch
    // Tọa độ GPS để hiện trên bản đồ (map.html). Không bắt buộc: công trình chưa có tọa độ thì không hiện marker.
    geo: {
        type: new mongoose.Schema({
            lat: { type: Number, required: true, min: -90, max: 90 },      // Vĩ độ
            lng: { type: Number, required: true, min: -180, max: 180 },    // Kinh độ
        }, { _id: false }),
        default: undefined,
    },
    categorySlug: { type: String, index: true },                        // Khu vực (tầng, khu) trong Dinh
    imageUrl: { type: String, trim: true },                             // Ảnh minh họa (link http/https hoặc /img/...)
    audioUrl: { type: String },                                         // Đường dẫn audio đã lưu (chưa dùng)
    qrLink: { type: String },                                           // Đường dẫn mã QR trỏ tới (trang thuyết minh)
    qrImage: { type: String },                                          // Ảnh mã QR (PNG dạng data:image/png;base64,...)
    translations: { type: mongoose.Schema.Types.Mixed },                // Bản dịch theo ngôn ngữ
}, { timestamps: true });

// Lọc bản dịch khi tạo/lưu document. Không dùng setter vì setter trên kiểu Mixed làm Mongoose
// bỏ qua lệnh cập nhật lồng nhau ($set 'translations.fr.description'); các lệnh đó do service kiểm tra.
artifactSchema.pre('validate', function cleanBeforeValidate() {
    if (this.isModified('translations')) this.translations = cleanTranslations(this.translations);
});

module.exports = mongoose.model('Artifact', artifactSchema);
