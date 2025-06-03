const { InlineKeyboard } = require("grammy");
const surveyQuestions = require("../surveyQuestions");

module.exports = async function adminCommand(ctx, db, config) {
  if (String(ctx.from.id) !== String(config.BOT_OWNER_ID)) return ctx.reply('Not allowed.');
  await ctx.reply(
    "Admin Panel:",
    {
      reply_markup: new InlineKeyboard()
        .text("View Users", "ADMIN_USERS")
        .row()
        .text("Survey Stats", "ADMIN_SURVEY_STATS")
        .row()
        .text("Authorize User", "ADMIN_AUTH")
    }
  );
};

module.exports.handleCallbackQuery = async function(ctx, db, config) {
  if (String(ctx.from.id) !== String(config.BOT_OWNER_ID)) return false;
  const cb = ctx.callbackQuery.data;
  if (cb === "ADMIN_USERS") {
    db.getAllUsers((users) => {
      let msg = "Users:\n" + users.map(
        u => `${u.username || ''} (${u.telegram_id}) - ${u.is_authorized ? "✅" : "❌"}`
      ).join("\n");
      ctx.reply(msg || "No users found.");
    });
    return true;
  }
  if (cb === "ADMIN_SURVEY_STATS") {
    for (const q of surveyQuestions) {
      await new Promise(resolve => {
        db.getSurveyStats(q.key, async (stats) => {
          let msg = `**${q.text}**\n`;
          if (!stats.length) msg += 'No responses yet.';
          else {
            msg += stats.map(s => `Answer ${s.answer || 'None'}: ${s.count}`).join('\n');
          }
          await ctx.reply(msg, { parse_mode: 'Markdown' });
          resolve();
        });
      });
    }
    return true;
  }
  if (cb === "ADMIN_AUTH") {
    await db.setState(ctx.from.id, 'awaiting_admin_auth', {});
    ctx.reply("Enter Telegram ID to authorize:");
    return true;
  }
  return false;
};

module.exports.handleText = async function(ctx, db, config) {
  const { state } = await db.getState(ctx.from.id);
  if (state === 'awaiting_admin_auth') {
    const id = ctx.message.text.trim();
    db.authorizeUser(id);
    await db.clearState(ctx.from.id);
    ctx.reply(`User ${id} authorized!`);
    return true;
  }
  return false;
};