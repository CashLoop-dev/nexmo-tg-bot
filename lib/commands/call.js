const { InlineKeyboard } = require("grammy");

const CALL_RATE_LIMIT_SECONDS = 60; // 1 call per minute per user

module.exports = async function callCommand(ctx, db, nexmoHelper) {
  if (!(await db.isUserAuthorized(ctx.from.id))) {
    return ctx.reply(ctx.t('not_authorized'));
  }
  // Rate limiting
  const now = Math.floor(Date.now() / 1000);
  const lastCall = await db.getLastCallTime(ctx.from.id);
  if (now - lastCall < CALL_RATE_LIMIT_SECONDS) {
    return ctx.reply(ctx.t('call_limit'));
  }
  await db.setState(ctx.from.id, 'awaiting_phone', {});
  ctx.reply(ctx.t('call_prompt'));
};

module.exports.handleText = async function(ctx, db, nexmoHelper) {
  const { state, data } = await db.getState(ctx.from.id);
  if (state === 'awaiting_phone') {
    const phone = ctx.message.text.replace(/[^0-9+]/g, "");
    if (!phone) {
      return ctx.reply('Invalid phone number. Try again.');
    }
    await db.setState(ctx.from.id, 'awaiting_schedule', { phone });
    return ctx.reply('Call now or schedule?', {
      reply_markup: new InlineKeyboard()
        .text('Now', 'CALL_NOW').text('Schedule', 'CALL_SCHEDULE')
    });
  }
  return false;
};

module.exports.handleCallbackQuery = async function(ctx, db, nexmoHelper) {
  const { state, data } = await db.getState(ctx.from.id);
  if (state === 'awaiting_schedule' && data.phone) {
    if (ctx.callbackQuery.data === 'CALL_NOW') {
      await db.setLastCallTime(ctx.from.id, Math.floor(Date.now() / 1000));
      await nexmoHelper.makeCall(ctx.from, data.phone, null, true);
      await db.clearState(ctx.from.id);
      await ctx.reply(ctx.t('call_now'));
      return true;
    }
    if (ctx.callbackQuery.data === 'CALL_SCHEDULE') {
      await db.setState(ctx.from.id, 'awaiting_schedule_minutes', data);
      await ctx.reply('How many minutes from now?');
      return true;
    }
  }
  return false;
};

module.exports.handleScheduledText = async function(ctx, db, nexmoHelper) {
  const { state, data } = await db.getState(ctx.from.id);
  if (state === 'awaiting_schedule_minutes' && data.phone) {
    const minutes = parseInt(ctx.message.text, 10);
    if (isNaN(minutes) || minutes < 1 || minutes > 1440) {
      return ctx.reply('Enter a valid number of minutes (1-1440).');
    }
    const scheduleTime = new Date(Date.now() + minutes * 60000).toISOString();
    await nexmoHelper.makeCall(ctx.from, data.phone, scheduleTime, true);
    await db.clearState(ctx.from.id);
    await ctx.reply(ctx.t('call_scheduled'));
    return true;
  }
  return false;
};