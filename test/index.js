var locksmith = require('../index')({
  timeout: 2
});

locksmith('asdf', function(err, release) {
  if (err) return console.error(err);

  console.log('first');
  setTimeout(release, 15000);
});
locksmith('asdf', function(err, release) {
  if (err) return console.error(err);

  console.log('second');
  release();
});
locksmith('notblocked', function(err, release) {
  console.log('notblocked');
  release();
});
locksmith('asdf', function(err, release) {
  console.log('third');
  release();
});
