
export const getCalendarUrls = (event) => {
    const title = encodeURIComponent(event.title);
    const location = encodeURIComponent(event.city?.join(', ') || 'Онлайн');

    const startTimeStr = event.start_time ? `${event.start_time}:00` : '00:00:00';
    const endTimeStr = event.end_time ? `${event.end_time}:00` : startTimeStr;
    // yandex
    const yStart = `${event.start_date}T${startTimeStr}`;
    const yEnd = `${event.end_date}T${endTimeStr};`
    // google
    const gStart = yStart.replace(/-|:/g, '');
    const gEnd = yEnd.replace(/-|:/g, '');

    return {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${gStart}/${gEnd}&location=${location}&ctz=UTC`,
        
        
        yandex: `https://calendar.yandex.ru/?event=${title}&start_date=${yStart}&end_date=${yEnd}&location=${location}`
};
}