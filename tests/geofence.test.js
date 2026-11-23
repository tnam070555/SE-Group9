const test = require('node:test');
const assert = require('node:assert');
const Geofence = require('../public/js/geofence');

// Vĩ độ 1 độ ≈ 111.195 m; 0,0001 độ ≈ 11,1 m. Dùng để dựng khoảng cách chính xác trong test.
const M = 1 / 111195; // độ vĩ tương ứng 1 mét
const tank = { code: 'DDL-05', geo: { lat: 10.7779, lng: 106.69615, radius: 20 } };
const gate = { code: 'DDL-08', geo: { lat: 10.7776, lng: 106.69575 } }; // không có radius -> mặc định 20 m
const at = (poi, metersNorth, accuracy = 8) => ({ lat: poi.geo.lat + metersNorth * M, lng: poi.geo.lng, accuracy });

test('khoảng cách Haversine: 0 m tại cùng điểm, ~111 km mỗi độ vĩ', () => {
    assert.strictEqual(Geofence.distanceM(tank.geo, tank.geo), 0);
    const d = Geofence.distanceM({ lat: 10, lng: 106 }, { lat: 11, lng: 106 });
    assert.ok(Math.abs(d - 111195) < 200, String(d));
});

test('bán kính mặc định 20 m khi công trình chưa đặt', () => {
    assert.strictEqual(Geofence.radiusOf(gate), 20);
    assert.strictEqual(Geofence.radiusOf({ geo: { lat: 1, lng: 1, radius: 35 } }), 35);
    assert.strictEqual(Geofence.radiusOf({ geo: { lat: 1, lng: 1, radius: 0 } }), 20);
});

test('đứng ngoài vùng thì không gợi ý, vào vùng thì gợi ý', () => {
    const g = Geofence.createTracker();
    assert.strictEqual(g.update(at(tank, 60), [tank, gate]), null);
    assert.strictEqual(g.update(at(tank, 25), [tank, gate]), null);
    const hit = g.update(at(tank, 15), [tank, gate]);
    assert.strictEqual(hit.poi.code, 'DDL-05');
    assert.ok(hit.distance > 14 && hit.distance < 16);
});

test('không lặp lại: ở trong vùng hoặc lắc lư ở mép vùng thì chỉ gợi ý một lần', () => {
    const g = Geofence.createTracker();
    assert.ok(g.update(at(tank, 15), [tank]));
    assert.strictEqual(g.update(at(tank, 10), [tank]), null);   // vẫn trong vùng
    assert.strictEqual(g.update(at(tank, 19), [tank]), null);
    assert.strictEqual(g.update(at(tank, 25), [tank]), null);   // ra khỏi bán kính nhưng chưa quá 1,5 lần
    assert.strictEqual(g.update(at(tank, 18), [tank]), null);   // vào lại mép: không gợi ý lại
});

test('đi ra xa hơn 1,5 lần bán kính rồi quay lại thì gợi ý lại', () => {
    const g = Geofence.createTracker();
    assert.ok(g.update(at(tank, 10), [tank]));
    assert.strictEqual(g.update(at(tank, 40), [tank]), null);   // > 30 m: coi như đã rời vùng
    assert.ok(g.update(at(tank, 10), [tank]));
});

test('GPS sai số lớn hơn 50 m thì bỏ qua và không đổi trạng thái', () => {
    const g = Geofence.createTracker();
    assert.strictEqual(g.update(at(tank, 5, 120), [tank]), null);
    assert.ok(g.update(at(tank, 5, 20), [tank]), 'khi GPS tốt lên vẫn phải gợi ý');
});

test('nhiều vùng chồng nhau: chỉ gợi ý công trình gần nhất, không báo nối tiếp', () => {
    const a = { code: 'A', geo: { lat: 10.7770, lng: 106.6950, radius: 30 } };
    const b = { code: 'B', geo: { lat: 10.7770 + 12 * M, lng: 106.6950, radius: 30 } };
    const g = Geofence.createTracker();
    const hit = g.update({ lat: 10.7770 + 10 * M, lng: 106.6950, accuracy: 5 }, [a, b]);
    assert.strictEqual(hit.poi.code, 'B');                       // B cách 2 m, A cách 10 m
    assert.strictEqual(g.update({ lat: 10.7770 + 9 * M, lng: 106.6950, accuracy: 5 }, [a, b]), null);
});

test('mỗi công trình dùng bán kính riêng', () => {
    const big = { code: 'BIG', geo: { lat: 10.78, lng: 106.69, radius: 100 } };
    const g = Geofence.createTracker();
    assert.ok(g.update(at(big, 80), [big]));
    const small = { code: 'SMALL', geo: { lat: 10.78, lng: 106.69, radius: 5 } };
    const g2 = Geofence.createTracker();
    assert.strictEqual(g2.update(at(small, 8), [small]), null);
    assert.ok(g2.update(at(small, 4), [small]));
});

test('reset: bật lại tính năng khi đang đứng trong vùng thì gợi ý ngay', () => {
    const g = Geofence.createTracker();
    assert.ok(g.update(at(tank, 5), [tank]));
    assert.strictEqual(g.update(at(tank, 5), [tank]), null);
    g.reset();
    assert.ok(g.update(at(tank, 5), [tank]));
});

test('bỏ qua vị trí không hợp lệ và công trình chưa có tọa độ', () => {
    const g = Geofence.createTracker();
    assert.strictEqual(g.update(null, [tank]), null);
    assert.strictEqual(g.update({ lat: NaN, lng: 1 }, [tank]), null);
    assert.strictEqual(g.update(at(tank, 5), [{ code: 'X' }, { code: 'Y', geo: null }]), null);
});
