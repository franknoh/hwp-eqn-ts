import {
  ASTNode, LiteralNode, BinaryOpNode, FractionNode, RootNode,
  SuperscriptNode, SubscriptNode, IntegralNode, SummationNode,
  MatrixNode, CasesNode, DecoratedNode, GroupNode
} from "./ast";


export function toLatex(node: ASTNode): string {
  switch (node.type) {
    case "Literal":
      return (node as LiteralNode).value;

    case "BinaryOp": {
      const b = node as BinaryOpNode;
      const left = toLatex(b.left);
      const right = toLatex(b.right);
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
        // atop
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
      const iNode = node as IntegralNode;
      const cmd = (iNode.variant === "int") ? "\\int" : "\\oint";
      let lower = "", upper = "";
      if (iNode.lower) lower = `_{${toLatex(iNode.lower)}}`;
      if (iNode.upper) upper = `^{${toLatex(iNode.upper)}}`;
      let body = "";
      if (iNode.body) {
        const bStr = toLatex(iNode.body);
        body = ` ${bStr}`;
      }
      return `${cmd}${lower}${upper}${body}`;
    }

    case "Summation": {
      const s = node as SummationNode;
      let lower = "", upper = "";
      if (s.lower) lower = `_{${toLatex(s.lower)}}`;
      if (s.upper) upper = `^{${toLatex(s.upper)}}`;
      let body = "";
      if (s.body) {
        body = ` ${toLatex(s.body)}`;
      }
      return `\\sum${lower}${upper}${body}`;
    }

    case "Matrix": {
      const m = node as MatrixNode;
      let env = m.matrixType;
      if (env === "dmatrix") env = "vmatrix"; // 임의 매핑
      const rowStrs = m.rows.map(r => r.map(e => toLatex(e)).join(" & ")).join(" \\\\ ");
      return `\\begin{${env}} ${rowStrs} \\end{${env}}`;
    }

    case "Cases": {
      const c = node as CasesNode;
      // \begin{cases} line \\ line \end{cases}
      const lines = c.lines.map(line => line.map(e => toLatex(e)).join(" ")).join(" \\\\ ");
      return `\\begin{cases} ${lines} \\end{cases}`;
    }

    case "Decorated": {
      const d = node as DecoratedNode;
      const child = toLatex(d.child);
      switch (d.decoType) {
        case "acute": return `\\acute{${child}}`;
        case "grave": return `\\grave{${child}}`;
        case "dot": return `\\dot{${child}}`;
        case "ddot": return `\\ddot{${child}}`;
        case "bar": return `\\bar{${child}}`;
        case "vec": return `\\vec{${child}}`;
        case "hat": return `\\hat{${child}}`;
        case "tilde": return `\\tilde{${child}}`;
        default:
          return child;
      }
    }

    case "Group": {
      const g = node as GroupNode;
      const inner = toLatex(g.body);
      // 만약 body가 Literal이면 {} 생략
      if (g.body.type === "Literal") {
        return inner;
      }
      return `{${inner}}`;
    }

    default:
      return "";
  }
}
