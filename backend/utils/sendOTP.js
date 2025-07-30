const nodemailer = require('nodemailer');

const sendOtpMail = async (to, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL,
      to,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
    });

    console.log('📩 OTP sent to', to);
  } catch (error) {
    console.error('❌ Failed to send OTP:', error);
  }
};

module.exports = sendOtpMail; 