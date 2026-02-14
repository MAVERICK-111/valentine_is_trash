const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendCleaningAlert = async (bin, distance) => {
  const mailOptions = {
    from: process.env.EMAIL_USER, // Gmail overrides this, but required
    to: process.env.CLEANING_EMAIL,
    subject: `🧹 Bin Needs Attention - ${bin.department}`,
    html: `
      <h2>Waste Alert</h2>
      <p><b>Department:</b> ${bin.department}</p>
      <p><b>Corner:</b> ${bin.corner_position}</p>
      <p><b>Time:</b> ${new Date().toLocaleString()}</p>
      <p>Please clean the bin as soon as possible.</p>
    `,
  };
    return transporter.sendMail(mailOptions);
};