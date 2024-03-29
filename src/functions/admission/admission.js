import { PARSE, PRIVATE_CHAT } from '../../constants/botSettings.js';
import { admissionDate } from '../../constants/infoAdmision.js';
import { ALREADY_ASSISTED, BACK, DONT_KNOW, FAQ, LOGIN, NO, YES } from '../../constants/responses.js';
import * as messages from '../../messages/admission.js';
import { verifyTelegramID, registerTelegramData } from '../../models/usersModel.js';
import bot from '../../settings/app.js';
import * as keyboard from '../keyboards.js';
import { sendMessage } from '../sendMessage.js';
import { deleteAllPrenuevos, deletePrenuevo, getAllPrenuevos, registerPrenuevo, verifyPrenuevoCarnet } from '../../models/prenuevosModel.js';
import { getPreparadorByTelegramID, verifyPreparadorID } from '../../models/preparadorModel.js';
import { removeFromAdmission } from './groupAdmin.js';
import { isAdmin } from '../../constants/preparadores.js';

// ---------------------------------------------------------------------------------------------------- //
// Environment variables.
// ---------------------------------------------------------------------------------------------------- //
import dotenv from 'dotenv';
dotenv.config();

const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || undefined;
const ADMISION_ID = process.env.ADMISION_ID || undefined;

let registroState = false;

const registroSwitch = () => {
	registroState = !registroState;
	console.log(`**Registro: ${registroState}`);
}

// ---------------------------------------------------------------------------------------------------- //
// The bot listens to the command /admision@remove to remove a prenuevo from the database.
// ---------------------------------------------------------------------------------------------------- //
bot.onText(/^\/admision@remove/, async msg => {
	let chatID = msg.chat.id;
	// We check if the user is preparador.
	if (await verifyPreparadorID(msg.from.id)) {
		bot.sendMessage(chatID, `No tienes permisos para realizar esta acción.`);
		return;
	}
	// We get the preparador
	const preparador = (await getPreparadorByTelegramID(chatID)).initials
	// We check if the usar is admin.
	if (!isAdmin(chatID)) {
		bot.sendMessage(chatID, `${preparador}, te falta calle para poder hacer esto.`);
		return;
	}
	// We ask the carnet of the prenuevo to be removed.
	bot.sendMessage(chatID, `Escribe el carnet del prenuevo que deseas eliminar. *(XX-XXXXX)*`, keyboard.replyOpts).then(sended => {
		// We listen to the message with the carnet.
		bot.onReplyToMessage(sended.chat.id, sended.message_id, async msg => {
			let carnet = msg.text.match(/^[0-9]{2}-[0-9]{5}$/g);
			// We check if the carnet is valid.
			if (carnet == null) {
				bot.sendMessage(chatID, `El carnet no es válido.`);
				return;
			}
			// We check if the prenuevo is registered.
			if (!(await verifyPrenuevoCarnet(carnet[0]))) {
				// We remove the prenuevo from the database.
				await deletePrenuevo(carnet[0]);
				bot.sendMessage(chatID, `Prenuevo eliminado correctamente.`);
			} else {
				bot.sendMessage(chatID, `El prenuevo no se encuentra registrado.`);
			}
		});
	})
});

// ---------------------------------------------------------------------------------------------------- //
// The bot listens to the command /admision@kick to remove a prenuevo from the admission group.
// ---------------------------------------------------------------------------------------------------- //
bot.onText(/^\/admision@kick/, async msg => {
	let chatID = msg.chat.id;
	// We check if the user is preparador.
	if (await verifyPreparadorID(msg.from.id)) {
		bot.sendMessage(chatID, `No tienes permisos para realizar esta acción.`);
		return;
	}
	// We get the preparador
	const preparador = (await getPreparadorByTelegramID(chatID)).initials
	// We check if the usar is admin.
	if (!isAdmin(chatID)) {
		bot.sendMessage(chatID, `${preparador}, te falta calle para poder hacer esto.`);
		return;
	}
	// We ask the carnet of the prenuevo to be removed.
	bot.sendMessage(chatID, `Escribe el carnet del prenuevo que deseas eliminar. *(XX-XXXXX)*`, keyboard.replyOpts).then(sended => {
		// We listen to the message with the carnet.
		bot.onReplyToMessage(sended.chat.id, sended.message_id, async msg => {
			let carnet = msg.text.match(/^[0-9]{2}-[0-9]{5}$/g);
			// We check if the carnet is valid.
			if (carnet == null) {
				bot.sendMessage(chatID, `El carnet no es válido.`);
				return;
			}
			// We check if the prenuevo is registered.
			if (!(await verifyPrenuevoCarnet(carnet[0]))) {
				// We remove the prenuevo from the admission group.
				await removeFromAdmission(carnet[0]);
				bot.sendMessage(chatID, `Prenuevo eliminado del grupo de admisión correctamente`);
			} else {
				bot.sendMessage(chatID, `El prenuevo no se encuentra registrado.`);
			}
		});
	})
});

