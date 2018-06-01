import { VisComponent } from '@candela/core';
import { select } from 'd3-selection';
import 'd3-transition';
import { scaleBand,
         scaleLinear,
         scaleLog } from 'd3-scale';
import { axisBottom,
         axisLeft } from 'd3-axis';
import { format } from 'd3-format';

import { partition } from './util';

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
    const vals = part[group].map(d => +d[field]).sort((x, y) => x - y);

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

    const q1Count = Math.max(vals.filter(d => d > q1 && d < med).length, 1);
    const q3Count = Math.max(vals.filter(d => d > med && d < q3).length, 1);

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
      q1Count,
      med,
      q3,
      q3Count,
      highWhisker,
      outliers,
      minmax,
      vals
    });
  }

  return boxplotData;
}

function minmax(bpData) {
  return [
    Math.min.apply(null, bpData.map(d => d.minmax[0])),
    Math.max.apply(null, bpData.map(d => d.minmax[1]))
  ];
}

export class BoxPlot extends VisComponent {
  constructor (el, options) {
    super(el);

    this.field = options.field;
    this.splitter = options.splitter;

    this.bodywidth = options.bodywidth || 'constant';
    if (this.bodywidth !== 'constant' && this.bodywidth !== 'variable') {
      throw new Error('option `bodywidth` must be either `constant` or `variable`');
    }

    this.boxplotdata = boxplotPrep(options.data, options.splitter, options.field);

    this.margin = {
      top: 20,
      right: 20,
      bottom: 40,
      left: 60
    };
    this.visWidth = 960;
    this.visHeight = 540;

    this.width = this.visWidth - this.margin.left - this.margin.right;
    this.height = this.visHeight - this.margin.top - this.margin.bottom;

    this.svg = select(this.el)
      .append('svg')
      .attr('xmlns', 'http://www.w3.org/2000/svg')
      .attr('width', this.visWidth)
      .attr('height', this.visHeight);

    this.tooltip = select(this.el)
      .append('div')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('text-align', 'center')
      .style('width', '60px')
      .style('height', '28px')
      .style('padding', '2px')
      .style('font', '12px sans-serif')
      .style('background', 'lightgreen')
      .style('border', '0px')
      .style('border-radius', '8px')
      .style('pointer-events', 'none');
  }

  render () {
    const x = scaleBand()
      .rangeRound([0, this.width])
      .padding(0.1)
      .domain(this.boxplotdata.map(d => d.group));

    const [min, max] = minmax(this.boxplotdata);
    const padding = 0.1 * (max - min);

    const y = scaleLinear()
      .rangeRound([this.height, 0])
      .domain([min - padding, max + padding]);

    let g = this.svg.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    g.append('g')
      .classed('axis', true)
      .classed('x-axis', true)
      .attr('transform', `translate(0,${this.height})`)
      .call(axisBottom(x))
      .append('text')
      // .attr('transform', `translate(${this.width / 2},${this.height/2})`)
      .attr('transform', `translate(${this.width / 2},${this.margin.bottom - 10})`)
      .attr('text-anchor', 'middle')
      .text(this.splitter)
      .style('font-family', 'sans-serif')
      .style('stroke', 'black');

    g.append('g')
      .classed('axis', true)
      .classed('y-axis', true)
      .call(axisLeft(y).ticks(10))
      .append('text')
      .attr('transform', `translate(${-this.margin.left + 10},${this.height/2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .text(this.field)
      .style('font-family', 'sans-serif')
      .style('stroke', 'black');

    let plots = g.selectAll('.boxplot')
      .data(this.boxplotdata);

    plots = plots.enter()
      .append('g')
      .merge(plots);

    let logScale = scaleLog()
      .domain([1, 1000])
      .range([0.1 * x.bandwidth(), 0.9 * x.bandwidth()]);

    let constScale = d => 0.25 * x.bandwidth();

    const widthScale = this.bodywidth === 'constant' ? constScale : logScale;
    const formatter = format('.1f');

    g = plots.append('g');
    g.append('rect')
      .attr('x', d => x(d.group) + 0.5 * (x.bandwidth() - widthScale(d.q3Count)))
      .attr('y', d => y(d.q3))
      .attr('width', d => widthScale(d.q3Count))
      .attr('height', d => Math.abs(y(d.q3) - y(d.med)))
      .style('fill', 'steelblue')
      .style('stroke', 'black')
      .on('mouseover', d => {
        this.tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        this.tooltip.html(`${d.q3Count} items`)
          .style('left', `${event.pageX}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mouseout', d => {
        this.tooltip.transition()
          .duration(200)
          .style('opacity', 0.0);
      });

    g.append('rect')
      .attr('x', d => x(d.group) + 0.5 * (x.bandwidth() - widthScale(d.q1Count)))
      .attr('y', d => y(d.med))
      .attr('width', d => widthScale(d.q1Count))
      .attr('height', d => Math.abs(y(d.med) - y(d.q1)))
      .style('fill', 'steelblue')
      .style('stroke', 'black')
      .on('mouseover', d => {
        this.tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        this.tooltip.html(`${d.q1Count} items`)
          .style('left', `${event.pageX}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mouseout', d => {
        this.tooltip.transition()
          .duration(200)
          .style('opacity', 0.0);
      });

    g.append('line')
      .attr('x1', d => x(d.group) + 0.5 * x.bandwidth())
      .attr('x2', d => x(d.group) + 0.5 * x.bandwidth())
      .attr('y1', d => y(d.lowWhisker))
      .attr('y2', d => y(d.q1))
      .style('stroke', 'black');

    g.append('line')
      .attr('x1', d => x(d.group) + 0.5 * x.bandwidth())
      .attr('x2', d => x(d.group) + 0.5 * x.bandwidth())
      .attr('y1', d => y(d.q3))
      .attr('y2', d => y(d.highWhisker))
      .style('stroke', 'black');

    g.append('g')
      .selectAll('.outlier')
      .data(d => d.outliers.map(o => ({
        outlier: o,
        group: d.group
      })))
      .enter()
      .append('circle')
      .attr('cx', d => x(d.group) + 0.5 * x.bandwidth())
      .attr('cy', d => y(d.outlier))
      .attr('r', 2)
      .style('fill', 'white')
      .style('stroke', 'black')
      .on('mouseover', d => {
        this.tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        this.tooltip.html(formatter(d.outlier))
          .style('left', `${event.pageX}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mouseout', d => {
        this.tooltip.transition()
          .duration(200)
          .style('opacity', 0.0);
      });
  }

  serialize (format) {
    switch (format) {
      case 'png':
        return this.serializePNG();
        break;

      case 'svg':
        return this.serializeSVG();
        break;

      default:
        throw new Error(`unknown serialization format: ${format}`);
    }
  }

  serializeSVG () {
    return select(this.el).select('svg').node().outerHTML;
  }

  serializePNG () {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = this.visWidth;
      canvas.height = this.visHeight;

      const ctx = canvas.getContext('2d');
      const data = this.serializeSVG();

      const img = new Image(this.visWidth, this.visHeight);
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };

      img.src = `data:image/svg+xml,${encodeURIComponent(data)}`;
    });
  }
}
