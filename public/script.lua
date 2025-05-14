task.wait(10)

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local token = getgenv().token
local device = getgenv().device or "unknown"

local http = syn and syn.request or http_request or request
if not http then
  warn("[❌] ไม่สามารถใช้งาน HTTP request ได้")
  return
end

-- ✅ รอ Data GUI พร้อม
local dataGui = player:WaitForChild("PlayerGui"):WaitForChild("Data")
local coinsValue = dataGui:WaitForChild("Coins")

-- ✅ รอ Items folder แบบปลอดภัย
local items
repeat
  items = dataGui:FindFirstChild("Items")
  task.wait(1)
until items and items:IsA("Folder")

-- ✅ ฟังก์ชันดึงค่าปลอดภัย
local function getSafeValue(folder, name)
  local ok, result = pcall(function()
    return folder:FindFirstChild(name) and folder[name].Value or 0
  end)
  return ok and result or 0
end

-- ✅ ส่งข้อมูล
local function sendData()
  local coins = coinsValue.Value
  local revive = getSafeValue(items, "CreatureReviveToken")
  local fullgrow = getSafeValue(items, "FullGrowToken")
  local colorchange = getSafeValue(items, "ChangeCreatureColorsToken")
  local partial = getSafeValue(items, "PartialGrowToken")

  local payload = {
    token = token,
    score = coins,
    playerName = player.Name,
    device = device,
    revive = revive,
    fullgrow = fullgrow,
    colorchange = colorchange,
    partial = partial
  }

  print("[📦] Sending to server:", HttpService:JSONEncode(payload))

  http({
    Url = "https://log-production-2f93.up.railway.app/roblox",
    Method = "POST",
    Headers = {["Content-Type"] = "application/json"},
    Body = HttpService:JSONEncode(payload)
  })
end

-- ✅ ส่งครั้งแรก
sendData()

-- 🔁 ส่งซ้ำทุก 30 วินาที
while true do
  task.wait(30)
  sendData()
end
