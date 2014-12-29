var util = {
  wrapErrors: function(fn) {
    return function() {
      try {
        return fn.apply(this, arguments);
      } catch (err) {
        console.log(err.stack);
        console.error(err.message);
      }
    }
  }
}