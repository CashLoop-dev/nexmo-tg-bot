# Telegram Survey Call Bot

**Automated Customer Survey by Phone, Powered via Telegram, Vonage/Nexmo Voice, and SQLite**

---

## Features

- 📞 **One-click call initiation** from Telegram to any customer phone number.
- 📝 **Dynamic, multi-question IVR (DTMF) surveys** with customizable questions.
- 💾 **Persistent storage** using SQLite for all calls, users, and survey results.
- 📊 **Analytics:** view aggregated survey results (per-question), user activity, and call stats.
- 🛠️ **Admin dashboard:** authorize users, review stats, and export survey data (CSV) via Telegram inline keyboards.
- 🔒 **Role-based access:** only authorized users can trigger calls or access analytics.
- ⚡ **Modular, maintainable architecture:** each command is a separate file for easy expansion.
- 🛡️ **Robust error handling** and conversational flows.

---

## Quickstart

### 1. **Clone and install dependencies**
```bash
git clone https://github.com/CashLoop-dev/nexmo-tg-bot.git
cd nexmo-tg-bot
npm install
```

### 2. **Prepare your environment**

Copy and edit your `.env` file (see below for required variables).

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
BOT_PHONE_NUMBER=your_vonage_virtual_number
NEXMO_API_KEY=your_vonage_api_key
NEXMO_API_SECRET=your_vonage_api_secret
NEXMO_APP_ID=your_vonage_application_id
NEXMO_PRIVATE_KEY=path/to/private.key
BASE_URL=https://your-server-url
BOT_OWNER_ID=your_telegram_id
```

> **Tip:** For webhooks, your `BASE_URL` must be reachable from Vonage (use [ngrok](https://ngrok.com/) for local dev).

### 3. **Create project structure**

You can use the provided script:

```bash
bash setup.sh
```
_or create folders/files as described in the structure below._

### 4. **Paste the code**

- Paste each provided code block into its corresponding file.

### 5. **Run the services**

In two terminals:

```bash
npm run server      # Runs Express server for Vonage webhooks
npm start           # Runs the Telegram bot
```

---

## Project Structure

```
lib/
  commands/
    call.js
    cancel.js
    help.js
    history.js
    start.js
    authorize.js
    analytics.js
    admin.js
    exportSurvey.js
  surveyQuestions.js
  config.js
  database.js
  NexmoHelper.js
  bot.js
  server.js
init_structure.sh
package.json
README.md
```

---

## Survey Flow

1. **Bot user** issues `/call` in Telegram.
2. **Bot** asks for customer phone number and (optionally) schedule.
3. **Customer** receives a call, hears a customizable series of survey questions, and answers using the keypad.
4. **Survey results** are stored in SQLite and sent as a summary to the originating bot user.
5. **Admins and users** can review analytics, export CSV, or manage authorization.

---

## Customizing Survey Questions

Edit `lib/surveyQuestions.js`:

```js
module.exports = [
  {
    step: 1,
    text: "How do you rate our service? (1-5)",
    maxDigits: 1,
    key: "service_rating"
  },
  // Add, remove, or reorder questions as needed
];
```

---

## Analytics and Dashboard

- **User:** `/analytics` - see your survey result stats by question.
- **Admin:** `/admin` command opens an inline keyboard dashboard; view all users, survey stats, or authorize new users.
- **Export:** `/export_survey` (admin only) to get all raw results as a CSV.

---

## Security & Access

- Only authorized Telegram users can initiate calls or access analytics.
- The admin (set via `BOT_OWNER_ID`) can authorize new users directly from Telegram.

---

## Production Notes

- Use a production-ready process manager (e.g., PM2) for reliability.
- Secure your webhooks and tokens.
- For large-scale use, swap SQLite for a more robust DB (e.g., PostgreSQL).

---

## Educational Notice

This project is for **educational and demonstration purposes** only. Use responsibly and comply with all applicable laws regarding customer contact and data privacy.

---

## License

MIT

---

### Questions? Suggestions?

Open an issue or PR. Happy coding! 🚀