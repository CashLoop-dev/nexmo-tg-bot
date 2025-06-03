class NexmoHelper {
  constructor(nexmo, config, db) {
    this.nexmo = nexmo;
    this.config = config;
    this.db = db;
  }

  async makeCall(user, phoneNumber, scheduleTime, record = false) {
    const status = scheduleTime ? 'scheduled' : 'pending';
    const callId = await this.db.logCall(user.id, phoneNumber, scheduleTime, status, null);
    if (!scheduleTime) {
      await this._initiateCall(callId, phoneNumber, record);
    }
    return callId;
  }

  async _initiateCall(callId, phoneNumber, record = false) {
    try {
      const answerUrl = `${this.config.BASE_URL}/answer?call_id=${callId}`;
      const eventUrl = `${this.config.BASE_URL}/events`;
      const ncco = [
        ...(record ? [{ action: 'record', eventUrl: [eventUrl] }] : []),
        {
          action: 'talk',
          text: 'Connecting you to the survey...'
        },
        {
          action: 'connect',
          endpoint: [{ type: 'phone', number: phoneNumber }]
        }
      ];
      await new Promise((resolve, reject) => {
        this.nexmo.calls.create({
          to: [{ type: 'phone', number: phoneNumber }],
          from: { type: 'phone', number: this.config.BOT_PHONE_NUMBER },
          answer_url: [answerUrl],
          event_url: [eventUrl]
        }, (err, res) => {
          if (err) return reject(err);
          resolve(res);
        });
      });
      await this.db.updateCallStatus(callId, 'completed');
    } catch (err) {
      await this.db.updateCallStatus(callId, 'failed', err.message);
    }
  }

  async processScheduledCalls() {
    const scheduledCalls = await this.db.getScheduledCalls();
    for (const call of scheduledCalls) {
      await this._initiateCall(call.id, call.phone_number);
    }
  }
}

module.exports = NexmoHelper;