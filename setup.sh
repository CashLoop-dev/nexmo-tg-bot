#!/bin/bash

# Create folders
mkdir -p lib/commands

# Create files with touch
touch lib/surveyQuestions.js
touch lib/config.js
touch lib/database.js
touch lib/NexmoHelper.js
touch lib/telegram-bot.js
touch lib/server.js

# Create command files
touch lib/commands/call.js
touch lib/commands/cancel.js
touch lib/commands/help.js
touch lib/commands/history.js
touch lib/commands/start.js
touch lib/commands/authorize.js
touch lib/commands/analytics.js
touch lib/commands/admin.js
touch lib/commands/exportSurvey.js

# Create package.json
touch package.json

echo "All folders and files created."
