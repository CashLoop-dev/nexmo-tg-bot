class NexmoHelper {
  constructor(nexmo, config, db) {
    this.nexmo = nexmo;
    this.config = config;
    this.db = db;
  }

  async makeCall(user, phoneNumber, scheduleTime) {
    const status = scheduleTime ? 'scheduled' : 'pending';
    const callId = await this.db.logCall(user.id, phoneNumber, scheduleTime, status, null);
    if (!scheduleTime) {
      this._initiateCall(callId, phoneNumber);
    }
    return callId;
  }

  async _initiateCall(callId, phoneNumber) {
    try {
      const answerUrl = `${this.config.BASE_URL}/answer?call_id=${callId}`;
      await this.nexmo.calls.create({
        to: [{ type: 'phone', number: phoneNumber }],
        from: { type: 'phone', number: this.config.BOT_PHONE_NUMBER },
        answer_url: [answerUrl]
      });
      this.db.updateCallStatus(callId, 'completed');
    } catch (err) {
      this.db.updateCallStatus(callId, 'failed', err.message);
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