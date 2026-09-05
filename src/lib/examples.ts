// Example TypR programs

export interface Example {
  name: string;
  description: string;
  code: string;
}

export const examples: Example[] = [
  {
    name: 'Hello World',
    description: 'A simple hello world program',
    code: `# Hello World in TypR
let message: char <- "Hello, TypR!";

message`,
  },
  {
    name: 'Basic Types',
    description: 'Working with numbers and strings',
    code: `# Basic type annotations
let x: int <- 42;
print(x);

let pi: num <- 3.14159;
print(pi);

let name: char <- "TypR";
print(name);

let is_valid: bool <- true;
print(is_valid);
`,
  },
  {
    name: 'Advanced Types',
    description: 'Working with numbers and strings',
    code: `# Lists combine existing types in a collection
type List <- list {
	a: int,
	b: bool
};

# Has a default constructor
let list0 <- list(a = 3, b = false);

# Vectors combines existing types as a sequence
type Vector <- Vector[3, int];

# Has a default constructor
let vector <- c(1, 2, 3);

# Array as an extension of vector
type Array <- [4, bool];

# Has a default constructor
let array <- [true, false, false, true];

# Function are the back bones of any language
type Function <- (int) -> bool;

# Has a default constructor
let function0 <- fn(a: int): bool {
	true
};

# Interfaces target types who has a set of related function
type Interface <- interface {
	f: (int) -> int,
	b: (bool) -> bool
};

# Interface have no default constructor

# [Coming soon] Union types to say if we have either a value or another
type Union <- int | bool;

# Union don't have any constructor
print("advanced types");
`,
  },
  {
    name: 'Signatures',
    description: 'Using existing R functions',
    code: `# Working with untyped functions

# By default, most base R functions are untyped

toupper("Hi"); # take Any return Empty

# toupper(7); will return an error at runtime

# Signature types existing variables/functions
@toupper: (char) -> char;

toupper("Hi"); # now take char return char

# toupper(7); will return an error at compile time
`
  },
  {
    name: 'Functions',
    description: 'Defining and using typed functions',
    code: `# Function with type annotations
let add <- fn(a: int, b: int): int {
  a + b
};

# Using the functions normally
print(add(5, 3));

# Using the functions with pipes
(5) |> add(3)
	|> print();

# Using the functions with method calling
(5).add(3)
   .print();
`
  },
  {
    name: 'Vectors and Arrays',
    description: 'Working with typed vectors',
    code: `# Creating typed vectors and arrays
let v1 <- c(1, 2, 3, 4, 5);
print(2*v1+3);

let a1 <- [1, 2, 3, 4, 5];
print(2*a1+3);
`
  },
  {
    name: 'Tags and Unions',
    description: 'Working with typed vectors',
    code: `# Unions can put together a set of types

# One can emulate the Option (like a Maybe)
type Option<T> <- .Some(T) | .None;

let val: Option<bool> <- .None;

let res = match val {
	.Some(a) => a,
	_ => false
};

res
`
  },
  {
    name: 'Lists',
    description: 'Working with lists',
    code: `# A list can be a subtype of another list
# thus inheriting its related functions

# Creating list 
let list1 <- list(name = "Anna", age = 45);

# Second notation (object like)
let list2 <- :{name: "Anna", age: 45};

# Function inheritance
let is_minor <- fn(p: {age: int}): bool {
	p$age < 18
};

# Apply to list (as a subtype)
list2.is_minor().print()
`
  },
  {
    name: 'Interfaces',
    description: 'Working with interfaces',
    code: `# one can create interface
# signature
@paste: (Any, Any) -> char;

# interface definition
type Viewable <- interface {
	view: (Self) -> char
};

# create a function for all viewable types
let double <- fn(a: Viewable): char {
	paste(view(a), view(a))
};

# include bool to Viewable with the view function
let view <- fn(a: bool): char {
	"bool"
};

# boolean inherit double
true.double()
`
  },
  {
    name: 'Aliases',
    description: 'Working with Custom types with aliases',
    code: `# You can target an existing type (lists, vector, function)
# With an alias, it help reducing the size of a greater type

# Type definition by alias
type Person = list {
	name: char,
	age: int
};

new_person <- fn(name: char, age: int): Person {
	list(name = name, age = age)
};

is_minor <- fn(p: Person): bool {
	p$age < 18
};

alice <- new_person("Alice", 35);

alice.is_minor()`
  },
  {
    name: 'Advanced example',
    description: 'Working with Advanced types',
    code: `# An example of what one can do with TypR's type system

# Type definition
type Point <- {
	x: int,
	y: int
};

# Constructor for the Point type
let new_point <- fn(x: int, y: int): Point {
	list(x = x, y = y)
};

# print function
let print <- fn(p: Point): Empty {
  cat("Point<", p$x, ",", p$y, ">", sep="");
  invisible(p);
};


let point1 <- new_point(9, 2);
print(point1);

# scaling function
let scale <- fn(p: Point, n: int): Point {
	new_point(p$x * n, p$y * n)
};

# multiplication operator for points
let \`*\` <- fn(p: Point, n: int): Point {
	scale(p, n)
};

# creating a vector of points in TypR
let points <- [new_point(1, 2), new_point(3, 4), new_point(5, 6)];

points`
  },
];

export function getExample(name: string): Example | undefined {
  return examples.find(e => e.name === name);
}

export const defaultCode = examples[0].code;
