const { InlineKeyboard } = require("grammy");

module.exports = async function adminCommand(ctx, db, config) {
  const role = await db.getUserRole(ctx.from.id);
  if (role !== 'owner' && String(ctx.from.id) !== String(config.BOT_OWNER_ID)) return ctx.reply(ctx.t('not_authorized'));
  await ctx.reply(
    ctx.t('admin_panel'),
    {
      reply_markup: new InlineKeyboard()
        .text("View Users", "ADMIN_USERS")
        .row()
        .text("Survey Stats", "ADMIN_SURVEY_STATS")
        .row()
        .text("Authorize User", "ADMIN_AUTH")
        .row()
        .text("Create Survey", "ADMIN_CREATE_SURVEY")
    }
  );
};

module.exports.handleCallbackQuery = async function(ctx, db, config) {
  const role = await db.getUserRole(ctx.from.id);
  if (role !== 'owner' && String(ctx.from.id) !== String(config.BOT_OWNER_ID)) return false;
  const cb = ctx.callbackQuery.data;
  if (cb === "ADMIN_USERS") {
    db.getAllUsers(async (users) => {
      let msg = users.map(u => `${u.username || u.telegram_id} - ${u.is_authorized ? '✅' : '❌'} - ${u.role}`).join('\n');
      await ctx.reply(msg || 'No users.');
    });
    return true;
  }
  if (cb === "ADMIN_SURVEY_STATS") {
    // Could call analyticsCommand here
    return true;
  }
  if (cb === "ADMIN_AUTH") {
    await db.setState(ctx.from.id, 'awaiting_admin_auth', {});
    await ctx.reply('Send Telegram ID to authorize:');
    return true;
  }
  if (cb === "ADMIN_CREATE_SURVEY") {
    await db.setState(ctx.from.id, 'creating_survey', { step: 0, name: '', lang: '', questions: [] });
    await ctx.reply('Enter survey name:');
    return true;
  }
  return false;
};

module.exports.handleText = async function(ctx, db, config) {
  const { state, data } = await db.getState(ctx.from.id);
  if (state === 'awaiting_admin_auth') {
    db.authorizeUser(ctx.message.text.trim());
    await db.clearState(ctx.from.id);
    await ctx.reply('User authorized.');
    return true;
  }
  if (state === 'creating_survey') {
    if (data.step === 0) {
      data.name = ctx.message.text.trim();
      data.step = 1;
      await db.setState(ctx.from.id, 'creating_survey', data);
      await ctx.reply('Enter language code (en/es/fr):');
      return true;
    }
    if (data.step === 1) {
      data.lang = ctx.message.text.trim();
      data.step = 2;
      await db.setState(ctx.from.id, 'creating_survey', data);
      await ctx.reply('Enter first question (or type /done to finish):');
      return true;
    }
    if (data.step === 2) {
      if (ctx.message.text.trim() === '/done') {
        if (!data.questions.length) {
          await ctx.reply('Add at least one question.');
          return true;
        }
        await db.createSurvey(data.name, data.lang, data.questions);
        await db.clearState(ctx.from.id);
        await ctx.reply('Survey created.');
        return true;
      }
      data.questions.push({ text: ctx.message.text.trim() });
      await db.setState(ctx.from.id, 'creating_survey', data);
      await ctx.reply('Enter next question (or type /done to finish):');
      return true;
    }
  }
  return false;
};