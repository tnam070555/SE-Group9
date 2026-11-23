const test = require('node:test');
const assert = require('node:assert');
const { parseLanguage, parseTargetLanguage, LANGUAGES, TARGET_CODES } = require('../config/languages');

test('hỗ trợ vi, en, ja, ko, zh; vi là ngôn ngữ gốc', () => {
    assert.deepStrictEqual(LANGUAGES.map((l) => l.code), ['vi', 'en', 'ja', 'ko', 'zh']);
    assert.deepStrictEqual(TARGET_CODES, ['en', 'ja', 'ko', 'zh']);
});

test('parseLanguage: mặc định vi, chấp nhận en-US, ZH-cn, ja_JP', () => {
    assert.strictEqual(parseLanguage(undefined), 'vi');
    assert.strictEqual(parseLanguage(''), 'vi');
    assert.strictEqual(parseLanguage('en-US'), 'en');
    assert.strictEqual(parseLanguage('ZH-cn'), 'zh');
    assert.strictEqual(parseLanguage('ja_JP'), 'ja');
});

test('parseLanguage: ngôn ngữ lạ hoặc sai kiểu thì lỗi 400', () => {
    assert.throws(() => parseLanguage('fr'), (e) => e.status === 400);
    assert.throws(() => parseLanguage(['en', 'ja']), (e) => e.status === 400);
    assert.throws(() => parseLanguage({ $ne: 1 }), (e) => e.status === 400);
});

test('parseTargetLanguage: không cho dùng ngôn ngữ gốc', () => {
    assert.strictEqual(parseTargetLanguage('ko'), 'ko');
    assert.throws(() => parseTargetLanguage('vi'), (e) => e.status === 400);
});
