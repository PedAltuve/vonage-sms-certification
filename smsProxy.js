const Nexmo = require('nexmo');

class SmsProxy {
  constructor() {
    this.nexmo = new Nexmo({
      apiKey: process.env.NEXMO_API_KEY,
      apiSecret: process.env.NEXMO_API_SECRET
    }, { debug: true });
  }

  createChat(firstUserNumber, secondUserNumber) {
    if (secondUserNumber) {
      this.chat = {
        firstUser: firstUserNumber,
        secondUser: secondUserNumber,
      };
  
      this.sendSMS();
    } else {
      this.nexmo.message.sendSms(
        firstUserNumber,
        process.env.VIRTUAL_NUMBER,
        'No professionals available, please try again later'
      );
    }

  }

  sendSMS() {
    this.nexmo.message.sendSms(
      process.env.VIRTUAL_NUMBER,
      this.chat.firstUser, 
      'Reply to this SMS to talk to your driver'
    );

    this.nexmo.message.sendSms(
      process.env.VIRTUAL_NUMBER,
      this.chat.secondUser,
      'Reply to this SMS to talk to your passenger'
    )
  }

  getDestionationNumber(from) {
    let destinationNumber = null;

    const fromFirstUser = (from === this.chat.firstUser);
    const fromSecondUser = (from === this.chat.secondUser);

    if (fromFirstUser || fromSecondUser) {
      destinationNumber = fromFirstUser ? this.chat.secondUser : this.chat.firstUser;
    }

    return destinationNumber;
  }

  proxySms(from, text) {
    const destionationNumber = this.getDestionationNumber(from);
    if (!destionationNumber) {
      console.log('No chat found for this number');
      return;
    }

    this.nexmo.message.sendSms(process.env.VIRTUAL_NUMBER, destionationNumber, text);
  }
}

module.exports = SmsProxy;