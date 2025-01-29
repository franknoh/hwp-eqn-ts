export interface ASTNode {
  type: string;
}

export interface LiteralNode extends ASTNode {
  type: "Literal";
  value: string;
}

export interface BinaryOpNode extends ASTNode {
  type: "BinaryOp";
  operator: string; // +, -, times, /, apply...
  left: ASTNode;
  right: ASTNode;
}

export interface FractionNode extends ASTNode {
  type: "Fraction";
  numerator: ASTNode;
  denominator: ASTNode;
  withBar: boolean; // over => true, atop => false, latex=>\frac
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
  variant: "int" | "oint";
  lower?: ASTNode;
  upper?: ASTNode;
  body?: ASTNode;
}

export interface SummationNode extends ASTNode {
  type: "Summation";
  lower?: ASTNode;
  upper?: ASTNode;
  body?: ASTNode;
}

export interface DecoratedNode extends ASTNode {
  type: "Decorated";
  decoType: string;
  child: ASTNode;
}

/** \begin{pmatrix}...\end{pmatrix} or \begin{cases}... => one node */
export interface BeginEnvNode extends ASTNode {
  type: "BeginEnv";
  envName: string;
  rows: ASTNode[][]; // row-based
}

/** ( ... ), { ... }, \left(\right) => bracket node */
export interface BracketNode extends ASTNode {
  type: "Bracket";
  leftDelim: string;
  rightDelim: string;
  content: ASTNode;
}