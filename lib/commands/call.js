const { InlineKeyboard } = require("grammy");

module.exports = async function callCommand(ctx, db) {
  if (!(await db.isUserAuthorized(ctx.from.id))) {
    return ctx.reply('You are not authorized to use this bot.');
  }
  await db.setState(ctx.from.id, 'awaiting_phone', {});
  ctx.reply('Enter phone number to call:');
};

module.exports.handleText = async function(ctx, db, nexmoHelper) {
  const { state, data } = await db.getState(ctx.from.id);
  if (state === 'awaiting_phone') {
    const phone = ctx.message.text.replace(/[^0-9]/g, "");
    if (!/^\d{7,15}$/.test(phone)) {
      return ctx.reply('Invalid phone number. Please enter digits only, at least 7 digits:');
    }
    await db.setState(ctx.from.id, 'awaiting_schedule', { phone });
    ctx.reply(
      'Schedule call or call now?',
      {
        reply_markup: new InlineKeyboard()
          .text("Call now", "CALL_NOW")
          .text("Schedule", "SCHEDULE_CALL")
      }
    );
    return true;
  }
  return false;
};

module.exports.handleCallbackQuery = async function(ctx, db, nexmoHelper) {
  const { state, data } = await db.getState(ctx.from.id);
  if (state === 'awaiting_schedule' && data.phone) {
    if (ctx.callbackQuery.data === "CALL_NOW") {
      try {
        const callId = await nexmoHelper.makeCall(ctx.from, data.phone, null);
        await db.clearState(ctx.from.id);
        await ctx.reply(`Call started! Call ID: ${callId}`);
      } catch (err) {
        await db.clearState(ctx.from.id);
        await ctx.reply(`Failed to make call: ${err.message}`);
      }
      return true;
    }
    if (ctx.callbackQuery.data === "SCHEDULE_CALL") {
      await db.setState(ctx.from.id, 'awaiting_schedule_minutes', { phone: data.phone });
      await ctx.reply("How many minutes from now should the call be scheduled?");
      return true;
    }
  }
  return false;
};

module.exports.handleScheduledText = async function(ctx, db, nexmoHelper) {
  const { state, data } = await db.getState(ctx.from.id);
  if (state === 'awaiting_schedule_minutes' && data.phone) {
    const minutes = Number(ctx.message.text.trim());
    if (isNaN(minutes) || minutes < 1) {
      return ctx.reply("Enter a valid number of minutes (at least 1):");
    }
    const scheduleTime = new Date(Date.now() + minutes * 60000).toISOString();
    try {
      const callId = await nexmoHelper.makeCall(ctx.from, data.phone, scheduleTime);
      await db.clearState(ctx.from.id);
      await ctx.reply(`Call scheduled for ${minutes} minutes from now! Call ID: ${callId}`);
    } catch (err) {
      await db.clearState(ctx.from.id);
      await ctx.reply(`Failed to schedule call: ${err.message}`);
    }
    return true;
  }
  return false;
};