# Tạo file mp3 thuyết minh cho từng công trình, từng ngôn ngữ -> public/audio/<ngôn ngữ>/<mã>.mp3
import asyncio, json, subprocess, sys, pathlib
import edge_tts
root = pathlib.Path(__file__).resolve().parent.parent
VOICES = {'vi': 'vi-VN-NamMinhNeural', 'en': 'en-US-JennyNeural', 'ja': 'ja-JP-NanamiNeural',
          'ko': 'ko-KR-SunHiNeural', 'zh': 'zh-CN-XiaoxiaoNeural'}
data = json.loads(subprocess.check_output(
    ['node', '-e', "console.log(JSON.stringify(require('./data/buildings.seed.js')))"], cwd=root, encoding='utf-8'))
async def main():
    fails = 0
    for b in data:
        for lang, voice in VOICES.items():
            t = b if lang == 'vi' else b.get('translations', {}).get(lang)
            if not t: print('thiếu bản dịch', b['code'], lang); continue
            out = root / 'public' / 'audio' / lang / f"{b['code']}.mp3"
            out.parent.mkdir(parents=True, exist_ok=True)
            if out.exists() and out.stat().st_size > 0: continue
            try:
                await edge_tts.Communicate((f"{t['name']}. {t['description']}").replace('&', ' và ' if lang == 'vi' else ' and '), voice).save(str(out))
            except Exception as e:
                fails += 1; print('lỗi', b['code'], lang, e)
    print('xong, lỗi:', fails)
asyncio.run(main())
