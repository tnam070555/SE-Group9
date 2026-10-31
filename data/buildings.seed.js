// Dữ liệu mẫu: các công trình tại Dinh Độc Lập (nạp khi database còn trống hoặc khi chạy seed).
// Trường location theo khu vực (categorySlug). Bản dịch do AI soạn, cần người thành thạo ngôn ngữ kiểm tra.
module.exports = [
  {
    code: 'DDL-01',
    name: 'Phòng Khánh Tiết',
    categorySlug: 'tang-tret',
    location: 'Tầng trệt – Dinh Độc Lập',
    description: 'Phòng Khánh Tiết là không gian lớn nhất tại Dinh Độc Lập với sức chứa lên đến 500 người. Đây là nơi diễn ra các lễ ra mắt nội các, hội nghị quốc tế và các buổi dạ yến lịch sử.',
    translations: {
      en: {
        name: 'Grand Reception Hall',
        location: 'Ground floor – Independence Palace',
        description: 'The Grand Reception Hall is the largest space in Independence Palace, with a capacity of up to 500 people. It is where cabinet inaugurations, international conferences and historic banquets took place.'
      },
      ja: {
        name: '式典の間',
        location: '1階 – 独立宮殿',
        description: '式典の間は独立宮殿で最も広い空間で、最大500人を収容できます。内閣の就任式、国際会議、歴史的な晩餐会が行われた場所です。'
      },
      ko: {
        name: '대연회장',
        location: '1층 – 독립궁',
        description: '대연회장은 독립궁에서 가장 넓은 공간으로 최대 500명을 수용할 수 있습니다. 내각 출범식, 국제회의, 역사적인 만찬이 열린 곳입니다.'
      },
      zh: {
        name: '庆典厅',
        location: '一楼 – 独立宫',
        description: '庆典厅是独立宫内最大的空间，可容纳多达500人。这里曾举行内阁就职仪式、国际会议和历史性的宴会。'
      }
    }
  },
  {
    code: 'DDL-02',
    name: 'Phòng Trình Quốc Thư',
    categorySlug: 'lau-2',
    location: 'Lầu 2 – Dinh Độc Lập',
    description: "Phòng Trình Quốc Thư là nơi Tổng thống nhận quốc thư của đại sứ các nước. Bức tranh sơn mài 'Bình Ngô Đại Cáo' trang trí trên tường mang đậm nét nghệ thuật truyền thống.",
    translations: {
      en: {
        name: 'Credentials Presentation Room',
        location: 'Second floor – Independence Palace',
        description: 'The Credentials Presentation Room is where the President received the letters of credence of foreign ambassadors. The lacquer painting “Bình Ngô Đại Cáo” decorating the wall is rich in traditional art.'
      },
      ja: {
        name: '信任状奉呈の間',
        location: '3階 – 独立宮殿',
        description: '信任状奉呈の間は、大統領が各国大使から信任状を受け取る場所です。壁を飾る漆絵「平呉大誥（ビンゴーダイカオ）」は、伝統芸術の趣にあふれています。'
      },
      ko: {
        name: '신임장 제정실',
        location: '3층 – 독립궁',
        description: "신임장 제정실은 대통령이 각국 대사로부터 신임장을 받던 곳입니다. 벽을 장식한 옻칠화 '평오대고(빈응오 다이까오)'는 전통 예술의 정취가 짙게 배어 있습니다."
      },
      zh: {
        name: '呈递国书厅',
        location: '三楼 – 独立宫',
        description: '呈递国书厅是总统接受各国大使国书的地方。墙上装饰的漆画《平吴大诰》充满传统艺术气息。'
      }
    }
  },
  {
    code: 'DDL-03',
    name: 'Phòng Hợp Hội Đồng Bộ Trưởng',
    categorySlug: 'lau-2',
    location: 'Lầu 2 – Dinh Độc Lập',
    description: 'Nơi diễn ra các phiên họp kín của Nội các chính quyền Sài Gòn cũ với hệ thống tai nghe phiên dịch đa ngôn ngữ hiện đại thời bấy giờ.',
    translations: {
      en: {
        name: 'Council of Ministers Meeting Room',
        location: 'Second floor – Independence Palace',
        description: 'The venue of the closed-door sessions of the former Saigon government’s Cabinet, equipped with a multilingual interpretation headset system that was modern for its time.'
      },
      ja: {
        name: '閣僚会議室',
        location: '3階 – 独立宮殿',
        description: '旧サイゴン政権の内閣が非公開の会議を開いた場所で、当時としては最新の多言語通訳用ヘッドホン設備を備えていました。'
      },
      ko: {
        name: '각료 회의실',
        location: '3층 – 독립궁',
        description: '옛 사이공 정권 내각의 비공개 회의가 열리던 곳으로, 당시로서는 최신식이던 다국어 통역 이어폰 시스템을 갖추고 있었습니다.'
      },
      zh: {
        name: '部长会议厅',
        location: '三楼 – 独立宫',
        description: '这里是旧西贡政权内阁举行秘密会议的地方，配备了当时先进的多语种翻译耳机系统。'
      }
    }
  },
  {
    code: 'DDL-04',
    name: 'Bến Đáp Trực Thăng & F5E',
    categorySlug: 'san-thuong',
    location: 'Tầng sân thượng – Dinh Độc Lập',
    description: 'Nơi đỗ chiếc trực thăng UH-1. Ghi dấu sự kiện phi công Nguyễn Thành Trung lái máy bay F5E ném bom vào sáng ngày 8 tháng 4 năm 1975.',
    translations: {
      en: {
        name: 'Helipad & F-5E',
        location: 'Rooftop – Independence Palace',
        description: 'The parking spot of a UH-1 helicopter. It commemorates the event in which pilot Nguyễn Thành Trung flew an F-5E aircraft and dropped bombs on the morning of 8 April 1975.'
      },
      ja: {
        name: 'ヘリポートとF-5E',
        location: '屋上 – 独立宮殿',
        description: 'UH-1ヘリコプターが駐機していた場所です。パイロットのグエン・タイン・チュンがF-5E戦闘機で1975年4月8日の朝に爆撃を行った出来事を記念しています。'
      },
      ko: {
        name: '헬기장 & F-5E',
        location: '옥상 – 독립궁',
        description: 'UH-1 헬리콥터가 주기되어 있던 곳입니다. 조종사 응우옌 타인 쭝이 F-5E 전투기를 몰고 1975년 4월 8일 아침에 폭격한 사건을 기억하는 장소입니다.'
      },
      zh: {
        name: '直升机停机坪与F-5E',
        location: '屋顶 – 独立宫',
        description: '这里是UH-1直升机停放的地方，记录着飞行员阮成忠于1975年4月8日上午驾驶F-5E战机进行轰炸的事件。'
      }
    }
  },
  {
    code: 'DDL-05',
    name: 'Xe Tăng 390 & Cổng Chính',
    categorySlug: 'ngoai-troi',
    location: 'Khuôn viên ngoài trời – Dinh Độc Lập',
    description: 'Chiếc xe tăng 390 huyền thoại đã húc văng cổng phụ Dinh Độc Lập vào lúc 10 giờ 45 phút ngày 30/4/1975, đánh dấu thời khắc hoàn toàn giải phóng miền Nam.',
    translations: {
      en: {
        name: 'Tank 390 & the Main Gate',
        location: 'Outdoor grounds – Independence Palace',
        description: 'The legendary Tank 390 smashed through the side gate of Independence Palace at 10:45 on 30 April 1975, marking the moment of the complete liberation of the South.'
      },
      ja: {
        name: '390号戦車と正門',
        location: '屋外（前庭） – 独立宮殿',
        description: '伝説の390号戦車は、1975年4月30日10時45分に独立宮殿の通用門を突き破り、南部が完全に解放された瞬間を告げました。'
      },
      ko: {
        name: '390호 전차와 정문',
        location: '야외 부지 – 독립궁',
        description: '전설적인 390호 전차는 1975년 4월 30일 10시 45분에 독립궁의 쪽문을 들이받아 열었으며, 남부가 완전히 해방된 순간을 알렸습니다.'
      },
      zh: {
        name: '390号坦克与正门',
        location: '室外场地 – 独立宫',
        description: '传奇的390号坦克于1975年4月30日10时45分撞开独立宫侧门，标志着南方全面解放的时刻。'
      }
    }
  },
  {
    code: 'DDL-06',
    name: 'Khu Hầm Tác Chiến Lịch Sử',
    categorySlug: 'tang-ham',
    location: 'Tầng hầm – Dinh Độc Lập',
    description: 'Hệ thống hầm kiên cố chịu được bom đạn hạng nặng, chứa đài vô tuyến, bản đồ tác chiến và phòng làm việc của Tổng thống.',
    translations: {
      en: {
        name: 'Historic War Command Bunker',
        location: 'Basement – Independence Palace',
        description: 'A fortified bunker system able to withstand heavy bombs and shells, housing radio equipment, battle maps and the President’s office.'
      },
      ja: {
        name: '歴史的な作戦指令地下壕',
        location: '地下 – 独立宮殿',
        description: '重爆撃にも耐える堅固な地下壕で、無線設備、作戦地図、大統領の執務室が置かれていました。'
      },
      ko: {
        name: '역사적인 지하 작전 벙커',
        location: '지하 – 독립궁',
        description: '중폭탄과 포격에도 견디는 견고한 지하 벙커 시설로, 무선 통신 장비와 작전 지도, 대통령 집무실이 있었습니다.'
      },
      zh: {
        name: '历史性作战指挥地下室',
        location: '地下室 – 独立宫',
        description: '坚固的地下掩体系统，可抵御重型炸弹和炮火，内设无线电台、作战地图和总统办公室。'
      }
    }
  },
  {
    code: 'DDL-07',
    name: 'Phòng Làm Việc Của Tổng Thống',
    categorySlug: 'lau-1',
    location: 'Lầu 1 – Dinh Độc Lập',
    description: 'Không gian làm việc chính thức của Tổng thống, được bài trí trang trọng với các bản đồ quân sự và sa bàn chiến lược.',
    translations: {
      en: {
        name: 'Presidential Office',
        description: 'The official workspace of the President.',
        location: 'First floor – Independence Palace'
      },
      ja: {
        name: '大統領執務室',
        description: '大統領の公式な執務空間です。',
        location: '2階 – 独立宮殿'
      },
      ko: {
        name: '대통령 집무실',
        description: '대통령의 공식 집무실입니다.',
        location: '2층 – 독립궁'
      },
      zh: {
        name: '总统办公室',
        description: '总统的官方办公场所。',
        location: '二楼 – 独立宫'
      }
    }
  },
  {
    code: 'DDL-08',
    name: 'Xe Tăng 843',
    categorySlug: 'ngoai-troi',
    location: 'Khuôn viên ngoài trời – Dinh Độc Lập',
    description: 'Cùng với xe tăng 390, xe tăng 843 do đồng chí Bùi Quang Thận chỉ huy đã húc tung cổng chính của Dinh Độc Lập vào trưa ngày 30/4/1975.',
    translations: {
      en: {
        name: 'Tank 843',
        description: 'Along with Tank 390, Tank 843 commanded by comrade Bui Quang Than crashed through the main gate of Independence Palace at noon on April 30, 1975.',
        location: 'Outdoor grounds – Independence Palace'
      },
      ja: {
        name: '843号戦車',
        description: '390号戦車とともに、1975年4月30日正午に独立宮殿の正門を突き破った戦車です。',
        location: '屋外（前庭） – 独立宮殿'
      },
      ko: {
        name: '843호 전차',
        description: '390호 전차와 함께 1975년 4월 30일 정오에 독립궁의 정문을 부수고 들어온 전차입니다.',
        location: '야외 부지 – 독립궁'
      },
      zh: {
        name: '843号坦克',
        description: '与390号坦克一起，于1975年4月30日中午撞开独立宫正门的坦克。',
        location: '室外场地 – 独立宫'
      }
    }
  },
  {
    code: 'DDL-09',
    name: 'Phòng Đại Yến',
    categorySlug: 'tang-tret',
    location: 'Tầng trệt – Dinh Độc Lập',
    description: 'Nơi tổ chức các buổi tiệc chiêu đãi quốc gia với sức chứa hơn 100 khách. Bàn ăn được bố trí theo hình chữ U với các trang thiết bị bàn tiệc sang trọng.',
    translations: {
      en: {
        name: 'State Banquet Hall',
        description: 'The venue for state banquets with a capacity of over 100 guests, featuring a U-shaped table arrangement and luxurious dining equipment.',
        location: 'Ground floor – Independence Palace'
      },
      ja: {
        name: '大宴会場',
        description: '100名以上の賓客を収容できる国家晩餐会の会場です。',
        location: '1階 – 独立宮殿'
      },
      ko: {
        name: '국가 연회장',
        description: '100명 이상의 국빈을 수용할 수 있는 국가 연회장입니다.',
        location: '1층 – 독립궁'
      },
      zh: {
        name: '国宴厅',
        description: '可容纳100多名宾客的国宴举办地。',
        location: '一楼 – 独立宫'
      }
    }
  },
  {
    code: 'DDL-10',
    name: 'Phòng Khách Của Phó Tổng Thống',
    categorySlug: 'lau-1',
    location: 'Lầu 1 – Dinh Độc Lập',
    description: 'Không gian tiếp khách riêng của Phó Tổng thống, được trang trí bằng các tác phẩm nghệ thuật truyền thống như tranh sơn mài và đồ gốm sứ.',
    translations: {
      en: {
        name: 'Vice President’s Reception Room',
        description: 'The private reception area of the Vice President, decorated with traditional artworks such as lacquer paintings and ceramics.',
        location: 'First floor – Independence Palace'
      },
      ja: {
        name: '副大統領の応接室',
        description: '副大統領の私的な応接空間で、漆絵や陶磁器などの伝統的な芸術作品で飾られています。',
        location: '2階 – 独立宮殿'
      },
      ko: {
        name: '부통령 접견실',
        description: '부통령의 개인 접견 공간으로, 옻칠화와 도자기 등 전통 예술품으로 장식되어 있습니다.',
        location: '2층 – 독립궁'
      },
      zh: {
        name: '副总统接待室',
        description: '副总统的私人接待空间，装饰有漆画和陶瓷等传统艺术品。',
        location: '二楼 – 独立宫'
      }
    }
  },
  {
    code: 'DDL-11',
    name: 'Khu Sinh Hoạt Gia Đình Tổng Thống',
    categorySlug: 'lau-2',
    location: 'Lầu 2 – Dinh Độc Lập',
    description: 'Khu vực riêng tư phía sau lầu 2 bao gồm phòng ngủ, phòng ăn gia đình và sân trong, nơi gia đình Tổng thống sinh sống thường ngày.',
    translations: {
      en: {
        name: 'Presidential Family Living Quarters',
        description: 'The private area at the back of the 2nd floor including bedrooms, a family dining room, and an inner courtyard where the President’s family lived.',
        location: 'Second floor – Independence Palace'
      },
      ja: {
        name: '大統領家族の居住区',
        description: '大統領の家族が日常生活を送っていた、寝室、家族用食堂、中庭を含む3階後方の私的なエリアです。',
        location: '3階 – 独立宮殿'
      },
      ko: {
        name: '대통령 가족 거주 구역',
        description: '대통령 가족이 일상생활을 하던 곳으로, 침실, 가족 식당, 안뜰이 있는 3층 뒤쪽의 개인 구역입니다.',
        location: '3층 – 독립궁'
      },
      zh: {
        name: '总统家族生活区',
        description: '位于三楼后部的私人区域，包括卧室、家庭餐厅和内庭院，是总统家族日常生活的地方。',
        location: '三楼 – 独立宫'
      }
    }
  },
  {
    code: 'DDL-12',
    name: 'Phòng Chiếu Phim & Giải Trí',
    categorySlug: 'san-thuong',
    location: 'Tầng sân thượng – Dinh Độc Lập',
    description: 'Nằm ở lầu cao nhất, phòng được trang bị máy chiếu phim màn ảnh rộng, bàn bi-da và quầy bar để phục vụ nhu cầu giải trí.',
    translations: {
      en: {
        name: 'Cinema & Entertainment Room',
        description: 'Located on the top floor, the room is equipped with a widescreen film projector, a billiard table, and a bar for entertainment purposes.',
        location: 'Rooftop – Independence Palace'
      },
      ja: {
        name: '映画＆娯楽室',
        description: '最上階に位置し、ワイドスクリーン映画プロジェクター、ビリヤード台、バーを備えた娯楽目的の部屋です。',
        location: '屋上 – 独立宮殿'
      },
      ko: {
        name: '영화 및 오락실',
        description: '최상층에 위치하며, 와이드 스크린 영화 프로젝터, 당구대, 바를 갖춘 오락용 방입니다.',
        location: '옥상 – 독립궁'
      },
      zh: {
        name: '电影与娱乐室',
        description: '位于最高层，配备宽银幕电影放映机、台球桌和吧台，供娱乐之用。',
        location: '屋顶 – 独立宫'
      }
    }
  },
  {
    code: 'DDL-13',
    name: 'Đài Phát Thanh Dự Phòng',
    categorySlug: 'tang-ham',
    location: 'Tầng hầm – Dinh Độc Lập',
    description: 'Hệ thống thiết bị vô tuyến điện và máy phát sóng dự phòng, đảm bảo thông tin liên lạc không bị gián đoạn trong tình trạng khẩn cấp.',
    translations: {
      en: {
        name: 'Backup Radio Broadcasting Station',
        description: 'The backup radio equipment and broadcasting system, ensuring uninterrupted communication during emergencies.',
        location: 'Basement – Independence Palace'
      },
      ja: {
        name: '予備ラジオ放送局',
        description: '緊急時に通信が途絶えないようにするための予備の無線設備と放送システムです。',
        location: '地下 – 独立宮殿'
      },
      ko: {
        name: '예비 라디오 방송국',
        description: '비상시 통신이 끊기지 않도록 하는 예비 무선 장비 및 방송 시스템입니다.',
        location: '지하 – 독립궁'
      },
      zh: {
        name: '备用广播电台',
        description: '备用无线电设备和广播系统，确保在紧急情况下通信不受中断。',
        location: '地下室 – 独立宫'
      }
    }
  },
  {
    code: 'DDL-14',
    name: 'Phòng Khách Của Phu Nhân',
    categorySlug: 'lau-1',
    location: 'Lầu 1 – Dinh Độc Lập',
    description: 'Nơi Phu nhân Tổng thống tiếp đón các phu nhân đại sứ và khách quý. Căn phòng được trang trí thanh lịch, nữ tính với màu sắc tươi sáng và nhiều bức tranh nghệ thuật.',
    translations: {
      en: {
        name: 'First Lady’s Reception Room',
        description: 'The place where the First Lady received ambassadors’ wives and distinguished guests. The room is decorated in an elegant, feminine style with bright colors and artworks.',
        location: 'First floor – Independence Palace'
      },
      ja: {
        name: '大統領夫人の応接室',
        description: '大統領夫人が大使夫人や貴賓をもてなした場所です。部屋は明るい色彩と芸術作品で上品かつ女性的に装飾されています。',
        location: '2階 – 独立宮殿'
      },
      ko: {
        name: '영부인 접견실',
        description: '영부인이 대사 부인들과 귀빈들을 맞이하던 곳입니다. 방은 밝은 색상과 예술 작품들로 우아하고 여성스럽게 장식되어 있습니다.',
        location: '2층 – 독립궁'
      },
      zh: {
        name: '第一夫人接待室',
        description: '第一夫人接待大使夫人和贵宾的地方。房间以明亮的色彩和艺术品装饰，优雅而富有女性气息。',
        location: '二楼 – 独立宫'
      }
    }
  },
  {
    code: 'DDL-15',
    name: 'Thư Viện Tổng Thống',
    categorySlug: 'lau-2',
    location: 'Lầu 2 – Dinh Độc Lập',
    description: 'Không gian tĩnh lặng lưu trữ hàng ngàn cuốn sách quý, tài liệu lịch sử và sách luật, nơi Tổng thống thường xuyên đến đọc sách và nghiên cứu tài liệu.',
    translations: {
      en: {
        name: 'Presidential Library',
        description: 'A quiet space storing thousands of rare books, historical documents, and law books, where the President frequently read and researched.',
        location: 'Second floor – Independence Palace'
      },
      ja: {
        name: '大統領の図書室',
        description: '何千冊もの希少な本、歴史的文書、法律書が保管されている静かな空間で、大統領が頻繁に読書や研究を行っていました。',
        location: '3階 – 独立宮殿'
      },
      ko: {
        name: '대통령 도서실',
        description: '수천 권의 귀중한 도서, 역사 문서, 법률 서적이 보관되어 있는 조용한 공간으로, 대통령이 자주 독서와 연구를 하던 곳입니다.',
        location: '3층 – 독립궁'
      },
      zh: {
        name: '总统阅览室',
        description: '一个安静的空间，藏有数千本珍贵书籍、历史文献和法律书籍，总统经常在这里阅读和研究。',
        location: '三楼 – 独立宫'
      }
    }
  },
  {
    code: 'DDL-16',
    name: 'Khu Vực Nhà Bếp',
    categorySlug: 'tang-ham',
    location: 'Tầng hầm – Dinh Độc Lập',
    description: 'Khu vực bếp rộng lớn được trang bị các thiết bị nấu nướng hiện đại bằng thép không gỉ vào thời bấy giờ, chịu trách nhiệm phục vụ hàng trăm suất ăn cho các buổi dạ tiệc lớn.',
    translations: {
      en: {
        name: 'Palace Kitchen',
        description: 'A spacious kitchen area equipped with what were then modern stainless steel cooking appliances, responsible for serving hundreds of meals for large banquets.',
        location: 'Basement – Independence Palace'
      },
      ja: {
        name: '宮殿の厨房',
        description: '当時としては最新のステンレス製調理器具を備えた広々とした厨房エリアで、大規模な晩餐会のために何百人分もの食事を提供する役割を担っていました。',
        location: '地下 – 独立宮殿'
      },
      ko: {
        name: '궁전 주방',
        description: '당시로서는 최신식인 스테인리스 스틸 조리 기구를 갖춘 넓은 주방으로, 대규모 만찬을 위해 수백 명분의 식사를 준비하는 곳이었습니다.',
        location: '지하 – 독립궁'
      },
      zh: {
        name: '宫殿厨房',
        description: '宽敞的厨房区域，配备了当时先进的不锈钢烹饪设备，负责为大型宴会提供数百份餐食。',
        location: '地下室 – 独立宫'
      }
    }
  }
];
