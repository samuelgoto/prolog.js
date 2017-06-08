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

class Lexer {
  *parse(text) {
    var tokenRegexp = /[A-Za-z_]+|:\-|[()\.,]/g;
    var match;
    while ((match = tokenRegexp.exec(text)) !== null) {
      yield match[0];
    }
  }
}

class Parser {
  constructor(tokens) {
    this.current;
    this.done = false;
    this.scope;
    this.tokens = tokens;
  }
  next() {
    var next = this.tokens.next();
    this.current = next.value;
    this.done = next.done;
  }
  parseAtom() {
    var name = this.current;
    if (!/^[A-Za-z_]+$/.test(name)) {
      throw new SyntaxError('Bad atom name: ' + name);
    }
    this.next();
    return name;
  }
  parseTerm() {
    if (this.current === '(') {
      this.next(); // eat (
      var args = [];
      while (this.current !== ')') {
        args.push(this.parseTerm());
        if (this.current !== ',' && this.current !== ')') {
          throw new SyntaxError('Expected , or ) in term but got ' + this.current);
        }
        if (this.current === ',') {
          this.next(); // eat ,
        }
      }
      this.next(); // eat )
      return new Conjunction(args);
    }
    var functor = this.parseAtom();
    if (/^[A-Z_][A-Za-z_]*$/.test(functor)) {
      if (functor === '_') {
        return new Variable('_');
      }
      // variable X in the same scope should point to the same object
      var variable = this.scope[functor];
      if (!variable) {
        variable = this.scope[functor] = new Variable(functor);
      }
      return variable;
    }
    if (this.current !== '(') {
      return new Term(functor);
    }
    this.next(); // eat (
    var args = [];
    while (this.current !== ')') {
      args.push(parseTerm());
      if (this.current !== ',' && this.current !== ')') {
        throw new SyntaxError('Expected , or ) in term but got ' + this.current);
      }
      if (this.current === ',') {
        this.next(); // eat ,
      }
    }
    this.next(); // eat )
    return new Term(functor, args);
  }
  parseRule() {
    this.next(); // start the tokens iterator
    var head = this.parseTerm();
    if (this.current === '.') {
      this.next(); // eat .
      return new Rule(head, Term.TRUE);
    }
    if (this.current !== ':-') {
      throw new SyntaxError('Expected :- in rule but got ' + this.current);
    }
    this.next(); // eat :-
    var args = [];
    while (this.current !== '.') {
      args.push(parseTerm());
      if (this.current !== ',' && this.current !== '.') {
        throw new SyntaxError('Expected , or ) in term but got ' + this.current);
      }
      if (this.current === ',') {
        this.next(); // eat ,
      }
    }
    this.next(); // eat .
    var body;
    if (args.length === 1) {
      // body is a regular Term
      body = args[0];
    } else {
      // body is a conjunction of all terms
      body = new Conjunction(args);
    }
    return new Rule(head, body);
  }
  parse() {
    this.next();
    var rules = [];
    while (!this.done) {
      // each rule gets its own scope for variables
      this.scope = {};
      rules.push(this.parseRule());
    }
    return rules;
  }
  //parseTerm() {
  //  this.scope = { };
  //  return this.parseTerm();
  //}
}

var program = `
  mother(stephanie, thorne).
  mother(stephanie, kristen).
  mother(stephanie, felicia).
`;

var code = new Lexer().parse(program);
// for (let token of code) {
// console.log(token);
// }

// return;

var rules = new Parser(code).parse();

console.log(rules);

return;

var X = new Variable("X");
var Y = new Variable("Y");
var Z = new Variable("Z");

var db = new Database([
  // Facts.
  new Rule(Term.of("father", [Term.of("Hugh"), Term.of("Hillary")]), new True()),
  new Rule(Term.of("mother", [Term.of("Hillary"), Term.of("Chelsea")]), new True()),
  new Rule(Term.of("father", [Term.of("Bill"), Term.of("Chelsea")]), new True()),
  new Rule(Term.of("father", [Term.of("Bill"), Term.of("Bill's fake child")]), new True()),

  // Rules.
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
