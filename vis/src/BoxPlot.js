import { VisComponent } from '@candela/core';

function partition (array, classifier) {
  let classes = {};
  array.forEach(d => {
    let class_ = classifier(d);
    let target = classes[class_] = classes[class_] || [];

    target.push(d);
  });

  return classes;
}

function median (data, low, high) {
  const size = high - low;
  const offset = Math.floor(size / 2)
  return size % 2 === 1 ? data[low + offset] : 0.5 * (data[low + offset - 1] + data[low + offset]);
}

function quartiles (data) {
  let halves = [
    {
      low: 0,
      high: null
    },
    {
      low: null,
      high: data.length
    }
  ];

  const med = median(data, 0, data.length);
  const idx = Math.floor(data.length / 2);
  if (data.length % 2 === 1) {
    halves[0].high = idx;
    halves[1].low = idx + 1;
  } else {
    halves[0].high = idx;
    halves[1].low = idx;
  }

  const q1 = median(data, halves[0].low, halves[0].high);
  const q3 = median(data, halves[1].low, halves[1].high);

  return {
    q1,
    med,
    q3
  };
}


function boxplot_prep (data, splitter, field) {
  let part = partition(data, d => d[splitter]);
  let boxplotData = [];

  for (let group in part) {
    const vals = part[group].map(d => d[field]).sort();

    const {q1, med, q3} = quartiles(vals);

    const iqr = q3 - q1;
    const lowFence = q1 - 1.5 * iqr;
    const highFence = q3 + 1.5 * iqr;

    const outliers = vals.filter(d => d < lowFence || d > highFence);

    let lowWhisker = lowFence;
    for (let i = 0; i < vals.length; i++) {
      if (vals[i] > lowWhisker) {
        lowWhisker = vals[i];
        break;
      }
    }

    let highWhisker = highFence;
    for (let i = vals.length; i >= 0; i--) {
      if (vals[i] < highWhisker) {
        highWhisker = vals[i];
        break;
      }
    }

    let minmax = [lowWhisker, highWhisker];
    if (outliers.length > 0) {
      if (outliers[0] < minmax[0]) {
        minmax[0] = outliers[0];
      }

      if (outliers[outliers.length - 1] > minmax[1]) {
        minmax[1] = outliers[outliers.length - 1];
      }
    }

    boxplotData.push({
      group,
      lowWhisker,
      q1,
      med,
      q3,
      highWhisker,
      outliers,
      minmax
    });
  }

  console.log(boxplotData);
  return boxplotData;
}

export class BoxPlot extends VisComponent {
  constructor (el, options) {
    super(el);

    this.data = boxplot_prep(options.data, options.splitter, options.field);
  }
}
