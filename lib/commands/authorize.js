module.exports = async function authorizeCommand(ctx, db, config) {
  const role = await db.getUserRole(ctx.from.id);
  if (role !== 'owner' && String(ctx.from.id) !== String(config.BOT_OWNER_ID)) return ctx.reply(ctx.t('not_authorized'));
  const targetId = ctx.match.trim();
  if (!targetId) return ctx.reply('Usage: /authorize_me <telegram_id>');
  db.authorizeUser(targetId);
  ctx.reply(`User ${targetId} authorized.`);
};