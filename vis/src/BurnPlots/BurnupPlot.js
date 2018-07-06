import { VisComponent } from '@candela/core';
import { select } from 'd3-selection';
import { axisLeft, axisBottom } from 'd3-axis';
import { scaleTime, scaleLinear, scaleOrdinal } from 'd3-scale';
import { timeFormat } from 'd3-time-format';
import { schemeSet1 } from 'd3-scale-chromatic';
import { D3Chart, AxisChart, Crosshairs, Tooltip } from '@candela/d3chart';

import { computeInfo, dateString } from './util';
import { pairUp } from '../ProgressPlot';
import tooltipHtml from '../tooltip.pug';

function goalCount(data, goal) {
  if (data[0][goal] === undefined) {
    throw new Error('fatal: data does not include initial goal count');
  }

  let count = [];
  let curCount;
  data.forEach(d => {
    if (d[goal]) {
      curCount = d[goal];
    }

    count.push(curCount);
  });

  return count;
}

function computeGoalPoints(data, goalCount, timeIndex, finishDate) {
  let points = [];
  let last = goalCount[0];

  data.forEach((c, i) => {
    points.push({
      x: c[timeIndex],
      y: last
    });

    if (last !== goalCount[i]) {
      points.push({
        x: c[timeIndex],
        y: goalCount[i]
      });
    }

    last = goalCount[i];
  });

  points.push({
    x: finishDate,
    y: points[points.length - 1].y
  });

  return points;
}

export class BurnupPlot extends Tooltip(Crosshairs(AxisChart(D3Chart(VisComponent)))) {
  constructor (el, options) {
    super(el);

    // Initialize InitSize mixin.
    this.width = 960;
    this.height = 540;

    // Initialize Margin/D3Chart mixins.
    this.margin({
      top: 20,
      right: 20,
      bottom: 40,
      left: 60
    });
    this.initD3Chart();

    // Compute necessary data for plot.
    this.goalCount = goalCount(options.data, options.goal);
    this.data = options.data;
    this.timeIndex = options.timeIndex;
    this.series = Array.isArray(options.series) ? options.series : [options.series];
    this.goal = options.goal;
    this.finishDate = options.finishDate;

    this.info = computeInfo(this.data, this.series, this.timeIndex, this.finishDate, this.goalCount);

    // Initialize axes.
    const margin = this.margin();

    const x = scaleTime().domain([this.info.start, this.info.end]);
    this.bottomScale(x);
    this.bottomAxis().tickFormat(timeFormat('%Y-%m-%d'));
    this.renderBottomAxis();

    const y = scaleLinear().domain([this.info.min, this.info.max]);
    this.leftScale(y);

    // Initialize crosshairs.
    this.initCrosshairs();
  }

  render () {
    // Capture the x and y scales.
    const x = this.bottomScale();
    const y = this.leftScale();

    // Set the data rectangle to receive mouse events.
    this.plot.style('pointer-events', 'all');

    const colormap = scaleOrdinal(schemeSet1);

    const populate = (series) => {
      const seriesColor = colormap(series);

      console.log('this.plot', this.plot);
      let me = this.plot.append('g')
        .classed('series', true);

      console.log('me', me);

      let dots = me.append('g')
        .classed('dots', true)
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

      console.log('dots', dots);

      dots.transition()
        .duration(duration)
        .delay(delay)
        .attr('cy', d => y(d[series]));

      let lines = me.append('g')
        .classed('lines', true)
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

      const x2 = x(this.data[this.data.length - 1][this.timeIndex]);
      const y2 = y(this.data[this.data.length - 1][series]);
      const projection = me.append('line')
        .classed('projection', true)
        .attr('x1', x2)
        .attr('y1', y2)
        .attr('x2', x2)
        .attr('y2', y2)
        .style('stroke-dasharray', '5, 5')
        .style('opacity', 0)
        .style('stroke', seriesColor);

      const y0 = y(this.goalCount[this.goalCount.length - 1]);
      projection.transition()
        .duration(duration)
        .delay(2 * duration)
        .attr('x2', x(this.finishDate))
        .attr('y2', y0)
        .style('opacity', 1);

      const x1 = x(this.data[0][this.timeIndex]);
      const y1 = y(this.data[0][series]);

      const average = me.append('line')
        .classed('average', true)
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x1)
        .attr('y2', y1)
        .style('stroke-dasharray', '2, 2')
        .style('opacity', 0)
        .style('stroke', seriesColor);

      const targetX = (y0 - y1) * (x2 - x1) / (y2 - y1) + x1;
      average.transition()
        .duration(duration)
        .delay(3 * duration)
        .attr('x2', targetX)
        .attr('y2', y0)
        .style('opacity', 1);

    };

    const goalPoints = computeGoalPoints(this.data, this.goalCount, this.timeIndex, this.finishDate);

    const goalline = this.plot.append('g')
      .classed('goal', true)
      .selectAll('line')
      .data(pairUp(goalPoints))
      .enter()
      .append('line')
      .attr('x1', d => x(d[0].x))
      .attr('y1', d => y(d[0].y))
      .attr('x2', d => x(d[1].x))
      .attr('y2', d => y(d[1].y))
      .style('stroke', 'black')
      .style('opacity', 0.5);

    this.plot.selectAll('g.series')
      .data(this.series)
      .enter()
      .each(populate);

    this.on('crosshairs.move', evt => {
      const mouse = this.mouseCoords();
      const date = dateString(this.bottomScale().invert(mouse.x));
      const hours= Math.floor(this.leftScale().invert(mouse.y));

      const tt = this.tooltip();
      tt.style('left', `${evt.pageX + 5}px`)
        .style('top', `${evt.pageY - 39}px`)
        .html(tooltipHtml({
          date,
          hours
        }));

      tt.transition()
        .duration(200)
        .style('opacity', 1.0);
    });

    this.on('crosshairs.out', () => {
      this.tooltip().transition()
        .duration(200)
        .style('opacity', 0.0);
    });
  }
}
