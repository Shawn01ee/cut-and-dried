/** Poisson arrivals via independent exponential interarrival times. Mean/variance of counts = rate × duration. */
export function appointmentTimes(open, close, rate, random = Math.random) {
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(open) || !Number.isFinite(close) || close <= open) return [];
  const times = []; let hour = open;
  while (true) {
    const u = Math.max(Number.MIN_VALUE, Math.min(1 - Number.EPSILON, random()));
    hour += -Math.log(u) / rate;
    if (hour >= close) break;
    times.push(hour);
  }
  return times;
}
