// bot.js (Final Stable Version with Advanced Aesthetic and UX)
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { authenticator } = require('otplib'); 
const config = require('./config');
const { 
    updateBalance, 
    getBalance, 
    getAndRemoveMail,
    saveMailForCheck, 
    getMailForCheck,   
    // removeMailForCheck 
} = require('./data_manager'); 

// Initialize Bot
const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });

// State Management
const userStates = {}; 
const MAIL_PRICE_MESSAGE = `1 mail costs ${config.BDT_PER_MAIL} BDT / 1 credit.`;

// --- TELEGRAM ADVANCED KEYBOARD MENU & COMMANDS ---

// 💡 নতুন, অ্যাডভান্সড মেনু লে-আউট
const replyKeyboard = {
    keyboard: [
        // Left: Get Mail, My Account / Right: Top Up, Support
        [{ text: '📬 Get Mail' }, { text: '💰 Top Up' }],
        [{ text: '📊 My Account' }, { text: '🤝 Support' }],
        [{ text: '🔑 2FA Generator' }, { text: '📜 Rules' }] 
    ],
    resize_keyboard: true,
    one_time_keyboard: false
};
const commandButtons = ['📬 Get Mail', '💰 Top Up', '📊 My Account', '🤝 Support', '🔑 2FA Generator', '📜 Rules']; 

// 💡 নতুন, পরিষ্কার Welcome Message ডিজাইন
const DEVELOPER_CREDIT = `\n_🤖 This BOT is developed by [REZAUL](${config.ADMIN_USERNAME.replace('@', '')})_ (ID: \`${config.ADMIN_ID}\`)\n`;

const WELCOME_MESSAGE = `
*╭────────────────────────────────╮*
*│  👑 ${config.MESSAGES.CHANNEL_NAME} Mail System 👑  │*
*╰────────────────────────────────╯*

*🤝 WELCOME TO A TRUSTED PLATFORM*
_We provide high-quality Hotmail/Outlook accounts for secure registration and instant code verification._
 
*✅ Service:* Hotmail/Outlook Mail & *Instant Facebook Code Check*.
*💸 Price:* Only *${config.BDT_PER_MAIL} BDT* per mail (1 Credit).
 
*🚀 Get instant access to new mails and codes!*
 
*🔗 Official Channel:* [Join Our Telegram](${config.MESSAGES.CHANNEL_LINK})
 
${DEVELOPER_CREDIT}
*────────────────────────────────*
*👇 Use the menu buttons below to proceed.*
`;

