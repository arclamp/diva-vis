import { VisComponent } from '@candela/core';
import { select } from 'd3-selection';
import { axisLeft, axisBottom } from 'd3-axis';
import { scaleTime, scaleLinear, scaleOrdinal } from 'd3-scale';
import { timeFormat } from 'd3-time-format';
import { schemeSet1 } from 'd3-scale-chromatic';
import { D3Chart, AxisChart, Crosshairs, Tooltip } from '@candela/d3chart';

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

export class BurnupPlot extends Tooltip(Crosshairs(AxisChart(D3Chart(VisComponent)))) {
  constructor (el, options) {
    super(el);

    this.averageStart = {};

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

    this.initTooltip({
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
    const margin = this.margin();

    const x = scaleTime().domain([this.info.start, this.info.end]);
    this.bottomScale(x);
    this.bottomLabel('Date');
    this.bottomAxis().tickFormat(timeFormat('%Y-%m-%d'));
    this.renderBottomAxis();

    const y = scaleLinear().domain([this.info.min, this.info.max]);
    this.leftScale(y);
    this.leftLabel('Hours');

    // Initialize crosshairs.
    this.initCrosshairs();
  }

  render () {
    // Capture the x and y scales.
    const x = this.bottomScale();
    const y = this.leftScale();

    const colormap = scaleOrdinal(schemeSet1);

    const plotBounds = this.marginBounds('plot');

    const populate = (series) => {
      const seriesColor = colormap(series);

      let me = this.plot.append('g')
        .classed('series', true);

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

      const avgStart = this.getAverageStart(series);
      const x1 = x(avgStart.x);
      const y1 = y(avgStart.y);

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
      .style('stroke-width', '1px')
      .style('opacity', 0.8);

    this.plot.selectAll('g.series')
      .data(this.series)
      .enter()
      .each(populate);

    let dataInterp = {};
    this.series.forEach(s => {
      dataInterp[s] = new LinearPoints(this.data.map(d => ({x: d[this.timeIndex], y: d[s]})), 'x', 'y');
    });

    const goalInterp = new StepPoints(goalPoints, 'x', 'y');

    this.plot.on('mousemove', () => {
      const mouse = this.mouseCoords();
      this.show();
      this.update(mouse.x, mouse.y);

      this.showTT();
      this.setTTPosition(event.pageX, event.pageY);
    });

    this.target.on('mousemove.tooltip', () => {
      const evt = window.event;

      const mouse = this.mouseCoords();
      const invertX = this.bottomScale().invert(mouse.x);
      const date = dateString(invertX);
      const hours = this.leftScale().invert(mouse.y);

      const seriesIntersections = this.series.map(s => ({color: colormap(s), value: dataInterp[s].evaluate(invertX)}));
      const goalIntersection = goalInterp.evaluate(invertX);

      const tt = this.tooltip();
      this.setTTPosition(window.event.pageX, window.event.pageY);
      tt.html(tooltipHtml({
          date,
          hours,
          seriesIntersections,
          goalIntersection
        }));
    });

    this.target.on('mouseout.tooltip', () => {
      this.tooltip()
        .style('opacity', 0.0);
    });

    const noteData = collectNotes(this.data, this.timeIndex);
    this.plot.append('g')
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
        this.show();
        this.update(x(d.x), y(d.y));

        this.showTT();
        this.setTTPosition(x(d.x) + plotBounds.x + 10, y(d.y) + plotBounds.y + 10);
        this.tooltip().text(d.note);

        event.stopPropagation();
      });
  }

  setTTPosition (x, y) {
    this.tooltip()
      .style('left', `${x + 10}px`)
      .style('top', `${y + 10}px`);
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
