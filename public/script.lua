task.wait(10)

local HttpService = game:GetService("HttpService")
local player = game.Players.LocalPlayer
local token = getgenv().token

local http = syn and syn.request or http_request or request
if not http then
  warn("[❌] Error")
  return
end

local function sendData()
  local coins = player:WaitForChild("PlayerGui"):WaitForChild("Data"):WaitForChild("Coins").Value
  http({
    Url = "https://log-production-2f93.up.railway.app/roblox",
    Method = "POST",
    Headers = {["Content-Type"] = "application/json"},
    Body = HttpService:JSONEncode({
      token = token,
      score = coins,
      playerName = player.Name
    })
  })
end

sendData()
while true do task.wait(50) sendData() end
