class Variable {
    constructor(opt_value) {
	this.value = opt_value;
	this.bound = false;
    }

    *unify(value) {
	if (!this.bound) {
	    this.value = value;
	    this.bound = true;
	    yield false;
	    this.bound = false;
	} else if (this.value == value) {
	    yield false;
	}
    }

    isBound() {
	return this.bound;
    }

    setValue(value) {
	this.value = value;
    }

    getValue() {
      if (!this.bound) {
	return this;
      } else if  (this.value instanceof Variable) {
	return this.value.getValue();
      }
      return this.value;
    }
}

function when(expression, then) {
  for (let a of expression) {
    then();
  }
}

function* person(p) {
    for (let a of unify(p, "Chelsea")) {
	yield false;
    }
    for (let a of unify(p, "Hillary")) {
	yield false;
    }
    for (let a of unify(p, "Bill")) {
	yield false;
    }
}

function* brother(Person, Brother) {
    for (let a of unify(Person, "Hillary")) {
        for (let c of unify(Brother, "Tony")) {
            // console.log(Person);
	    yield false;
	}
	for (let c of unify(Brother, "Hugh")) {
	    yield false;
	}
    }
    for (let a of unify(Person, "Bill")) {
	for (let c of unify(Brother, "Roger")) {
	    yield false;
	}
    }
}

class Prolog {
  constructor() {
    this.facts = {};
  }

  fact(name, ...params) {
    params.unshift(name);
    let path = this.facts;
    for (let param of params) {
      path[param] = path[param] || {};
      path = path[param];
    }
    return this;
  }

  *eval(name, ...params) {
    console.log(`Evaling ${name} and ${JSON.stringify(params)} with facts: ${JSON.stringify(this.facts)}`);
    params.unshift(name);
    let roots = [];

    for (let fact in this.facts) {
      roots.push({root: this.facts[fact], depth: 0, name: fact});
    }

    // console.log(params.length);

    while (roots.length > 0) {
      // console.log(roots);
      let root = roots.shift();
      console.log(`State1 ${JSON.stringify(params)}`);
      for (let a of unify(root.name, params[root.depth])) {
	console.log(`Unified ${root.name} to ${JSON.stringify(params[root.depth])} at level ${root.depth}`);
	console.log(`State2 ${JSON.stringify(params)}`);
	if ((root.depth + 1) == params.length) {
	  console.log(`Yielding ${JSON.stringify(params)}`);
	  yield false;
	} else {
	  for (let key in root.root) {
	    console.log(`Adding ${JSON.stringify(key)} to the list`);
	    // console.log(roots);
	    roots.unshift({root: root.root[key], name: key, depth: root.depth + 1});
	  }
	}
      }
      console.log(`State3 ${JSON.stringify(params)}`);
    }
  }
}

let prolog = new Prolog();

prolog.fact("brother", "Hillary", "Tony");

var r = new Variable();
when(prolog.eval("brother", r, "Tony"), () => console.log(`${r.getValue()} is Tony's brother`));
console.log(r);

return;

prolog.fact("person", "Hillary");
prolog.fact("person", "Bill");
prolog.fact("person", "Chelsea");

when(prolog.eval("person", "Hillary"), () => console.log(`Hillary is a person`));

var p = new Variable();
when(prolog.eval("person", p), () => console.log(`${p.getValue()} is a person`));

when(prolog.eval("brother", "Hillary", "Tony"), () => console.log(`Hillary and Tony are brothers!`));

var p = new Variable();
when(prolog.eval("brother", "Hillary", p), () => console.log(`${p.getValue()} is Hillary's brother`));


// prolog.fact("brother", "Hillary", "Tony");

// prolog.eval("person", "Hillary").next();

return;

var q = new Variable();
when(brother(q, "Tony"), () => console.log(`${q.getValue()} is Tony's brother`));



return;

// return;


// Equivalent to stating:
// person("Hillary")
// person("Bill")
// person("Chelsea")
prolog.fact("person", "Bill");
when(prolog.eval("person", "Hillary"), () => console.log(`Hillary is a person`));

// console.log(p.getValue().getValue());

prolog
    .fact("person", "Hillary")
    .fact("person", "Bill")
    .fact("person", "Chelsea")
    .fact("brother", "Hillary", "Tony")
    .fact("brother", "Hillary", "Hugh");




return;

when(person("Hillary"), () => console.log("Hillary is a person"));
when(person("Sam"), () => console.log("Sam is a person"));

return;

function get(value) {
    if (!(value instanceof Variable)) {
	return value;
    }

    if (!value.isBound()) {
	return value;
    }

    return value.getValue();
}

function* unify(var1, var2) {
    let value1 = get(var1);
    let value2 = get(var2);

    if (value1 == value2) {
	// Both literal types.
	yield false;
    } else if (value1.unify) {
	for (let c of value1.unify(value2)) {
	    yield false;
	}
    } else if (value2.unify) {
	for (let c of value2.unify(value1)) {
	    yield false;
	}
    }
}

function* parent(Person, Parent) {
    for (let a of unify(Person, "Chelsea")) {
	for (let c of unify(Parent, "Hillary")) {
	    yield false;
	}
    }
    for (let a of unify(Person, "Chelsea")) {
	for (let c of unify(Parent, "Bill")) {
	    yield false;
	}
    }
}

function* uncle(Person, Uncle) {
    let Parent = new Variable();
    for (let p of parent(Person, Parent)) {
	for (let u of brother(Parent, Uncle)) {
	    yield false;
	}
    }
}

function* square(Width, Height) {
    for (let a of unify(Width, Height)) {
	yield false;
    }
}

class List {
  constructor(head, tail) {
    this.head = head;
    this.tail = tail;
  }

  *unify(var1) {
    let value1 = get(var1);
    if (value1 instanceof List) {
      for (let a of unify(this.head, value1.head)) {
	for (let b of unify(this.tail, value1.tail)) {
	  yield false;
	}
      }
    } else if (value1 instanceof Variable) {
      for (let a of var1.unify(this)) {
	yield false;
      }
    }
  }

  static *create(First, Second, Var) {
    let result = new List(First, new List(Second, null));
    for (let c of unify(Var, result)) {
      yield false;
    }
  }
}


let second = new Variable();
when(List.create("a", second, new List("a", new List("b", null))),
     () => console.log(`Second element is ${second.getValue()}`));

let Height = new Variable();
for (let s of square(10, Height)) {
  console.log(`The height of a width=10 square is ${Height.getValue()}`);
}


let list = new Variable();
when(List.create("a", "b", list),
     () => console.log(list.getValue()));


let Parent = new Variable();

let Person = new Variable();
let Uncle = new Variable();

when(uncle(Person, Uncle),
     () => console.log(`${Person.getValue()}'s uncle is ${Uncle.getValue()}`));
