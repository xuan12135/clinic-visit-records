const assert = require('node:assert/strict');
const test = require('node:test');

const { createServer, listVisits, readVisits } = require('../server');

test('示例数据字段完整且使用虚构编号', () => {
  const visits = readVisits();
  assert.ok(visits.length >= 3);
  visits.forEach((visit) => {
    assert.match(visit.id, /^VIS-\d{4}-\d{3}$/);
    ['patientName', 'department', 'diagnosis', 'visitTime'].forEach((field) => {
      assert.ok(visit[field], `${field} 不应为空`);
    });
  });
});

test('可按科室和关键字筛选', () => {
  const params = new URLSearchParams({ department: '心内科', q: '高血压' });
  const visits = listVisits(params);
  assert.equal(visits.length, 1);
  assert.equal(visits[0].id, 'VIS-2026-002');
});

test('API 返回列表、详情与 404', async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const { port } = server.address();

  const listResponse = await fetch(`http://127.0.0.1:${port}/api/visits`);
  assert.equal(listResponse.status, 200);
  assert.ok((await listResponse.json()).length >= 3);

  const detailResponse = await fetch(`http://127.0.0.1:${port}/api/visits/VIS-2026-001`);
  assert.equal(detailResponse.status, 200);
  assert.equal((await detailResponse.json()).department, '呼吸内科');

  const missingResponse = await fetch(`http://127.0.0.1:${port}/api/visits/UNKNOWN`);
  assert.equal(missingResponse.status, 404);
});
