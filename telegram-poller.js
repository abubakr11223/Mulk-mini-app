const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("No TELEGRAM_BOT_TOKEN found in .env");
  process.exit(1);
}

// Clear webhook first
axios.get(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`)
  .then(() => {
    console.log("Webhook removed, starting Long Poller instead...");
    const bot = new TelegramBot(token, { polling: true });

    bot.on('message', async (msg) => {
      try {
        await axios.post('http://localhost:3000/api/bot/webhook', {
          update_id: Date.now(),
          message: msg
        });
        console.log(`[POLLER] Forwarded message from ${msg.from.id}`);
      } catch (e) {
        console.error("[POLLER] Failed to forward to Next.js API:", e.message);
      }
    });

    bot.on('edited_message', async (msg) => {
        try {
            await axios.post('http://localhost:3000/api/bot/webhook', {
              update_id: Date.now(),
              edited_message: msg
            });
            console.log(`[POLLER] Forwarded edited message from ${msg.from.id}`);
          } catch (e) {
            console.error("[POLLER] Failed to forward to Next.js API:", e.message);
          }
    });

    console.log("Poller is actively listening and bypassing firewalls!");
  })
  .catch(err => console.error("Could not clear webhook:", err.message));
