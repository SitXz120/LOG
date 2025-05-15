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

local dataGui = player:WaitForChild("PlayerGui"):WaitForChild("Data")
local items = dataGui:WaitForChild("Items")

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

  warn("[📤] ส่งข้อมูลแล้ว => Shooms:", coins, " | Revive:", revive, " FullGrow:", fullgrow, " ChangeColor:", colorchange, " Partial:", partial)
end

local function checkCommand()
  local response = http({
    Url = "https://log-production-2f93.up.railway.app/command?token=" .. token,
    Method = "GET"
  })

  if response and response.Body then
    local ok, command = pcall(function()
      return HttpService:JSONDecode(response.Body)
    end)

    if ok and command and command.action then
      warn("[📥] คำสั่งใหม่จาก Server:", command.action, command.target or "")

      if command.action == "kick" then
        player:Kick("คุณถูกเตะโดยเจ้าของระบบ")
      elseif command.action == "say" and command.target then
        game:GetService("ReplicatedStorage").DefaultChatSystemChatEvents.SayMessageRequest:FireServer(command.target, "All")
      elseif command.action == "teleport" and command.target then
        local pos = tonumber(command.target)
        if pos then
          player.Character:MoveTo(Vector3.new(pos, 10, pos)) -- เปลี่ยนตำแหน่งตามต้องการ
        end
      else
        warn("ไม่รู้จักคำสั่งนี้:", command.action)
      end
    end
  end
end

sendData()

task.spawn(function()
  while true do
    task.wait(120)
    sendData()
  end
end)

task.spawn(function()
  while true do
    task.wait(5)
    checkCommand()
  end
end)
