const test = require('node:test');
const assert = require('node:assert');
const Artifact = require('../models/artifact.model');

test('model nhận bản dịch cho en, ja, ko, zh và bỏ ngôn ngữ lạ', async () => {
    const doc = new Artifact({
        name: 'A', code: 'ddl-9',
        translations: { en: { name: 'A en' }, ja: { description: 'd' }, ko: { location: 'l' }, zh: { name: 'z' }, fr: { name: 'x' } },
    });
    await doc.validate();
    const plain = doc.toObject();
    assert.strictEqual(doc.code, 'DDL-9');
    assert.strictEqual(plain.translations.en.name, 'A en');
    assert.strictEqual(plain.translations.zh.name, 'z');
    assert.strictEqual(plain.translations.fr, undefined);
});

test('model từ chối code có ký tự lạ', async () => {
    await assert.rejects(() => new Artifact({ name: 'A', code: 'ddl 9!' }).validate());
});

test('model: tọa độ không bắt buộc, có thì phải đúng phạm vi', async () => {
    const none = new Artifact({ name: 'A', code: 'A1' });
    await none.validate();
    assert.strictEqual(none.toObject().geo, undefined);

    const ok = new Artifact({ name: 'A', code: 'A2', geo: { lat: 10.777, lng: 106.6953 } });
    await ok.validate();
    assert.deepStrictEqual(ok.toObject().geo, { lat: 10.777, lng: 106.6953 });

    await assert.rejects(() => new Artifact({ name: 'A', code: 'A3', geo: { lat: 100, lng: 106 } }).validate());
    await assert.rejects(() => new Artifact({ name: 'A', code: 'A4', geo: { lat: 10 } }).validate());
});
