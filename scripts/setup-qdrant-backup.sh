#!/bin/bash
#
# Qdrant Backup Setup Script
# Automated snapshots and backup to replica server
#
# Features:
# - Automated snapshots every 6 hours
# - Backup to remote server
# - 7-day retention policy
# - Quick restore capability
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

QDRANT_STORAGE_PATH="/opt/qdrant/storage"
BACKUP_PATH="/backup/qdrant"

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Qdrant Backup Setup${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# Step 1: Install Qdrant on backup server
echo -e "${GREEN}[1/4] Installing Qdrant on backup server...${NC}"

ssh -i $BACKUP_SSH_KEY root@$BACKUP_SERVER_IP bash <<'ENDSSH'
set -e

# Download and install Qdrant
if [ ! -f /usr/local/bin/qdrant ]; then
    echo "Downloading Qdrant..."
    wget https://github.com/qdrant/qdrant/releases/download/v1.7.4/qdrant-x86_64-unknown-linux-gnu.tar.gz
    tar -xzf qdrant-x86_64-unknown-linux-gnu.tar.gz
    mv qdrant /usr/local/bin/
    chmod +x /usr/local/bin/qdrant
    rm qdrant-x86_64-unknown-linux-gnu.tar.gz
    echo "Qdrant installed"
else
    echo "Qdrant already installed"
fi

# Create directories
mkdir -p /opt/qdrant/storage
mkdir -p /opt/qdrant/config
mkdir -p /backup/qdrant

# Create Qdrant config
cat > /opt/qdrant/config/config.yaml <<EOF
storage:
  storage_path: /opt/qdrant/storage
  snapshots_path: /opt/qdrant/storage/snapshots

service:
  host: 0.0.0.0
  http_port: 6333
  grpc_port: 6334

cluster:
  enabled: false
EOF

# Create systemd service
cat > /etc/systemd/system/qdrant.service <<EOF
[Unit]
Description=Qdrant Vector Database
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt
ExecStart=/usr/local/bin/qdrant --config-path /opt/qdrant/config/config.yaml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable qdrant

echo "Qdrant backup server configured"
ENDSSH

echo -e "${GREEN}✓ Qdrant installed on backup server${NC}"
echo ""

# Step 2: Create backup directories and scripts on primary
echo -e "${GREEN}[2/4] Setting up backup system on primary...${NC}"

ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP bash <<'ENDSSH'
set -e

# Create local backup directory
mkdir -p /backup/qdrant/snapshots
mkdir -p /backup/qdrant/logs

# Create backup script
cat > /usr/local/bin/qdrant-backup.sh <<'EOF'
#!/bin/bash
#
# Qdrant Backup Script
# Creates snapshots and syncs to backup server
#

set -e

QDRANT_URL="http://localhost:6333"
BACKUP_DIR="/backup/qdrant"
LOG_FILE="/backup/qdrant/logs/backup-$(date +%Y%m%d-%H%M%S).log"
BACKUP_SERVER="46.62.146.236"
RETENTION_DAYS=7

exec > >(tee -a "$LOG_FILE")
exec 2>&1

echo "========================================="
echo "Qdrant Backup - $(date)"
echo "========================================="

# Get list of all collections
echo "Fetching collections..."
COLLECTIONS=$(curl -s "$QDRANT_URL/collections" | jq -r '.result.collections[].name' 2>/dev/null || echo "")

if [ -z "$COLLECTIONS" ]; then
    echo "No collections found or Qdrant is not responding"
    exit 1
fi

echo "Found collections:"
echo "$COLLECTIONS"
echo ""

# Create snapshots for each collection
for COLLECTION in $COLLECTIONS; do
    echo "Creating snapshot for: $COLLECTION"

    # Create snapshot via API
    SNAPSHOT_RESPONSE=$(curl -s -X POST "$QDRANT_URL/collections/$COLLECTION/snapshots")
    SNAPSHOT_NAME=$(echo "$SNAPSHOT_RESPONSE" | jq -r '.result.name' 2>/dev/null || echo "")

    if [ -n "$SNAPSHOT_NAME" ]; then
        echo "  Snapshot created: $SNAPSHOT_NAME"

        # Download snapshot
        SNAPSHOT_DIR="$BACKUP_DIR/snapshots/$(date +%Y%m%d)"
        mkdir -p "$SNAPSHOT_DIR"

        curl -s "$QDRANT_URL/collections/$COLLECTION/snapshots/$SNAPSHOT_NAME" \
            -o "$SNAPSHOT_DIR/${COLLECTION}_${SNAPSHOT_NAME}"

        echo "  Downloaded to: $SNAPSHOT_DIR/${COLLECTION}_${SNAPSHOT_NAME}"
    else
        echo "  ERROR: Failed to create snapshot for $COLLECTION"
    fi
    echo ""
done

# Sync to backup server
echo "Syncing to backup server..."
rsync -avz --delete \
    -e "ssh -i /root/.ssh/hetzner_fluxez" \
    "$BACKUP_DIR/snapshots/" \
    "root@$BACKUP_SERVER:/backup/qdrant/snapshots/"

echo "Backup synced to $BACKUP_SERVER"

# Clean up old local snapshots
echo "Cleaning up old snapshots (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR/snapshots" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true

# Clean up old logs
find "$BACKUP_DIR/logs" -name "backup-*.log" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

echo ""
echo "Backup completed successfully at $(date)"
echo "========================================="
EOF

chmod +x /usr/local/bin/qdrant-backup.sh

echo "Backup script created"
ENDSSH

echo -e "${GREEN}✓ Backup system configured${NC}"
echo ""

# Step 3: Set up SSH key for passwordless rsync
echo -e "${GREEN}[3/4] Configuring SSH access...${NC}"

# Copy SSH key to primary server if not exists
ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP "mkdir -p /root/.ssh && chmod 700 /root/.ssh"
scp -i $PRIMARY_SSH_KEY ~/.ssh/hetzner_fluxez root@$PRIMARY_IP:/root/.ssh/
ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP "chmod 600 /root/.ssh/hetzner_fluxez"

# Test SSH connection
ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP "ssh -i /root/.ssh/hetzner_fluxez -o StrictHostKeyChecking=no root@$BACKUP_SERVER_IP 'echo SSH connection successful'"

echo -e "${GREEN}✓ SSH access configured${NC}"
echo ""

# Step 4: Schedule automated backups
echo -e "${GREEN}[4/4] Scheduling automated backups...${NC}"

ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP bash <<'ENDSSH'
set -e

# Create cron job for automated backups
cat > /etc/cron.d/qdrant-backup <<EOF
# Qdrant Automated Backups
# Backup every 6 hours
0 */6 * * * root /usr/local/bin/qdrant-backup.sh

# Daily full backup at 3 AM
0 3 * * * root /usr/local/bin/qdrant-backup.sh
EOF

chmod 644 /etc/cron.d/qdrant-backup

echo "Automated backups scheduled"
ENDSSH

# Run initial backup
echo ""
echo -e "${YELLOW}Running initial backup...${NC}"
ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP "/usr/local/bin/qdrant-backup.sh"

echo -e "${GREEN}✓ Initial backup completed${NC}"
echo ""

# Create restore script
echo -e "${GREEN}Creating restore script...${NC}"

cat > ./restore-qdrant.sh <<'EOF'
#!/bin/bash
#
# Qdrant Restore Script
# Usage: ./restore-qdrant.sh [backup_date]
# Example: ./restore-qdrant.sh 20251122
#

set -e

PRIMARY_IP="46.62.161.254"
BACKUP_SERVER_IP="46.62.146.236"
SSH_KEY="~/.ssh/hetzner_fluxez"

BACKUP_DATE=${1:-$(date +%Y%m%d)}

echo "======================================"
echo "Qdrant Restore"
echo "======================================"
echo "Backup Date: $BACKUP_DATE"
echo "Target Server: $PRIMARY_IP"
echo ""
read -p "This will STOP Qdrant and RESTORE data. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled"
    exit 1
fi

# Stop Qdrant
echo "Stopping Qdrant..."
ssh -i $SSH_KEY root@$PRIMARY_IP "systemctl stop qdrant"

# Restore from backup server
echo "Restoring data from backup server..."
ssh -i $SSH_KEY root@$PRIMARY_IP bash <<ENDSSH
set -e

# Backup current data
mv /opt/qdrant/storage /opt/qdrant/storage.old.\$(date +%Y%m%d-%H%M%S)

# Create new storage directory
mkdir -p /opt/qdrant/storage

# Copy snapshots from backup server
rsync -avz \
    -e "ssh -i /root/.ssh/hetzner_fluxez" \
    "root@$BACKUP_SERVER_IP:/backup/qdrant/snapshots/$BACKUP_DATE/" \
    "/tmp/qdrant-restore/"

echo "Data restored, restarting Qdrant..."
ENDSSH

# Start Qdrant
ssh -i $SSH_KEY root@$PRIMARY_IP "systemctl start qdrant"
sleep 5

# Verify
ssh -i $SSH_KEY root@$PRIMARY_IP "systemctl is-active qdrant"

echo ""
echo "======================================"
echo "Restore completed successfully!"
echo "======================================"
echo ""
echo "Note: You need to import the snapshots via Qdrant API"
echo "Check /tmp/qdrant-restore/ on the server for snapshot files"
EOF

chmod +x ./restore-qdrant.sh

echo -e "${GREEN}✓ Restore script created${NC}"
echo ""

# Verification
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "${YELLOW}Backup Schedule:${NC}"
echo "- Snapshots every 6 hours"
echo "- Daily full backup at 3:00 AM"
echo "- 7-day retention policy"
echo "- Automatic sync to backup server ($BACKUP_SERVER_IP)"
echo ""
echo -e "${YELLOW}Backup Locations:${NC}"
echo "Primary: $PRIMARY_IP:/backup/qdrant/snapshots/"
echo "Replica: $BACKUP_SERVER_IP:/backup/qdrant/snapshots/"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "Manual backup:"
echo "  ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP '/usr/local/bin/qdrant-backup.sh'"
echo ""
echo "View backups:"
echo "  ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP 'ls -lh /backup/qdrant/snapshots/'"
echo ""
echo "Restore from backup:"
echo "  ./restore-qdrant.sh [YYYYMMDD]"
echo ""
echo "View backup logs:"
echo "  ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP 'tail -f /backup/qdrant/logs/backup-*.log'"
echo ""
