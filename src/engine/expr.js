/**
 * Small expression engine for the bench calculators.
 *
 * The design is deliberately tiny: one AST, one evaluator, one substitute
 * routine. The UI renders output; it does not reimplement the formula logic.
 */

import { scan } from './units.js';

const PRECEDENCE = {
  '=': 1,
  '==': 2,
  '!=': 2,
  '<': 2,
  '<=': 2,
  '>': 2,
  '>=': 2,
  '+': 3,
  '-': 3,
  '*': 4,
  '/': 4,
  '^': 5,
};

function isNumberToken(token) {
  return token && token.type === 'number';
}

function tokenize(src) {
  const text = String(src ?? '').trim();
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === '(' || ch === ')' || ch === ',' || ch === '+') {
      tokens.push({ type: 'symbol', value: ch });
      i += 1;
      continue;
    }

    if (ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      tokens.push({ type: 'symbol', value: ch });
      i += 1;
      continue;
    }

    if (ch === '=' || ch === '<' || ch === '>') {
      const next = text[i + 1];
      if ((ch === '=' && next === '=') || (ch === '!' && next === '=') ||
          (ch === '<' && next === '=') || (ch === '>' && next === '=')) {
        tokens.push({ type: 'symbol', value: ch + next });
        i += 2;
        continue;
      }
      if (ch === '=') {
        tokens.push({ type: 'symbol', value: '=' });
        i += 1;
        continue;
      }
      tokens.push({ type: 'symbol', value: ch });
      i += 1;
      continue;
    }

    if (ch === '!') {
      if (text[i + 1] === '=') {
        tokens.push({ type: 'symbol', value: '!=' });
        i += 2;
        continue;
      }
      throw new Error(`Unexpected token '!' at index ${i}`);
    }

    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < text.length && /[0-9.]/.test(text[j])) j += 1;
      const exp = text.slice(j);
      const match = exp.match(/^([eE][+-]?\d+)?(?:[A-Za-zµμ°][A-Za-z0-9µμ°]*)?/);
      const slice = text.slice(i, i + (j - i) + (match[0].length));
      const value = scan(slice);
      if (value === null) {
        throw new Error(`Bad numeric literal: ${slice}`);
      }
      tokens.push({ type: 'number', value: value.value, raw: slice });
      i += slice.length;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < text.length && /[A-Za-z0-9_]/.test(text[j])) j += 1;
      tokens.push({ type: 'identifier', name: text.slice(i, j) });
      i = j;
      continue;
    }

    throw new Error(`Unexpected character '${ch}' at index ${i}`);
  }

  return tokens;
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.index = 0;
  }

  peek() {
    return this.tokens[this.index] ?? null;
  }

  match(...values) {
    const tok = this.peek();
    if (!tok) return false;
    if (values.includes(tok.type === 'symbol' ? tok.value : tok.type)) {
      this.index += 1;
      return true;
    }
    return false;
  }

  expect(value) {
    const tok = this.peek();
    if (!tok || (tok.type === 'symbol' ? tok.value : tok.type) !== value) {
      throw new Error(`Expected ${value}, got ${tok ? JSON.stringify(tok) : 'end of input'}`);
    }
    this.index += 1;
    return tok;
  }

  consumeNumber() {
    const tok = this.peek();
    if (!isNumberToken(tok)) {
      throw new Error(`Expected number, got ${tok ? JSON.stringify(tok) : 'end of input'}`);
    }
    this.index += 1;
    return { type: 'number', value: tok.value };
  }

  consumeIdentifier() {
    const tok = this.peek();
    if (!tok || tok.type !== 'identifier') {
      throw new Error(`Expected identifier, got ${tok ? JSON.stringify(tok) : 'end of input'}`);
    }
    this.index += 1;
    return tok.name;
  }

  parse() {
    const expr = this.parseAssignment();
    if (this.peek()) {
      throw new Error(`Unexpected token ${JSON.stringify(this.peek())}`);
    }
    return expr;
  }

  parseAssignment() {
    const left = this.parseComparison();
    if (this.match('=')) {
      return {
        type: 'assign',
        left,
        right: this.parseAssignment(),
      };
    }
    return left;
  }

  parseComparison() {
    let expr = this.parseAdditive();
    while (this.peek() && this.peek().type === 'symbol' && ['==', '!=', '<', '<=', '>', '>='].includes(this.peek().value)) {
      const op = this.peek().value;
      this.index += 1;
      const right = this.parseAdditive();
      expr = { type: 'binary', op, left: expr, right };
    }
    return expr;
  }

  parseAdditive() {
    let expr = this.parseMultiplicative();
    while (this.peek() && this.peek().type === 'symbol' && ['+', '-'].includes(this.peek().value)) {
      const op = this.peek().value;
      this.index += 1;
      const right = this.parseMultiplicative();
      expr = { type: 'binary', op, left: expr, right };
    }
    return expr;
  }

  parseMultiplicative() {
    let expr = this.parsePower();
    while (this.peek() && this.peek().type === 'symbol' && ['*', '/'].includes(this.peek().value)) {
      const op = this.peek().value;
      this.index += 1;
      const right = this.parsePower();
      expr = { type: 'binary', op, left: expr, right };
    }
    return expr;
  }

  parsePower() {
    let expr = this.parseUnary();
    if (this.peek() && this.peek().type === 'symbol' && this.peek().value === '^') {
      this.index += 1;
      const right = this.parsePower();
      expr = { type: 'binary', op: '^', left: expr, right };
    }
    return expr;
  }

  parseUnary() {
    if (this.peek() && this.peek().type === 'symbol' && ['+', '-'].includes(this.peek().value)) {
      const op = this.peek().value;
      this.index += 1;
      return { type: 'unary', op, arg: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const tok = this.peek();
    if (!tok) {
      throw new Error('Unexpected end of expression');
    }

    if (tok.type === 'number') {
      this.index += 1;
      return { type: 'number', value: tok.value };
    }

    if (tok.type === 'identifier') {
      const name = this.consumeIdentifier();
      if (this.match('(')) {
        const args = [];
        if (!this.match(')')) {
          while (true) {
            args.push(this.parseAssignment());
            if (this.match(',')) {
              continue;
            }
            this.expect(')');
            break;
          }
        }
        return { type: 'call', name, args };
      }
      return { type: 'identifier', name };
    }

    if (this.match('(')) {
      const expr = this.parseAssignment();
      this.expect(')');
      return expr;
    }

    throw new Error(`Unexpected token ${JSON.stringify(tok)}`);
  }
}

export function parse(src) {
  const parser = new Parser(tokenize(src));
  return parser.parse();
}

function applyUnary(op, value) {
  switch (op) {
    case '+': return +value;
    case '-': return -value;
    default: throw new Error(`Unsupported unary op: ${op}`);
  }
}

function applyBinary(op, left, right) {
  switch (op) {
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/': return left / right;
    case '^': return left ** right;
    case '==': return left === right;
    case '!=': return left !== right;
    case '<': return left < right;
    case '<=': return left <= right;
    case '>': return left > right;
    case '>=': return left >= right;
    case '=': return right;
    default: throw new Error(`Unsupported binary op: ${op}`);
  }
}

function applyFunction(name, args) {
  const n = args.length;
  switch (name) {
    case 'sqrt': return Math.sqrt(args[0]);
    case 'ln': return Math.log(args[0]);
    case 'log10': return Math.log10(args[0]);
    case 'exp': return Math.exp(args[0]);
    case 'abs': return Math.abs(args[0]);
    case 'min': return Math.min(...args);
    case 'max': return Math.max(...args);
    default: throw new Error(`Unknown function: ${name}`);
  }
}

export function evaluate(ast, scope = {}) {
  if (!ast) return NaN;

  switch (ast.type) {
    case 'number':
      return ast.value;

    case 'identifier': {
      if (Object.hasOwn(scope, ast.name)) return scope[ast.name];
      if (ast.name === 'pi') return Math.PI;
      if (ast.name === 'e') return Math.E;
      return NaN;
    }

    case 'unary':
      return applyUnary(ast.op, evaluate(ast.arg, scope));

    case 'binary': {
      const left = evaluate(ast.left, scope);
      if (ast.op === '=') {
        const right = evaluate(ast.right, scope);
        if (ast.left.type === 'identifier') {
          scope[ast.left.name] = right;
        }
        return right;
      }
      const right = evaluate(ast.right, scope);
      return applyBinary(ast.op, left, right);
    }

    case 'call':
      return applyFunction(ast.name, ast.args.map((arg) => evaluate(arg, scope)));

    case 'assign': {
      const right = evaluate(ast.right, scope);
      if (ast.left.type === 'identifier') {
        scope[ast.left.name] = right;
      }
      return right;
    }

    default:
      throw new Error(`Unknown AST node: ${ast.type}`);
  }
}

function collectIdentifiers(node, set) {
  if (!node) return set;

  switch (node.type) {
    case 'identifier':
      set.add(node.name);
      return set;

    case 'call':
      for (const arg of node.args) collectIdentifiers(arg, set);
      return set;

    case 'assign':
      collectIdentifiers(node.left, set);
      collectIdentifiers(node.right, set);
      return set;

    case 'unary':
      collectIdentifiers(node.arg, set);
      return set;

    case 'binary':
      collectIdentifiers(node.left, set);
      collectIdentifiers(node.right, set);
      return set;

    case 'number':
      return set;

    default:
      return set;
  }
}

export function identifiers(ast) {
  return collectIdentifiers(ast, new Set());
}

export function substitute(ast, scope = {}, fmt = String) {
  const format = (value) => (typeof fmt === 'function' ? fmt(value) : String(value));

  function walk(node) {
    if (!node) return '';

    switch (node.type) {
      case 'number':
        return format(node.value);

      case 'identifier': {
        if (Object.hasOwn(scope, node.name)) return format(scope[node.name]);
        if (node.name === 'pi') return format(Math.PI);
        return node.name;
      }

      case 'unary':
        return `${node.op}${walk(node.arg)}`;

      case 'binary': {
        const left = walk(node.left);
        const right = walk(node.right);
        if (node.op === '=') return `${left} = ${right}`;
        return `(${left} ${node.op} ${right})`;
      }

      case 'call': {
        const args = node.args.map((arg) => walk(arg)).join(', ');
        return `${node.name}(${args})`;
      }

      case 'assign':
        return `${walk(node.left)} = ${walk(node.right)}`;

      default:
        return '';
    }
  }

  return walk(ast);
}
