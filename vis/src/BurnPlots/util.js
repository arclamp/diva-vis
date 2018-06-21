export function computeInfo (data, series, timeIndex, finishDate) {
  // Compute the earliest and latest dates given.
  const dates = data.map(d => d[timeIndex]);
  const start = dates.reduce((a, b) => a.getTime() < b.getTime() ? a : b, dates[0]);
  const end = [...dates, finishDate].reduce((a, b) => a.getTime() > b.getTime() ? a : b, dates[0]);

  // Compute the min and max value of each series.
  let mins = [];
  let maxes = [];

  series.forEach(s => {
    const values = data.map(d => d[s]);
    const min = Math.min.apply(null, [...values, 0]);
    const max = Math.max.apply(null, values);

    mins.push(min);
    maxes.push(max);
  });

  // Send back the min of mins, max of maxes, and the start and end dates.
  return {
    min: Math.min.apply(null, mins),
    max: Math.max.apply(null, maxes),
    start,
    end
  };
}

export function dateString (d) {
  const year = d.getFullYear();
  const month = d.getMonth() + 1 < 10 ? `0${d.getMonth() + 1}` : d.getMonth() + 1;
  const day = d.getDate() < 10 ? `0${d.getDate()}` : d.getDate();
  return `${year}-${month}-${day}`;
}
