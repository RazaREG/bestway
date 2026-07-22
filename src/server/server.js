const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/send-inventory-email", async (req, res) => {
  try {
    const { itemName, qty, userEmail } = req.body;

    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: {
        user: "support@pourcrete.com",
        pass: "ht13040@C",
      },
    });

    const html = `
      <h2>Inventory Picked</h2>
      <p><b>User:</b> ${userEmail}</p>
      <p><b>Item:</b> ${itemName}</p>
      <p><b>Quantity:</b> ${qty}</p>
    `;

    await transporter.sendMail({
      from: "support@pourcrete.com",
      to: "muhammadraza202501@gmail.com",
      subject: "Inventory Picked",
      html,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => {
  console.log("✅ Server running on http://localhost:5000");
});