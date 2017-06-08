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
	return this.value;
    }
}

function* person(p) {
    console.log("person -- chelsea");
    for (let a of unify(p, "Chelsea")) {
	yield false;
    }
    console.log("person -- hillary");
    for (let a of unify(p, "Hillary")) {
	yield false;
    }
    console.log("person -- bill");
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
    if (value1 instanceof Variable) {
	for (let c of value1.unify(value2)) {
	    yield false;
	}
    } else if (value2 instanceof Variable) {
	for (let c of value2.unify(value1)) {
	    yield false;
	}	
    } else if (value1 == value2) {
	// Both literal types.
	yield false;
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

console.log("hello world");

// let p = new Variable();

// console.log(p.unify("Foo").next());
// console.log(p.getValue());

// console.log(p.unify("Foo").next());
// console.log(p.getValue());

// for (let a of person(p)) {
//    console.log(p.getValue());
// }

let Parent = new Variable();
for (let c of brother("Bill", Parent)) {
    // console.log("hilary's brother is: " + Parent.getValue());
}

// return;

let Person = new Variable();
let Uncle = new Variable();

for (let u of uncle(Person, Uncle)) {
    console.log(Person.getValue() + "'s uncle is " + Uncle.getValue());
}

console.log("done");

