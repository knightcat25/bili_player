#!/bin/bash
# BiliPlay 一键部署脚本 — 兼容 Debian 12 / Ubuntu 22.04
set -e

echo "🚀 BiliPlay 一键部署..."

# 1. Node.js
echo "📦 安装 Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt update -y
sudo apt install -y nodejs git nginx

# 2. 克隆项目
echo "📥 克隆项目..."
sudo mkdir -p /opt/bili_player
sudo chown $USER:$USER /opt/bili_player
git clone https://github.com/knightcat25/bili_player.git /opt/bili_player
cd /opt/bili_player

# 3. 安装依赖 & 构建
echo "🔧 安装依赖 & 构建..."
npm install
npm run build

# 4. PM2 启动
echo "▶️ 启动..."
sudo npm install -g pm2
pm2 start server.js --name biliplay
pm2 save
pm2 startup systemd -u $USER --hp $HOME

# 5. Nginx 反向代理
echo "🌐 Nginx..."
sudo tee /etc/nginx/sites-available/biliplay > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;
    client_max_body_size 500M;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/biliplay /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 6. 防火墙
echo "🔒 防火墙..."
sudo apt install -y ufw
sudo ufw allow 80/tcp
sudo ufw allow 22/tcp
sudo ufw --force enable

echo ""
echo "✅ 完成！访问 http://$(curl -s ifconfig.me)"
