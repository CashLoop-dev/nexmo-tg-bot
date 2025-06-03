const { Bot, InlineKeyboard, session } = require('grammy');
const config = require('./config');
const db = require('./database');
const NexmoHelper = require('./NexmoHelper');
const i18n = require('./i18n');

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
const surveyCommand = require('./commands/survey');

const bot = new Bot(config.TELEGRAM_BOT_TOKEN);
const nexmoHelper = new NexmoHelper(config, db);

// Session middleware for language and rate limiting
bot.use(session({ initial: () => ({}) }));

// Middleware: register users, set language, rate limit
bot.use(async (ctx, next) => {
  if (ctx.from) {
    await db.addUser(ctx.from.id, ctx.from.username || '', 0);
    ctx.session.lang = ctx.session.lang || (await db.getUserLanguage(ctx.from.id)) || 'en';
    ctx.t = (key, params) => i18n.t(ctx.session.lang, key, params);
    ctx.session.lastCall = ctx.session.lastCall || 0;
  }
  await next();
});

// Language selection command
bot.command('language', async ctx => {
  await ctx.reply(ctx.t('choose_language'), {
    reply_markup: new InlineKeyboard()
      .text('English', 'LANG_en').text('Español', 'LANG_es').row()
      .text('Français', 'LANG_fr')
  });
});
bot.callbackQuery(/^LANG_(.+)$/, async ctx => {
  const lang = ctx.match[1];
  await db.setUserLanguage(ctx.from.id, lang);
  ctx.session.lang = lang;
  await ctx.answerCallbackQuery({ text: i18n.t(lang, 'language_set') });
  await ctx.reply(i18n.t(lang, 'language_set'));
});

// Command Routing
bot.command('start', ctx => startCommand(ctx));
bot.command('call', ctx => callCommand(ctx, db, nexmoHelper));
bot.command('history', ctx => historyCommand(ctx, db));
bot.command('cancel', ctx => cancelCommand(ctx, db));
bot.command('help', ctx => helpCommand(ctx));
bot.command('authorize_me', async ctx => {
  const match = ctx.message.text.split(' ').slice(1).join(' ');
  ctx.match = match;
  await authorizeCommand(ctx, db, config);
});
bot.command('analytics', ctx => analyticsCommand(ctx, db));
bot.command('export_survey', ctx => exportSurveyCommand(ctx, db));
bot.command('admin', ctx => adminCommand(ctx, db, config));
bot.command('survey', ctx => surveyCommand(ctx, db, config));

// Inline Keyboard Callback Handler (for all commands!)
bot.on('callback_query:data', async ctx => {
  if (await require('./commands/admin').handleCallbackQuery(ctx, db, config)) return;
  if (await require('./commands/call').handleCallbackQuery(ctx, db, nexmoHelper)) return;
  if (await require('./commands/survey').handleCallbackQuery(ctx, db, config)) return;
  await ctx.answerCallbackQuery();
});

// Text handler for conversational steps
bot.on('message:text', async ctx => {
  if (await require('./commands/admin').handleText(ctx, db, config)) return;
  if (await require('./commands/call').handleText(ctx, db, nexmoHelper)) return;
  if (await require('./commands/call').handleScheduledText(ctx, db, nexmoHelper)) return;
  if (await require('./commands/survey').handleText(ctx, db, config)) return;
});

bot.start();