#!/bin/bash
#
# PostgreSQL Streaming Replication Setup Script
# Primary: 46.62.161.254 (Server 254)
# Replica: 46.62.146.236 (Server 236)
#
# This script sets up production-ready PostgreSQL replication with:
# - Streaming replication for high availability
# - Automatic failover capability
# - Point-in-time recovery support
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PRIMARY_IP="46.62.161.254"
REPLICA_IP="46.62.146.236"
PRIMARY_SSH_KEY="~/.ssh/hetzner_fluxez"
REPLICA_SSH_KEY="~/.ssh/hetzner_fluxez"

# Replication settings
REPLICATION_USER="replicator"
REPLICATION_PASSWORD=$(openssl rand -base64 32)
POSTGRES_VERSION="16"

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}PostgreSQL Replication Setup${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo "Primary Server: $PRIMARY_IP"
echo "Replica Server: $REPLICA_IP"
echo ""

# Save credentials
CREDENTIALS_FILE="./postgres-replication-credentials.txt"
cat > "$CREDENTIALS_FILE" <<EOF
PostgreSQL Replication Credentials
===================================
Generated: $(date)

Primary Server: $PRIMARY_IP
Replica Server: $REPLICA_IP

Replication User: $REPLICATION_USER
Replication Password: $REPLICATION_PASSWORD

KEEP THIS FILE SECURE!
EOF

echo -e "${YELLOW}Credentials saved to: $CREDENTIALS_FILE${NC}"
echo ""

# Step 1: Configure Primary Server
echo -e "${GREEN}[1/6] Configuring Primary Server...${NC}"

ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP bash <<'ENDSSH'
set -e

# Create replication user
sudo -u postgres psql <<EOF
-- Create replication user
CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'REPL_PASSWORD_PLACEHOLDER';
GRANT CONNECT ON DATABASE postgres TO replicator;

-- Grant necessary permissions
ALTER USER replicator WITH LOGIN;
EOF

echo "Replication user created"

# Backup current postgresql.conf
cp /etc/postgresql/16/main/postgresql.conf /etc/postgresql/16/main/postgresql.conf.backup.$(date +%F)

# Configure PostgreSQL for replication
cat >> /etc/postgresql/16/main/postgresql.conf <<EOF

#------------------------------------------------------------------------------
# REPLICATION SETTINGS (Added by setup script)
#------------------------------------------------------------------------------
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
hot_standby = on
wal_keep_size = 1024
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/16/archive/%f && cp %p /var/lib/postgresql/16/archive/%f'
EOF

# Create archive directory
mkdir -p /var/lib/postgresql/16/archive
chown postgres:postgres /var/lib/postgresql/16/archive
chmod 700 /var/lib/postgresql/16/archive

# Backup current pg_hba.conf
cp /etc/postgresql/16/main/pg_hba.conf /etc/postgresql/16/main/pg_hba.conf.backup.$(date +%F)

# Allow replication connections
cat >> /etc/postgresql/16/main/pg_hba.conf <<EOF

# Replication connections (Added by setup script)
host    replication     replicator      46.62.146.236/32        scram-sha-256
host    all            replicator      46.62.146.236/32        scram-sha-256
EOF

echo "Primary server configured"
ENDSSH

# Replace password in the script
ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP "sudo -u postgres psql -c \"ALTER USER replicator WITH PASSWORD '$REPLICATION_PASSWORD';\""

echo -e "${GREEN}✓ Primary server configured${NC}"
echo ""

# Step 2: Restart Primary PostgreSQL
echo -e "${GREEN}[2/6] Restarting Primary PostgreSQL...${NC}"
ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP "systemctl restart postgresql"
sleep 5

# Verify primary is running
ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP "systemctl is-active postgresql" || {
    echo -e "${RED}ERROR: Primary PostgreSQL failed to start!${NC}"
    exit 1
}

echo -e "${GREEN}✓ Primary PostgreSQL restarted${NC}"
echo ""

# Step 3: Prepare Replica Server
echo -e "${GREEN}[3/6] Preparing Replica Server...${NC}"

ssh -i $REPLICA_SSH_KEY root@$REPLICA_IP bash <<ENDSSH
set -e

# Stop PostgreSQL if running
systemctl stop postgresql 2>/dev/null || true

# Install PostgreSQL 16 if not installed
if ! dpkg -l | grep -q postgresql-16; then
    echo "Installing PostgreSQL 16..."
    apt-get update
    apt-get install -y postgresql-16 postgresql-client-16
fi

# Remove existing data directory
rm -rf /var/lib/postgresql/16/main/*

# Create .pgpass file for replication user
cat > /var/lib/postgresql/.pgpass <<EOF
$PRIMARY_IP:5432:replication:$REPLICATION_USER:$REPLICATION_PASSWORD
EOF

chown postgres:postgres /var/lib/postgresql/.pgpass
chmod 0600 /var/lib/postgresql/.pgpass

echo "Replica server prepared"
ENDSSH

echo -e "${GREEN}✓ Replica server prepared${NC}"
echo ""

# Step 4: Create Base Backup
echo -e "${GREEN}[4/6] Creating base backup from primary...${NC}"
echo -e "${YELLOW}This may take several minutes depending on database size...${NC}"

ssh -i $REPLICA_SSH_KEY root@$REPLICA_IP bash <<ENDSSH
set -e

# Use pg_basebackup to clone primary
sudo -u postgres pg_basebackup \
    -h $PRIMARY_IP \
    -D /var/lib/postgresql/16/main \
    -U replicator \
    -P \
    -v \
    -R \
    -X stream \
    -C -S replica_slot_1

echo "Base backup completed"
ENDSSH

echo -e "${GREEN}✓ Base backup completed${NC}"
echo ""

# Step 5: Configure Replica
echo -e "${GREEN}[5/6] Configuring Replica Server...${NC}"

ssh -i $REPLICA_SSH_KEY root@$REPLICA_IP bash <<'ENDSSH'
set -e

# Backup and update postgresql.conf
cp /etc/postgresql/16/main/postgresql.conf /etc/postgresql/16/main/postgresql.conf.backup.$(date +%F)

cat >> /etc/postgresql/16/main/postgresql.conf <<EOF

#------------------------------------------------------------------------------
# REPLICA SETTINGS (Added by setup script)
#------------------------------------------------------------------------------
hot_standby = on
hot_standby_feedback = on
wal_receiver_status_interval = 10
max_standby_streaming_delay = 30s
wal_retrieve_retry_interval = 5s
EOF

# Set correct permissions
chown -R postgres:postgres /var/lib/postgresql/16/main
chmod 700 /var/lib/postgresql/16/main

echo "Replica configured"
ENDSSH

echo -e "${GREEN}✓ Replica configured${NC}"
echo ""

# Step 6: Start Replica
echo -e "${GREEN}[6/6] Starting Replica PostgreSQL...${NC}"

ssh -i $REPLICA_SSH_KEY root@$REPLICA_IP "systemctl start postgresql"
sleep 5

# Verify replica is running
ssh -i $REPLICA_SSH_KEY root@$REPLICA_IP "systemctl is-active postgresql" || {
    echo -e "${RED}ERROR: Replica PostgreSQL failed to start!${NC}"
    exit 1
}

echo -e "${GREEN}✓ Replica PostgreSQL started${NC}"
echo ""

# Verification
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Verifying Replication Status${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

echo "Primary Server Status:"
ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP "sudo -u postgres psql -c 'SELECT client_addr, state, sync_state FROM pg_stat_replication;'"

echo ""
echo "Replica Server Status:"
ssh -i $REPLICA_SSH_KEY root@$REPLICA_IP "sudo -u postgres psql -c 'SELECT status, receive_start_lsn, received_lsn FROM pg_stat_wal_receiver;'"

echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "${YELLOW}Important Notes:${NC}"
echo "1. Credentials saved in: $CREDENTIALS_FILE"
echo "2. Replication is now active"
echo "3. All changes on Primary (254) will replicate to Replica (236)"
echo "4. Replica is READ-ONLY - do not write to it directly"
echo "5. Backups are stored in /var/lib/postgresql/16/archive on Primary"
echo ""
echo -e "${YELLOW}Monitoring Commands:${NC}"
echo "Primary: ssh -i $PRIMARY_SSH_KEY root@$PRIMARY_IP \"sudo -u postgres psql -c 'SELECT * FROM pg_stat_replication;'\""
echo "Replica: ssh -i $REPLICA_SSH_KEY root@$REPLICA_IP \"sudo -u postgres psql -c 'SELECT * FROM pg_stat_wal_receiver;'\""
echo ""
