// apply-site-qr.js
// Thêm vào dự án của bạn: (1) khu vực (categorySlug) trong dữ liệu trả về cho trang du khách,
// (2) API mã QR của trang web: GET /api/site/qr?base=<địa chỉ>
// Cách dùng: đặt file ở thư mục gốc dự án (cùng chỗ với package.json), rồi chạy: node apply-site-qr.js
// Script chỉ ghi file khi MỌI chỗ cần sửa đều khớp đúng 1 lần; nếu không, dừng và không đổi gì.

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const p = (f) => path.join(root, f);

function abort(msg) { console.error('\nDỪNG, chưa thay đổi file nào: ' + msg); process.exit(1); }
function read(f) {
  if (!fs.existsSync(p(f))) abort(`Không thấy ${f}. Hãy chạy ở thư mục gốc dự án (nơi có package.json).`);
  return fs.readFileSync(p(f), 'utf8');
}
// Giữ kiểu xuống dòng của file (CRLF trên Windows)
function eolOf(text) { return text.includes('\r\n') ? '\r\n' : '\n'; }
function insertBefore(text, file, anchor, block) {
  const eol = eolOf(text);
  const a = anchor.replace(/\n/g, eol), b = block.replace(/\n/g, eol);
  const n = text.split(a).length - 1;
  if (n !== 1) abort(`${file}: đoạn "${anchor.trim().slice(0, 60)}" phải xuất hiện đúng 1 lần, tìm thấy ${n}. Có thể bạn đã sửa file này.`);
  return text.replace(a, () => b + a);
}
function insertAfter(text, file, anchor, block) {
  const eol = eolOf(text);
  const a = anchor.replace(/\n/g, eol), b = block.replace(/\n/g, eol);
  const n = text.split(a).length - 1;
  if (n !== 1) abort(`${file}: đoạn "${anchor.trim().slice(0, 60)}" phải xuất hiện đúng 1 lần, tìm thấy ${n}.`);
  return text.replace(a, () => a + b);
}

// ---------- Kiểm tra đã áp dụng chưa ----------
const svcPath = 'services/artifact.service.js';
const ctrlPath = 'controllers/artifact.controller.js';
const appPath = 'app.js';
const modelPath = 'models/artifact.model.js';
let svc = read(svcPath), ctrl = read(ctrlPath), app = read(appPath), model = read(modelPath);
if (svc.includes('getSiteQrPng') || ctrl.includes('getSiteQr') || app.includes("'/api/site/qr'")) {
  abort('Có vẻ đã áp dụng rồi (đã có getSiteQr / /api/site/qr).');
}

// ---------- 1) Dịch vụ: thêm categorySlug vào dữ liệu trả về + hàm tạo QR trang web ----------
svc = insertAfter(svc, svcPath, '        code: a.code,\n', '        categorySlug: a.categorySlug,\n');
svc = insertBefore(svc, svcPath, '    async update(id', [
  '    // Mã QR dẫn tới trang du khách. Không lưu database, sinh theo yêu cầu.',
  '    async getSiteQrPng(baseUrl) {',
  '        const base = normalizeBaseUrl(baseUrl);',
  "        return QRCode.toBuffer(`${base}/`, { type: 'png', width: 400, margin: 2 });",
  '    }',
  '',
  '',
].join('\n'));

// ---------- 2) Controller ----------
ctrl = insertBefore(ctrl, ctrlPath, '    async updateArtifact(req', [
  '    // Mã QR trang web. ?base= hoặc PUBLIC_BASE_URL hoặc địa chỉ đang truy cập',
  '    async getSiteQr(req, res) {',
  "        const base = (typeof req.query.base === 'string' && req.query.base)",
  '            || process.env.PUBLIC_BASE_URL',
  '            || `${req.protocol}://${req.get(\'host\')}`;',
  '        const png = await artifactService.getSiteQrPng(base);',
  "        res.set('Content-Type', 'image/png');",
  "        res.set('Cache-Control', 'no-store');",
  '        res.send(png);',
  '    }',
  '',
  '',
].join('\n'));

// ---------- 3) app.js: đăng ký route công khai ----------
app = insertAfter(app, appPath, "app.use('/api/artifacts', artifactRoutes);\n",
  "app.get('/api/site/qr', (req, res, next) => require('./controllers/artifact.controller').getSiteQr(req, res).catch(next));\n");

// ---------- 4) Model: thêm trường khu vực ----------
model = insertAfter(model, modelPath, '    location: { type: String },', '\n    categorySlug: { type: String, index: true },');

// ---------- Ghi file (sao lưu bản gốc lần đầu) ----------
const files = { [svcPath]: svc, [ctrlPath]: ctrl, [appPath]: app, [modelPath]: model };
for (const [f, content] of Object.entries(files)) {
  if (!fs.existsSync(p(f + '.bak-site'))) fs.copyFileSync(p(f), p(f + '.bak-site'));
  fs.writeFileSync(p(f), content, 'utf8');
  console.log('Đã sửa : ' + f);
}
console.log('\nXong. Khởi động lại server (Ctrl + C rồi npm start), sau đó mở http://localhost:5000/api/site/qr');