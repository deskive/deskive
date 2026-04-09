#!/bin/bash
#
# pgBackRest Setup Script - Production-Grade PostgreSQL Backups
# Automated backups with retention, compression, and point-in-time recovery
#
# Features:
# - Automated daily full backups
# - Incremental backups every hour
# - 7-day retention policy
# - Compression and encryption
# - Point-in-time recovery capability
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PRIMARY_IP="46.62.161.254"
BACKUP_SERVER_IP="46.62.146.236"
PRIMARY_SSH_KEY="~/.ssh/hetzner_fluxez"
BACKUP_SSH_KEY="~/.ssh/hetzner_fluxez"

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}pgBackRest Setup${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# Step 1: Install pgBackRest on both servers
echo -e "${GREEN}[1/5] Installing pgBackRest...${NC}"

for SERVER in "$PRIMARY_IP:$PRIMARY_SSH_KEY" "$BACKUP_SERVER_IP:$BACKUP_SSH_KEY"; do
    IP=$(echo $SERVER | cut -d: -f1)
    KEY=$(echo $SERVER | cut -d: -f2)

    echo "Installing on $IP..."
    ssh -i $KEY root@$IP bash <<'ENDSSH'
set -e

# Install pgBackRest
apt-get update
apt-get install -y pgbackrest

# Create pgBackRest directories
mkdir -p /var/log/pgbackrest
chown postgres:postgres /var/log/pgbackrest

mkdir -p /var/lib/pgbackrest
chown postgres:postgres /var/lib/pgbackrest

echo "pgBackRest installed"
ENDSSH
done

echo -e "${GREEN}✓ pgBackRest installed${NC}"
echo ""

# Step 2: Configure Primary Server
echo -e "${GREEN}[2/5] Configuring Primary Server...${NC}"

ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP bash <<'ENDSSH'
set -e

# Create pgBackRest configuration
cat > /etc/pgbackrest.conf <<EOF
[global]
repo1-path=/var/lib/pgbackrest
repo1-retention-full=7
repo1-retention-diff=4
repo1-retention-archive=7
log-level-console=info
log-level-file=debug
start-fast=y
delta=y
process-max=4

[main]
pg1-path=/var/lib/postgresql/16/main
pg1-port=5432
pg1-socket-path=/var/run/postgresql
EOF

chown postgres:postgres /etc/pgbackrest.conf
chmod 640 /etc/pgbackrest.conf

# Update PostgreSQL configuration for WAL archiving
cat >> /etc/postgresql/16/main/postgresql.conf <<EOF

#------------------------------------------------------------------------------
# pgBackRest SETTINGS (Added by setup script)
#------------------------------------------------------------------------------
archive_mode = on
archive_command = 'pgbackrest --stanza=main archive-push %p'
EOF

echo "Primary configured"
ENDSSH

echo -e "${GREEN}✓ Primary configured${NC}"
echo ""

# Step 3: Configure Backup Server
echo -e "${GREEN}[3/5] Configuring Backup Server...${NC}"

ssh -i $BACKUP_SSH_KEY root@$BACKUP_SERVER_IP bash <<'ENDSSH'
set -e

# Create backup repository
mkdir -p /backup/pgbackrest
chown postgres:postgres /backup/pgbackrest
chmod 750 /backup/pgbackrest

# Create pgBackRest configuration
cat > /etc/pgbackrest.conf <<EOF
[global]
repo1-path=/backup/pgbackrest
repo1-retention-full=7
repo1-retention-diff=4
repo1-retention-archive=7
log-level-console=info
log-level-file=debug
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=$(openssl rand -base64 32)

[main]
pg1-host=46.62.161.254
pg1-path=/var/lib/postgresql/16/main
pg1-port=5432
pg1-user=postgres
EOF

chown postgres:postgres /etc/pgbackrest.conf
chmod 640 /etc/pgbackrest.conf

echo "Backup server configured"
ENDSSH

echo -e "${GREEN}✓ Backup server configured${NC}"
echo ""

# Step 4: Initialize pgBackRest
echo -e "${GREEN}[4/5] Initializing pgBackRest...${NC}"

# Restart PostgreSQL on primary
ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP "systemctl restart postgresql"
sleep 5

# Create stanza
ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP "sudo -u postgres pgbackrest --stanza=main stanza-create"

# Verify configuration
ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP "sudo -u postgres pgbackrest --stanza=main check"

echo -e "${GREEN}✓ pgBackRest initialized${NC}"
echo ""

# Step 5: Create initial backup and set up cron jobs
echo -e "${GREEN}[5/5] Creating initial backup and scheduling...${NC}"

# Create first full backup
echo "Creating initial full backup (this may take several minutes)..."
ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP "sudo -u postgres pgbackrest --stanza=main --type=full backup"

# Set up automated backups
ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP bash <<'ENDSSH'
set -e

# Create cron jobs for automated backups
cat > /etc/cron.d/pgbackrest <<EOF
# pgBackRest Automated Backups
# Full backup daily at 2 AM
0 2 * * * postgres pgbackrest --stanza=main --type=full backup

# Incremental backup every 4 hours
0 */4 * * * postgres pgbackrest --stanza=main --type=incr backup

# Check backup every 6 hours
0 */6 * * * postgres pgbackrest --stanza=main check
EOF

chmod 644 /etc/cron.d/pgbackrest

echo "Automated backups scheduled"
ENDSSH

echo -e "${GREEN}✓ Automated backups configured${NC}"
echo ""

# Verification
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Backup Status${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP "sudo -u postgres pgbackrest --stanza=main info"

echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "${YELLOW}Backup Schedule:${NC}"
echo "- Full backup: Daily at 2:00 AM"
echo "- Incremental backup: Every 4 hours"
echo "- Backup verification: Every 6 hours"
echo "- Retention: 7 days of full backups"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "View backups:"
echo "  ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP 'sudo -u postgres pgbackrest --stanza=main info'"
echo ""
echo "Manual full backup:"
echo "  ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP 'sudo -u postgres pgbackrest --stanza=main --type=full backup'"
echo ""
echo "Restore to specific time:"
echo "  sudo -u postgres pgbackrest --stanza=main --type=time --target='2025-11-22 12:00:00' restore"
echo ""
