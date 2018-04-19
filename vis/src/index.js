function wait () {
  return Promise.resolve(47);
}

(async function () {
  const value = await wait();
  console.log(value);
}());
