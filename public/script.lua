task.wait(10)

local HttpService = game:GetService("HttpService")
local player = game.Players.LocalPlayer
local token = getgenv().token
local device = getgenv().device or "unknown"

local http = syn and syn.request or http_request or request
if not http then
  warn("[❌] ไม่สามารถใช้งาน HTTP request ได้")
  return
end

-- ✅ รอ GUI โหลดก่อน
local dataGui = player:WaitForChild("PlayerGui"):WaitForChild("Data")
local items = dataGui:WaitForChild("Items")

-- ✅ ดึงค่า Token
local function getSafeValue(folder, name)
  local ok, result = pcall(function()
    return folder:FindFirstChild(name) and folder[name].Value or 0
  end)
  return ok and result or 0
end

local function sendData()
  local coins = dataGui:WaitForChild("Coins").Value
  local revive = getSafeValue(items, "CreatureReviveToken")
  local fullgrow = getSafeValue(items, "FullGrowToken")
  local colorchange = getSafeValue(items, "ChangeCreatureColorsToken")
  local partial = getSafeValue(items, "PartialGrowToken")

  http({
    Url = "https://log-production-2f93.up.railway.app/roblox",
    Method = "POST",
    Headers = {["Content-Type"] = "application/json"},
    Body = HttpService:JSONEncode({
      token = token,
      score = coins,
      playerName = player.Name,
      device = device,
      revive = revive,
      fullgrow = fullgrow,
      colorchange = colorchange,
      partial = partial
    })
  })
end

sendData()
while true do
  task.wait(30)
  sendData()
end
