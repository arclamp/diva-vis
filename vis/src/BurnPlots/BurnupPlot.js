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

function taskCounts(data, series) {
  let counts = {};
  series.forEach(s => {
    const countField = `${s}_count`;
    let curCount = data[0][s];

    counts[s] = [];

    data.forEach(d => {
      if (d[countField]) {
        curCount = d[countField];
      }

      counts[s].push(curCount);
    });
  });

  return counts;
}

function computeGoalPoints(data, series, timeIndex, finishDate) {
  let points = [];
  let last = data[0];

  const countField = `${series}_count`;

  data.forEach(c => {
    points.push({
      x: c[timeIndex],
      y: last[countField]
    });

    if (last && last[countField] !== c[countField]) {
      points.push({
        x: c[timeIndex],
        y: c[countField]
      });
    }

    last = c;
  });

  points.push({
    x: finishDate,
    y: points[points.length - 1].y
  });

  return points;
}

function invert(data, series, counts) {
  return data.map((d, i) => {
    series.forEach(s => {
      d[s] = counts[s][counts[s].length - 1] - d[s];
      d[`${s}_count`] = counts[s][i];
    });

    return d;
  });
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
    this.taskCounts = taskCounts(options.data, options.series);
    this.data = invert(options.data, options.series, this.taskCounts);
    this.timeIndex = options.timeIndex;
    this.series = Array.isArray(options.series) ? options.series : [options.series];
    this.finishDate = options.finishDate;

    this.info = computeInfo(this.data, this.series, this.timeIndex, this.finishDate, this.taskCounts);

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

      const y0 = y(this.taskCounts[series][this.taskCounts[series].length - 1]);
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

      const goalPoints = computeGoalPoints(this.data, series, this.timeIndex, this.finishDate);

      const goalline = me.append('g')
        .classed('goal', true)
        .selectAll('line')
        .data(pairUp(goalPoints))
        .enter()
        .append('line')
        .attr('x1', d => x(d[0].x))
        .attr('y1', d => y(d[0].y))
        .attr('x2', d => x(d[1].x))
        .attr('y2', d => y(d[1].y))
        .style('stroke', seriesColor)
        .style('opacity', 0.5);
    };

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

export class BurnupPlotOld extends VisComponent {
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

    this.taskCounts = taskCounts(options.data, options.series);
    this.data = invert(options.data, options.series, this.taskCounts);
    this.timeIndex = options.timeIndex;
    this.series = Array.isArray(options.series) ? options.series : [options.series];
    this.finishDate = options.finishDate;

    this.info = computeInfo(this.data, this.series, this.timeIndex, this.finishDate, this.taskCounts);

    this.svg = select(this.el)
      .append('svg')
      .attr('xmlns', 'http://www.w3.org/2000/svg')
      .attr('width', this.visWidth)
      .attr('height', this.visHeight);

    this.tooltipOptions = {
      width: 80,
      height: 30
    };

    this.tooltip = select(this.el)
      .append('div')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('text-align', 'center')
      .style('width', `${this.tooltipOptions.width}px`)
      .style('height', `${this.tooltipOptions.height}px`)
      .style('padding', '2px')
      .style('font', '12px sans-serif')
      .style('background', 'lightgreen')
      .style('border', '0px')
      .style('border-radius', '8px')
      .style('pointer-events', 'none');
  }

  render () {
    const x = scaleTime()
      .domain([this.info.start, this.info.end])
      .range([0, this.width]);

    const y = scaleLinear()
      .domain([this.info.min, this.info.max])
      .range([this.height, 0]);

    const g = this.svg.append('g')
      .classed('vis', true)
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

    const dr = g.append('g')
      .classed('data-rectangle', true)
      .style('pointer-events', 'all');

    let crosshair = dr.append('g')
      .classed('crosshair', true);
    crosshair.append('line')
      .classed('crosshair-x', true)
      .style('opacity', 0)
      .style('stroke', 'lightgray')
      .attr('x1', x.range()[0])
      .attr('x2', x.range()[1]);
    crosshair.append('line')
      .classed('crosshair-y', true)
      .style('opacity', 0)
      .style('stroke', 'lightgray')
      .attr('y1', y.range()[0])
      .attr('y2', y.range()[1]);

    const colormap = scaleOrdinal(schemeSet1);

    const populate = (series) => {
      const seriesColor = colormap(series);

      let me = dr.append('g')
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

      const lastX1 = x(this.data[this.data.length - 1][this.timeIndex]);
      const lastY1 = y(this.data[this.data.length - 1][series]);
      const projection = me.append('line')
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
        .attr('y2', y(this.taskCounts[series][this.taskCounts[series].length - 1]))
        .style('opacity', 1);

      const goalPoints = computeGoalPoints(this.data, series, this.timeIndex, this.finishDate);

      const average = me.append('g')
        .classed('goal', true)
        .selectAll('line')
        .data(pairUp(goalPoints))
        .enter()
        .append('line')
        .attr('x1', d => x(d[0].x))
        .attr('y1', d => y(d[0].y))
        .attr('x2', d => x(d[1].x))
        .attr('y2', d => y(d[1].y))
        .style('stroke', seriesColor)
        .style('opacity', 0.5);
    };

    dr.selectAll('g.series')
      .data(this.series)
      .enter()
      .each(populate);

    dr.append('rect')
      .classed('target', true)
      .attr('width', this.width)
      .attr('height', this.height)
      .style('opacity', 0.0)
      .on('mousemove', () => {
        const bbox = event.srcElement.getBoundingClientRect();
        const mouseX = event.clientX - bbox.left;
        const mouseY = event.clientY - bbox.top;

        crosshair.select('.crosshair-x')
          .style('opacity', 1)
          .attr('y1', mouseY)
          .attr('y2', mouseY);

        crosshair.select('.crosshair-y')
          .style('opacity', 1)
          .attr('x1', mouseX)
          .attr('x2', mouseX);

        const date = dateString(x.invert(mouseX));
        const numTasks = Math.floor(y.invert(mouseY));

        this.tooltip
          .style('left', `${event.pageX + 5}px`)
          .style('top', `${event.pageY - this.tooltipOptions.height - 9}px`)
          .html(tooltipHtml({
            date,
            numTasks
          }));

        this.tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
      })
      .on('mouseout', () => {
        crosshair.selectAll('line')
          .style('opacity', 0);

        this.tooltip.transition()
          .duration(200)
          .style('opacity', 0.0);
      });

  }
}
