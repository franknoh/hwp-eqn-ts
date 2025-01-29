import { ASTNode, BinaryOpNode, BracketNode, DecoratedNode, FractionNode, IntegralNode, LiteralNode, RootNode, SubscriptNode, SuperscriptNode, SummationNode, BeginEnvNode } from "./ast";

export function toHwpEqn(node: ASTNode): string {
  switch (node.type) {
      case "Literal":
          return (node as LiteralNode).value;
      case "BinaryOp": {
          const b = node as BinaryOpNode;
          const left = toHwpEqn(b.left);
          const right = toHwpEqn(b.right);
          if (b.operator === "apply") {
              return left + right;
          }
          switch (b.operator) {
              case "times": return `${left} times ${right}`;
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
          const i = node as IntegralNode;
          let out = (i.variant === "int") ? "int" : "oint";
          if (i.lower) out += `_${toHwpEqn(i.lower)}`;
          if (i.upper) out += `^${toHwpEqn(i.upper)}`;
          if (i.body) {
              // keep double braces => no flatten
              out += ` { { ${toHwpEqn(i.body)} } }`;
          }
          return out;
      }
      case "Summation": {
          const s = node as SummationNode;
          let out = "sum";
          if (s.lower) out += `_${toHwpEqn(s.lower)}`;
          if (s.upper) out += `^${toHwpEqn(s.upper)}`;
          if (s.body) {
              out += ` { ${toHwpEqn(s.body)} }`;
          }
          return out;
      }
      case "Decorated": {
          const d = node as DecoratedNode;
          const c = toHwpEqn(d.child);
          return `${d.decoType} ${c}`;
      }
      case "BeginEnv": {
          const be = node as BeginEnvNode;
          // e.g. pmatrix{1 & 2 # 3 & 4}, cases { x=1 # y=2 }
          const rowStrs = be.rows.map(r => {
              // unify each row => if [x,"=",1] => "x = 1"
              const colStr = unifyCaseRowHwp(r.map(e => toHwpEqn(e)));
              return colStr.join(" & ");
          }).join(" # ");
          return `${be.envName}{${rowStrs}}`;
      }
      case "Bracket": {
          const br = node as BracketNode;
          const content = toHwpEqn(br.content);
          if (br.leftDelim.startsWith("\\left")) {
              const c = br.leftDelim.slice(5);
              let left = `LEFT${c}`;
              let right = "";
              if (br.rightDelim.startsWith("\\right")) {
                  const c2 = br.rightDelim.slice(6);
                  right = `RIGHT${c2}`;
              }
              return ` ${left} ${content} ${right}`;
          } else if (br.leftDelim === "LEFT(") {
              return ` ${br.leftDelim} ${content} ${br.rightDelim}`;
          } else {
              return `${br.leftDelim}${content}${br.rightDelim}`;
          }
      }
      default:
          return "";
  }
}

function unifyCaseRowHwp(strs: string[]): string[] {
  if (strs.length === 3 && strs[1] === "=") {
      return [strs[0] + " = " + strs[2]];
  }
  return strs;
}