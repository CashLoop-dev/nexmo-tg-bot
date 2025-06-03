const { createObjectCsvStringifier } = require('csv-writer');

module.exports = async function exportSurveyCommand(ctx, db) {
  if (!(await db.isUserAuthorized(ctx.from.id))) {
    return ctx.reply(ctx.t('not_authorized'));
  }
  const rows = await db.getAllSurveyResults();
  if (!rows.length) return ctx.reply('No survey data found.');
  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'call_id', title: 'Call ID' },
      { id: 'step', title: 'Step' },
      { id: 'key', title: 'Question Key' },
      { id: 'answer', title: 'Answer' },
      { id: 'created_at', title: 'Timestamp' }
    ]
  });
  let csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(rows);
  await ctx.replyWithDocument({ source: Buffer.from(csv), filename: 'survey_results.csv' });
};