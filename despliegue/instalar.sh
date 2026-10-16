#!/usr/bin/env bash
# Instala y publica el SGR en una instancia Amazon Linux 2023 (EC2).
# Uso, desde la carpeta del proyecto en el servidor:  sudo bash despliegue/instalar.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_USER="${SUDO_USER:-ec2-user}"

echo "==> Memoria de intercambio (swap) de 2 GB para compilar en instancias pequeñas"
if ! swapon --show | grep -q /swapfile; then
  dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
fi

echo "==> Node.js 22 y nginx"
dnf install -y nodejs22 nginx >/dev/null
# El paquete nodejs22 instala node-22/npm-22; se dejan como node/npm por defecto.
alternatives --set node /usr/bin/node-22 2>/dev/null || ln -sf /usr/bin/node-22 /usr/local/bin/node
[ -x /usr/bin/npm-22 ] && ln -sf /usr/bin/npm-22 /usr/local/bin/npm
node -v

echo "==> Dependencias y compilación"
cd "$APP_DIR"
sudo -u "$APP_USER" npm ci --no-audit --no-fund
sudo -u "$APP_USER" npm run build

echo "==> Servicio sgr (se inicia solo al encender la instancia)"
cat > /etc/systemd/system/sgr.service <<EOF
[Unit]
Description=SGR - Municipalidad de La Serena
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=$(command -v npm) run preview
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "==> nginx en el puerto 80"
cat > /etc/nginx/conf.d/sgr.conf <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:4174;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
nginx -t

systemctl daemon-reload
systemctl enable --now sgr nginx
systemctl restart sgr nginx

sleep 3
curl -fsS -o /dev/null -w "==> Respuesta local: HTTP %{http_code}\n" http://127.0.0.1/
echo "==> Listo. Abre http://<IP pública de la instancia>"
