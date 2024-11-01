const { htmlToText } = require("html-to-text");
const nodemailer = require("nodemailer");
const pug = require("pug");

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `Natours <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === "production") {
      // SendGrid configuration
      return nodemailer.createTransport({
        service: "SendGrid",
        auth: {
          user: "apikey", // SendGrid requires "apikey" as the user
          pass: process.env.SENDGRID_API_KEY,
        },
      });
    }

    // Fallback to a development email transporter
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Send the actual email
  async send(template, subject, data = {}) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
        ...data, // Pass additional data like 2FA code here
      },
    );

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    };

    // 3) Create transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to the Natours family !");
  }

  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "Your password reset token (valid for only 10min)",
    );
  }

  async sendConfirmation() {
    await this.send("confirmEmail", "Confirm your Natours account!");
  }

  async sendTwoFACode(code) {
    await this.send("twoFA", "Your 2FA code", { code });
  }
};
