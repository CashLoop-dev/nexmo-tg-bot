const axios = require('axios');
const surveyQuestions = require('../surveyQuestions');

module.exports = async function analyticsCommand(ctx, db) {
  if (!(await db.isUserAuthorized(ctx.from.id))) {
    return ctx.reply(ctx.t('not_authorized'));
  }
  for (const q of surveyQuestions) {
    await new Promise(resolve => {
      db.getSurveyStats(q.key, async (stats) => {
        let msg = `**${q.text}**\n`;
        if (!stats.length) msg += 'No responses yet.';
        else {
          msg += stats.map(s => `Answer ${s.answer || 'None'}: ${s.count}`).join('\n');
          // Generate chart image using QuickChart
          const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
            type: 'bar',
            data: {
              labels: stats.map(s => s.answer || 'None'),
              datasets: [{ label: q.text, data: stats.map(s => s.count) }]
            }
          }))}`;
          await ctx.replyWithPhoto(chartUrl, { caption: q.text });
        }
        await ctx.reply(msg, { parse_mode: 'Markdown' });
        resolve();
      });
    });
  }
};