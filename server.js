const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 3000;
const root = __dirname;

let users = [
  { id: 1, firstName: 'Mama', lastName: 'Globe', email: 'mamag@gmail.com', phone: '+1 555 0101', company: { name: 'Sa bahay lang' }, image: 'https://i.pinimg.com/736x/5d/19/c0/5d19c0b62fa7556646511006c0d60335.jpg' },
  { id: 2, firstName: 'Mama', lastName: 'Smart', email: 'mamas@gmail.com', phone: '+1 555 0102', company: { name: 'Sa bahay lang din' }, image: 'https://i.pinimg.com/736x/b2/01/b2/b201b2b61e08e66de39d642e01ee0977.jpg' },
  { id: 3, firstName: 'Tubig', lastName: 'Mineral', email: 'naturesprings@gmail.com', phone: '+1 555 0103', company: { name: 'Gerardo Mineral Station' }, image: 'https://i.pinimg.com/736x/9a/e9/74/9ae974ed23849096295512c92f31b47e.jpg' },
  { id: 4, firstName: 'Unknown', lastName: 'Caller', email: 'N/A', phone: '+1 555 0104', company: { name: 'N/A' }, image: 'https://i.pinimg.com/1200x/97/f3/08/97f308d4231933ee0f574400230b27e8.jpg' },
  { id: 5, firstName: 'Kate', lastName: '❤️', email: 'kate@yahoo.com', phone: '+1 555 0105', company: { name: 'Roblox Karinderya' }, image: 'https://i.pinimg.com/1200x/41/c5/08/41c5086fb66ed569a8210bc5eae6950f.jpg' }
];

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body is too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Request body must be valid JSON'));
      }
    });

    req.on('error', reject);
  });
}

function normalizeCompany(value) {
  if (value && typeof value === 'object') return value;
  return { name: value || '' };
}

function sendFile(res, fileName, contentType) {
  fs.readFile(path.join(root, fileName), (error, content) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('File not found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && pathname === '/') {
    sendFile(res, 'index.html', 'text/html; charset=utf-8');
    return;
  }

  if (req.method === 'GET' && pathname === '/styles.css') {
    sendFile(res, 'styles.css', 'text/css; charset=utf-8');
    return;
  }

  if (pathname === '/api/users') {
    if (req.method === 'GET') {
      sendJson(res, 200, { users });
      return;
    }

    if (req.method === 'POST') {
      try {
        const body = await readJson(req);
        const user = {
          id: Date.now(),
          firstName: body.firstName || '',
          lastName: body.lastName || '',
          email: body.email || '',
          phone: body.phone || '',
          company: normalizeCompany(body.company),
          image: body.image || ''
        };
        users.unshift(user);
        sendJson(res, 201, user);
      } catch (error) {
        sendJson(res, 400, { message: error.message });
      }
      return;
    }

    sendJson(res, 405, { message: 'Method not allowed' });
    return;
  }

  const userMatch = pathname.match(/^\/api\/users\/(\d+)$/);
  if (userMatch) {
    const id = Number(userMatch[1]);
    const index = users.findIndex(user => user.id === id);

    if (index === -1) {
      sendJson(res, 404, { message: 'Contact not found' });
      return;
    }

    if (req.method === 'GET') {
      sendJson(res, 200, users[index]);
      return;
    }

    if (req.method === 'PUT') {
      try {
        const body = await readJson(req);
        users[index] = {
          ...users[index],
          ...body,
          id,
          company: body.company === undefined ? users[index].company : normalizeCompany(body.company),
          image: body.image === undefined ? users[index].image : body.image
        };
        sendJson(res, 200, users[index]);
      } catch (error) {
        sendJson(res, 400, { message: error.message });
      }
      return;
    }

    if (req.method === 'DELETE') {
      const [deletedUser] = users.splice(index, 1);
      sendJson(res, 200, { success: true, user: deletedUser });
      return;
    }

    sendJson(res, 405, { message: 'Method not allowed' });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});