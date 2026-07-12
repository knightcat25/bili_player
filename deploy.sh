#!/bin/bash
# BiliPlay 一键部署脚本
# 在 Ubuntu 服务器上运行：bash deploy.sh

set -e

echo "🚀 BiliPlay 一键部署开始..."

# 1. 更新系统 & 安装 Node.js + git
echo "📦 安装 Node.js..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt update -y
sudo apt install -y nodejs git nginx

# 2. 克隆项目
echo "📥 克隆项目..."
cd /opt
sudo git clone https://github.com/knightcat25/bili_player.git
sudo chown -R $USER:$USER /opt/bili_player

# 3. 安装依赖 & 构建
echo "🔧 安装依赖..."
cd /opt/bili_player
npm install
npm run build

# 4. 安装 PM2 并启动
echo "▶️ 启动服务..."
sudo npm install -g pm2
pm2 start server.js --name biliplay
pm2 save
pm2 startup

# 5. 配置 Nginx 反向代理（可选，去掉端口号）
echo "🌐 配置 Nginx..."
sudo tee /etc/nginx/sites-available/biliplay > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/biliplay /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo ""
echo "✅ 部署完成！"
echo "访问 http://$(curl -s ifconfig.me) 即可使用"
