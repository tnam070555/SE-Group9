// Các khu vực mặc định của Dinh Độc Lập. slug khớp với categorySlug của công trình trong buildings.seed.js.
module.exports = [
    { slug: 'tang-tret', order: 1, icon: 'fa-door-open', name: 'Tầng trệt', translations: { en: 'Ground floor', ja: '1階', ko: '1층', zh: '一楼' } },
    { slug: 'lau-1', order: 2, icon: 'fa-stairs', name: 'Lầu 1', translations: { en: 'First floor', ja: '2階', ko: '2층', zh: '二楼' } },
    { slug: 'lau-2', order: 3, icon: 'fa-stairs', name: 'Lầu 2', translations: { en: 'Second floor', ja: '3階', ko: '3층', zh: '三楼' } },
    { slug: 'san-thuong', order: 4, icon: 'fa-sun', name: 'Tầng sân thượng', translations: { en: 'Rooftop', ja: '屋上', ko: '옥상', zh: '屋顶' } },
    { slug: 'tang-ham', order: 5, icon: 'fa-lock', name: 'Tầng hầm', translations: { en: 'Basement', ja: '地下', ko: '지하', zh: '地下室' } },
    { slug: 'ngoai-troi', order: 6, icon: 'fa-tree', name: 'Khuôn viên ngoài trời', translations: { en: 'Outdoor grounds', ja: '屋外（前庭）', ko: '야외 부지', zh: '室外场地' } },
];
