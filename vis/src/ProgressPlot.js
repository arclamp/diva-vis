import { VisComponent } from '@candela/core';
import { select } from 'd3-selection';
import { transition } from 'd3-transition';
import { arc } from 'd3-shape';
import { scaleOrdinal,
         scaleLinear } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import rough from 'roughjs';

const tau = 2 * Math.PI;

function rad2deg (r) {
  return r / tau * 360;
}

function computeArcData (progress) {
  // Compute the sum of all the progress categories.
  const sum = progress.reduce((a, c) => a + c, 0);

  // Compute a subtending angle for each progress value.
  const subtends = progress.map(x => x * tau / sum);

  // Compute start angles for each progress segment.
  let angles = [0];
  subtends.forEach(d => {
    angles.push(angles[angles.length - 1] + d);
  });

  return angles;
}

function pairUp (values) {
  let pairs = [];
  for (let i = 0; i < values.length - 1; i++) {
    pairs.push([values[i], values[i + 1]]);
  }
  return pairs;
}

export class ProgressPlot extends VisComponent {
  constructor (el, options) {
    super(el);

    this.data = options.data;
    this.size = options.size;
    this.speedRange = options.speedRange || [0, 1];

    this.donutWidth = this.size / 8;
    this.outerRadius = this.size / 2 - 5;
    this.innerRadius = this.outerRadius - this.donutWidth;

    this.svg = select(this.el)
      .append('svg')
      .attr('xmlns', 'http://www.w3.org/2000/svg')
      .attr('width', this.size)
      .attr('height', this.size);

    this.rough = rough.svg(this.svg.node());
  }

  render () {
    const arcData = computeArcData(this.data.progress);
    const arcfunc = arc()
      .innerRadius(this.innerRadius)
      .outerRadius(this.outerRadius);

    const colormap = scaleOrdinal(schemeCategory10);

    const arcs = this.svg.append('g')
      .attr('transform', `translate(${this.size / 2} ${this.size / 2})`);

    const strokes = arcs.selectAll('path.progress')
      .data(pairUp(arcData))
      .enter()
      .append('path')
      .classed('progress', true)
      .attr('d', d => {
        let arc = arcfunc({
          startAngle: d[0],
          endAngle: d[0]
        });
        // console.log(this.rough.path(arc, {'fill': 'green'}));
        return select(this.rough.path(arc))
          .select('path')
          .attr('d');
      })
      .attr('stroke', (d, i) => colormap(i))
      .attr('fill', 'none')
      .on('mouseover', (d, i) => {
        console.log(this.data.progress[i]);
      });

    const fills = arcs.selectAll('path.fill')
      .data(pairUp(arcData))
      .enter()
      .append('path')
      .classed('fill', true)
      .attr('d', (d, i) => {
        let arc = arcfunc({
          startAngle: d[0],
          endAngle: d[1]
        });
        console.log(this.rough.path(arc, {'fill': colormap(i)}));
        return select(this.rough.path(arc, {'fill': colormap(i)}))
          .select('path:nth-child(2)')
          .attr('d');
      })
      .attr('stroke', (d, i) => colormap(i))
      .attr('fill', 'none');

    strokes.transition()
      .delay((d, i) => i * 100)
      .duration(3000)
      .attrTween('d', d => t => {
        let arc = arcfunc({
          startAngle: d[0],
          endAngle: d[0] + t * (d[1] - d[0])
        });
        return select(this.rough.path(arc, {roughness: 0.5}))
          .select('path')
          .attr('d');
      });

    // fills.transition()
      // .delay((d, i) => i * 100)
      // .duration(3000)
      // .attrTween('d', (d, i) => t => {
        // let arc = arcfunc({
          // startAngle: d[0],
          // endAngle: d[0] + t * (d[1] - d[0])
        // });
        // return select(this.rough.path(arc, {'fill': colormap(i), roughness: 0.5}))
          // .select('path:nth-child(1)')
          // .attr('d');
      // });

    const dial = this.svg.append('g')
      .attr('transform', `translate(${this.size / 2} ${this.size / 2})`);

    const dialOuterRadius = this.innerRadius - (5 / 250) * this.size;
    const dialInnerRadius = this.innerRadius - (7 / 250) * this.size;

    const scale = arc()
      .innerRadius(dialInnerRadius)
      .outerRadius(dialOuterRadius)
      .startAngle(-tau / 3)
      .endAngle(tau / 3);

    dial.append('path')
      .attr('d', scale())
      .attr('fill', 'black')
      .attr('stroke', 'black');

    const tickScale = scaleLinear()
      .domain(this.speedRange)
      .range([-tau / 3, tau / 3]);

    const tickStops = [...Array(11).keys()].map(d => d / 10 * (this.speedRange[1] - this.speedRange[0]) + this.speedRange[0]);

    const tickInnerRadius = this.innerRadius - (12 / 250) * this.size;
    dial.append('g')
      .classed('ticks', true)
      .selectAll('line.tick')
      .data(tickStops)
      .enter()
      .append('line')
      .classed('tick', true)
      .attr('x1', 0)
      .attr('y1', -dialOuterRadius)
      .attr('x2', 0)
      .attr('y2', -tickInnerRadius)
      .attr('transform', d => `rotate(${rad2deg(tickScale(d))})`)
      .attr('stroke', 'black')
      .attr('stroke-width', '2px');

    let needle = dial.append('g')
      .classed('needle', true)
      .on('mouseover', () => {
        console.log(this.data.speed);
      });

    needle.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', (4 / 250) * this.size)
      .style('stroke', 'black')
      .style('fill', 'black');

    const needleRadius = this.innerRadius - (20 / 250) * this.size;
    const indicator = needle.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', -needleRadius)
      .attr('stroke', 'black')
      .attr('transform', `rotate(${rad2deg(tickScale(0))})`);

    indicator.transition()
      .delay(200)
      .duration(750)
      .attr('transform', `rotate(${rad2deg(tickScale(this.data.speed))})`);
  }
}