// --- CORE BOT LOGIC ---

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, WELCOME_MESSAGE, { 
        parse_mode: 'Markdown',
        reply_markup: replyKeyboard
    });
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const text = msg.text.trim();
    const username = msg.from.username;
    
    const currentState = userStates[userId] || {};

    // --- State Handlers (Top-up & 2FA) ---
    
    if (commandButtons.includes(text)) {
        if (currentState.step) {
            delete userStates[userId];
        }
    } else if (currentState.step === 'waiting_for_amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount <= 0) {
             return bot.sendMessage(chatId, '❌ Invalid amount. Please enter a positive number.', { reply_markup: replyKeyboard });
        }
        
        const totalBDT = (amount * config.BDT_PER_MAIL).toFixed(2);
        userStates[userId] = { step: 'waiting_for_txn_id', credits: amount, bdt: totalBDT };

        return bot.sendMessage(chatId, `
*💲 PAYMENT INSTRUCTIONS 💲*
You are buying *${amount} mails/credits* for a total of *${totalBDT} BDT*.
1. Send the amount to:
   * 🟢 BKASH: \`${config.PAYMENT_INFO.BKASH}\`
   * 🟣 NAGAD: \`${config.PAYMENT_INFO.NAGAD}\`
2. After payment, reply *immediately* with your payment details in the exact format:
\`<Sending_Number>|<Transaction_ID>\`
Example: \`018xxxxxxx|ABCDE12345\`
        `, { parse_mode: 'Markdown' });

    } else if (currentState.step === 'waiting_for_txn_id') {
        const parts = text.split('|');
        if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
            return bot.sendMessage(chatId, '❌ Invalid format. Please use: `Sending_Number|Transaction_ID`');
        }

        const [senderNumber, txnId] = parts;
        const requestData = currentState;

        const confirmationMessage = `
⚠️ *NEW TOP-UP REQUEST PENDING!* ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *User:* [${msg.from.first_name}](tg://user?id=${userId}) (ID: \`${userId}\`)
💵 *Amount:* ${requestData.bdt} BDT (${requestData.credits} Mails)
📞 *Sender Number:* \`${senderNumber}\`
#️⃣ *Transaction ID:* \`${txnId}\`
━━━━━━━━━━━━━━━━━━━━━━━━━━
_Please confirm payment and add balance._
        `;
        
        bot.sendMessage(config.ADMIN_CHANNEL_ID, confirmationMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✅ CONFIRM & ADD BALANCE', callback_data: `CONFIRM_${userId}_${requestData.credits}` }],
                    [{ text: '❌ REJECT', callback_data: `REJECT_${userId}` }]
                ]
            }
        });

        delete userStates[userId];
        return bot.sendMessage(chatId, '⌛️ Your Top-Up request has been sent to the Admin for manual confirmation. Please wait.', { reply_markup: replyKeyboard });

    } else if (currentState.step === 'waiting_for_2fa_key') {
        const secretKey = text.replace(/\s/g, '').trim(); 
        
        try {
            const code = authenticator.generate(secretKey);
            bot.sendMessage(chatId, `
*🔑 2FA Code Generator*
━━━━━━━━━━━━━━━━━━━━
*🔐 Key:* \`${secretKey}\`
*🔢 Code:* \`\`\`${code}\`\`\`
━━━━━━━━━━━━━━━━━━━━
_Code generated successfully._
            `, { parse_mode: 'Markdown' });
        } catch(e) {
            bot.sendMessage(chatId, '❌ Error generating code. The key might be invalid.', { parse_mode: 'Markdown' });
        }
        
        delete userStates[userId];
        return;
    }

    // --- Main Menu Button Handlers ---
    
    if (text === '📬 Get Mail') { // 💡 Get Mail
        const balance = getBalance(userId);
        
        if (balance < 1) {
            return bot.sendMessage(chatId, '❌ *Insufficient Balance.* Please Top Up to get 1 mail (1 Credit = 1 Mail).', { parse_mode: 'Markdown' });
        }

        const mailData = getAndRemoveMail();
        
        if (!mailData) {
            const outOfStockMessage = `
*⚠️ Stock Alert: Mail supply is currently depleted!*
━━━━━━━━━━━━━━━━━━━━━━━━━━
Sorry, all mails have been sold out. Please try again after *10-15 minutes*.
━━━━━━━━━━━━━━━━━━━━━━━━━━
            `;
            return bot.sendMessage(chatId, outOfStockMessage, { parse_mode: 'Markdown' });
        }

        updateBalance(userId, -1);
        const newBalance = getBalance(userId);
        
        const fullLine = mailData.original_line;
        const [email] = fullLine.split('|');
        
        // CRITICAL FIX: Save data permanently and get a very short hash ID (6 chars)
        const uniqueCheckId = saveMailForCheck(fullLine); 

        // Send ONLY the Email Address to the User
        const mailSentMessage = `
*🎉 SUCCESS! Your mail is ready:*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*📧 Hotmail/Outlook:* \`${email}\`
*🔐 (Your private data is securely stored.)* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*💰 Current Balance:* \`${newBalance} Credits\`

*➡️ Next Step:* Click the button below to **Check the Inbox** for the Facebook code.
        `;
        
        bot.sendMessage(chatId, mailSentMessage, { 
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📬 Check Inbox', callback_data: `CHECK_${uniqueCheckId}` }] 
                ]
            }
        });

    } else if (text === '💰 Top Up') { // 💡 Top Up
        userStates[userId] = { step: 'waiting_for_amount' };
        return bot.sendMessage(chatId, `*${MAIL_PRICE_MESSAGE}*\n\nHow many mails/credits do you want to buy? (Enter number only)`, { parse_mode: 'Markdown' });
        
    } else if (text === '📊 My Account') { // 💡 My Account
        const balance = getBalance(userId);
        return bot.sendMessage(chatId, `
*👤 Your Account Details 👤*
*🆔 User ID:* \`${userId}\`
*📇 Username:* ${username ? `@${username}` : 'N/A'}
*💰 Balance:* \`${balance} Mail/Credits\`
        `, { parse_mode: 'Markdown' });
        
    } else if (text === '🔑 2FA Generator') { // 💡 2FA Generator
        userStates[userId] = { step: 'waiting_for_2fa_key' };
        return bot.sendMessage(chatId, '🔐 *2FA Code Generator Activated.* Please enter your Private Key:', { parse_mode: 'Markdown' });
        
    } else if (text === '📜 Rules') { // 💡 Rules
        return bot.sendMessage(chatId, `
*📜 BOT Rules & Info 📜*
*============================================*
 
*1. Purpose:*
  Mails are for **new Facebook account creation** and *code verification*. Use for other purposes is at your own risk.
 
*2. Cost:*
  Each mail costs *1 Credit* (${config.BDT_PER_MAIL} BDT).
 
*3. Refund:*
  No refund will be provided after mail purchase.
*============================================*
        `, { parse_mode: 'Markdown' });
        
    } else if (text === '🤝 Support') { // 💡 Support
         return bot.sendMessage(chatId, `
👑 *Developer & Support*
 
*Any problem? Contact the Developer directly:*
 
*👤 Developer/Admin:* [REZAUL](${config.ADMIN_USERNAME.replace('@', '')})
*🆔 User ID:* \`${config.ADMIN_ID}\`
 
*For payment confirmation or any issues, please message:* \`${config.ADMIN_USERNAME}\`
 
*🔗 Channel:* [${config.MESSAGES.CHANNEL_NAME}](${config.MESSAGES.CHANNEL_LINK})
        `, { 
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: `📢 Join Channel`, url: config.MESSAGES.CHANNEL_LINK }],
                    [{ text: `💬 Message Developer`, url: `https://t.me/${config.ADMIN_USERNAME.substring(1)}` }]
                ]
            }
        });
    }
});


