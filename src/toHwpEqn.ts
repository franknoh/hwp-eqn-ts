import {
  ASTNode, LiteralNode, BinaryOpNode, FractionNode, RootNode,
  SuperscriptNode, SubscriptNode, IntegralNode, SummationNode,
  MatrixNode, CasesNode, DecoratedNode, GroupNode
} from "./ast";

export function toHwpEqn(node: ASTNode): string {
  switch (node.type) {
    case "Literal":
      return (node as LiteralNode).value;

    case "BinaryOp": {
      const b = node as BinaryOpNode;
      const left = toHwpEqn(b.left);
      const right = toHwpEqn(b.right);
      switch (b.operator) {
        case "times":
          return `${left} times ${right}`;
        case "+": case "-": case "/":
          return `${left} ${b.operator} ${right}`;
        default:
          return `${left} ${b.operator} ${right}`;
      }
    }

    case "Fraction": {
      const f = node as FractionNode;
      const num = toHwpEqn(f.numerator);
      const den = toHwpEqn(f.denominator);
      if (f.withBar) {
        return `${num} over ${den}`;
      } else {
        return `${num} atop ${den}`;
      }
    }

    case "Root": {
      const r = node as RootNode;
      return `sqrt ${toHwpEqn(r.radicand)}`;
    }

    case "Superscript": {
      const s = node as SuperscriptNode;
      return `${toHwpEqn(s.base)}^${toHwpEqn(s.exponent)}`;
    }

    case "Subscript": {
      const sb = node as SubscriptNode;
      return `${toHwpEqn(sb.base)}_${toHwpEqn(sb.sub)}`;
    }

    case "Integral": {
      const iNode = node as IntegralNode;
      const variant = (iNode.variant === "int") ? "int" : "oint";
      let out = variant;
      if (iNode.lower) {
        out += `_${toHwpEqn(iNode.lower)}`;
      }
      if (iNode.upper) {
        out += `^${toHwpEqn(iNode.upper)}`;
      }
      if (iNode.body) {
        out += ` { ${toHwpEqn(iNode.body)} }`;
      }
      return out;
    }

    case "Summation": {
      const s = node as SummationNode;
      let out = `sum`;
      if (s.lower) out += `_${toHwpEqn(s.lower)}`;
      if (s.upper) out += `^${toHwpEqn(s.upper)}`;
      if (s.body) {
        out += ` { ${toHwpEqn(s.body)} }`;
      }
      return out;
    }

    case "Matrix": {
      const m = node as MatrixNode;
      let prefix = m.matrixType; // 'matrix', 'pmatrix' 등
      const rowStrs = m.rows.map(r => r.map(e => toHwpEqn(e)).join(" & ")).join(" # ");
      return `${prefix}{${rowStrs}}`;
    }

    case "Cases": {
      const c = node as CasesNode;
      const lines = c.lines.map(line => line.map(e => toHwpEqn(e)).join(" ")).join(" # ");
      return `cases {${lines}}`;
    }

    case "Decorated": {
      const d = node as DecoratedNode;
      return `${d.decoType} ${toHwpEqn(d.child)}`;
    }

    case "Group": {
      const g = node as GroupNode;
      const inner = toHwpEqn(g.body);
      // body가 Literal이면 생략
      if (g.body.type === "Literal") {
        return inner;
      }
      return `{ ${inner} }`;
    }

    default:
      return "";
  }
}
