// config.js
const BDT_PER_MAIL = 1.50; // ১ মেইলের দাম

module.exports = {
    // 🚨 আপনার নিজের টোকেন, ID, Channel ID দিয়ে প্রতিস্থাপন করুন
    TELEGRAM_BOT_TOKEN: '8481611330:AAHmQcm_SSikk2fc9XK1XQ8MXyMEYqcKVBY', // <--- আপনার বটের টোকেন
    ADMIN_ID: '7574558427', // ⚠️ আপনার ব্যক্তিগত Telegram ID (এটিই ডেভেলপমেন্ট ক্রেডিট ID)
    ADMIN_USERNAME: '@Rs_Rezaul_99', // <--- আপনার দেওয়া Admin Username
    ADMIN_CHANNEL_ID: '-1002323042564', // আপনার প্রাইভেট চ্যানেলের ID 
    
    // Dong Van API Details (কোড চেক করার জন্য)
    API_URL: 'https://tools.dongvanfb.net/api/graph_code',
    
    // পেমেন্ট তথ্য
    PAYMENT_INFO: {
        BKASH: '01840785086',
        NAGAD: '01840785086'
    },
    
    // ফাইল পাথ
    USER_BALANCE_FILE: './user_balances.json', 
    MAIL_DATA_FILE: './available_mails.txt', 
    INBOX_CHECK_STORAGE: './inbox_checks.json', 
    
    // মেইল/ক্রেডিট তথ্য
    BDT_PER_MAIL: BDT_PER_MAIL,
    
    // মেসেজ কনফিগারেশন
    MESSAGES: {
        CHANNEL_NAME: 'Tech Underworld', 
        CHANNEL_LINK: 'https://t.me/+QeJUwONgZp05ZDVl', 
    }
};