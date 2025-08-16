import nodemailer from "nodemailer";

/**
 * Sends an email using Nodemailer.
 * Requires EMAIL_SERVICE, EMAIL_USERNAME, EMAIL_PASSWORD in your .env file.
 *
 * @param {Object} options - Email options.
 * @param {string} options.to - Recipient email address.
 * @param {string} options.subject - Email subject.
 * @param {string} options.text - Plain text content of the email.
 * @param {string} options.html - HTML content of the email.
 */
const sendEmail = async (options) => {
  // 1. Create a transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // e.g., 'gmail', 'SendGrid', 'Outlook365'
    auth: {
      user: process.env.EMAIL_USERNAME, // Your email address
      pass: process.env.EMAIL_PASSWORD, // Your email password or app-specific password
    },
    // Optional: configure host and port if service is not recognized or for custom SMTP
    // host: process.env.EMAIL_HOST,
    // port: process.env.EMAIL_PORT,
    // secure: process.env.EMAIL_PORT == 465 ? true : false, // true for 465, false for other ports
  });

  // 2. Define email options
  const mailOptions = {
    from: `Infinite Learning <${process.env.EMAIL_USERNAME}>`, // Sender address
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  // 3. Send the email
  await transporter.sendMail(mailOptions);
};

export default sendEmail;
