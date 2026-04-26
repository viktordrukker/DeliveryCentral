#!/usr/bin/env bash
# bootstrap-vm.sh — Phase 1 of the Hetzner deployment plan.
#
# Run ONCE on a fresh Ubuntu 22.04 / 24.04 Hetzner VM as root or via sudo.
#
# If root SSH is enabled:
#   scp ops/bootstrap-vm.sh root@<VM_IP>:/root/
#   ssh root@<VM_IP> "bash /root/bootstrap-vm.sh"
#
# If root SSH is disabled (typical Hetzner setup), run via sudo from a regular
# user. The script reads $SUDO_USER and copies that user's authorized_keys to
# the new `deploy` user so you can SSH as deploy immediately:
#   scp ops/bootstrap-vm.sh <sudo-user>@<VM_IP>:~/
#   ssh <sudo-user>@<VM_IP> "sudo bash ~/bootstrap-vm.sh"
#
# What it does (every step idempotent — re-runs are safe):
#   1. apt update + security patches
#   2. Install Docker Engine, docker-compose-plugin, ufw, fail2ban,
#      unattended-upgrades, jq, curl, git, gnupg
#   3. Create non-root sudo user `deploy`, add to docker group
#   4. Harden SSH: disable root login + password auth
#   5. UFW firewall: allow 22, 80, 443/tcp + 443/udp; deny everything else
#   6. fail2ban with sshd jail (10 retries / 1h ban)
#   7. unattended-upgrades for OS security patches (no auto-reboot)
#   8. 4 GB swapfile (vm.swappiness=10)
#   9. Create /opt/deliverycentral{,-staging,-data}/ + /opt/backups/
#  10. Generate ed25519 keypair for GitHub Actions deploy SSH
#  11. Print the GHA private key for transfer to GitHub Secrets

set -euo pipefail

