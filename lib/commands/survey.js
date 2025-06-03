const { InlineKeyboard } = require("grammy");

module.exports = async function surveyCommand(ctx, db, config) {
  // List available surveys
  const surveys = await db.getSurveys(ctx.session.lang);
  if (!surveys.length) return ctx.reply(ctx.t('no_surveys'));
  const kb = new InlineKeyboard();
  surveys.forEach(s => kb.text(s.name, `SURVEY_${s.id}`).row());
  await ctx.reply(ctx.t('choose_survey'), { reply_markup: kb });
};

module.exports.handleCallbackQuery = async function(ctx, db, config) {
  if (ctx.callbackQuery.data.startsWith('SURVEY_')) {
    const surveyId = ctx.callbackQuery.data.split('_')[1];
    const survey = await db.getSurveyById(surveyId);
    if (!survey) return ctx.reply(ctx.t('survey_not_found'));
    await db.setState(ctx.from.id, 'taking_survey', { surveyId, step: 0, answers: [] });
    await ctx.reply(survey.questions[0].text);
    return true;
  }
  return false;
};

module.exports.handleText = async function(ctx, db, config) {
  const { state, data } = await db.getState(ctx.from.id);
  if (state === 'taking_survey') {
    const survey = await db.getSurveyById(data.surveyId);
    const step = data.step;
    data.answers.push(ctx.message.text);
    if (step + 1 < survey.questions.length) {
      await db.setState(ctx.from.id, 'taking_survey', { ...data, step: step + 1 });
      await ctx.reply(survey.questions[step + 1].text);
    } else {
      // Store answers, clear state, send summary
      await db.storeSurveyAnswers(ctx.from.id, data.surveyId, data.answers);
      await db.clearState(ctx.from.id);
      await ctx.reply(ctx.t('survey_complete'));
    }
    return true;
  }
  return false;
};