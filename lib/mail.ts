import nodemailer from 'nodemailer';

/**
 * Create a fresh transporter per call to avoid "Unexpected socket close"
 * errors in serverless environments where idle connections get dropped.
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) === 587 ? 587 : 465, // Use 465 for Gmail SSL by default
    secure: Number(process.env.EMAIL_PORT) !== 587,           // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    family: 4, // Force IPv4 to avoid EHOSTUNREACH/timeout on some networks
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  } as any);
}

export const sendIssuanceEmail = async (studentEmail: string, studentName: string, degreeTitle: string) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: studentEmail,
    subject: '🎓 Your Academic Degree has been Issued!',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4F46E5;">Congratulations, ${studentName}!</h2>
        <p>We are pleased to inform you that your <strong>${degreeTitle}</strong> has been officially issued and verified on the blockchain.</p>
        <p><strong>You can view your issued degree on the website.</strong></p>
        <p>You can now view, download, and share your digital credential from your student dashboard.</p>
        <div style="margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/student" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">View My Certificate</a>
        </div>
        <p style="font-size: 12px; color: #666;">This is an automated message from the Smart Issuance Portal. Please do not reply directly to this email.</p>
      </div>
    `,
  };

  try {
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${studentEmail}`);
  } catch (error) {
    console.error(`Failed to send email to ${studentEmail}:`, error);
  }
};

export const sendOtpEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for VCred Wallet',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4F46E5;">Verification Code</h2>
        <p>Your one-time password is:</p>
        <div style="margin: 20px 0; text-align: center;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #666;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
        <p style="font-size: 12px; color: #999;">If you did not request this code, please ignore this email.</p>
      </div>
    `,
  };

  try {
    const transporter = createTransporter();
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send OTP to ${email}:`, error);
    throw error; // Re-throw so the caller can handle it
  }
};
