class Variable {
    constructor(opt_value) {
	this.value = opt_value;
	this.bound = false;
    }

    *unify(value) {
	// yield "foo";
	// yield "bar";
	// console.log("Unifying " + value);
	if (!this.bound) {
	    // console.log("Not bound");
	    this.value = value;
	    this.bound = true;
	    yield false;
	    // console.log("already bound");
	    this.bound = false;
	} else if (this.value == value) {
	    // console.log("value equals");
	    yield false;
	}
	// console.log("done");
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

function* person(p) {
    // console.log("person -- chelsea");
    for (let a of unify(p, "Chelsea")) {
	yield false;
    }
    // console.log("person -- hillary");
    for (let a of unify(p, "Hillary")) {
	yield false;
    }
    // console.log("person -- bill");
    for (let a of unify(p, "Bill")) {
	yield false;
    }
}

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

  // console.log("unifying");
  // console.log(value1);
  // console.log(value2);

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

function* brother(Person, Brother) {
    // Hilary has Tony and Hugh as brothers.
    for (let a of unify(Person, "Hillary")) {
	for (let c of unify(Brother, "Tony")) {
	    yield false;
	}
	for (let c of unify(Brother, "Hugh")) {
	    yield false;
	}
    }
    // Bill has Roger as brother.
    for (let a of unify(Person, "Bill")) {
	for (let c of unify(Brother, "Roger")) {
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
    // console.log("hi");
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
    // console.log(result);
    for (let c of unify(Var, result)) {
      yield false;
    }
  }
}

function when(expression, then) {
  for (let a of expression) {
    then();
  }
}

let second = new Variable();
when(List.create("a", second, new List("a", new List("b", null))), () => console.log(`Second element is ${second.getValue()}`));

let Height = new Variable();
for (let s of square(10, Height)) {
  console.log(`The height of a width=10 square is ${Height.getValue()}`);
}


let list = new Variable();
when(List.create("a", "b", list), () => console.log(list.getValue()));


let Parent = new Variable();

let Person = new Variable();
let Uncle = new Variable();

when(uncle(Person, Uncle), () => console.log(`${Person.getValue()}'s uncle is ${Uncle.getValue()}`));
