const sgMail = require("@sendgrid/mail");

/**
 * Send email using SendGrid
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text version
 * @param {string} [options.html] - HTML version
 * @param {string} [options.templateId] - SendGrid Dynamic Template ID
 * @param {Object} [options.dynamicTemplateData] - Variables for dynamic template
 */
const sendEmail = async (options) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  try {
    const msg = {
      to: options.to,
      from: process.env.SENDER_MAIL,
      subject: options.subject,
    };

    if (options.templateId) {
      msg.templateId = options.templateId;
      msg.dynamicTemplateData = options.dynamicTemplateData || {};
    } else {
      msg.text = options.text || "";
      msg.html = options.html || `<p>${options.text || ""}</p>`;
    }

    await sgMail.send(msg);
    console.log(`📧 Email sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error(
      "❌ SendGrid Email Error:",
      error.response?.body || error.message
    );
    return false;
  }
};

module.exports = sendEmail;
