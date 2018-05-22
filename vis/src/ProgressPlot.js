import { VisComponent } from '@candela/core';
import { select } from 'd3-selection';
import { arc } from 'd3-shape';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

function computeArcData (progress) {
  const tau = 2 * Math.PI;

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

export class ProgressPlot extends VisComponent {
  constructor (el, options) {
    super(el);

    this.data = options.data;
    this.size = options.size;

    this.donutWidth = this.size / 8;
    this.outerRadius = this.size / 2 - 5;
    this.innerRadius = this.outerRadius - this.donutWidth;

    this.svg = select(this.el)
      .append('svg')
      .attr('xmlns', 'http://www.w3.org/2000/svg')
      .attr('width', this.size)
      .attr('height', this.size);
  }

  render () {
    const arcData = computeArcData(this.data.progress);

    let arcs = [];
    for (let i = 0; i < arcData.length - 1; i++) {
      console.log(this.innerRadius, this.outerRadius, arcData[i], arcData[i + 1]);
      arcs.push(arc()
        .innerRadius(this.innerRadius)
        .outerRadius(this.outerRadius)
        .startAngle(arcData[i])
        .endAngle(arcData[i + 1]));
    }

    const colormap = scaleOrdinal(schemeCategory10);

    this.svg.append('g')
      .attr('transform', `translate(${this.size / 2} ${this.size / 2})`)
      .selectAll('path.progress')
      .data(arcs.map(d => d()))
      .enter()
      .append('path')
      .classed('progress', true)
      .attr('d', d => d)
      .attr('fill', (d, i) => colormap(i));
  }
}
