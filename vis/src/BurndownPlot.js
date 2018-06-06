import { VisComponent } from '@candela/core';
import { select } from 'd3-selection';
import { axisLeft, axisBottom } from 'd3-axis';
import { scaleTime, scaleLinear } from 'd3-scale';
import { timeFormat } from 'd3-time-format';

import { pairUp } from './ProgressPlot';

function computeInfo (data, series, timeIndex, finishDate) {
  const values = data.map(d => d[series]);
  const min = Math.min.apply(null, [...values, 0]);
  const max = Math.max.apply(null, values);

  const dates = data.map(d => d[timeIndex]);
  const start = dates.reduce((a, b) => a.getTime() < b.getTime() ? a : b, dates[0]);
  const end = [...dates, finishDate].reduce((a, b) => a.getTime() > b.getTime() ? a : b, dates[0]);

  return {
    min,
    max,
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
    this.series = options.series;
    this.finishDate = options.finishDate

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

    let dots = g.append('g')
      .selectAll('circle')
      .data(this.data)
      .enter()
      .append('circle')
      .attr('cx', d => x(d[this.timeIndex]))
      .attr('cy', y(0))
      .attr('r', 2.5);

    const duration = 500;
    const delay = (d, i) => 50 * i;

    dots.transition()
      .duration(duration)
      .delay(delay)
      .attr('cy', d => y(d[this.series]));

    let lines = g.append('g')
      .selectAll('line')
      .data(pairUp(this.data))
      .enter()
      .append('line')
      .attr('x1', d => x(d[0][this.timeIndex]))
      .attr('y1', d => y(0))
      .attr('x2', d => x(d[1][this.timeIndex]))
      .attr('y2', d => y(0))
      .style('opacity', 0)
      .style('stroke', 'black');

    lines.transition()
      .duration(duration)
      .delay(delay)
      .attr('y1', d => y(d[0][this.series]))
      .attr('y2', d => y(d[1][this.series]))
      .style('opacity', 1);
  }
}
