export function getTime(currentTime?: Date) {
    const ingameStartDate = new Date('1349-06-28T00:00:00Z');
    const realWorldStartDate = new Date('2025-11-11T00:00:00Z');
    
    const now = currentTime ? currentTime.valueOf() : Date.now();
    const irlHoursPerIngameDay = 6;
    const msPerIngameDay = irlHoursPerIngameDay * 60 * 60 * 1000;
    const elapsedMs = now - realWorldStartDate.getTime();
    const elapsedIngameDays = Math.floor(elapsedMs / msPerIngameDay);
    
    const remainderMs = elapsedMs % msPerIngameDay;
    const currentIngameHour = Math.floor(remainderMs / (60 * 60 * 1000));
    const currentIngameMinute = Math.floor((remainderMs % (60 * 60 * 1000)) / (60 * 1000));
    const currentIngameSecond = Math.floor((remainderMs % (60 * 1000)) / 1000);
    
    const ingameDate = new Date(ingameStartDate.getTime() + elapsedIngameDays * msPerIngameDay);
    
    const ingameYear = ingameDate.getFullYear();
    const ingameMonth = ingameDate.toLocaleString('default', { month: 'long' });
    const ingameDay = ingameDate.getDate();
    const ingameDayOfWeek = ingameDate.toLocaleString('default', { weekday: 'long' });
    const ingameTime = `${currentIngameHour.toString().padStart(2, '0')}:${currentIngameMinute.toString().padStart(2, '0')}:${currentIngameSecond.toString().padStart(2, '0')}`;
    //return `${ingameYear}, ${ingameMonth} ${ingameDay}. ${ingameTime}. ${ingameDayOfWeek}.`;

    return {
        year: ingameYear,
        month: {
            num: ingameDate.getMonth() + 1,
            short: ingameMonth.slice(0, 3),
            long: ingameMonth,
        },
        day: ingameDay,
        dayOfWeek: {
            short: ingameDayOfWeek.slice(0, 3),
            long: ingameDayOfWeek,
        },
        hours: currentIngameHour,
        minutes: currentIngameMinute,
        seconds: currentIngameSecond,

        string: `${ingameYear}, ${ingameMonth} ${ingameDay}. ${ingameTime}. ${ingameDayOfWeek}.`
    }
}