// ---------------------------------------------------------------------------------------------------- //
// The bot listens to the command /admision@echo to send a message to the admission group.
// ---------------------------------------------------------------------------------------------------- //
bot.onText(/^\/admision@echo/, async msg => {
	let chatID = msg.chat.id;
	// We check if the user is preparador.
	if (await verifyPreparadorID(msg.from.id)) {
		bot.sendMessage(chatID, `No tienes permisos para realizar esta acción.`);
		return;
	}
	// We ask the message to be sent to the admission group.
	bot.sendMessage(chatID, `Escribe el mensaje que deseas enviar al grupo de admisión.`, keyboard.replyOpts).then(sended => {
		// We listen to the message with the text.
		bot.onReplyToMessage(sended.chat.id, sended.message_id, async msg => {
			let text = msg.text;
			// We send the message to the admission group.
			sendMessage(ADMISION_ID, text, { parse_mode: 'HTML' });
		});
	})
});

// ---------------------------------------------------------------------------------------------------- //
// The bot listens to the command /admision@show to show the list of prenuevos.
// ---------------------------------------------------------------------------------------------------- //
bot.onText(/^\/admision@show/, async msg => {
	let chatID = msg.chat.id;
	// We check if the user is preparador.
	if (await verifyPreparadorID(chatID)) {
		bot.sendMessage(chatID, `No tienes permisos para realizar esta acción.`);
		return;
	}
	// We get the list of prenuevos.
	let prenuevos = await getAllPrenuevos();
	let prenuevosList = `*Lista de prenuevos*\n\n`;
	prenuevos.forEach(prenuevo => {
		console.log(prenuevo)
		prenuevosList += `*${prenuevo.name}* - ${prenuevo.carnet} \n`;
	});
	prenuevosList += `\n*Total:* ${prenuevos.length}`;
	// We send the list of prenuevos.
	sendMessage(chatID, prenuevosList);
});

// ---------------------------------------------------------------------------------------------------- //
// The bot listens to the command /admision@clean to remove all the prenuevos from the database.
// ---------------------------------------------------------------------------------------------------- //
bot.onText(/^\/admision@clean/, async msg => {
	let chatID = msg.chat.id;
	// We check if the user is preparador.
	if (await verifyPreparadorID(chatID)) {
		bot.sendMessage(chatID, `No tienes permisos para realizar esta acción.`);
		return;
	}
	// We get the preparador
	const preparador = (await getPreparadorByTelegramID(chatID)).initials
	// We check if the usar is admin.
	if (!isAdmin(chatID)) {
		bot.sendMessage(chatID, `${preparador}, te falta calle para poder hacer esto.`);
		return;
	}
	// We send a warning message to the user.
	bot.sendMessage(chatID, `**WARNING** : Cuidado ${preparador} que si borras la BD por accidente vamos a tener un peo tu y yo`, { parse_mode: PARSE })
	console.log(`**WARNING** : ${preparador} quiere borrar la BD de prenuevos.`);
	// We send a message to the user to confirm if he wants to restart the database. 
	// The buttons are "Si" and "No" and only can be clicked once.
	const opts = {
		reply_markup: {
			inline_keyboard: [
				[
					{
						text: "Si",
						callback_data: "yes"
					},
					{
						text: "No",
						callback_data: "no"
					}
				]
			]
		}
	}
	await bot.sendMessage(chatID, "¿Estás seguro de que quieres eliminar la lista de prenuevos?", opts)
	bot.on("callback_query", async query => {
		if (query.message.chat.id !== chatID) return
		const data = query.data
		// We erase the buttons
		bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatID, message_id: query.message.message_id })
		// If the user clicks "Si", we restart the database
		if (data === "yes") {
			// We remove all the prenuevos from the database.
			await deleteAllPrenuevos()
			bot.sendMessage(chatID, `Lista de prenuevos eliminada correctamente.`);
			console.log(`**WARNING** : ${preparador} ha eliminado la BD de prenuevos.`);
		}
		// If the user clicks "No", we send a message
		else {
			sendMessage(chatID, "La Base de Datos no ha sido reiniciada.")
			console.log(`${preparador} no ha eliminado la BD de prenuevos.`);
		}
	})
});

