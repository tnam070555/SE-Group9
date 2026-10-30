// Dữ liệu mẫu: các công trình tại Dinh Độc Lập (nạp tự động khi database còn trống).
// Bản dịch (en, ja, ko, zh) được soạn sẵn để demo chạy được mà không cần dịch vụ dịch bên ngoài.
// LƯU Ý: nội dung lịch sử và bản dịch cần được đối chiếu với nguồn chính thống / người thành thạo ngôn ngữ trước khi nộp.
module.exports = [
    {
        code: 'DDL-01', name: 'Phòng Khánh Tiết', location: 'Tầng trệt - Dinh Độc Lập',
        description: 'Phòng Khánh Tiết là không gian lớn nhất tại Dinh Độc Lập với sức chứa lên đến 500 người. Đây là nơi diễn ra các lễ ra mắt nội các, hội nghị quốc tế và các buổi dạ yến lịch sử.',
        translations: {
            en: { name: 'Grand Reception Hall', location: 'Ground floor – Independence Palace',
                description: 'The Grand Reception Hall is the largest space in Independence Palace, with a capacity of up to 500 people. It is where cabinet inaugurations, international conferences and historic banquets took place.' },
            ja: { name: '式典の間', location: '1階 – 独立宮殿',
                description: '式典の間は独立宮殿で最も広い空間で、最大500人を収容できます。内閣の就任式、国際会議、歴史的な晩餐会が行われた場所です。' },
            ko: { name: '대연회장', location: '1층 – 독립궁',
                description: '대연회장은 독립궁에서 가장 넓은 공간으로 최대 500명을 수용할 수 있습니다. 내각 출범식, 국제회의, 역사적인 만찬이 열린 곳입니다.' },
            zh: { name: '庆典厅', location: '一楼 – 独立宫',
                description: '庆典厅是独立宫内最大的空间，可容纳多达500人。这里曾举行内阁就职仪式、国际会议和历史性的宴会。' },
        },
    },
    {
        code: 'DDL-02', name: 'Phòng Trình Quốc Thư', location: 'Tầng 2 - Dinh Độc Lập',
        description: "Phòng Trình Quốc Thư là nơi Tổng thống nhận quốc thư của đại sứ các nước. Bức tranh sơn mài 'Bình Ngô Đại Cáo' trang trí trên tường mang đậm nét nghệ thuật truyền thống.",
        translations: {
            en: { name: 'Credentials Presentation Room', location: '2nd floor – Independence Palace',
                description: 'The Credentials Presentation Room is where the President received the letters of credence of foreign ambassadors. The lacquer painting “Bình Ngô Đại Cáo” decorating the wall is rich in traditional art.' },
            ja: { name: '信任状奉呈の間', location: '2階 – 独立宮殿',
                description: '信任状奉呈の間は、大統領が各国大使から信任状を受け取る場所です。壁を飾る漆絵「平呉大誥（ビンゴーダイカオ）」は、伝統芸術の趣にあふれています。' },
            ko: { name: '신임장 제정실', location: '2층 – 독립궁',
                description: "신임장 제정실은 대통령이 각국 대사로부터 신임장을 받던 곳입니다. 벽을 장식한 옻칠화 '평오대고(빈응오 다이까오)'는 전통 예술의 정취가 짙게 배어 있습니다." },
            zh: { name: '呈递国书厅', location: '二楼 – 独立宫',
                description: '呈递国书厅是总统接受各国大使国书的地方。墙上装饰的漆画《平吴大诰》充满传统艺术气息。' },
        },
    },
    {
        code: 'DDL-03', name: 'Phòng Hợp Hội Đồng Bộ Trưởng', location: 'Tầng 2 - Dinh Độc Lập',
        description: 'Nơi diễn ra các phiên họp kín của Nội các chính quyền Sài Gòn cũ với hệ thống tai nghe phiên dịch đa ngôn ngữ hiện đại thời bấy giờ.',
        translations: {
            en: { name: 'Council of Ministers Meeting Room', location: '2nd floor – Independence Palace',
                description: 'The venue of the closed-door sessions of the former Saigon government’s Cabinet, equipped with a multilingual interpretation headset system that was modern for its time.' },
            ja: { name: '閣僚会議室', location: '2階 – 独立宮殿',
                description: '旧サイゴン政権の内閣が非公開の会議を開いた場所で、当時としては最新の多言語通訳用ヘッドホン設備を備えていました。' },
            ko: { name: '각료 회의실', location: '2층 – 독립궁',
                description: '옛 사이공 정권 내각의 비공개 회의가 열리던 곳으로, 당시로서는 최신식이던 다국어 통역 이어폰 시스템을 갖추고 있었습니다.' },
            zh: { name: '部长会议厅', location: '二楼 – 独立宫',
                description: '这里是旧西贡政权内阁举行秘密会议的地方，配备了当时先进的多语种翻译耳机系统。' },
        },
    },
    {
        code: 'DDL-04', name: 'Bến Đáp Trực Thăng & F5E', location: 'Tầng sân thượng - Dinh Độc Lập',
        description: 'Nơi đỗ chiếc trực thăng UH-1. Ghi dấu sự kiện phi công Nguyễn Thành Trung lái máy bay F5E ném bom vào sáng ngày 8 tháng 4 năm 1975.',
        translations: {
            en: { name: 'Helipad & F-5E', location: 'Rooftop – Independence Palace',
                description: 'The parking spot of a UH-1 helicopter. It commemorates the event in which pilot Nguyễn Thành Trung flew an F-5E aircraft and dropped bombs on the morning of 8 April 1975.' },
            ja: { name: 'ヘリポートとF-5E', location: '屋上 – 独立宮殿',
                description: 'UH-1ヘリコプターが駐機していた場所です。パイロットのグエン・タイン・チュンがF-5E戦闘機で1975年4月8日の朝に爆撃を行った出来事を記念しています。' },
            ko: { name: '헬기장 & F-5E', location: '옥상 – 독립궁',
                description: 'UH-1 헬리콥터가 주기되어 있던 곳입니다. 조종사 응우옌 타인 쭝이 F-5E 전투기를 몰고 1975년 4월 8일 아침에 폭격한 사건을 기억하는 장소입니다.' },
            zh: { name: '直升机停机坪与F-5E', location: '屋顶 – 独立宫',
                description: '这里是UH-1直升机停放的地方，记录着飞行员阮成忠于1975年4月8日上午驾驶F-5E战机进行轰炸的事件。' },
        },
    },
    {
        code: 'DDL-05', name: 'Xe Tăng 390 & Cổng Chính', location: 'Khuôn viên bãi cỏ phía trước',
        description: 'Chiếc xe tăng 390 huyền thoại đã húc văng cổng phụ Dinh Độc Lập vào lúc 10 giờ 45 phút ngày 30/4/1975, đánh dấu thời khắc hoàn toàn giải phóng miền Nam.',
        translations: {
            en: { name: 'Tank 390 & the Main Gate', location: 'Front lawn grounds',
                description: 'The legendary Tank 390 smashed through the side gate of Independence Palace at 10:45 on 30 April 1975, marking the moment of the complete liberation of the South.' },
            ja: { name: '390号戦車と正門', location: '前庭の芝生',
                description: '伝説の390号戦車は、1975年4月30日10時45分に独立宮殿の通用門を突き破り、南部が完全に解放された瞬間を告げました。' },
            ko: { name: '390호 전차와 정문', location: '앞쪽 잔디밭',
                description: '전설적인 390호 전차는 1975년 4월 30일 10시 45분에 독립궁의 쪽문을 들이받아 열었으며, 남부가 완전히 해방된 순간을 알렸습니다.' },
            zh: { name: '390号坦克与正门', location: '前方草坪',
                description: '传奇的390号坦克于1975年4月30日10时45分撞开独立宫侧门，标志着南方全面解放的时刻。' },
        },
    },
    {
        code: 'DDL-06', name: 'Khu Hầm Tác Chiến Lịch Sử', location: 'Tầng hầm - Dinh Độc Lập',
        description: 'Hệ thống hầm kiên cố chịu được bom đạn hạng nặng, chứa đài vô tuyến, bản đồ tác chiến và phòng làm việc của Tổng thống.',
        translations: {
            en: { name: 'Historic War Command Bunker', location: 'Basement – Independence Palace',
                description: 'A fortified bunker system able to withstand heavy bombs and shells, housing radio equipment, battle maps and the President’s office.' },
            ja: { name: '歴史的な作戦指令地下壕', location: '地下 – 独立宮殿',
                description: '重爆撃にも耐える堅固な地下壕で、無線設備、作戦地図、大統領の執務室が置かれていました。' },
            ko: { name: '역사적인 지하 작전 벙커', location: '지하 – 독립궁',
                description: '중폭탄과 포격에도 견디는 견고한 지하 벙커 시설로, 무선 통신 장비와 작전 지도, 대통령 집무실이 있었습니다.' },
            zh: { name: '历史性作战指挥地下室', location: '地下室 – 独立宫',
                description: '坚固的地下掩体系统，可抵御重型炸弹和炮火，内设无线电台、作战地图和总统办公室。' },
        },
    },
];
