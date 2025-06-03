module.exports = async function historyCommand(ctx, db) {
  if (!(await db.isUserAuthorized(ctx.from.id))) {
    return ctx.reply(ctx.t('not_authorized'));
  }
  const history = await db.getUserCallHistory(ctx.from.id);
  if (!history.length) return ctx.reply('No call history.');
  let msg = 'Your call history:\n' +
    history.map(h => `• ${h.phone_number} - ${h.status}${h.scheduled_time ? ` (scheduled for ${h.scheduled_time})` : ''}${h.error ? ` [error: ${h.error}]` : ''}${h.recording_url ? ` [recording: ${h.recording_url}]` : ''}`).join('\n');
  ctx.reply(msg);
};