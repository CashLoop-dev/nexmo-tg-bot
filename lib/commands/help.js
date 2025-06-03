module.exports = async function helpCommand(ctx) {
  ctx.reply(
    'Available commands:\n' +
    '/call — Make a call (step by step)\n' +
    '/history — See your call logs\n' +
    '/cancel — Cancel an ongoing operation\n' +
    '/help — Show this help message\n' +
    '/authorize_me <id> — Admin: authorize a user\n' +
    '/analytics — View your survey analytics\n' +
    '/export_survey — Export all survey results as CSV (admin only)\n' +
    '/admin — Admin dashboard\n' +
    '/language — Change your language\n' +
    '/survey — Take a survey'
  );
};