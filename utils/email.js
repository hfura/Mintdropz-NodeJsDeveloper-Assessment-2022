const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url, otherUser) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Mintdropz Social Media <${process.env.EMAIL_FROM}>`;
    this.otherUser = otherUser;
    this.replyTo = `Mintdropz Social Media  <${process.env.EMAIL_REPLY_TO}>`;
  }

  newTransport() {

    if (process.env.NODE_ENV === 'production') {
      //MailGun
      return nodemailer.createTransport(
        mg({
          service: 'MailGun',
          auth: {
            api_key: process.env.MAILGUN_API_KEY,
            domain: process.env.MAILGUN_DOMAIN
          },
          host: 'api.eu.mailgun.net'
        })
      );
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  // Send the actual email
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      otherUser: this.otherUser,
      subject
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html)
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send(
      'welcome',
      'Welcome to the our social media type platform!'
    );
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)'
    );
  }

  async sendNotificationNewCommentOnPost() {
    await this.send(
      'newCommentPost',
      `${this.otherUser.name} commented on your post`
    );
  }

  async sendNotificationNewFollower() {
    await this.send(
      'newFollower',
      `${this.otherUser.name} started following you`
    );
  }

  async sendNotificationNewLikeOnPost() {
    await this.send(
      'newLikePost',
      `${this.otherUser.name} reacted to your post`
    );
  }

  async sendNotificationNewLikeOnComment() {
    await this.send(
      'newLikeComment',
      `${this.otherUser.name} reacted to your comment`
    );
  }
};
