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
let pi: num <- 3.14159;
let name: char <- "TypR";
let is_valid: bool <- true;

# display the variable
a
`,
  },
  {
    name: 'Functions',
    description: 'Defining and using typed functions',
    code: `# Function with type annotations
let add <- fn(a: int, b: int): int {
  a + b
};

# Using the functions
add(5, 3)`
  },
  {
    name: 'Vectors',
    description: 'Working with typed vectors',
    code: `# Creating typed vectors
let numbers <- c(1, 2, 3, 4, 5);

numbers`
  },
  {
    name: 'Data Analysis',
    description: 'Simple data analysis example',
    code: `# Simple data analysis
let scores <- c(85, 92, 78, 95, 88, 76, 91, 84);

let avg_score <- mean(scores);

avg_score`
  },
];

export function getExample(name: string): Example | undefined {
  return examples.find(e => e.name === name);
}

export const defaultCode = examples[0].code;
