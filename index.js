const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const app = express();

const USERS_FILE = './users.json';
const TIMEOUT = 30000;
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

// ✅ ส่งคะแนนจาก Roblox
app.post('/roblox', (req, res) => {
  const { token, score, playerName } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.token === token);
  if (!user) return res.status(401).send("Invalid token");

  const name = playerName || user.username;

  // ✅ ตรวจสอบว่าผู้เล่นนี้เคยมีอยู่ในตารางหรือยัง
  const existing = scores.find(s => s.player === name);

  if (existing) {
    // 🔁 ถ้ามีอยู่แล้ว ให้ update ค่า score และเวลา
    existing.score = score;
    existing.lastSeen = Date.now();
  } else {
    // ➕ ถ้ายังไม่มี ให้เพิ่มใหม่
    scores.push({
      player: name,
      username: user.username, // 👈 เก็บ token-owner name
      score,
      lastSeen: Date.now()
    });
  }

  console.log(`[✅] ${name} : ${score}`);
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
    .filter(s => s.username === user.username) // ✅ เฉพาะคนที่ส่งมาด้วย token นี้
    .map(entry => ({
      player: entry.player,
      score: entry.score,
      online: now - entry.lastSeen <= TIMEOUT
    }));

  res.json(entries);
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

