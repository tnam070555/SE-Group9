// fix-locations.js
// Chuẩn hóa cột "location" của 16 công trình theo khu vực (categorySlug) và sửa số tầng trong bản dịch.
// Cách dùng (ở thư mục gốc dự án, cùng chỗ với package.json):
//   node fix-locations.js
// Script sao lưu file cũ thành data/buildings.seed.js.bak trước khi ghi.

const fs = require('fs');
const path = require('path');
const util = require('util');

const FILE = path.join(process.cwd(), 'data', 'buildings.seed.js');

// Tên khu vực theo từng ngôn ngữ (khớp với 6 mục categories trong MongoDB).
// Quy ước: "Tầng trệt" = tầng ngay mặt đất; "Lầu 1" = tầng ngay trên tầng trệt; "Lầu 2" = tầng trên Lầu 1.
const AREAS = {
    'tang-tret':   { vi: 'Tầng trệt',             en: 'Ground floor',     ja: '1階',       ko: '1층',   zh: '一楼' },
    'lau-1':       { vi: 'Lầu 1',                 en: 'First floor',      ja: '2階',       ko: '2층',   zh: '二楼' },
    'lau-2':       { vi: 'Lầu 2',                 en: 'Second floor',     ja: '3階',       ko: '3층',   zh: '三楼' },
    'san-thuong':  { vi: 'Tầng sân thượng',       en: 'Rooftop',          ja: '屋上',      ko: '옥상',  zh: '屋顶' },
    'tang-ham':    { vi: 'Tầng hầm',              en: 'Basement',         ja: '地下',      ko: '지하',  zh: '地下室' },
    'ngoai-troi':  { vi: 'Khuôn viên ngoài trời', en: 'Outdoor grounds',  ja: '屋外（前庭）', ko: '야외 부지', zh: '室外场地' },
};

// Hậu tố tên Dinh theo từng ngôn ngữ
const PALACE = { vi: 'Dinh Độc Lập', en: 'Independence Palace', ja: '独立宮殿', ko: '독립궁', zh: '独立宫' };

// Sửa các mô tả có nhắc số tầng sai (bản dịch cũ dùng đánh số tầng khác)
// DDL-11 nằm ở Lầu 2 nên trong bản tiếng Nhật/Hàn/Trung phải là tầng 3.
const DESCRIPTION_FIXES = {
    'DDL-11': {
        ja: [['2階後方', '3階後方']],
        ko: [['2층 뒤쪽', '3층 뒤쪽']],
        zh: [['位于二楼后部', '位于三楼后部']],
    },
};

function fail(message) {
    console.error('DỪNG, chưa ghi file nào: ' + message);
    process.exit(1);
}

function main() {
    if (!fs.existsSync(FILE)) fail(`Không thấy ${path.relative(process.cwd(), FILE)}. Hãy chạy ở thư mục gốc dự án.`);

    const buildings = require(FILE);
    if (!Array.isArray(buildings) || buildings.length === 0) fail('File không chứa danh sách công trình.');

    const codes = new Set();
    for (const b of buildings) {
        if (codes.has(b.code)) fail(`Trùng mã ${b.code}.`);
        codes.add(b.code);
        if (!AREAS[b.categorySlug]) fail(`${b.code} có categorySlug "${b.categorySlug}" không thuộc 6 khu vực.`);
    }

    const changes = [];
    const fixed = buildings.map((b) => {
        const area = AREAS[b.categorySlug];
        const next = JSON.parse(JSON.stringify(b));

        next.location = `${area.vi} – ${PALACE.vi}`;
        for (const lang of ['en', 'ja', 'ko', 'zh']) {
            next.translations[lang] = next.translations[lang] || {};
            next.translations[lang].location = `${area[lang]} – ${PALACE[lang]}`;
        }

        const fixes = DESCRIPTION_FIXES[b.code] || {};
        for (const [lang, pairs] of Object.entries(fixes)) {
            for (const [from, to] of pairs) {
                const text = next.translations[lang].description;
                if (text && text.includes(to) && !text.includes(from)) continue; // đã sửa rồi (chạy lại an toàn)
                if (!text || text.split(from).length !== 2) fail(`${b.code} (${lang}): không tìm thấy đúng 1 lần "${from}".`);
                next.translations[lang].description = text.replace(from, to);
            }
        }

        if (JSON.stringify(next) !== JSON.stringify(b)) changes.push(b.code);
        return next;
    });

    const header = [
        '// Dữ liệu mẫu: các công trình tại Dinh Độc Lập (nạp khi database còn trống hoặc khi chạy seed).',
        '// Trường location theo khu vực (categorySlug). Bản dịch do AI soạn, cần người thành thạo ngôn ngữ kiểm tra.',
        '',
    ].join('\n');
    const body = 'module.exports = ' + util.inspect(fixed, { depth: null, maxArrayLength: null, breakLength: 110, compact: false }) + ';\n';


    if (changes.length === 0) {
        console.log('Không có gì thay đổi: dữ liệu đã đúng, file không bị ghi lại.');
        return;
    }
    // Chỉ sao lưu bản GỐC lần đầu, không ghi đè bản sao lưu bằng bản đã sửa
    if (!fs.existsSync(FILE + '.bak')) fs.copyFileSync(FILE, FILE + '.bak');
    fs.writeFileSync(FILE, header + body, 'utf8');
    console.log(`Đã ghi ${fixed.length} công trình. Bản sao lưu gốc: data/buildings.seed.js.bak`);
    console.log(`Công trình có thay đổi: ${changes.length} (${changes.join(', ')})`);
}

main();