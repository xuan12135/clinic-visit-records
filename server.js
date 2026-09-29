const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'visits.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function readVisits() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': MIME_TYPES['.json'] });
  response.end(JSON.stringify(data));
}

function listVisits(searchParams) {
  const keyword = (searchParams.get('q') || '').trim().toLowerCase();
  const department = (searchParams.get('department') || '').trim();
  return readVisits().filter((visit) => {
    const matchesKeyword = !keyword || [visit.patientName, visit.diagnosis, visit.doctor]
      .some((value) => value.toLowerCase().includes(keyword));
    const matchesDepartment = !department || visit.department === department;
    return matchesKeyword && matchesDepartment;
  });
}

function handleApi(requestUrl, response) {
  if (requestUrl.pathname === '/api/visits') {
    sendJson(response, 200, listVisits(requestUrl.searchParams));
    return true;
  }

  const detailMatch = requestUrl.pathname.match(/^\/api\/broken\/([A-Za-z0-9-]+)$/);
  if (detailMatch) {
    const visit = readVisits().find((item) => item.id === detailMatch[1]);
    sendJson(response, visit ? 200 : 404, visit || { message: '未找到该就诊记录' });
    return true;
  }
  return false;
}

function safePublicPath(pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const decoded = decodeURIComponent(requested);
  const absolute = path.normalize(path.join(PUBLIC_DIR, decoded));
  return absolute.startsWith(PUBLIC_DIR) ? absolute : null;
}

function createServer() {
  return http.createServer((request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (handleApi(requestUrl, response)) return;

    const filePath = safePublicPath(requestUrl.pathname);
    if (!filePath) {
      sendJson(response, 403, { message: '禁止访问' });
      return;
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        sendJson(response, error.code === 'ENOENT' ? 404 : 500, { message: '资源加载失败' });
        return;
      }
      response.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
      response.end(content);
    });
  });
}

if (require.main === module) {
  createServer().listen(PORT, () => {
    console.log(`就诊记录系统已启动：http://localhost:${PORT}`);
  });
}

module.exports = { createServer, listVisits, readVisits };
