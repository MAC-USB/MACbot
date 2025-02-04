import notion from "./connection.js";
import dotenv from "dotenv";
import { weekDays } from "../constants/notionProps.js";
dotenv.config();

const NOTION_DB_ID = process.env.NOTION_TAQUILLA_DB_ID;

const BLOCK = "Hora";

/**
 * Converts the time of a string in format "HH am/pm" to an integer index of the BLOCKS_HOURS array.
 * @param {string} time 
 * @returns {number} Index of the BLOCKS_HOURS array.
 */
export const convertTime = (time) => {
    // const [hour, p] = time.split(" ")
    const i = parseInt(time)
    // return p.includes("am") ? i - 8 : i === 12 ? 4 : i + 4
    return i - 1
}

/**
    Formato de la base de datos:
    - Bloque horario: Titulo
    - Lunes: rich_text, iniciales del preparador
    - Martes: rich_text, iniciales del preparador
    - Miércoles: rich_text, iniciales del preparador
    - Jueves: rich_text, iniciales del preparador
    - Viernes: rich_text, iniciales del preparador
*/

/**
 * preparersOfTheDay()
 * This fuction return an object with the initials of the preparers of the day. 
 * The value of each preparer is an array with the hours that the preparer is in taquilla.
 * @param {object} response . Response of the query to the database of taquilla.
 * @param {String} day . Day of the week (Lunes, Martes, Miércoles, Jueves, Viernes)
 * @returns {object} Object with the initials of the preparers of the day.
 */
const preparersOfTheDay = (response, day) => {
    // We get the initials of the preparers of the day.
    const preparers = [...new Set(response.results.map(result => result.properties[day].rich_text[0].plain_text))];
    // We create an object with the initials of the preparers as keys and an empty array as value.
    const preparersOfTheDay = {};
    // We fill the array with the hours that the preparer is in taquilla.
    preparers.forEach(preparer => preparersOfTheDay[preparer] = []);
    response.results.forEach(result => {
        const preparer = result.properties[day]?.rich_text[0]?.plain_text;
        const hour = result.properties[BLOCK]?.title[0]?.plain_text;
        preparersOfTheDay[preparer].push(hour);
    });
    return preparersOfTheDay;
}

/**
 * taquillaSchedule()
 * This function return an object with the initials of the preparers of the day.
 * @returns {Promise<object>} Object with the initials of the preparers of the day. 
 * And the value of each preparer is an array with the hours that the preparer is in taquilla.
 */
export const taquillaSchedule = async () => {
    try {
        // First, we get the day of the week. It has to be between 1 and 5.
        const date = new Date();
        const hours = date.getHours()
        date.setHours(hours - 4);
        const day = weekDays[date.getDay() - 1];
        const response = await notion.databases.query({
            database_id: NOTION_DB_ID,
            filter: {
                property: day,
                rich_text: {
                    is_not_empty: true
                },
            },
        });
        return preparersOfTheDay(response, day);
    } catch (error) {
        console.log("Error en taquillaSchedule");
        console.error(error);
    }
}