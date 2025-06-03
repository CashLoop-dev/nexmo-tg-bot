const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');
const config = require('./config');
const surveyQuestions = require('./surveyQuestions');
const { sendSurveyResultToTelegram } = require('./telegram-bot');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function getSurveyNCCO(callId, step = 1) {
  const question = surveyQuestions.find(q => q.step === step);
  if (!question) {
    return [{
      action: 'talk',
      text: 'Thank you for taking our survey. Goodbye!'
    }];
  }
  return [
    { action: 'talk', text: question.text },
    {
      action: 'input',
      eventUrl: [`${config.BASE_URL}/webhooks/dtmf?call_id=${callId}&step=${step}`],
      maxDigits: question.maxDigits,
      timeOut: 5
    }
  ];
}

app.get('/answer', (req, res) => {
  const callId = req.query.call_id;
  res.json(getSurveyNCCO(callId, 1));
});

app.post('/webhooks/dtmf', async (req, res) => {
  const callId = req.query.call_id;
  const step = Number(req.query.step);
  const dtmf = req.body.dtmf || req.body.dtmfDigits || req.body.digits;
  const question = surveyQuestions.find(q => q.step === step);

  await db.storeSurveyAnswer(callId, step, question ? question.key : `q${step}`, dtmf);

  if (step < surveyQuestions.length) {
    res.json(getSurveyNCCO(callId, step + 1));
  } else {
    await db.finalizeSurvey(callId, surveyQuestions);
    sendSurveyResultToTelegram(callId);
    res.json(getSurveyNCCO(callId, 99));
  }
});

app.post('/events', (req, res) => {
  console.log('Event:', req.body);
  res.status(204).end();
});

const port = process.env.PORT || 4001;
app.listen(port, () => console.log(`Survey server listening on port ${port}`));