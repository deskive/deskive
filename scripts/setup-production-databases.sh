#!/bin/bash
#
# Master Setup Script - Production Database Infrastructure
#
# This script automates the complete setup of:
# 1. PostgreSQL streaming replication (Primary -> Replica)
# 2. pgBackRest automated backups
# 3. Qdrant snapshot backups
#
# Primary Server: 46.62.161.254 (ubuntu-16gb-hel1-1)
# Backup/Replica Server: 46.62.146.236 (ubuntu-16gb-hel1-2)
#
# Author: Automated setup script
# Date: November 22, 2025
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   Production Database Infrastructure Setup                  ║
║                                                              ║
║   PostgreSQL Replication + Automated Backups + Qdrant       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo -e "${YELLOW}This script will set up:${NC}"
echo "  ✓ PostgreSQL 16 streaming replication"
echo "  ✓ pgBackRest automated backups (7-day retention)"
echo "  ✓ Qdrant snapshot backups (synced to replica)"
echo "  ✓ Automated cron jobs for backups"
echo "  ✓ Monitoring and restore scripts"
echo ""
echo -e "${YELLOW}Servers:${NC}"
echo "  Primary:  46.62.161.254 (ubuntu-16gb-hel1-1)"
echo "  Replica:  46.62.146.236 (ubuntu-16gb-hel1-2)"
echo ""
echo -e "${RED}WARNING: This will modify PostgreSQL and Qdrant configurations!${NC}"
echo -e "${YELLOW}Make sure you have recent backups before proceeding.${NC}"
echo ""
read -p "Do you want to continue? (yes/no) " -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "Setup cancelled"
    exit 1
fi

echo ""
echo -e "${GREEN}Starting setup...${NC}"
echo ""

# Step 1: PostgreSQL Replication
echo -e "${BLUE}[1/3] Setting up PostgreSQL Replication...${NC}"
if [ -f "$SCRIPT_DIR/setup-postgres-replication.sh" ]; then
    chmod +x "$SCRIPT_DIR/setup-postgres-replication.sh"
    "$SCRIPT_DIR/setup-postgres-replication.sh"
else
    echo -e "${RED}ERROR: setup-postgres-replication.sh not found!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}PostgreSQL replication setup completed!${NC}"
echo "Press Enter to continue to backup setup..."
read

# Step 2: pgBackRest Backup
echo ""
echo -e "${BLUE}[2/3] Setting up pgBackRest Automated Backups...${NC}"
if [ -f "$SCRIPT_DIR/setup-pgbackrest.sh" ]; then
    chmod +x "$SCRIPT_DIR/setup-pgbackrest.sh"
    "$SCRIPT_DIR/setup-pgbackrest.sh"
else
    echo -e "${RED}ERROR: setup-pgbackrest.sh not found!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}pgBackRest setup completed!${NC}"
echo "Press Enter to continue to Qdrant backup setup..."
read

# Step 3: Qdrant Backup
echo ""
echo -e "${BLUE}[3/3] Setting up Qdrant Snapshot Backups...${NC}"
if [ -f "$SCRIPT_DIR/setup-qdrant-backup.sh" ]; then
    chmod +x "$SCRIPT_DIR/setup-qdrant-backup.sh"
    "$SCRIPT_DIR/setup-qdrant-backup.sh"
else
    echo -e "${RED}ERROR: setup-qdrant-backup.sh not found!${NC}"
    exit 1
fi

# Final Summary
echo ""
echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              🎉 SETUP COMPLETED SUCCESSFULLY! 🎉             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo -e "${GREEN}=== PRODUCTION INFRASTRUCTURE SUMMARY ===${NC}"
echo ""
echo -e "${YELLOW}✓ PostgreSQL Streaming Replication${NC}"
echo "  Primary:  46.62.161.254:5432"
echo "  Replica:  46.62.146.236:5432 (read-only)"
echo "  Status:   Credentials saved in postgres-replication-credentials.txt"
echo ""
echo -e "${YELLOW}✓ pgBackRest Automated Backups${NC}"
echo "  Schedule: Full backup daily at 2 AM"
echo "            Incremental every 4 hours"
echo "  Retention: 7 days"
echo "  Location: /var/lib/pgbackrest (primary)"
echo "            /backup/pgbackrest (replica)"
echo ""
echo -e "${YELLOW}✓ Qdrant Snapshot Backups${NC}"
echo "  Schedule: Every 6 hours + daily at 3 AM"
echo "  Retention: 7 days"
echo "  Location: /backup/qdrant/snapshots (both servers)"
echo ""
echo -e "${GREEN}=== MONITORING COMMANDS ===${NC}"
echo ""
echo "Check PostgreSQL replication:"
echo "  ssh -i ~/.ssh/hetzner_fluxez root@46.62.161.254 'sudo -u postgres psql -c \"SELECT * FROM pg_stat_replication;\"'"
echo ""
echo "Check pgBackRest backups:"
echo "  ssh -i ~/.ssh/hetzner_fluxez root@46.62.161.254 'sudo -u postgres pgbackrest --stanza=main info'"
echo ""
echo "Check Qdrant backups:"
echo "  ssh -i ~/.ssh/hetzner_fluxez root@46.62.161.254 'ls -lh /backup/qdrant/snapshots/'"
echo ""
echo -e "${GREEN}=== RESTORE SCRIPTS ===${NC}"
echo ""
echo "Restore PostgreSQL (point-in-time):"
echo "  See: pgbackrest documentation for restore procedures"
echo ""
echo "Restore Qdrant:"
echo "  ./restore-qdrant.sh [YYYYMMDD]"
echo ""
echo -e "${YELLOW}=== IMPORTANT FILES ===${NC}"
echo "  - postgres-replication-credentials.txt (PostgreSQL credentials)"
echo "  - restore-qdrant.sh (Qdrant restore script)"
echo ""
echo -e "${YELLOW}=== NEXT STEPS ===${NC}"
echo "1. Test replication by creating test data on primary"
echo "2. Verify backups are running (check cron logs)"
echo "3. Set up monitoring alerts (optional)"
echo "4. Document your disaster recovery procedures"
echo ""
echo -e "${GREEN}Your databases are now production-ready with:${NC}"
echo "  ✓ High availability (replication)"
echo "  ✓ Automated backups"
echo "  ✓ Point-in-time recovery"
echo "  ✓ 7-day retention"
echo "  ✓ Quick restore capability"
echo ""
echo -e "${BLUE}Setup completed at: $(date)${NC}"
echo ""
