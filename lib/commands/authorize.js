module.exports = async function authorizeCommand(ctx, db, config) {
  if (String(ctx.from.id) !== String(config.BOT_OWNER_ID)) return ctx.reply('Not allowed.');
  const targetId = ctx.match.trim();
  if (!targetId) return ctx.reply('Usage: /authorize_me <telegram_id>');
  db.authorizeUser(targetId);
  ctx.reply(`User ${targetId} authorized.`);
};