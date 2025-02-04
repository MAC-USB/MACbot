import { BLOCKS_HOURS, weekDays } from "../../constants/notionProps.js";
import { isJefe } from "../../constants/preparadores.js";
import { NOT_JEFE, NOT_PREPARADOR } from "../../messages/permissions.js";
import { getAllPreparadores, getPreparadorByTelegramID, verifyPreparadorID } from "../../models/preparadorModel.js";
import { convertTime, taquillaSchedule } from "../../notion/readTaquilla.js";
import bot from "../../settings/app.js";
import { sendMessage } from "../sendMessage.js";

/**
 * Organize the schedule of the day. 
 * The schedule is an object with the initials of the preparers as keys and an array with the hours that the preparer is in taquilla as value.
 * @returns {Promise<object>} Object with the initials of the preparers of the day.
 */
const taquillaScheduleMessage = async () => {
    const dateI = new Date();
    const hours = dateI.getHours()
    dateI.setHours(hours - 4);
    const day = dateI.getDay()
    // We get the schedule of the day
    const schedule = await taquillaSchedule()
    let isReunion = false
    // We build the response
    let response = `El horario de taquilla hoy *(${weekDays[day - 1]})* es: \n`
    let reunion = ""
    // We iterate over the schedule. First, we take each preparer and their blocks
    for (const [preparer, block] of Object.entries(schedule)) {
        // We check if the block is a meeting
        if (preparer === "REUNION") {
            reunion += `Hoy hay reunión a las ${BLOCKS_HOURS[block[0] - 1]}\n`
            isReunion = true
            continue
        }
        block.sort((a, b) => convertTime(a) - convertTime(b))
        // We iterate over the blocks
        block.forEach((time, index) => {
            // We convert time to a int
            const i = convertTime(time)
            if (index === 0) { // If it's the first block, we add the preparer
                response += `**${preparer}**: ${BLOCKS_HOURS[i]}\n`
            } else { // If it's not the first block, we add the block with an indentation
                response += `     ${BLOCKS_HOURS[i]}\n`
            }
        })
    }
    response += isReunion ? `\n${reunion}` : ""
    response += "\n Recuerda que si no puedes ir a taquilla, debes avisar con tiempo"
    return response
}

// isTaquillaActive is a boolean that indicates if the taquilla is active or not
let isTaquillaActive = true

// ---------------------------------------------------------------------------------------------------- //
// The bot listens to the /taquilla@switch command and switches the taquilla state.
// ---------------------------------------------------------------------------------------------------- //
bot.onText(/^\/taquilla@switch/, async msg => {
    const chatID = msg.chat.id
    console.log("Se va a ejecutar el comando /taquilla:switch")
    // We check if the user is the jefe
    console.log(chatID)
    // If the user is not the jefe, we send a message and cancel the function
    if (!isJefe(chatID)) {
        sendMessage(chatID, NOT_JEFE)
        return
    }
    isTaquillaActive = !isTaquillaActive
    const message = isTaquillaActive ? "Taquilla abierta" : "Taquilla cerrada"
    sendMessage(chatID, message)
})

// ---------------------------------------------------------------------------------------------------- //
// The bot listens to the /taquilla command and sends a message with the schedule of the day.
// ---------------------------------------------------------------------------------------------------- //
bot.onText(/^\/taquilla$/, async msg => {
    const chatID = msg.chat.id
    console.log("Buscando horario de taquilla del dia")
    // We check if the user is a preparador
    // If the user is not a preparador, we send a message and cancel the function
    if (await verifyPreparadorID(chatID)) {
        console.log("No es preparador")
        sendMessage(chatID, NOT_PREPARADOR)
        return
    }
    // We get the initials of the preparer
    const preparer = (await getPreparadorByTelegramID(chatID)).initials
    const dateI = new Date();
    const hours = dateI.getHours()
    dateI.setHours(hours - 4);
    const day = dateI.getDay()
    // We check if it's a weekend
    if (day === 0 || day === 6) {
        sendMessage(chatID, `No me jodas ${preparer} que es fin de semana, no hay taquilla!!`)
        return
    }
    // We check if the taquilla is active
    if (!isTaquillaActive) {
        sendMessage(chatID, `Deja de joder ${preparer}, la taquilla está cerrada`)
        return
    }
    // If it's a weekday and the taquilla is active, we send the message
    const message = await taquillaScheduleMessage()
    sendMessage(chatID, message)
})

/**
 * sendTaquillaMessage()
 * This function sends a message to each preparer with their schedule of the day.
 * @returns {Promise<void>}
 */
const sendTaquillaMessage = async () => {
    const dateI = new Date();
    const hours = dateI.getHours()
    dateI.setHours(hours - 4);
    const day = dateI.getDay()
    console.log(day, hours - 4)
    // We check if the taquilla is active
    if (isTaquillaActive) {
        // We check if it's a weekend. 0 is Sunday and 6 is Saturday
        if (day === 0 || day === 6) {
            return
        }
        console.log(`Hoy es ${weekDays[day - 1]}`)
        // If it's a weekday, we get the schedule of the day
        const schedule = await taquillaSchedule()
        // We get the IDs of the preparers of the day
        const allPreparers = await getAllPreparadores()
        const preparers = allPreparers
            .map(preparer => [preparer.telegram_id, preparer.initials])
            .filter(preparer => Object.keys(schedule).includes(preparer[1]))
        // We send the message to each preparer
        preparers.forEach(preparer => {
            // We build the message
            let msg = `Hola ${preparer[1]}, recuerda que hoy ${weekDays[day - 1]} tienes taquilla. Tu horario es: \n`
            // We iterate over the blocks
            schedule[preparer[1]].forEach(time => {
                const i = convertTime(time)
                msg += `     ${BLOCKS_HOURS[i]}\n`
            })
            // We add the last message
            msg += "Recuerda que si no puedes ir a taquilla, debes avisar con tiempo"
            sendMessage(preparer[0], msg)
        })
        // We check if there is a meeting
        if (Object.keys(schedule).includes("REUNION")) {
            const reunion = schedule["REUNION"]
            const msg = `Recuerda que hoy hay reunión a las ${BLOCKS_HOURS[reunion[0] - 1]}`
            allPreparers.forEach(preparer => {
                sendMessage(preparer.telegram_id, msg)
            })
        }
    }
}

const date = new Date();
let hours = date.getHours()
date.setHours(hours - 4);
hours = date.getHours()
// Convert to milliseconds
const hoursToMilliseconds = hours * 60 * 60 * 1000;
const minutesToMilliseconds = date.getMinutes() * 60 * 1000;
const secondsToMilliseconds = date.getSeconds() * 1000;
// Sum all the milliseconds
const milliseconds = hoursToMilliseconds + minutesToMilliseconds + secondsToMilliseconds;
// Calculate the milliseconds to 8:00 am
const millisecondsToEight = 8 * 60 * 60 * 1000;
let millisecondsToStart = millisecondsToEight - milliseconds;
// If the milliseconds to start is negative, we add 24 hours
if (millisecondsToStart < 0) {
    millisecondsToStart += 24 * 60 * 60 * 1000;
}

// Every day at 8:00 am, we send the message
setTimeout(() => {
    // We calculate the milliseconds to the next day
    const next24Hours = 24 * 60 * 60 * 1000;
    // We send the message every 24 hours
    setInterval(() => {
        sendTaquillaMessage();
        console.log("Se ha ejecutado el setInterval")
    }, next24Hours);

}, millisecondsToStart);