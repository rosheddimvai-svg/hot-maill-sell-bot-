// data_manager.js (Functionally Final)
const fs = require('fs');
const crypto = require('crypto');
const config = require('./config');

const balanceFilePath = config.USER_BALANCE_FILE;
const mailFilePath = config.MAIL_DATA_FILE;
const inboxChecksPath = config.INBOX_CHECK_STORAGE;

// --- Balance Management (Unchanged) ---
function loadBalances() {
    if (fs.existsSync(balanceFilePath)) {
        try {
            const data = fs.readFileSync(balanceFilePath, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            console.error("Error loading user balances:", e.message);
            return {};
        }
    }
    return {};
}

function saveBalances(balances) {
    try {
        fs.writeFileSync(balanceFilePath, JSON.stringify(balances, null, 2), 'utf8');
    } catch (e) {
        console.error("Error saving user balances:", e.message);
    }
}

function updateBalance(userId, amount) {
    const balances = loadBalances();
    let currentBalance = balances[userId] || 0;
    currentBalance += amount;
    balances[userId] = Math.max(0, currentBalance);
    saveBalances(balances);
    return balances[userId];
}

function getBalance(userId) {
    const balances = loadBalances();
    return balances[userId] || 0;
}

// --- Mail Data Management (Unchanged) ---
function getAndRemoveMail() {
    if (!fs.existsSync(mailFilePath)) {
        console.error(`Mail file not found: ${mailFilePath}`);
        return null;
    }
    
    try {
        let lines = fs.readFileSync(mailFilePath, 'utf8').trim().split('\n').filter(line => line.trim() !== '');
        
        if (lines.length === 0) {
            return null; // File is empty
        }
        
        const firstLine = lines.shift().trim(); 
        
        // Save the remaining lines back to the file
        fs.writeFileSync(mailFilePath, lines.join('\n') + (lines.length > 0 ? '\n' : ''), 'utf8');
        
        return {
            original_line: firstLine
        };

    } catch (e) {
        console.error("Error reading/writing mail file:", e.message);
        return null;
    }
}

// --- PERMANENT INBOX CHECK STORAGE (Hash ID Logic) ---

function loadCheckStorage() {
    if (fs.existsSync(inboxChecksPath)) {
        try {
            const data = fs.readFileSync(inboxChecksPath, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            console.error("Error loading inbox check storage, creating new one:", e.message);
            return {};
        }
    }
    return {};
}

function saveCheckStorage(storage) {
    try {
        fs.writeFileSync(inboxChecksPath, JSON.stringify(storage, null, 2), 'utf8');
    } catch (e) {
        console.error("Error saving inbox check storage:", e.message);
    }
}

/**
 * Saves mail data to the permanent JSON storage and returns a unique 6-character hash ID.
 */
function saveMailForCheck(fullMailData) {
    const storage = loadCheckStorage();
    
    let uniqueId = crypto.createHash('sha256').update(fullMailData + Date.now()).digest('hex').substring(0, 6); 
    
    let collisionCount = 0;
    let finalId = uniqueId;
    while (storage[finalId]) {
        collisionCount++;
        finalId = crypto.createHash('sha256').update(fullMailData + Date.now() + collisionCount).digest('hex').substring(0, 6);
    }
    
    storage[finalId] = fullMailData;
    saveCheckStorage(storage);
    
    return finalId; // Return the 6-character unique ID
}

/**
 * Retrieves mail data using the unique ID (6-char hash).
 */
function getMailForCheck(uniqueId) {
    const storage = loadCheckStorage();
    return storage[uniqueId] || null;
}

/**
 * Removes mail data from the permanent JSON storage after use (optional).
 */
function removeMailForCheck(uniqueId) {
    const storage = loadCheckStorage();
    if (storage[uniqueId]) {
        delete storage[uniqueId];
        saveCheckStorage(storage);
    }
}


module.exports = {
    updateBalance,
    getBalance,
    getAndRemoveMail,
    saveMailForCheck, 
    getMailForCheck,  
    removeMailForCheck 
};