// --- CALLBACK QUERY HANDLER (Check Inbox Button & Admin Confirmation) ---
bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;
    const chatId = callbackQuery.message.chat.id;
    const senderId = callbackQuery.from.id.toString();

    // 1. ADMIN CONFIRMATION LOGIC 
    if (data.startsWith('CONFIRM_') || data.startsWith('REJECT_')) {
        // ... (Admin Logic remains same)
        if (senderId !== config.ADMIN_ID.toString()) {
            return bot.answerCallbackQuery(callbackQuery.id, '❌ You are not authorized to perform this action.');
        }
        
        if (data.startsWith('CONFIRM_')) {
            const [_, userId, credits] = data.split('_');
            const addedCredits = parseInt(credits);
            const newBalance = updateBalance(userId, addedCredits);

            bot.editMessageText(`✅ *CONFIRMED!* Balance added to User ID: \`${userId}\`. New Balance: ${newBalance} mails/credits.`, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
            });
            bot.sendMessage(userId, `🎉 *SUCCESS!* Your payment has been confirmed by the Admin. *${addedCredits} mails/credits* added to your account. Your new balance is \`${newBalance}\`.`, { parse_mode: 'Markdown' });
            bot.answerCallbackQuery(callbackQuery.id, 'Balance Confirmed and Added!');

        } else if (data.startsWith('REJECT_')) {
            const [_, userId] = data.split('_');

            bot.editMessageText(`❌ *REJECTED!* User ID: \`${userId}\`. No balance added.`, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
            });
            bot.answerCallbackQuery(callbackQuery.id, 'Payment Rejected.');
        }
        return;
    }

    // 2. INBOX CHECK LOGIC
    if (data.startsWith('CHECK_')) {
        await bot.answerCallbackQuery(callbackQuery.id, 'Checking inbox... Please wait.');
        
        const uniqueId = data.substring(6); 
        const fullMailData = getMailForCheck(uniqueId); 

        if (!fullMailData) {
            // This is the hosting issue case!
            bot.editMessageReplyMarkup({
                inline_keyboard: [
                    [{ text: '❌ Data Lost', callback_data: 'DATA_LOST' }]
                ]
            }, { chat_id: chatId, message_id: messageId });

            return bot.sendMessage(chatId, `
*⚠️ ISSUE: Mail Data Not Found!*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The data for this mail could not be retrieved from the server file.
*👉 Solution:* Please get a new mail.
            `, { parse_mode: 'Markdown' });
        }

        const parts = fullMailData.split('|');
        const [emailAddr, pass, refresh_token, client_id] = parts;
        
        // Disable the button and show processing status
        bot.editMessageReplyMarkup({
            inline_keyboard: [
                [{ text: '⏳ Checking Inbox...', callback_data: 'IN_PROCESS' }]
            ]
        }, { chat_id: chatId, message_id: messageId });

        try {
            const requestData = {
                email: emailAddr,
                pass: pass,
                refresh_token: refresh_token,
                client_id: client_id,
                type: "facebook" 
            };
            
            const response = await axios.post(config.API_URL, requestData);
            const apiResponse = response.data;

            let finalMessage;
            
            if (apiResponse && apiResponse.status === true && apiResponse.code) {
                // ✅ Success: Facebook Code Found
                const code = apiResponse.code;
                const content = apiResponse.content || 'Facebook Security Message.';
                const date = apiResponse.date || 'Time Unknown';
                const from = apiResponse.from || 'security@facebookmail.com';
                
                finalMessage = `
*✅ CODE FOUND!*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*📧 Mail:* \`${emailAddr}\`
*👤 From:* ${from}
*🔑 Code:* \`\`\`${code}\`\`\`
*📄 Message:* _${content}_
*⏰ Date:* ${date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                `;
            } else {
                // ❌ Failure: No Code Found
                finalMessage = `
*🤷‍♂️ Sorry! No Facebook code found for this mail:* \`${emailAddr}\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Please ensure:_
1. No **Facebook security code** has arrived yet.
2. Please **check again** in a few minutes.
`;
            }

            // 💡 Final Fix: Re-enable the button after check
            bot.editMessageReplyMarkup({
                inline_keyboard: [
                    [{ text: '📬 Check Inbox', callback_data: `CHECK_${uniqueId}` }] 
                ]
            }, { chat_id: chatId, message_id: messageId });


            bot.sendMessage(chatId, finalMessage, { parse_mode: 'Markdown' });
            
        } catch (error) {
            console.error("Inbox Check Error:", error.message);
            
            let errorMessage = `❌ *Check Failed!* \`${emailAddr}\`\n\n`;
            
            if (error.response) {
                errorMessage += `Service is temporarily down. Please try again later.`;
            } else {
                errorMessage += `Connection error. Please try again later.`;
            } 
            
            // 💡 Final Fix: Re-enable the button after check (even on error)
            bot.editMessageReplyMarkup({
                inline_keyboard: [
                    [{ text: '📬 Check Inbox', callback_data: `CHECK_${uniqueId}` }] 
                ]
            }, { chat_id: chatId, message_id: messageId });
            
            bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
        }
    }
});

console.log('Hybrid Mail Supplier and Code Checker Bot (Final Advanced UI) is running...');