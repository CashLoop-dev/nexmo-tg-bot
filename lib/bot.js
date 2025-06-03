const { Bot } = require('grammy');
const Nexmo = require('nexmo');
const config = require('./config');
const db = require('./database');
const NexmoHelper = require('./NexmoHelper');

// Import commands
const callCommand = require('./commands/call');
const historyCommand = require('./commands/history');
const cancelCommand = require('./commands/cancel');
const helpCommand = require('./commands/help');
const authorizeCommand = require('./commands/authorize');
const startCommand = require('./commands/start');
const analyticsCommand = require('./commands/analytics');
const exportSurveyCommand = require('./commands/exportSurvey');
const adminCommand = require('./commands/admin');

const bot = new Bot(config.TELEGRAM_BOT_TOKEN);
const nexmo = new Nexmo({
  apiKey: config.NEXMO_API_KEY,
  apiSecret: config.NEXMO_API_SECRET,
  applicationId: config.NEXMO_APP_ID,
  privateKey: config.NEXMO_PRIVATE_KEY
}, { debug: true });

const nexmoHelper = new NexmoHelper(nexmo, config, db);

const surveyQuestions = require('./surveyQuestions');

// --- Scheduled calls background handler ---
setInterval(() => nexmoHelper.processScheduledCalls(), 60 * 1000);

// Middleware: register users
bot.use(async (ctx, next) => {
  if (ctx.from) db.addUser(ctx.from.id, ctx.from.username || '', 0);
  await next();
});

// Command Routing
bot.command('start', ctx => startCommand(ctx));
bot.command('call', ctx => callCommand(ctx, db));
bot.command('history', ctx => historyCommand(ctx, db));
bot.command('cancel', ctx => cancelCommand(ctx, db));
bot.command('help', ctx => helpCommand(ctx));
bot.command('authorize_me', ctx => authorizeCommand(ctx, db, config));
bot.command('analytics', ctx => analyticsCommand(ctx, db));
bot.command('export_survey', ctx => exportSurveyCommand(ctx, db));
bot.command('admin', ctx => adminCommand(ctx, db, config));

// Inline Keyboard Callback Handler (for all commands!)
bot.on('callback_query:data', async ctx => {
  if (await callCommand.handleCallbackQuery?.(ctx, db, nexmoHelper)) return;
  if (await adminCommand.handleCallbackQuery?.(ctx, db, config)) return;
  await ctx.answerCallbackQuery();
});

// Text handler for conversational steps
bot.on('message:text', async ctx => {
  if (await callCommand.handleText?.(ctx, db, nexmoHelper)) return;
  if (await callCommand.handleScheduledText?.(ctx, db, nexmoHelper)) return;
  if (await adminCommand.handleText?.(ctx, db, config)) return;
});

// --- Survey result notification for server.js ---
async function sendSurveyResultToTelegram(callId) {
  const { summary, user_telegram_id } = await db.getSurveySummary(callId);
  if (summary && user_telegram_id) {
    await bot.api.sendMessage(user_telegram_id, `Survey results for call ${callId}:\n${summary}`);
  }
}
module.exports.sendSurveyResultToTelegram = sendSurveyResultToTelegram;

bot.catch(err => console.error('Bot error:', err));
bot.start();