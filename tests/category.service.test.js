const test = require('node:test');
const assert = require('node:assert');
const Category = require('../models/category.model');
const categoryService = require('../services/category.service');

test('slugify bỏ dấu tiếng Việt', () => {
    assert.strictEqual(categoryService.slugify('Tầng trệt'), 'tang-tret');
    assert.strictEqual(categoryService.slugify('Lầu 1'), 'lau-1');
    assert.strictEqual(categoryService.slugify('  Đại sảnh / Khánh tiết '), 'dai-sanh-khanh-tiet');
});

test('thêm khu vực không nhập slug thì tự tạo từ tên', async (t) => {
    t.mock.method(Category, 'create', async (data) => data);
    const c = await categoryService.create({ name: 'Sân thượng' });
    assert.strictEqual(c.slug, 'san-thuong');
});

test('slug nhập tay được chuẩn hóa; tên trống -> 400', async (t) => {
    t.mock.method(Category, 'create', async (data) => data);
    assert.strictEqual((await categoryService.create({ name: 'X', slug: 'Ngoài Trời' })).slug, 'ngoai-troi');
    await assert.rejects(categoryService.create({ name: '  ' }), { status: 400 });
});

test('model yêu cầu slug đúng định dạng', () => {
    assert.ok(new Category({ name: 'A' }).validateSync().errors.slug);
    assert.ok(new Category({ name: 'A', slug: 'Có dấu' }).validateSync().errors.slug);
    assert.strictEqual(new Category({ name: 'A', slug: 'lau-2' }).validateSync(), undefined);
});
