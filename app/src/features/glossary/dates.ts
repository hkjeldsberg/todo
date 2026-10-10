/** A YYYY-MM-DD date stored at noon UTC, so it shows as that day in any nearby time zone. */
export const dateToTimestamp = (date: string) => `${date}T12:00:00.000Z`;
