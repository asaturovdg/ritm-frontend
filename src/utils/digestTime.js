export function utcHourToLocal(utcHour) {
  const offsetHours = -new Date().getTimezoneOffset() / 60;
  return ((Math.round(utcHour + offsetHours) % 24) + 24) % 24;
}

export function localHourToUtc(localHour) {
  const offsetHours = -new Date().getTimezoneOffset() / 60;
  return ((Math.round(localHour - offsetHours) % 24) + 24) % 24;
}
