import {
  ASTNode,
  LiteralNode,
  BinaryOpNode,
  FractionNode,
  RootNode,
  SuperscriptNode,
  SubscriptNode,
  IntegralNode,
  SummationNode,
  DecoratedNode,
  BeginEnvNode,
  BracketNode
} from "./ast";

export function toLatex(node: ASTNode): string {
  switch (node.type) {
    case "Literal": return (node as LiteralNode).value;

    case "BinaryOp": {
      const b = node as BinaryOpNode;
      const left = toLatex(b.left);
      const right = toLatex(b.right);
      if (b.operator === "apply") {
        // f(...) => left + bracket
        return `${left}${right}`;
      }
      switch (b.operator) {
        case "times": return `${left} \\times ${right}`;
        case "+": case "-": case "/":
          return `${left} ${b.operator} ${right}`;
        default:
          return `${left} ${b.operator} ${right}`;
      }
    }

    case "Fraction": {
      const f = node as FractionNode;
      const num = toLatex(f.numerator);
      const den = toLatex(f.denominator);
      if (f.withBar) {
        return `\\frac{${num}}{${den}}`;
      } else {
        return `\\begin{array}{c} ${num} \\atop ${den} \\end{array}`;
      }
    }

    case "Root": {
      const r = node as RootNode;
      return `\\sqrt{${toLatex(r.radicand)}}`;
    }

    case "Superscript": {
      const s = node as SuperscriptNode;
      return `${toLatex(s.base)}^{${toLatex(s.exponent)}}`;
    }
    case "Subscript": {
      const sb = node as SubscriptNode;
      return `${toLatex(sb.base)}_{${toLatex(sb.sub)}}`;
    }
    case "Integral": {
      const i = node as IntegralNode;
      const cmd = (i.variant === "int") ? "\\int" : "\\oint";
      let lower = "", upper = "";
      if (i.lower) lower = `_{${toLatex(i.lower)}}`;
      if (i.upper) upper = `^{${toLatex(i.upper)}}`;
      const body = i.body ? ` {${toLatex(i.body)}}` : "";
      return `${cmd}${lower}${upper}${body}`;
    }
    case "Summation": {
      const s = node as SummationNode;
      let lower = "", upper = "";
      if (s.lower) lower = `_{${toLatex(s.lower)}}`;
      if (s.upper) upper = `^{${toLatex(s.upper)}}`;
      const body = s.body ? ` {${toLatex(s.body)}}` : "";
      return `\\sum${lower}${upper}${body}`;
    }
    case "Decorated": {
      const d = node as DecoratedNode;
      const c = toLatex(d.child);
      switch (d.decoType) {
        case "acute": return `\\acute{${c}}`;
        case "grave": return `\\grave{${c}}`;
        case "dot": return `\\dot{${c}}`;
        case "ddot": return `\\ddot{${c}}`;
        case "bar": return `\\bar{${c}}`;
        case "vec": return `\\vec{${c}}`;
        case "hat": return `\\hat{${c}}`;
        case "tilde": return `\\tilde{${c}}`;
        default: return c;
      }
    }
    case "BeginEnv": {
      const be = node as BeginEnvNode;
      // row => ' \\\\ ', col => ' & '
      const rowStrs = be.rows.map(r => {
        // 특별 해킹: 만약 r=[ x, =, 1 ] => join => "x=1"
        const colStr = unifyCaseRow(r.map(e => toLatex(e)));
        return colStr.join(" & ");
      }).join(" \\\\ ");
      return `\\begin{${be.envName}} ${rowStrs} \\end{${be.envName}}`;
    }
    case "Bracket": {
      const br = node as BracketNode;
      const content = toLatex(br.content);
      // if "LEFT(" => => \left( ...
      if (br.leftDelim.startsWith("LEFT")) {
        const c = br.leftDelim.slice(4);
        let left = `\\left${c}`;
        let right = "";
        if (br.rightDelim.startsWith("RIGHT")) {
          const c2 = br.rightDelim.slice(5);
          right = `\\right${c2}`;
        }
        return ` ${left} ${content} ${right}`;
      } else if (br.leftDelim.startsWith("\\left")) {
        return ` ${br.leftDelim} ${content} ${br.rightDelim}`;
      } else {
        return `${br.leftDelim}${content}${br.rightDelim}`;
      }
    }
    default:
      return "";
  }
}

/** small helper: if row=[x,"=","1"] => unify => ["x=1"] */
function unifyCaseRow(strs: string[]): string[] {
  if (strs.length === 3 && strs[1] === "=") {
    return [strs[0] + " = " + strs[2]];
  }
  return strs;
}