// ---------------------------------------------------------------------------------------------------- //
// The bot listens to the command /admision@switch to change the status of the admision register.
// ---------------------------------------------------------------------------------------------------- //
bot.onText(/^\/admision@switch/, async msg => {
	let chatID = msg.chat.id;
	// We check if the user is preparador.
	if (await verifyPreparadorID(chatID)) {
		bot.sendMessage(chatID, `No tienes permisos para realizar esta acción.`);
		return;
	}
	// We change the state of the admission register.
	registroSwitch();
	sendMessage(chatID, `Registro de admisión: *${registroState}*`);
});

// ---------------------------------------------------------------------------------------------------- //
// The bot listens to the command /admision to begin with the guide to the new.
// ---------------------------------------------------------------------------------------------------- //
bot.onText(/^\/admision$/, async msg => {
	let chatID = msg.chat.id;
	let chatType = msg.chat.type;
	let fromID = msg.from.id;
	let chatFirstName = msg.from.first_name;

	// Guard that is responsible for verifying if the person has already written to the bot before.
	// If so, it does nothing, if it is the first time you write it, it records it in the database.
	let guard = await verifyTelegramID(fromID);

	if (guard) {
		await registerTelegramData(msg.from);
	}

	// Check if the user writes to the bot in private, this causes the command not to work in groups.
	if (chatType === PRIVATE_CHAT) {
		bot.sendMessage(
			chatID,
			`Hola ${chatFirstName}, bienvenido al proceso de admisión del MAC ${admissionDate.getFullYear()}. ¿Ya sabes que hacer?`,
			keyboard.login
		);
	}
	// If they try to place the command in the main group (teleMAC) the bot will warn them that it cannot be given that it is only available in private chat.
	else {
		bot.sendMessage(chatID, `${chatFirstName}, por grupos não não. Así que escríbeme en privado.`);
	}
});

