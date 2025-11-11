const passwordResetTemplate = ({ name, resetLink }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Password Reset</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f8f9fa;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: #111827;
      color: #ffffff;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
    }
    .content {
      padding: 30px;
      text-align: left;
      color: #333;
    }
    .content p {
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 20px;
      background: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #666;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>LocArt Studio</h1>
    </div>
    <div class="content">
      <p>Hello ${name || "there"},</p>
      <p>You requested to reset your password. Please click the button below to create a new one:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </p>
      <p>If the button doesn’t work, copy and paste this link into your browser:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you didn’t request a password reset, you can safely ignore this email.</p>
      <div class="footer">
        <p>© ${new Date().getFullYear()} LocArt Studio. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export { passwordResetTemplate };
