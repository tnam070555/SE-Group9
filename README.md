# SE-group9 – Thuyết minh tự động đa ngôn ngữ (Dinh Độc Lập)

Back-end Node.js (Express 5 + MongoDB) theo kiến trúc 3 lớp, kèm trang web mẫu để du khách quét QR và nghe thuyết minh các công trình tại Dinh Độc Lập.

## Cấu trúc 3 lớp
| Lớp | Thư mục | Vai trò |
|---|---|---|
| Controller | `controllers/`, `routers/` | Nhận request, trả response |
| Service | `services/` | Logic nghiệp vụ, kiểm tra dữ liệu, sinh QR |
| Repository | `repositories/` (+ `models/`) | Truy vấn database |

Giao diện web nằm trong `public/` (server chỉ phục vụ thư mục này, không lộ mã nguồn hay `.env`).

## Chạy dự án
1. Cài Node.js (bản LTS).
2. `npm install`
3. Sao chép `.env.example` thành `.env` và điền:
   - `JWT_SECRET`: chuỗi ngẫu nhiên dài (bắt buộc).
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD` (tối thiểu 8 ký tự): tài khoản admin tự tạo khi khởi động.
   - Database: `MONGO_URI` (MongoDB Atlas hoặc MongoDB trên máy), hoặc `USE_MEMORY_DB=true` để chạy thử (mất dữ liệu khi tắt).
4. `npm start` rồi mở http://localhost:5000
5. Lần đầu khi database còn trống, server tự nạp 6 công trình mẫu (tắt bằng `SEED_SAMPLE_DATA=false`).

**Không đưa `.env` lên GitHub** và không gửi file này cho người khác (chứa mật khẩu database, khóa JWT).

## Quét QR bằng điện thoại
1. Máy chạy server và điện thoại phải **cùng mạng Wi-Fi**.
2. Tìm IP của máy chạy server (Windows: `ipconfig`, mục IPv4, ví dụ 192.168.1.10).
3. Mở trang chủ, nhập `http://192.168.1.10:5000` vào ô địa chỉ, rồi chọn công trình để lấy mã QR. (Hoặc đặt sẵn `PUBLIC_BASE_URL` trong `.env`.)
4. Nếu điện thoại không mở được, kiểm tra Windows Firewall có chặn cổng 5000 không.

QR không được lưu trong database mà sinh theo yêu cầu, nên đổi IP hay tên miền thì QR vẫn đúng.

## Đa ngôn ngữ (vi, en, ja, ko, zh)
- Nội dung gốc nhập bằng **tiếng Việt**; mỗi công trình có thể có bản dịch `en`, `ja`, `ko`, `zh` (trường `translations`).
- 6 công trình mẫu đã có sẵn đủ bản dịch (soạn tay), nên demo chạy được mà không cần dịch vụ bên ngoài. **Bản dịch mẫu nên được người thành thạo ngôn ngữ kiểm tra lại.**
- Trang `detail.html` (trang mở khi quét QR) **tự chọn ngôn ngữ theo điện thoại**, có nút đổi ngôn ngữ, chữ giao diện cũng đổi theo. Thứ tự ưu tiên: `?lang=` trên đường dẫn → lựa chọn đã lưu → ngôn ngữ điện thoại → tiếng Việt.
- Đọc thuyết minh dùng giọng của trình duyệt theo ngôn ngữ (`vi-VN`, `en-US`, `ja-JP`, `ko-KR`, `zh-CN`). Máy chưa cài giọng của ngôn ngữ nào thì có thể không nghe được; trang sẽ hiện cảnh báo.
- Công trình chưa có bản dịch sẽ hiển thị tiếng Việt kèm cờ `fallback: true`.

### Thêm / dịch nội dung (admin)
- Dịch tự động các phần còn thiếu: `POST /api/artifacts/:id/translate` (body tùy chọn `{"languages":["en","ja"],"force":false}`).
  Nhà cung cấp chọn bằng `TRANSLATE_PROVIDER` trong `.env`: `mymemory` (miễn phí, có hạn mức mỗi ngày), `google` (cần `GOOGLE_TRANSLATE_API_KEY`) hoặc `none`.
- Sửa tay bản dịch: `PUT /api/artifacts/:id/translations/:lang` (body `{"name","description","location"}`).
- Khi sửa nội dung tiếng Việt của một trường, bản dịch của đúng trường đó bị xóa để tránh hiển thị bản dịch lỗi thời; hãy dịch lại.

## Kiểm thử
`npm test` (không cần database). Thử API thủ công: mở `test.http` bằng extension REST Client.

## API
| Method | Đường dẫn | Quyền |
|---|---|---|
| POST | `/api/admin/login` | Công khai |
| GET | `/api/languages` | Công khai |
| GET | `/api/artifacts?lang=ja` | Công khai |
| GET | `/api/artifacts/code/:code?lang=ja` | Công khai (dùng cho trang quét QR) |
| GET | `/api/artifacts/code/:code/qr?base=<địa chỉ server>` | Công khai (trả ảnh PNG) |
| GET | `/api/artifacts/:id` | Công khai |
| POST, PUT, DELETE | `/api/artifacts`, `/api/artifacts/:id` | Admin (header `Authorization: Bearer <token>`) |
| PUT | `/api/artifacts/:id/translations/:lang` | Admin |
| POST | `/api/artifacts/:id/translate` | Admin |
