const hugeLevelDB = [
  // Easy (1-3)
  { "left": "sin(x)^2 + cos(x)^2", "right": "1", "diff": 1 },
  { "left": "tan(x)", "right": "sin(x) / cos(x)", "diff": 1 },
  { "left": "cot(x)", "right": "1 / tan(x)", "diff": 1 },
  { "left": "1 - sin(x)^2", "right": "cos(x)^2", "diff": 1 },
  { "left": "cos(x) * tan(x)", "right": "sin(x)", "diff": 2 },
  { "left": "sin(x) * sec(x)", "right": "tan(x)", "diff": 2 },
  { "left": "sec(x)^2 - 1", "right": "tan(x)^2", "diff": 2 },
  { "left": "csc(x)^2 - cot(x)^2", "right": "1", "diff": 2 },
  { "left": "cos(x)^2 - sin(x)^2", "right": "cos(2*x)", "diff": 3 },
  { "left": "sin(2*x) / (2 * sin(x))", "right": "cos(x)", "diff": 3 },
  { "left": "sin(x) / csc(x) + cos(x) / sec(x)", "right": "1", "diff": 3 },

  // Medium (4-6)
  { "left": "tan(x) + cot(x)", "right": "sec(x) * csc(x)", "diff": 4 },
  { "left": "(1 - sin(x)) * (1 + sin(x))", "right": "cos(x)^2", "diff": 4 },
  { "left": "1 / (1 - sin(x)) + 1 / (1 + sin(x))", "right": "2 * sec(x)^2", "diff": 5 },
  { "left": "(sin(x) + cos(x))^2", "right": "1 + sin(2*x)", "diff": 5 },
  { "left": "cos(x)^4 - sin(x)^4", "right": "cos(2*x)", "diff": 5 },
  { "left": "sec(x) + tan(x)", "right": "cos(x) / (1 - sin(x))", "diff": 6 },
  { "left": "sin(x)^3 + sin(x) * cos(x)^2", "right": "sin(x)", "diff": 6 },

  // Hard (7-10)
  { "left": "tan(x)^2 - sin(x)^2", "right": "tan(x)^2 * sin(x)^2", "diff": 7 },
  { "left": "(1 + tan(x)^2) * cos(x)^2", "right": "1", "diff": 7 },
  { "left": "(sec(x) - cos(x)) * csc(x)", "right": "tan(x)", "diff": 8 },
  { "left": "cos(x)^6 + sin(x)^6 + 3 * sin(x)^2 * cos(x)^2", "right": "1", "diff": 8 },
  { "left": "2 / (1 + cos(2*x))", "right": "sec(x)^2", "diff": 8 },
  { "left": "(sin(x) + csc(x))^2 + (cos(x) + sec(x))^2", "right": "tan(x)^2 + cot(x)^2 + 7", "diff": 9 },
  { "left": "sin(3*x)", "right": "3*sin(x) - 4*sin(x)^3", "diff": 10 },
  { "left": "cos(3*x)", "right": "4*cos(x)^3 - 3*cos(x)", "diff": 10 },
  { "left": "tan(3*x)", "right": "(3*tan(x) - tan(x)^3) / (1 - 3*tan(x)^2)", "diff": 10 },

  // Log and Fractions Special Identities
  { "left": "log(sin(x)) + log(csc(x))", "right": "0", "diff": 4 },
  { "left": "log(tan(x)) - log(sin(x))", "right": "log(sec(x))", "diff": 5 }
];
