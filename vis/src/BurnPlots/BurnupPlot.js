import { VisComponent } from '@candela/core';
import { select } from 'd3-selection';
import { axisLeft, axisBottom } from 'd3-axis';
import { scaleTime, scaleLinear, scaleOrdinal } from 'd3-scale';
import { timeFormat } from 'd3-time-format';
import { schemeSet1 } from 'd3-scale-chromatic';
import { D3Chart, Axes, Crosshairs, Tooltip } from '@candela/d3chart';

import { computeInfo, dateString } from './util';
import { LinearPoints, StepPoints } from '../function';
import { pairUp } from '../ProgressPlot';
import tooltipHtml from '../tooltip.pug';

function collectNotes (data, timeIndex) {
  let notes = [];
  data.forEach(d => {
    for (let k in d) {
      if (k.endsWith('_note')) {
        const parts = k.split('_');
        const series = parts.slice(0, -1).join('_');

        notes.push({
          x: d[timeIndex],
          y: d[series],
          note: d[k]
        });
      }
    }
  });

  return notes;
}

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

export class BurnupPlot extends Tooltip(Crosshairs(Axes(D3Chart(VisComponent)))) {
  constructor (el, options) {
    super(el);

    this.averageStart = {};

    // Initialize InitSize mixin.
    this.width = 960;
    this.height = 540;

    // Initialize Margin/D3Chart mixins.
    this.margin.set({
      top: 20,
      right: 20,
      bottom: 40,
      left: 60
    });
    this.d3chart.init();

    this.tooltip.init({
      textAlign: 'left',
      width: '80px',
      height: '100px'
    });

    // Compute necessary data for plot.
    this.goalCount = goalCount(options.data, options.goal);
    this.data = options.data;
    this.timeIndex = options.timeIndex;
    this.series = Array.isArray(options.series) ? options.series : [options.series];
    this.goal = options.goal;
    this.finishDate = options.finishDate;

    this.info = computeInfo(this.data, this.series, this.timeIndex, this.finishDate, this.goalCount);

    // Initialize axes.
    const margin = this.margin.get();

    const x = scaleTime().domain([this.info.start, this.info.end]);
    this.axes.setScale('bottom', x)
      .setLabel('bottom', 'Date')
      .axis.bottom.tickFormat(timeFormat('%Y-%m-%d'));
    this.axes.renderAxis('bottom');

    const y = scaleLinear().domain([this.info.min, this.info.max]);
    this.axes.setScale('left', y)
      .setLabel('left', 'Hours');

    // Initialize crosshairs.
    this.crosshairs.init();
  }

  render () {
    // Capture the x and y scales.
    const x = this.axes.getScale('bottom');
    const y = this.axes.getScale('left');

    const colormap = scaleOrdinal(schemeSet1);

    const plotBounds = this.margin.bounds('plot');

    const populate = (series) => {
      const seriesColor = colormap(series);

      let me = this.d3chart.plot.append('g')
        .classed('series', true);

      let dots = me.append('g')
        .classed('dots', true)
        .selectAll('circle')
        .data(this.data)
        .enter()
        .append('circle')
        .attr('cx', d => x(d[this.timeIndex]))
        .attr('cy', d => y(d[series]))
        .attr('r', 2.5)
        .style('fill', seriesColor);

      const duration = 500;
      const delay = (d, i) => 50 * i;

      let lines = me.append('g')
        .classed('lines', true)
        .selectAll('line')
        .data(pairUp(this.data))
        .enter()
        .append('line')
        .attr('x1', d => x(d[0][this.timeIndex]))
        .attr('y1', d => y(d[0][series]))
        .attr('x2', d => x(d[1][this.timeIndex]))
        .attr('y2', d => y(d[1][series]))
        .style('opacity', 1)
        .style('stroke', seriesColor);

      const x2 = x(this.data[this.data.length - 1][this.timeIndex]);
      const y2 = y(this.data[this.data.length - 1][series]);
      const y0 = y(this.goalCount[this.goalCount.length - 1]);
      const projection = me.append('line')
        .classed('projection', true)
        .attr('x1', x2)
        .attr('y1', y2)
        .attr('x2', x(this.finishDate))
        .attr('y2', y0)
        .style('opacity', 1)
        .style('stroke-dasharray', '5, 5')
        .style('stroke', seriesColor);

      const avgStart = this.getAverageStart(series);
      const x1 = x(avgStart.x);
      const y1 = y(avgStart.y);

      const targetX = (y0 - y1) * (x2 - x1) / (y2 - y1) + x1;
      const average = me.append('line')
        .classed('average', true)
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x1)
        .attr('y2', y1)
        .attr('x2', targetX)
        .attr('y2', y0)
        .style('stroke-dasharray', '2, 2')
        .style('stroke', seriesColor)
        .style('opacity', 1);
    };

    const goalPoints = computeGoalPoints(this.data, this.goalCount, this.timeIndex, this.finishDate);

    const goalline = this.d3chart.plot.append('g')
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
      .style('stroke-width', '1px')
      .style('opacity', 0.8);

    this.d3chart.plot.selectAll('g.series')
      .data(this.series)
      .enter()
      .each(populate);

    let dataInterp = {};
    this.series.forEach(s => {
      dataInterp[s] = new LinearPoints(this.data.map(d => ({x: d[this.timeIndex], y: d[s]})), 'x', 'y');
    });

    const goalInterp = new StepPoints(goalPoints, 'x', 'y');

    this.d3chart.plot.on('mousemove', () => {
      const mouse = this.crosshairs.mouseCoords();
      this.crosshairs.show()
        .setPosition(mouse.x, mouse.y);

      this.tooltip.show()
        .setPosition(event.pageX + 10, event.pageY + 10);
    });

    this.crosshairs.target.on('mousemove.tooltip', () => {
      const evt = window.event;

      const mouse = this.crosshairs.mouseCoords();
      const invertX = this.axes.getScale('bottom').invert(mouse.x);
      const date = dateString(invertX);
      const hours = this.axes.getScale('left').invert(mouse.y);

      const seriesIntersections = this.series.map(s => ({color: colormap(s), value: dataInterp[s].evaluate(invertX)}));
      const goalIntersection = goalInterp.evaluate(invertX);

      this.tooltip.setPosition(window.event.pageX + 10, window.event.pageY + 10);
      this.tooltip.tooltip.html(tooltipHtml({
          date,
          hours,
          seriesIntersections,
          goalIntersection
        }));
    });

    this.crosshairs.target.on('mouseout.tooltip', () => {
      this.tooltip.hide();
    });

    const noteData = collectNotes(this.data, this.timeIndex);
    this.d3chart.plot.append('g')
      .classed('notes', true)
      .selectAll('circle')
      .data(noteData)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.x))
      .attr('cy', d => y(d.y))
      .attr('r', 5)
      .style('fill', 'gray')
      .on('mousemove.note', d => {
        this.crosshairs.show()
          .setPosition(x(d.x), y(d.y));

        this.tooltip.show()
          .setPosition(x(d.x) + plotBounds.x + 20, y(d.y) + plotBounds.y + 20)
          .tooltip.text(d.note);

        event.stopPropagation();
      });
  }

  getAverageStart (s) {
    if (!this.averageStart.hasOwnProperty(s)) {
      this.averageStart[s] = {
        x: this.data[0][this.timeIndex],
        y: this.data[0][s]
      };
    }

    return this.averageStart[s];
  }

  setAverageStart (s, {x, y}) {
    this.averageStart[s] = {x, y};
  }
}
