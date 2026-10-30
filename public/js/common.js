// Hàm dùng chung cho index.html và detail.html

// ---------- Tiện ích DOM ----------

// Tạo phần tử bằng textContent (không dùng innerHTML) để dữ liệu từ server không chèn được mã độc (XSS)
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(classes) {
  return el('i', classes);
}

// Gọi API, ném lỗi có thông báo nếu server trả lỗi
async function fetchJson(url) {
  const res = await fetch(url);
  let body = null;
  try { body = await res.json(); } catch (e) { /* không phải JSON */ }
  if (!res.ok) throw new Error((body && body.message) || `Lỗi ${res.status}`);
  return body;
}

// ---------- Chữ giao diện theo ngôn ngữ (trang du khách) ----------

const UI = {
  vi: {
    back: 'Danh sách', subtitle: 'Dinh Độc Lập - Thuyết Minh Tự Động', loading: 'Đang tải thông tin...',
    play: 'Phát Thuyết Minh', stop: 'Dừng', errTitle: 'Không mở được công trình',
    missingCode: 'Thiếu mã công trình trong đường dẫn. Hãy quét lại mã QR hoặc chọn từ danh sách.',
    noSpeech: 'Thiết bị này không hỗ trợ đọc thuyết minh, bạn có thể đọc nội dung phía trên.',
    noVoice: 'Thiết bị có thể chưa cài giọng đọc cho ngôn ngữ này, nên có thể không nghe được. Bạn vẫn có thể đọc nội dung phía trên.',
    fallback: 'Công trình này chưa có bản dịch, đang hiển thị tiếng Việt.',
  },
  en: {
    back: 'List', subtitle: 'Independence Palace – Automatic Audio Guide', loading: 'Loading...',
    play: 'Play Audio Guide', stop: 'Stop', errTitle: 'Unable to open this exhibit',
    missingCode: 'The exhibit code is missing from the link. Please scan the QR code again or choose from the list.',
    noSpeech: 'This device does not support speech. You can read the text above.',
    noVoice: 'This device may not have a voice for this language, so you may not hear anything. You can still read the text above.',
    fallback: 'This exhibit has no translation yet; showing Vietnamese.',
  },
  ja: {
    back: '一覧', subtitle: '独立宮殿 – 自動音声ガイド', loading: '読み込み中...',
    play: '音声ガイドを再生', stop: '停止', errTitle: 'この展示を開けません',
    missingCode: 'リンクに展示コードがありません。QRコードをもう一度スキャンするか、一覧から選んでください。',
    noSpeech: 'この端末は音声読み上げに対応していません。上の文章をお読みください。',
    noVoice: 'この端末にはこの言語の音声が入っていない可能性があり、再生されないことがあります。上の文章をお読みください。',
    fallback: 'この展示の翻訳はまだありません。ベトナム語で表示しています。',
  },
  ko: {
    back: '목록', subtitle: '독립궁 – 자동 음성 안내', loading: '불러오는 중...',
    play: '음성 안내 듣기', stop: '정지', errTitle: '이 전시물을 열 수 없습니다',
    missingCode: '링크에 전시물 코드가 없습니다. QR 코드를 다시 스캔하거나 목록에서 선택해 주세요.',
    noSpeech: '이 기기는 음성 읽기를 지원하지 않습니다. 위의 글을 읽어 주세요.',
    noVoice: '이 기기에는 해당 언어의 음성이 설치되어 있지 않을 수 있어 소리가 나지 않을 수 있습니다. 위의 글을 읽어 주세요.',
    fallback: '이 전시물은 아직 번역이 없습니다. 베트남어로 표시합니다.',
  },
  zh: {
    back: '列表', subtitle: '独立宫 – 自动语音讲解', loading: '加载中...',
    play: '播放讲解', stop: '停止', errTitle: '无法打开该展品',
    missingCode: '链接中缺少展品编号。请重新扫描二维码或从列表中选择。',
    noSpeech: '此设备不支持语音朗读，请阅读上方文字。',
    noVoice: '此设备可能未安装该语言的语音，可能听不到声音。您仍可阅读上方文字。',
    fallback: '该展品暂无翻译，正在显示越南语。',
  },
};

function t(lang, key) {
  return (UI[lang] && UI[lang][key]) || UI.vi[key];
}

// ---------- Chọn ngôn ngữ ----------

function readStoredLang() {
  try { return localStorage.getItem('lang'); } catch (e) { return null; }
}

function storeLang(code) {
  try { localStorage.setItem('lang', code); } catch (e) { /* trình duyệt chặn lưu trữ */ }
}

// Thứ tự ưu tiên: ?lang= trên đường dẫn -> lựa chọn đã lưu -> ngôn ngữ của trình duyệt/điện thoại -> tiếng Việt
function detectLanguage(supportedCodes) {
  const candidates = [
    new URLSearchParams(window.location.search).get('lang'),
    readStoredLang(),
    ...(navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const code = candidate.toLowerCase().split(/[-_]/)[0];
    if (supportedCodes.includes(code)) return code;
  }
  return 'vi';
}

// Dựng hàng nút chọn ngôn ngữ
function renderLanguageButtons(container, languages, current, onChange, extraClass = '') {
  container.replaceChildren();
  languages.forEach((language) => {
    const active = language.code === current;
    const button = el('button',
      `text-xs font-bold px-3 py-1.5 rounded-full border transition ${extraClass} ` +
      (active ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-transparent border-slate-400 hover:border-amber-500'),
      language.label);
    button.type = 'button';
    button.dataset.lang = language.code;
    button.setAttribute('aria-pressed', String(active));
    button.addEventListener('click', () => onChange(language.code));
    container.append(button);
  });
}

// ---------- Đọc to ----------

// true: có giọng cho ngôn ngữ này; false: không có; null: trình duyệt chưa tải xong danh sách giọng
function hasVoice(speechLang) {
  if (!('speechSynthesis' in window)) return false;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const prefix = speechLang.toLowerCase().split(/[-_]/)[0];
  return voices.some((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith(prefix));
}

// Đọc to bằng giọng của trình duyệt. Trả về false nếu thiết bị không hỗ trợ.
function speak(text, lang = 'vi-VN', rate = 0.95) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
  return true;
}

function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