// El bot escucha los botones que el usuario presiona para enviar el mensaje asociado con ese botón.
bot.on('message', async msg => {
	let fromID = msg.from.id;
	let chatType = msg.chat.type;

	// Check if the user writes to the bot in private, this causes the command not to work in groups.
	if (chatType === PRIVATE_CHAT) {
		// If the user presses Log in, the process of data verification begins
		// (which does not verify anything anywhere xD).
		console.log("**Listening to the button 'Iniciar sesión'.")
		if (msg.text.toString().toLowerCase() === LOGIN.toLowerCase()) {
			// Variables that establish the day of the week and the date corresponding to that day.
			let tz = new Date()
			let day = tz.getDate();
			let month = tz.getMonth() + 1;
			let year = tz.getFullYear()

			console.log(`**Day: ${day} Month: ${month} Year: ${year}. Checking Date.`)
			// Check if the date is after the day of the first meeting towards the prenuevos.
			if (registroState) {
				console.log('**Function "login" in admission.');
				// The bot asks for the card of the person.
				bot.sendMessage(fromID, messages.iniciar_sesion, keyboard.replyOpts)
					.then(sended => {
						console.log('**Listening to the carnet.')
						// The bot reads the card entered by the person.
						bot.onReplyToMessage(sended.chat.id, sended.message_id, async msg => {
							let carnet = msg.text.trim().match(/[0-9]{2}-[0-9]{5}/g)[0]
							console.log(`**Carnet: ${carnet}`)

							// If the card is not written in the indicated format, the bot insults the users.
							if (carnet === null) {
								bot.sendMessage(fromID, messages.fallback_iniciar_session, keyboard.login);
							}
							// If the card is written correctly follow the flow.
							else {
								// The bot asks for the name of the user.
								bot.sendMessage(fromID, messages.carnet_correcto, keyboard.replyOpts).then(sended => {
									console.log('**Listening to the name.')
									bot.onReplyToMessage(sended.chat.id, sended.message_id, async msg => {
										let nombre = msg.text;

										// If the name is not written in the indicated format, the bot insults the users.
										if (nombre === null) {
											bot.sendMessage(fromID, messages.fallback_nombre, keyboard.login);
										}
										// If the name is written correctly follow the flow.
										else {
											bot.sendMessage(fromID, messages.auth_session, keyboard.replyOpts).then(sended => {
												console.log('**Listening to the password.')
												// The bot reads the key entered by the person.
												bot.onReplyToMessage(sended.chat.id, sended.message_id, async msg => {
													let checkPassword = msg.text;

													// If the password is correct, the bot sends the invitation link to the admission group.
													if (checkPassword == LOGIN_PASSWORD) {
														await registerPrenuevo(fromID, nombre, carnet);
														bot.sendMessage(fromID, messages.success, keyboard.inlineURL);
													}
													// If this is incorrect, it tells you that it is stupid.
													else {
														bot.sendMessage(fromID, messages.fallback_auth_session, keyboard.login);
													}
												});
											});
										}
									});
								})

							}
						});
					})
					.catch(err => {
						bot.sendMessage(
							fromID,
							'Hubo un problema en enviarte algún mensaje. Por favor contacta con uno de mis creadores: @lmisea o @zambra_shunior.'
						);
						throw new Error('Hubo un problema al momento de presionar el botón de Iniciar sesión.', err);
					});
			}
			// If the person tries to log in before the meeting, the bot tells them to hold on.
			else {
				bot.sendMessage(fromID, messages.liar, keyboard.login);
			}
		}

		// Other buttons and their actions (Needless to explain, it's quite intuitive).
		// ! Deprecated.
		if (msg.text.toString().toLowerCase() === YES.toLowerCase()) {
			bot.sendMessage(fromID, messages.yes_tooLate, keyboard.login);
		}
		// ! Deprecated.
		if (msg.text.toString().toLowerCase() === NO.toLowerCase()) {
			bot.sendMessage(fromID, messages.too_late, keyboard.preLogin);
		}
		// ! Deprecated.
		if (msg.text.toString().toLowerCase() === BACK.toLowerCase()) {
			bot.sendMessage(fromID, '... Ok ...\n\nEspero no estés perdido.', keyboard.login);
		}

		if (msg.text.toString().toLowerCase() === DONT_KNOW.toLowerCase()) {
			bot.sendMessage(fromID, registroState ? messages.ahora_que : messages.too_late, keyboard.login);
		}

		// ! Deprecated.
		if (msg.text.indexOf(ALREADY_ASSISTED) === 0) {
			bot.sendMessage(fromID, messages.ahora_que, keyboard.login);
		}

		if (msg.text.indexOf(FAQ) === 0) {
			await bot.sendMessage(fromID, messages.faq.title, keyboard.faqsOpts);

			// We create a listener for the callback query, to check if the invitado has selected an option.
			bot.on("callback_query", async (query) => {
				// We get the chatID of the query.
				const chatID = query.message.chat.id
				// We check if the query is from the invitado we are looking for.
				if (query.from.id != fromID) return

				// // We delete the message with the options.
				// await bot.deleteMessage(chatID, query.message.message_id)

				// We take the answer (Query Data)
				const i = parseInt(query.data)
				const answer = messages.faq.content[i]
				const text = `<b>${answer.title}</b> \n${answer.text}`
				await bot.sendMessage(chatID, text, { parse_mode: 'HTML' })
			})
		}
	}
});
