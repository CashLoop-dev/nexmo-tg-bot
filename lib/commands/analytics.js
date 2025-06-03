const surveyQuestions = require('../surveyQuestions');
module.exports = async function analyticsCommand(ctx, db) {
  if (!(await db.isUserAuthorized(ctx.from.id))) {
    return ctx.reply('You are not authorized.');
  }
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
};