# ---------------------------------------------------------------------- output
COLOR_GREEN='\033[0;32m'; COLOR_YELLOW='\033[0;33m'; COLOR_RED='\033[0;31m'; COLOR_BOLD='\033[1m'; COLOR_OFF='\033[0m'
step()  { printf "\n${COLOR_BOLD}==> %s${COLOR_OFF}\n" "$*"; }
ok()    { printf "    ${COLOR_GREEN}✓ %s${COLOR_OFF}\n" "$*"; }
warn()  { printf "    ${COLOR_YELLOW}! %s${COLOR_OFF}\n" "$*"; }
fail()  { printf "    ${COLOR_RED}✗ %s${COLOR_OFF}\n" "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "must run as root (try: sudo bash $0)"

DEPLOY_USER=deploy
SSH_KEY_TYPE=ed25519
SSH_KEY_PATH="/home/${DEPLOY_USER}/.ssh/gha"

# -----------------------------------------------------------------------------
step "1/11  apt update + base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -yq
apt-get upgrade -yq
apt-get install -yq \
    ca-certificates curl gnupg lsb-release \
    ufw fail2ban unattended-upgrades \
    jq git
ok "base packages installed"

# -----------------------------------------------------------------------------
step "2/11  Install Docker Engine + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        > /etc/apt/sources.list.d/docker.list
    apt-get update -yq
    apt-get install -yq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
    ok "Docker installed and running"
else
    ok "Docker already installed: $(docker --version)"
fi

# -----------------------------------------------------------------------------
step "3/11  Create deploy user"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
    useradd --create-home --shell /bin/bash --groups sudo "$DEPLOY_USER"
    # Passwordless sudo for cron + docker — but keep SSH password-disabled.
    echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/${DEPLOY_USER}"
    chmod 0440 "/etc/sudoers.d/${DEPLOY_USER}"
    ok "user $DEPLOY_USER created"
else
    ok "user $DEPLOY_USER already exists"
fi
usermod -aG docker "$DEPLOY_USER"
ok "$DEPLOY_USER added to docker group (re-login to take effect)"

# Copy the invoker's authorized_keys to the deploy user so the operator can
# SSH as deploy immediately. SUDO_USER is set when this script was invoked via
# `sudo` (the typical case on Hetzner where root SSH is disabled). If the
# script was invoked directly as root (e.g. via the Hetzner serial console),
# fall back to /root/.ssh/authorized_keys.
SOURCE_USER="${SUDO_USER:-root}"
if [ "$SOURCE_USER" = "root" ]; then
    SOURCE_KEYS="/root/.ssh/authorized_keys"
else
    SOURCE_KEYS="/home/${SOURCE_USER}/.ssh/authorized_keys"
fi

mkdir -p "/home/${DEPLOY_USER}/.ssh"
chmod 700 "/home/${DEPLOY_USER}/.ssh"
if [ -f "$SOURCE_KEYS" ]; then
    cp "$SOURCE_KEYS" "/home/${DEPLOY_USER}/.ssh/authorized_keys"
    chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
    chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
    ok "copied $SOURCE_USER's authorized_keys → ${DEPLOY_USER}"
else
    warn "$SOURCE_KEYS missing — add a key to ~${DEPLOY_USER}/.ssh/authorized_keys before SSHing as ${DEPLOY_USER}"
fi

# -----------------------------------------------------------------------------
step "4/11  Harden SSH (disable root login + password auth)"
SSHD_CONF=/etc/ssh/sshd_config
sed -i \
    -e 's/^#\?\s*PermitRootLogin\s\+.*/PermitRootLogin no/' \
    -e 's/^#\?\s*PasswordAuthentication\s\+.*/PasswordAuthentication no/' \
    -e 's/^#\?\s*PubkeyAuthentication\s\+.*/PubkeyAuthentication yes/' \
    -e 's/^#\?\s*ChallengeResponseAuthentication\s\+.*/ChallengeResponseAuthentication no/' \
    "$SSHD_CONF"
# Belt + braces — append if sed missed (some distros have these only in a *.d/ file).
grep -q '^PermitRootLogin no' "$SSHD_CONF" || echo 'PermitRootLogin no' >> "$SSHD_CONF"
grep -q '^PasswordAuthentication no' "$SSHD_CONF" || echo 'PasswordAuthentication no' >> "$SSHD_CONF"
sshd -t && systemctl reload ssh && ok "sshd reloaded with hardened config"

# -----------------------------------------------------------------------------
step "5/11  UFW firewall"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP — Caddy ACME + redirects'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 443/udp comment 'HTTP/3 (QUIC)'
ufw --force enable
ok "UFW enabled: 22, 80, 443/tcp, 443/udp allowed"

# -----------------------------------------------------------------------------
step "6/11  fail2ban (sshd jail)"
cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled = true
maxretry = 10
findtime = 10m
bantime = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban
ok "fail2ban active with sshd jail"

# -----------------------------------------------------------------------------
step "7/11  unattended-upgrades (security patches only, no auto-reboot)"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
cat > /etc/apt/apt.conf.d/50unattended-upgrades.dc <<'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF
ok "unattended-upgrades configured"

# -----------------------------------------------------------------------------
step "8/11  4 GB swapfile (vm.swappiness=10)"
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    ok "swapfile created and enabled"
else
    swapon /swapfile 2>/dev/null || true
    ok "swapfile already exists"
fi
echo 'vm.swappiness=10' > /etc/sysctl.d/99-deliverycentral.conf
sysctl -p /etc/sysctl.d/99-deliverycentral.conf >/dev/null
ok "vm.swappiness=10 persisted"

# -----------------------------------------------------------------------------
step "9/11  Create deploy directories"
for dir in /opt/deliverycentral /opt/deliverycentral-staging /opt/deliverycentral-data /opt/backups; do
    mkdir -p "$dir"
    chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$dir"
done
ok "/opt/deliverycentral{,-staging,-data}/ + /opt/backups/ ready"

# -----------------------------------------------------------------------------
step "10/11  Generate GitHub Actions SSH keypair"
if [ ! -f "$SSH_KEY_PATH" ]; then
    sudo -u "$DEPLOY_USER" ssh-keygen -t "$SSH_KEY_TYPE" -f "$SSH_KEY_PATH" -N '' -C 'gha-deploy@deliverycentral'
    cat "${SSH_KEY_PATH}.pub" >> "/home/${DEPLOY_USER}/.ssh/authorized_keys"
    chown "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh/authorized_keys"
    chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
    ok "generated $SSH_KEY_PATH"
else
    ok "GHA keypair already exists at $SSH_KEY_PATH"
fi
# Save a copy outside ~deploy for easier scp from the operator's laptop.
cp "$SSH_KEY_PATH" /root/gha-private-key.txt
chmod 600 /root/gha-private-key.txt

# -----------------------------------------------------------------------------
step "11/11  Done — copy this private key to GitHub Secrets"
echo
printf "${COLOR_BOLD}========================  GHA SSH PRIVATE KEY  ========================${COLOR_OFF}\n"
echo "Save this content as the value of these THREE GitHub repository secrets:"
echo "    VPS_SSH_KEY"
echo "    STAGING_VPS_SSH_KEY"
echo
echo "Or run this from your laptop to fetch it:"
echo "    scp ${DEPLOY_USER}@$(hostname -I | awk '{print $1}'):/home/${DEPLOY_USER}/.ssh/gha /tmp/gha-private-key"
echo
echo "It is also at /root/gha-private-key.txt on this VM (chmod 600)."
echo
printf "${COLOR_BOLD}---------- BEGIN KEY (DO NOT SHARE) ----------${COLOR_OFF}\n"
cat "$SSH_KEY_PATH"
printf "${COLOR_BOLD}----------  END KEY  ----------${COLOR_OFF}\n"
echo
printf "${COLOR_GREEN}${COLOR_BOLD}VM hardening complete.${COLOR_OFF}\n"
echo
echo "NEXT STEPS (in order):"
echo "  1. Add 4 DNS A records: app, staging, monitor, logs → $(hostname -I | awk '{print $1}')"
echo "  2. Run ops/setup-github-secrets.sh on your laptop (writes secrets via 'gh' CLI)"
echo "  3. Create a GHCR Personal Access Token (read:packages):"
echo "       https://github.com/settings/tokens/new?scopes=read:packages"
echo "  4. SSH to this VM as ${DEPLOY_USER} and clone the repo into /opt/deliverycentral, then run:"
echo "       bash ops/bootstrap-app.sh"
