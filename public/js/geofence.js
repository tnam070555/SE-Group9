// Logic geofence (vùng gợi ý quanh công trình), tách riêng khỏi giao diện để test được bằng node --test.
// Dùng ở trình duyệt (biến toàn cục Geofence) và ở Node (require).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Geofence = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_RADIUS = 20;     // mét, khi công trình chưa đặt bán kính
  const MAX_ACCURACY = 50;       // mét: GPS sai số lớn hơn mức này thì bỏ qua (tránh gợi ý nhầm phòng)
  const EXIT_FACTOR = 1.5;       // phải đi ra xa 1,5 lần bán kính mới được gợi ý lại (tránh nhấp nháy ở mép vùng)

  // Khoảng cách giữa 2 tọa độ (mét), công thức Haversine
  function distanceM(a, b) {
    const R = 6371000;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function radiusOf(poi) {
    const r = poi && poi.geo && poi.geo.radius;
    return Number.isFinite(r) && r > 0 ? r : DEFAULT_RADIUS;
  }

  // Bộ theo dõi: mỗi công trình chỉ được gợi ý MỘT lần cho đến khi du khách đi ra khỏi vùng.
  //   update(position, pois) -> công trình cần gợi ý (gần nhất), hoặc null
  //   position: { lat, lng, accuracy }   pois: [{ code, geo: { lat, lng, radius } }]
  function createTracker(options) {
    const maxAccuracy = (options && options.maxAccuracy) || MAX_ACCURACY;
    const exitFactor = (options && options.exitFactor) || EXIT_FACTOR;
    const notified = new Set(); // các công trình đã gợi ý và du khách chưa rời vùng

    return {
      update(position, pois) {
        if (!position || !Number.isFinite(position.lat) || !Number.isFinite(position.lng)) return null;
        // GPS quá kém: không kết luận gì, giữ nguyên trạng thái
        if (Number.isFinite(position.accuracy) && position.accuracy > maxAccuracy) return null;

        const entered = [];
        for (const poi of pois) {
          if (!poi || !poi.geo) continue;
          const d = distanceM(position, poi.geo);
          const r = radiusOf(poi);
          if (notified.has(poi.code)) {
            if (d > r * exitFactor) notified.delete(poi.code); // đã rời vùng: lần sau vào lại sẽ gợi ý tiếp
          } else if (d <= r) {
            entered.push({ poi, distance: d });
          }
        }
        if (!entered.length) return null;
        // Nhiều vùng chồng nhau: gợi ý công trình gần nhất, các công trình còn lại coi như đã báo
        // (danh sách trong trang vẫn xếp theo khoảng cách) để không có thông báo nối tiếp liên tục.
        entered.sort((x, y) => x.distance - y.distance);
        entered.forEach((e) => notified.add(e.poi.code));
        return { poi: entered[0].poi, distance: entered[0].distance };
      },
      // Quên trạng thái (khi du khách bật lại tính năng: nếu đang đứng trong vùng thì gợi ý ngay)
      reset() { notified.clear(); },
      has(code) { return notified.has(code); },
    };
  }

  return { createTracker, distanceM, radiusOf, DEFAULT_RADIUS, MAX_ACCURACY, EXIT_FACTOR };
});
