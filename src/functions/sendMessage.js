import bot from '../settings/app.js';
import { PARSE } from '../constants/botSettings.js';

/**
 * Send a message to the chat with the given ID in the given format.
 * Use the constants PARSE to format the message. (HTML, Markdown, etc.)
 * Usually, the format is Markdown.
 * @param {Integer} chatID 
 * @param {String} message 
 * @param {String} parse
 * @returns {Promise<void>}
 */
export const sendMessage = async (chatID, message, parse = PARSE) => {
    await bot.sendMessage(chatID, message, { parse_mode: parse });
}