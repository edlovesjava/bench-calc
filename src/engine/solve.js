/**
 * Solve an equation for a single variable.
 *
 * The repo design is strict: closed-form solutions are preferred when they are
 * simple, but numeric solving is used when needed. If the solver cannot
 * bracket a root, it refuses instead of returning a plausible wrong number.
 */

import { parse, evaluate } from './expr.js';

function residualForExpression(exprText, unknown, scope, value) {
  const next = { ...scope, [unknown]: value };
  const ast = parse(exprText);

  if (ast && ast.type === 'assign') {
    const lhs = evaluate(ast.left, next);
    const rhs = evaluate(ast.right, next);
    return lhs - rhs;
  }

  return evaluate(ast, next);
}

function bracketRoot(exprText, unknown, scope, min, max) {
  let a = Number(min);
  let b = Number(max);

  if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) {
    return null;
  }

  let fa = residualForExpression(exprText, unknown, scope, a);
  let fb = residualForExpression(exprText, unknown, scope, b);

  if (!Number.isFinite(fa) || !Number.isFinite(fb)) {
    return null;
  }

  const maxSteps = 200;
  for (let step = 0; step < maxSteps; step += 1) {
    if (fa === 0) return { left: a, right: a, fLeft: fa, fRight: fa };
    if (fb === 0) return { left: b, right: b, fLeft: fb, fRight: fb };
    if (fa * fb <= 0) return { left: a, right: b, fLeft: fa, fRight: fb };

    const mid = (a + b) / 2;
    const fm = residualForExpression(exprText, unknown, scope, mid);
    if (!Number.isFinite(fm)) {
      return null;
    }

    if (fa * fm <= 0) {
      b = mid;
      fb = fm;
    } else {
      a = mid;
      fa = fm;
    }
  }

  return null;
}

function bisection(exprText, unknown, scope, left, right, tol = 1e-12, maxIter = 200) {
  let a = left;
  let b = right;
  let fa = residualForExpression(exprText, unknown, scope, a);
  let fb = residualForExpression(exprText, unknown, scope, b);

  if (!Number.isFinite(fa) || !Number.isFinite(fb) || fa === 0) return a;
  if (fb === 0) return b;
  if (fa * fb > 0) return null;

  for (let iter = 0; iter < maxIter; iter += 1) {
    const mid = (a + b) / 2;
    const fm = residualForExpression(exprText, unknown, scope, mid);

    if (!Number.isFinite(fm)) return null;
    if (Math.abs(fm) <= tol || (b - a) / 2 <= tol) {
      return mid;
    }

    if (fa * fm <= 0) {
      b = mid;
      fb = fm;
    } else {
      a = mid;
      fa = fm;
    }
  }

  return (a + b) / 2;
}

export function solveFor(expr, unknown, scope = {}, domain = null) {
  if (typeof expr !== 'string' || !expr.trim()) return null;

  const ast = parse(expr);
  const base = { ...scope };

  if (ast && ast.type === 'assign') {
    const leftNames = new Set();
    const rightNames = new Set();
    const walk = (node, set) => {
      if (!node) return;
      if (node.type === 'identifier') {
        set.add(node.name);
        return;
      }
      if (node.type === 'binary' || node.type === 'assign') {
        walk(node.left, set);
        walk(node.right, set);
        return;
      }
      if (node.type === 'unary') {
        walk(node.arg, set);
        return;
      }
      if (node.type === 'call') {
        for (const arg of node.args) walk(arg, set);
      }
    };

    walk(ast.left, leftNames);
    walk(ast.right, rightNames);

    const unknownPresent = leftNames.has(unknown) || rightNames.has(unknown);
    if (unknownPresent) {
      const fn = (value) => residualForExpression(expr, unknown, base, value);

      if (domain && Number.isFinite(domain.min) && Number.isFinite(domain.max)) {
        const bracket = bracketRoot(expr, unknown, base, domain.min, domain.max);
        if (bracket) {
          return bisection(expr, unknown, base, bracket.left, bracket.right);
        }
        return null;
      }

      const candidates = [-1e6, -1e5, -1e4, -1e3, -100, -10, -1, -0.1, 0, 0.1, 1, 10, 100, 1000, 1e4, 1e5, 1e6];
      let left = null;
      let right = null;
      let fLeft = null;

      for (const v of candidates) {
        const f = fn(v);
        if (!Number.isFinite(f)) continue;
        if (left === null) {
          left = v;
          fLeft = f;
          continue;
        }
        if (fLeft === 0) return left;
        if (fLeft * f <= 0) {
          right = v;
          break;
        }
        left = v;
        fLeft = f;
      }

      if (left === null || right === null) return null;
      return bisection(expr, unknown, base, left, right);
    }
  }

  return null;
}
