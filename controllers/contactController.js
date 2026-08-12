import { getGraphClient } from "../utils/graphClient.js";

export const sendContactMail = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    const graphClient = await getGraphClient();

    await graphClient
      .api(`/users/${process.env.MS_SENDER_EMAIL}/sendMail`)
      .post({
        message: {
          subject: "New Contact Form Submission",

          body: {
            contentType: "HTML",
            content: `
              <h2>Contact Form Enquiry</h2>

              <p><strong>Name:</strong> ${name}</p>

              <p><strong>Email:</strong> ${email}</p>

              <p><strong>Message:</strong></p>

              <p>${message}</p>
            `,
          },

          toRecipients: [
            {
              emailAddress: {
                address: process.env.MS_SENDER_EMAIL,
              },
            },
          ],

          replyTo: [
            {
              emailAddress: {
                address: email,
                name: name,
              },
            },
          ],
        },

        saveToSentItems: true,
      });

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("MAIL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error.message,
    });
  }
};