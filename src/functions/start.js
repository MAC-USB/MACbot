import bot from '../settings/app';
import * as usersModel from '../models/usersModel';
import * as messages from '../messages/start';

// ---------------------------------------------------------------------------------------------------- //
// The bot listens to the /start command.
// ---------------------------------------------------------------------------------------------------- //
bot.onText(/^\/start/, async msg => {
	let chatID = msg.chat.id;
	let chatType = msg.chat.type;
	let fromID = msg.from.id;

	// Check if the user writes to the bot in private, this causes the command not to work in groups.
	if (chatType === 'private') {
		// Guard that is responsible for verifying if the person has already written to the bot before.
		// If so, it does nothing, if it is the first time you write it, it records it in the database.
		let guard = await usersModel.verifyTelegramID(fromID);

		if (guard) {
			await usersModel.registerTelegramData(msg.from);
		}

		bot.sendMessage(chatID, messages.wellcome, { parse_mode: 'Markdown' });
	}
});
