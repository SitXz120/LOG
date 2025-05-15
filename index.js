const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const app = express();

const USERS_FILE = './users.json';
const TIMEOUT = 150000;
let scores = []; // ✅ ใช้ object แทน array
let commands = {}; // 🔁 เก็บคำสั่งไว้ต่อ username

app.use(bodyParser.json());
app.use(express.static('public'));

function loadUsers() {
  return fs.existsSync(USERS_FILE)
    ? JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'))
    : [];
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ✅ สมัครชื่อ แล้วรับ token
app.post('/register', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).send("Username is required");

  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.status(400).send("Username already exists");
  }

  const token = uuidv4();
  users.push({ username, token });
  saveUsers(users);

  res.json({ token });
});

// ✅ Login เพื่อดึง token เดิม
app.post('/login', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).send("Username is required");

  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).send("User not found");

  res.json({ token: user.token });
});

// ✅ รับข้อมูลที่ส่งมาจาก Roblox
app.post('/roblox', (req, res) => {
  const {
    token, score, playerName, device,
    revive = 0, fullgrow = 0, colorchange = 0, partial = 0
  } = req.body;

  const users = loadUsers();
  const user = users.find(u => u.token === token);
  if (!user) return res.status(401).send("Invalid token");

  const name = playerName || user.username;
  const now = Date.now();

  const existing = scores.find(s => s.player === name);
  
  if (existing) {
    existing.score = score;
    existing.device = device || existing.device || "unknown";
    existing.lastSeen = now;
    existing.revive = revive;
    existing.fullgrow = fullgrow;
    existing.colorchange = colorchange;
    existing.partial = partial;
  } else {
    scores.push({
      player: name,
      username: user.username,
      score,
      device: device || "unknown",
      lastSeen: now,
      revive,
      fullgrow,
      colorchange,
      partial
    });
  }

  console.log(`[✅] ${name} (${device}) : ${score} | Tokens - R:${revive} F:${fullgrow} C:${colorchange} P:${partial}`);
  res.send("OK");
});

// ✅ ปลอดภัยกว่า: เช็ค token ก่อนส่ง leaderboard
app.post('/data', (req, res) => {
  const { token } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.token === token);
  if (!user) return res.status(401).send("Invalid token");

  const now = Date.now();

  const entries = scores
    .filter(s => s.username === user.username);

  const result = {
    entries: entries.map(entry => ({
      player: entry.player,
      score: entry.score,
      device: entry.device || "-",
      online: now - entry.lastSeen <= TIMEOUT
    })),
    totalRevive: entries.reduce((sum, e) => sum + (e.revive || 0), 0),
    totalFullGrow: entries.reduce((sum, e) => sum + (e.fullgrow || 0), 0),
    totalColorChange: entries.reduce((sum, e) => sum + (e.colorchange || 0), 0),
    totalPartialGrow: entries.reduce((sum, e) => sum + (e.partial || 0), 0)
  };

  res.json(result);
});

// ✅ ดึงชื่อจาก token
app.post('/me', (req, res) => {
  const { token } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.token === token);
  if (!user) return res.status(404).send("User not found");

  res.json({ username: user.username });
});

// ✅ reset เฉพาะของผู้ใช้
app.post('/reset', (req, res) => {
  const { token } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.token === token);
  if (!user) return res.status(401).send("Invalid token");

  scores = scores.filter(s => s.username !== user.username);
  res.send("OK");
});

// ✅ ส่งคำสั่งจากเว็บมาเก็บไว้
app.post('/send-command', (req, res) => {
  const { token, action, target } = req.body;
  if (!token || !action) return res.status(400).send("Missing required fields");

  const users = loadUsers();
  const user = users.find(u => u.token === token);
  if (!user) return res.status(401).send("Invalid token");

  commands[user.username] = { action, target };
  res.send("Command stored");
});

// ✅ ให้ Roblox ดึงคำสั่งล่าสุด
app.get('/command', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Token is required");

  const users = loadUsers();
  const user = users.find(u => u.token === token);
  if (!user) return res.status(401).send("Invalid token");

  const cmd = commands[user.username] || null;
  delete commands[user.username]; // 🧼 ล้างหลังเรียก
  res.json(cmd);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server listening on port ${PORT}`));

