class Variable {
  constructor(name) {
    this.name = name;
  }

  match(other) {
    var bindings = new Map();
    if (this !== other) {
        bindings.set(this, other);
    }
    return bindings;
  }

  substitute(bindings) {
    var value = bindings.get(this);
    if (value) {
      // if value is a compound term then substitute
      // variables inside it too
      return value.substitute(bindings);
    }
    return this;
  }
}

class Term {
  constructor(functor, args) {
    this.functor = functor;
    this.args = args || [];
  }
  static of(functor, args) {
    return new Term(functor, args);
  }
  match(other) {
    if (other instanceof Term) {
      if (this.functor !== other.functor) {
        return null;
      }
      if (this.args.length !== other.args.length) {
        return null;
      }
      return Term.zip([this.args, other.args]).map(function(args) {
        return args[0].match(args[1]);
      }).reduce(Term.mergeBindings, new Map());
    }
    return other.match(this);
  };

  static zip(arrays) {
    return arrays[0].map(function(element, index) {
      return arrays.map(function(array) {
	return array[index];
      });
    });
  }

  static mergeBindings(bindings1, bindings2) {
    if (!bindings1 || !bindings2) {
      return null;
    }
    var conflict = false;
    var bindings = new Map();
    bindings1.forEach(function(value, variable) {
      bindings.set(variable, value);
    });
    bindings2.forEach(function(value, variable) {
      var other = bindings.get(variable);
      if (other) {
        var sub = other.match(value);
        if (!sub) {
          conflict = true;
        } else {
          sub.forEach(function(value, variable) {
            bindings.set(variable, value);
          });
        }
      } else {
        bindings.set(variable, value);
      }
    });
    if (conflict) {
      return null;
    }
    return bindings;
  };

  substitute(bindings) {
    return new Term(this.functor, this.args.map(function(arg) {
      return arg.substitute(bindings);
    }));
  };

  *query(database) {
    yield* database.query(this);
  };
}

class True extends Term {
  constructor() {
    super("true");
  }
  substitute() {
    return this;
  };
  *query() {
    yield this;
  };
}


class Rule {
  constructor(head, body) {
    this.head = head;
    this.body = body;
  }
}

class Conjunction extends Term {
  constructor(args) {
    super(undefined, args);
  }

  *query(database) {
    var self = this;
    function* solutions(index, bindings) {
      var arg = self.args[index];
      if (!arg) {
        yield self.substitute(bindings);
      } else {
        for (var item of database.query(arg.substitute(bindings))) {
          var unified = Term.mergeBindings(arg.match(item), bindings);
          if (unified) {
            yield* solutions(index + 1, unified);
          }
        }
      }
    }
    yield* solutions(0, new Map());
  };

  substitute(bindings) {
    return new Conjunction(this.args.map(function(arg) {
      return arg.substitute(bindings);
    }));
  };
}

class Database {
  constructor(rules) {
    this.rules = rules;
  }
  *query(goal) {
    for (var i = 0, rule; rule = this.rules[i]; i++) {
      // console.log("hi");
      var match = rule.head.match(goal);
      if (match) {
        var head = rule.head.substitute(match);
        var body = rule.body.substitute(match);
        for (var item of body.query(this)) {
          yield head.substitute(body.match(item));
        }
      }
    }
  }
}

//var knownTerm = Term.of('father_child', [Term.of('eric'), Term.of('thorne')]);
//var goal = Term.of('father_child', [Term.of('eric'), Term.of('thorne')]);
//var bindings = goal.match(knownTerm);
//console.log(bindings);

// var goal = Term.of("person", [Term.of("Hillary")]);
// var bindings = goal.match(Term.of("person", [Term.of("Hillary")]));
// console.log(bindings);

var X = new Variable("X");
var Y = new Variable("Y");
var Z = new Variable("Z");

var db = new Database([
  new Rule(Term.of("father", [Term.of("Hugh"), Term.of("Hillary")]), new True()),

  new Rule(Term.of("mother", [Term.of("Hillary"), Term.of("Chelsea")]), new True()),
  new Rule(Term.of("father", [Term.of("Bill"), Term.of("Chelsea")]), new True()),

  new Rule(Term.of("father", [Term.of("Bill"), Term.of("Bill's fake child")]), new True()),
  // if x is a mother of y, x is a parent of y
  new Rule(Term.of("parent", [X, Y]), Term.of("mother", [X, Y])),
  // if x is a father of y, x is a parent of y
  new Rule(Term.of("parent", [X, Y]), Term.of("father", [X, Y])),
  // if z is a parent of x and z is a parent of y, x and y are siblings
  new Rule(Term.of("sibling", [X, Y]), new Conjunction([Term.of("parent", [Z, X], Term.of("parent", [Z, Y]))])),
  // if x is a parent of y, x is an ancestor of y
  new Rule(Term.of("ancestor", [X, Y]), Term.of("parent", [X, Y])),
  // if x is a parent of z and z is an ancestor of y, x is an ancestor of y
  new Rule(Term.of("ancestor", [X, Y]), new Conjunction([Term.of("parent", [X, Z], Term.of("ancestor", [Z, Y]))])),
]);

for (mother of db.query(Term.of("mother", [Term.of("Hillary"), new Variable("X")]))) {
  // console.log(mother);
}

for (parent of db.query(Term.of("parent", [new Variable("X"), Term.of("Chelsea")]))) {
  // console.log(parent);
}

for (sibling of db.query(Term.of("sibling", [new Variable("X"), Term.of("Chelsea")]))) {
  // console.log(sibling);
}

for (ancestor of db.query(Term.of("ancestor", [new Variable("X"), Term.of("Chelsea")]))) {
  console.log(ancestor);
}


return;

var knownTerm = Term.of('father_child', [Term.of('eric'), Term.of('thorne')]);
var x = new Variable('X');
var goal = Term.of('father_child', [Term.of('eric'), x]);
var bindings = goal.match(knownTerm);

console.log(bindings);

var value = goal.substitute(bindings);
console.log(`Goal with substituted variables: ${JSON.stringify(value)}`);

var goal = Term.of("father_child", [new Variable("Y"), Term.of("thorne")]);
var bindings = goal.match(knownTerm);
console.log(bindings);
console.log(`Thorne's dad is: ${JSON.stringify(goal.substitute(bindings))}`);
