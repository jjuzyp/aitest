# Ubuntu 24 Deploy

## What Gets Deployed

- `/opt/wbdash/openrouter-chat`
- `/opt/wbdash/HTMLDASH/WB Dashboard.html`
- `/opt/wbdash/deploy`
- `/opt/wbdash/.env`
- `nginx` on port `80`
- `systemd` service for the chat on `127.0.0.1:8012`

Public URLs:

- `http://SERVER_IP/` for the chat
- `http://SERVER_IP/dashboard.html` for the dashboard

## 1. Install System Packages

```bash
apt update
apt install -y nginx curl
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v
npm -v
```

## 2. Copy Project To The Server

```bash
mkdir -p /opt/wbdash
```

Copy these local folders/files into `/opt/wbdash`:

- `openrouter-chat/`
- `HTMLDASH/`
- `deploy/`
- `.env` or `.env.example`

The final layout should be:

```text
/opt/wbdash
  /.env
  /deploy
  /HTMLDASH
    /WB Dashboard.html
  /openrouter-chat
```

## 3. Create Production Env

```bash
cat >/opt/wbdash/.env <<'EOF'
OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY
OPENROUTER_MODEL=qwen/qwen3.6-plus:free
OPENROUTER_SITE_URL=http://SERVER_IP
OPENROUTER_SITE_NAME=WB Dashboard Chat
PORT=8012
SESSIONS_DIR=/opt/wbdash/openrouter-chat/.sessions
DASHBOARD_HTML_PATH=/opt/wbdash/HTMLDASH/WB Dashboard.html
EOF
```

Replace `SERVER_IP` with the real public IP of the Ubuntu server.

## 4. Install Node Dependencies And Build

```bash
cd /opt/wbdash/openrouter-chat
npm install
npm run build
```

## 5. Install systemd Service

```bash
cp /opt/wbdash/deploy/systemd/wbdash-chat.service /etc/systemd/system/wbdash-chat.service
systemctl daemon-reload
systemctl enable --now wbdash-chat
systemctl status wbdash-chat --no-pager
```

Quick health check:

```bash
curl http://127.0.0.1:8012/api/health
```

## 6. Install Nginx Config

```bash
cp /opt/wbdash/deploy/nginx/wbdash-ip.conf /etc/nginx/sites-available/wbdash-ip.conf
ln -sf /etc/nginx/sites-available/wbdash-ip.conf /etc/nginx/sites-enabled/wbdash-ip.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

## 7. Open In Browser

Use:

- `http://SERVER_IP/`
- `http://SERVER_IP/dashboard.html`

## Update Procedure

```bash
cd /opt/wbdash/openrouter-chat
npm install
npm run build
systemctl restart wbdash-chat
systemctl reload nginx
```
