import nodemailer from "nodemailer";

export const sendMail = async ({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) => {
  const transporter = nodemailer.createTransport({
    host: process.env.POST_SERVICE_URL,
    port: 587,
    auth: {
      user: process.env.POST_USER,
      pass: process.env.POST_PASS,
    },
  });

  await transporter.sendMail({
    from: "no-reply@js2go.ru",
    to,
    subject,
    text,
  });
};
