function newDiv (id) {
  const div = document.createElement('div')
  div.setAttribute('id', id);

  document.body.appendChild(div);
  return div;
}

async function getData () {
  console.log('hi');
  const req = await fetch('diva.json');
  return req.json();
}

function process (data) {
  data.forEach(d => {
    d['Audit Burden'] = d['Audit Time (/estimate)'] / d['Annotation Time (/spend)'];
    d['Annotation Speed'] = d['Frames'] / d['Annotation Time (/spend)'];
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

function scatterPlot(id, data, x, y, color) {
  let vis = new candela.components.ScatterPlot(newDiv(id), {
    data,
    x,
    y,
    color,
    width: 960,
    height: 540
  });
  vis.render();
  return vis;
}

function barChart(id, data, x, y, color) {
  let vis = new candela.components.BarChart(newDiv(id), {
    data,
    x,
    y,
    color,
    width: 960,
    height: 540
  });
  vis.render();
  return vis;
}

(async function () {
  let data = await getData();

  scatterPlot('vis1', data, 'Frames', 'Annotation Time (/spend)', 'Annotator');
  scatterPlot('vis2', data, 'Annotation Time (/spend)', 'Audit Time (/estimate)', 'Annotator');

  process(data);

  scatterPlot('vis3', data, 'Annotation Time (/spend)', 'Audit Burden', 'Annotator');
  scatterPlot('vis4', data, 'Frames', 'Annotation Speed', 'Annotator');

  const der = derived(data);
  console.log(der);

  barChart('vis5', der, 'Annotator', 'Average Annotation Time', 'Annotator');
  barChart('vis6', der, 'Annotator', 'Average Annotation Speed', 'Annotator');
}());
