# Jira Assets Integration Plugin

Import AI Systems from Jira Service Management (JSM) Assets as use-cases in VerifyWise.

## Features

- **Import AI Systems**: Import AI System objects from JSM Assets as use-cases
- **Organizational/Non-Organizational**: Classify imported objects as organizational (linked to org project) or standalone
- **Automatic Sync**: Scheduled synchronization to keep data in sync with JIRA
- **Full Attribute Storage**: All JIRA object attributes are stored as-is (no field mapping)
- **UC-ID Generation**: Auto-generated unique UC-IDs for imported use-cases (UC-J1, UC-J2, etc.)

## Configuration

1. Install the plugin from the VerifyWise Plugin Marketplace
2. Configure your JIRA connection:
   - **JIRA Base URL**: Your Atlassian instance URL (e.g., https://company.atlassian.net)
   - **Workspace ID**: Your JSM Assets workspace ID
   - **Email**: Your Atlassian account email
   - **API Token**: Generate from https://id.atlassian.com/manage-profile/security/api-tokens
3. Select the Schema and Object Type containing your AI Systems
4. Enable auto-sync if desired

## Import Process

1. Navigate to the Use Cases page and click the "JIRA AI Systems" tab
2. Click "Import from JIRA" to open the import wizard
3. Select the objects you want to import
4. Choose whether to import as:
   - **Organizational**: Links to your VerifyWise organizational project (inherits frameworks)
   - **Non-Organizational**: Standalone use-case with its own UC-ID

## Sync Behavior

- **Auto-Sync**: When enabled, the plugin syncs at the configured interval (1h, 6h, 12h, 24h, 48h)
- **Manual Sync**: Click "Sync Now" to trigger an immediate sync
- **Change Detection**: Updates existing records, adds new ones, marks deleted ones

## Requirements

- JIRA Service Management with Assets (formerly Insight)
- API Token with read access to Assets
- VerifyWise organization with plugin installation permissions

## Support

For issues or feature requests, please contact support@verifywise.com
