module.exports = async function cancelCommand(ctx, db) {
  await db.clearState(ctx.from.id);
  ctx.reply('Cancelled.');
};