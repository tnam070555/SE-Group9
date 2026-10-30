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
