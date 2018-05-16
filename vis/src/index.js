import { BarChart, ScatterPlot } from '@candela/vega';
import data from './diva.json';
import { BoxPlot } from './BoxPlot';

function newDiv (id) {
  const div = document.createElement('div')
  div.setAttribute('id', id);

  document.body.appendChild(div);
  return div;
}

function process (data) {
  data.forEach(d => {
    d['Audit Time (/estimate)'] /= 3600;
    d['Annotation Time (/spend)'] /= 3600;

    d['Audit Burden'] = d['Audit Time (/estimate)'] / d['Annotation Time (/spend)'];
    d['Annotation Speed'] = d['Frames'] / d['Annotation Time (/spend)'];
    d['Audit Speed'] = d['Frames'] / d['Audit Time (/estimate)'];
  });
}

function fieldSum (data, field) {
  return data.map(d => d[field]).reduce((a, cur) => a + cur, 0);
}

function derived (data) {
  let taters = {};
  data.forEach(d => {
    taters[d.Annotator] = taters[d.Annotator] || {data: [], derived: {}};
    taters[d.Annotator].data.push(d);
  });

  for (let tater in taters) {
    let dat = taters[tater].data;
    let der = taters[tater].derived;

    der['Average Annotation Time'] = dat.map(d => d['Annotation Time (/spend)']).reduce((a, cur) => a + cur, 0) / dat.length;
    der['Average Annotation Speed'] = fieldSum(dat, 'Frames') / fieldSum(dat, 'Annotation Time (/spend)')
  }

  let table = [];
  for (let tater in taters) {
    let record = {
      Annotator: tater
    };

    for (let field in taters[tater].derived) {
      record[field] = taters[tater].derived[field];
    }

    table.push(record);
  }

  return table;
}

let table = {};
let dlLink = document.createElement('a');

function register (id, vis) {
  table[id] = vis;
}

async function dump (id, filename) {
  const vis = table[id];
  const data = await vis.serialize('png');
  dlLink.setAttribute('download', `${filename}.png`);
  dlLink.setAttribute('href', data);
  dlLink.click();
}

function scatterPlot(id, data, x, y, color) {
  let vis = new ScatterPlot(newDiv(id), {
    data,
    x,
    y,
    color,
    width: 960,
    height: 540
  });
  vis.render();
  register(id, vis);
  return vis;
}

function barChart(id, data, x, y, color) {
  let vis = new BarChart(newDiv(id), {
    data,
    x,
    y,
    color,
    width: 960,
    height: 540
  });
  vis.render();
  register(id, vis);
  return vis;
}

function distributionPlot(id, origData, distField, color) {
  // Make a copy of the data and sort it by the chosen field.
  let data = origData.map(x => Object.assign({}, x));
  data.sort((a, b) => a[distField] - b[distField]);

  // Adjoin an index field now that the data is sorted.
  data = data.map((d, i) => Object.assign(d, {index: i}));

  // Now create a scatter plot based on this modified dataset.
  return scatterPlot(id, data, 'index', distField, color);
}

(async function () {
  console.log('data', data);
  process(data);

  let vis = new BoxPlot(document.body, {
    data,
    splitter: 'Annotator',
    field: 'Audit Time (/estimate)'
  });

  // scatterPlot('vis1', data, 'Frames', 'Annotation Time (/spend)', 'Annotator');
  // scatterPlot('vis2', data, 'Annotation Time (/spend)', 'Audit Time (/estimate)', 'Annotator');

  // scatterPlot('vis3', data, 'Annotation Time (/spend)', 'Audit Burden', 'Annotator');
  // scatterPlot('vis4', data, 'Frames', 'Annotation Speed', 'Annotator');

  // const der = derived(data);
  // console.log('derived', der);

  // barChart('vis5', der, 'Annotator', 'Average Annotation Time', 'Annotator');
  // barChart('vis6', der, 'Annotator', 'Average Annotation Speed', 'Annotator');

  // distributionPlot('vis7', data, 'Annotation Time (/spend)', 'Annotator');
  // distributionPlot('vis8', data, 'Audit Time (/estimate)', 'Auditor');
  // distributionPlot('vis9', data, 'Annotation Speed', 'Annotator');
  // distributionPlot('vis10', data, 'Audit Speed', 'Auditor');
}());
