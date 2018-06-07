import { VisComponent } from '@candela/core';
import { select } from 'd3-selection';
import { axisLeft, axisBottom } from 'd3-axis';
import { scaleTime, scaleLinear, scaleOrdinal } from 'd3-scale';
import { timeFormat } from 'd3-time-format';
import { schemeSet1 } from 'd3-scale-chromatic';

import { pairUp } from './ProgressPlot';

function computeInfo (data, series, timeIndex, finishDate) {
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

export class BurndownPlot extends VisComponent {
  constructor (el, options) {
    super(el);

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

    this.data = options.data;
    this.timeIndex = options.timeIndex;
    this.series = Array.isArray(options.series) ? options.series : [options.series];
    this.finishDate = options.finishDate;

    this.info = computeInfo(this.data, this.series, this.timeIndex, this.finishDate);
    console.log(this.info);

    this.svg = select(this.el)
      .append('svg')
      .attr('xmlns', 'http://www.w3.org/2000/svg')
      .attr('width', this.visWidth)
      .attr('height', this.visHeight);
  }

  render () {
    const x = scaleTime()
      .domain([this.info.start, this.info.end])
      .range([0, this.width]);

    const y = scaleLinear()
      .domain([this.info.min, this.info.max])
      .range([this.height, 0]);

    const g = this.svg.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    g.append('g')
      .classed('axis', true)
      .classed('x-axis', true)
      .attr('transform', `translate(0,${this.height})`)
      .call(axisBottom(x).tickFormat(timeFormat('%Y-%m-%d')));

    g.append('g')
      .classed('axis', true)
      .classed('y-axis', true)
      .call(axisLeft(y));

    const colormap = scaleOrdinal(schemeSet1);

    const populate = (series) => {
      console.log('series', series);
      const seriesColor = colormap(series);

      let dots = g.append('g')
        .selectAll('circle')
        .data(this.data)
        .enter()
        .append('circle')
        .attr('cx', d => x(d[this.timeIndex]))
        .attr('cy', y(0))
        .attr('r', 2.5)
        .style('fill', seriesColor);

      const duration = 500;
      const delay = (d, i) => 50 * i;

      dots.transition()
        .duration(duration)
        .delay(delay)
        .attr('cy', d => y(d[series]));

      let lines = g.append('g')
        .selectAll('line')
        .data(pairUp(this.data))
        .enter()
        .append('line')
        .attr('x1', d => x(d[0][this.timeIndex]))
        .attr('y1', d => y(d[0][series]))
        .attr('x2', d => x(d[0][this.timeIndex]))
        .attr('y2', d => y(d[0][series]))
        .style('opacity', 0)
        .style('stroke', seriesColor);

      lines.transition()
        .duration(duration)
        .delay((d, i) => duration + delay(d, i))
        .attr('x2', d => x(d[1][this.timeIndex]))
        .attr('y2', d => y(d[1][series]))
        .style('opacity', 1);

      const lastX1 = x(this.data[this.data.length - 1][this.timeIndex]);
      const lastY1 = y(this.data[this.data.length - 1][series]);
      const projection = g.append('line')
        .classed('projection', true)
        .attr('x1', lastX1)
        .attr('y1', lastY1)
        .attr('x2', lastX1)
        .attr('y2', lastY1)
        .style('stroke-dasharray', '5, 5')
        .style('opacity', 0)
        .style('stroke', seriesColor);

      projection.transition()
        .duration(duration)
        .delay(2 * duration)
        .attr('x2', x(this.finishDate))
        .attr('y2', y(0))
        .style('opacity', 1);

      const firstX1 = x(this.data[0][this.timeIndex]);
      const firstY1 = y(this.data[0][series]);
      const average = g.append('line')
        .classed('average', true)
        .attr('x1', firstX1)
        .attr('y1', firstY1)
        .attr('x2', firstX1)
        .attr('y2', firstY1)
        .style('stroke-dasharray', '2, 2')
        .style('opacity', 0)
        .style('stroke', seriesColor);

      average.transition()
        .duration(duration)
        .delay(2.5 * duration)
        .attr('x2', x(this.finishDate))
        .attr('y2', y(0))
        .style('opacity', 0.5);
    };

    g.append('g')
      .selectAll('g')
      .data(this.series)
      .enter()
      .append('g')
      .each(populate);
  }
}
