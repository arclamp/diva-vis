import { VisComponent } from '@candela/core';
import { select } from 'd3-selection';
import { scaleBand,
         scaleLinear } from 'd3-scale';
import { axisBottom,
         axisLeft } from 'd3-axis';

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
  const offset = Math.floor(size / 2);
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

function boxplotPrep (data, splitter, field) {
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

  return boxplotData;
}

export class BoxPlot extends VisComponent {
  constructor (el, options) {
    super(el);

    this.boxplotdata = boxplotPrep(options.data, options.splitter, options.field);

    console.log(this.boxplotdata);

    this.margin = {
      top: 20,
      right: 20,
      bottom: 30,
      left: 40
    };
    const width = 960;
    const height = 540;
    this.width = width - this.margin.left - this.margin.right;
    this.height = height - this.margin.top - this.margin.bottom;

    this.svg = select(this.el)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
  }

  render () {
    const x = scaleBand()
      .rangeRound([0, this.width])
      .padding(0.1)
      .domain(this.boxplotdata.map(d => d.group));

    const y = scaleLinear()
      .rangeRound([this.height, 0])
      .domain([0, 10]);

    const g = this.svg.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    g.append('g')
      .classed('axis', true)
      .classed('x-axis', true)
      .attr('transform', `translate(0,${this.height})`)
      .call(axisBottom(x));

    g.append('g')
      .classed('axis', true)
      .classed('y-axis', true)
      .call(axisLeft(y).ticks(10))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 6)
      .attr('dy', '0.71em')
      .attr('text-nnchor', 'end')
      .attr('text', 'placeholder');

    let plots = g.selectAll('.boxplot')
      .data(this.boxplotdata);

    plots = plots.enter()
      .append('g')
      .merge(plots);

    plots.each(d => console.log('data', d));
  }
}
