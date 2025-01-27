export interface ASTNode {
  type: string;
}

export interface LiteralNode extends ASTNode {
  type: "Literal";
  value: string;
}

export interface BinaryOpNode extends ASTNode {
  type: "BinaryOp";
  operator: string; // "+", "-", "times", "/", ...
  left: ASTNode;
  right: ASTNode;
}

export interface FractionNode extends ASTNode {
  type: "Fraction";
  numerator: ASTNode;
  denominator: ASTNode;
  withBar: boolean; // over=true, atop=false, or latex \frac => true
}

export interface RootNode extends ASTNode {
  type: "Root";
  radicand: ASTNode;
}

export interface SuperscriptNode extends ASTNode {
  type: "Superscript";
  base: ASTNode;
  exponent: ASTNode;
}
export interface SubscriptNode extends ASTNode {
  type: "Subscript";
  base: ASTNode;
  sub: ASTNode;
}

export interface IntegralNode extends ASTNode {
  type: "Integral";
  variant: "int" | "oint"; // \int, \oint
  lower?: ASTNode;
  upper?: ASTNode;
  body?: ASTNode; // 적분 내부 식
}

export interface SummationNode extends ASTNode {
  type: "Summation";
  lower?: ASTNode;
  upper?: ASTNode;
  body?: ASTNode;
}

export interface MatrixNode extends ASTNode {
  type: "Matrix";
  matrixType: "matrix" | "pmatrix" | "bmatrix" | "dmatrix" | "vmatrix";
  rows: ASTNode[][];
}

export interface CasesNode extends ASTNode {
  type: "Cases";
  lines: ASTNode[][];
}

export interface DecoratedNode extends ASTNode {
  type: "Decorated";
  decoType: string;  // "acute", "dot", "hat", ...
  child: ASTNode;
}

/** 괄호/중괄호로 묶인 그룹 */
export interface GroupNode extends ASTNode {
  type: "Group";
  body: ASTNode;
}
