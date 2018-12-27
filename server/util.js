function wrapErrors(fn) {
  return function() {
    //TODO(NODE) try {
      return fn.apply(this, arguments);
    // } catch (err) {
    //   console.log(err.stack);
    //   console.error(err.message);
    // }
  };
}

module.exports.wrapErrors = wrapErrors;
