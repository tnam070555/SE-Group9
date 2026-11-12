/**
 * =============================================================
 *  XÁC THỰC ADMIN (phía trình duyệt)
 * =============================================================
 *  Dùng chung cho login.html và admin.html.
 *
 *  Luồng hoạt động:
 *    1. login.html gửi username/password tới POST /api/admin/login
 *    2. Server trả về JWT -> lưu vào localStorage
 *    3. admin.html gọi Auth.requireLogin() để chặn người chưa đăng nhập
 *    4. Mọi request tới API admin đi qua Auth.apiFetch() để tự gắn
 *       header "Authorization: Bearer <token>"
 *
 *  Lưu ý: token lưu trong localStorage nên chỉ tồn tại trên đúng
 *  trình duyệt đó. Đăng xuất = xóa token.
 * =============================================================
 */
(function (global) {
    'use strict';

    var TOKEN_KEY = 'ddl_admin_token';
    var LOGIN_PAGE = '/login.html';
    var ADMIN_PAGE = '/admin';

    // ---------------------------------------------------------
    // Đọc / ghi token
    // ---------------------------------------------------------

    function getToken() {
        try {
            return localStorage.getItem(TOKEN_KEY) || '';
        } catch (err) {
            // Trình duyệt chặn localStorage (chế độ ẩn danh...)
            return '';
        }
    }

    function saveToken(token) {
        try {
            localStorage.setItem(TOKEN_KEY, token);
        } catch (err) {
            /* không lưu được thì thôi, phiên này vẫn dùng được */
        }
    }

    function clearToken() {
        try {
            localStorage.removeItem(TOKEN_KEY);
        } catch (err) {
            /* bỏ qua */
        }
    }

    // ---------------------------------------------------------
    // Đọc nội dung bên trong JWT
    // ---------------------------------------------------------
    // JWT có 3 phần ngăn bởi dấu chấm: header.payload.chữ-ký
    // Phần payload chứa { id, username, role, exp } do server ký.
    // Đọc ở đây CHỈ để hiển thị tên và biết token hết hạn chưa.
    // Việc kiểm tra thật vẫn do server làm (middlewares/auth.middleware.js).

    function readPayload(token) {
        try {
            var part = String(token).split('.')[1];
            if (!part) return null;
            var base64 = part.replace(/-/g, '+').replace(/_/g, '/');
            var raw = atob(base64);
            // Giải mã UTF-8 để tên tiếng Việt không bị lỗi font
            var json = decodeURIComponent(
                raw.split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join('')
            );
            return JSON.parse(json);
        } catch (err) {
            return null;
        }
    }

    function isExpired(payload) {
        if (!payload || !payload.exp) return false;
        return payload.exp * 1000 <= Date.now();
    }

    // ---------------------------------------------------------
    // Trạng thái đăng nhập
    // ---------------------------------------------------------

    function isLoggedIn() {
        var token = getToken();
        if (!token) return false;
        var payload = readPayload(token);
        if (!payload) return false;
        if (isExpired(payload)) {
            clearToken();
            return false;
        }
        return payload.role === 'admin';
    }

    function getAdmin() {
        return readPayload(getToken());
    }

    // ---------------------------------------------------------
    // Điều hướng
    // ---------------------------------------------------------

    /**
     * Gọi ở đầu trang admin. Chưa đăng nhập thì đá về trang login.
     * Trả về true nếu hợp lệ.
     */
    function requireLogin() {
        if (isLoggedIn()) return true;
        clearToken();
        // replace thay vì href: bấm Back không quay lại được trang admin
        location.replace(LOGIN_PAGE + '?next=' + encodeURIComponent(location.pathname));
        return false;
    }

    /**
     * Gọi ở trang login. Đã đăng nhập rồi thì vào thẳng trang admin.
     */
    function redirectIfLoggedIn() {
        if (!isLoggedIn()) return false;
        location.replace(ADMIN_PAGE);
        return true;
    }

    function logout() {
        clearToken();
        location.replace(LOGIN_PAGE);
    }

    // ---------------------------------------------------------
    // Đăng nhập
    // ---------------------------------------------------------

    /**
     * Gửi username/password lên server.
     * Thành công: lưu token, trả về { ok: true }
     * Thất bại:   trả về { ok: false, message: 'lý do' }
     */
    async function login(username, password) {
        var res;
        try {
            res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password }),
            });
        } catch (err) {
            return { ok: false, message: 'Không kết nối được tới server. Kiểm tra server đã chạy chưa.' };
        }

        var data = {};
        try {
            data = await res.json();
        } catch (err) {
            /* server trả về thứ không phải JSON */
        }

        if (!res.ok || !data.token) {
            return { ok: false, message: data.message || 'Đăng nhập thất bại' };
        }

        saveToken(data.token);
        return { ok: true };
    }

    // ---------------------------------------------------------
    // Gọi API có kèm token
    // ---------------------------------------------------------

    /**
     * Dùng thay cho fetch() ở mọi nơi cần quyền admin.
     *   const res  = await Auth.apiFetch('/api/admin/stats');
     *   const data = await res.json();
     *
     * Token hết hạn (401) -> tự đăng xuất và quay về trang login.
     */
    async function apiFetch(path, options) {
        options = options || {};
        var headers = Object.assign({}, options.headers || {});

        var token = getToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;
        if (options.body && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        var res = await fetch(path, Object.assign({}, options, { headers: headers }));

        if (res.status === 401) {
            clearToken();
            location.replace(LOGIN_PAGE + '?expired=1');
            throw new Error('Phiên đăng nhập đã hết hạn');
        }
        return res;
    }

    // ---------------------------------------------------------
    // Hiển thị tên admin đang đăng nhập (nếu trang có chỗ để hiện)
    // ---------------------------------------------------------

    function renderIdentity() {
        var admin = getAdmin();
        if (!admin) return;

        var nameEl = document.getElementById('admin-username');
        if (nameEl) nameEl.textContent = admin.username || 'Quản trị viên';

        var roleEl = document.getElementById('admin-role');
        if (roleEl) roleEl.textContent = admin.role === 'admin' ? 'Quản trị viên' : admin.role;

        var avatarEl = document.getElementById('admin-avatar');
        if (avatarEl && admin.username) {
            var initials = admin.username.trim().slice(0, 2).toUpperCase();
            avatarEl.src = 'https://placehold.co/100x100/8B1E24/C9A227?text=' + encodeURIComponent(initials);
            avatarEl.alt = admin.username;
        }
    }

    // ---------------------------------------------------------

    global.Auth = {
        login: login,
        logout: logout,
        isLoggedIn: isLoggedIn,
        getAdmin: getAdmin,
        getToken: getToken,
        requireLogin: requireLogin,
        redirectIfLoggedIn: redirectIfLoggedIn,
        apiFetch: apiFetch,
        renderIdentity: renderIdentity,
    };
})(window);
