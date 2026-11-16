const os = require('os');

// Card mạng ảo (VirtualBox, VMware, WSL, Hyper-V, VPN...) có IP nhưng điện thoại không truy cập được
const VIRTUAL_IFACE = /virtual|vmware|vbox|vethernet|wsl|hyper-v|docker|loopback|tailscale|zerotier|hamachi|tap|tun|bluetooth/i;

// Trả về IP LAN (IPv4 nội bộ) của máy đang chạy server, ví dụ 192.168.1.10. Không tìm thấy thì trả về null.
function getLanIp() {
    const candidates = [];
    for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
        for (const a of addrs || []) {
            const family = typeof a.family === 'string' ? a.family : `IPv${a.family}`;
            if (family !== 'IPv4' || a.internal) continue;
            if (a.address.startsWith('169.254.')) continue; // IP tự gán khi card chưa kết nối
            let score = 0;
            if (/^192\.168\./.test(a.address)) score += 3;
            else if (/^10\./.test(a.address)) score += 2;
            else if (/^172\.(1[6-9]|2\d|3[01])\./.test(a.address)) score += 1;
            else continue; // chỉ lấy IP mạng nội bộ
            if (/wi-?fi|wlan|wireless|ethernet|^en|^eth/i.test(name)) score += 2;
            if (VIRTUAL_IFACE.test(name)) score -= 10;
            candidates.push({ address: a.address, score });
        }
    }
    candidates.sort((x, y) => y.score - x.score);
    return candidates.length && candidates[0].score > 0 ? candidates[0].address : null;
}

// Địa chỉ gốc để điện thoại truy cập: PUBLIC_BASE_URL nếu có, không thì http://<IP LAN>:<cổng>
function getPublicBaseUrl(port = process.env.PORT || 5000) {
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL;
    const ip = getLanIp();
    return ip ? `http://${ip}:${port}` : '';
}

module.exports = { getLanIp, getPublicBaseUrl };
