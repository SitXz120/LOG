const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const app = express();

const USERS_FILE = './users.json';
const TIMEOUT = 60000;
let scores = []; // ✅ ใช้ object แทน array

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

// ✅ ส่งคะแนนจาก Roblox พร้อม token เพิ่มเติม
app.post('/roblox', (req, res) => {
  const { token, score, playerName, device, revive, fullgrow, colorchange, partial } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.token === token);
  if (!user) return res.status(401).send("Invalid token");

  const name = playerName || user.username;

  const existing = scores.find(s => s.player === name);

  if (existing) {
    existing.score = score;
    existing.device = device || existing.device || "unknown";
    existing.lastSeen = Date.now();
    existing.revive = revive || 0;
    existing.fullgrow = fullgrow || 0;
    existing.colorchange = colorchange || 0;
    existing.partial = partial || 0;
  } else {
    scores.push({
      player: name,
      username: user.username,
      score,
      device: device || "unknown",
      lastSeen: Date.now(),
      revive: revive || 0,
      fullgrow: fullgrow || 0,
      colorchange: colorchange || 0,
      partial: partial || 0
    });
  }

  console.log(`[✅] ${name} (${device || "?"}) : ${score}`);
  res.send("OK");
});

// ✅ ปลอดภัยกว่า: เช็ค token ก่อนส่ง leaderboard
// ✅ ปลอดภัยกว่า: เช็ค token ก่อนส่ง leaderboard
app.post('/data', (req, res) => {
  const { token } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.token === token);
  if (!user) return res.status(401).send("Invalid token");

  const now = Date.now();

  const entries = scores
    .filter(s => s.username === user.username)
    .map(entry => ({
      player: entry.player,
      score: entry.score,
      device: entry.device || "-",
      online: now - entry.lastSeen <= TIMEOUT,
      revive: entry.revive || 0,
      fullgrow: entry.fullgrow || 0,
      colorchange: entry.colorchange || 0,
      partial: entry.partial || 0
    }));

  // ✅ รวม token ทั้งหมดไว้ที่ root ของ response
  const totalRevive = entries.reduce((sum, e) => sum + (e.revive || 0), 0);
  const totalFullGrow = entries.reduce((sum, e) => sum + (e.fullgrow || 0), 0);
  const totalColorChange = entries.reduce((sum, e) => sum + (e.colorchange || 0), 0);
  const totalPartialGrow = entries.reduce((sum, e) => sum + (e.partial || 0), 0);

  res.json({
    totalRevive,
    totalFullGrow,
    totalColorChange,
    totalPartialGrow,
    entries
  });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server listening on port ${PORT}`));

