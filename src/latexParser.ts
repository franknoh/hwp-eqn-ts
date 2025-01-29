import { Token, TokenType } from "./tokenTypes";
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

export class LatexParser {
  private tokens: Token[];
  private pos = 0;
  constructor(tokens: Token[]) {
    this.tokens = tokens.filter(t => t.type !== TokenType.SPACE && t.type !== TokenType.UNKNOWN);
  }
  private peek(): Token { return this.tokens[this.pos] || { type: TokenType.EOF, value: "" }; }
  private next(): Token { const t = this.peek(); if (t.type !== TokenType.EOF) this.pos++; return t; }
  private matchSymbol(v: string): boolean {
    const t = this.peek();
    return (t.type === TokenType.SYMBOL && t.value === v);
  }
  private matchKeyword(k: string): boolean {
    const t = this.peek();
    return (t.type === TokenType.KEYWORD && t.value.toLowerCase() === k.toLowerCase());
  }

  public parseExpression(): ASTNode {
    return this.parseExpr();
  }

  private parseExpr(): ASTNode {
    let node = this.parseTerm();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.SYMBOL && (t.value === '+' || t.value === '-')) {
        this.next();
        const r = this.parseTerm();
        node = { type: "BinaryOp", operator: t.value, left: node, right: r } as BinaryOpNode;
      } else {
        break;
      }
    }
    return node;
  }
  private parseTerm(): ASTNode {
    let node = this.parseFactor();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.KEYWORD && t.value === "times") {
        this.next();
        const r = this.parseFactor();
        node = { type: "BinaryOp", operator: "times", left: node, right: r } as BinaryOpNode;
      }
      else if (t.type === TokenType.SYMBOL && t.value === "/") {
        this.next();
        const r = this.parseFactor();
        node = { type: "BinaryOp", operator: "/", left: node, right: r } as BinaryOpNode;
      }
      else {
        break;
      }
    }
    return node;
  }

  private parseFactor(): ASTNode {
    const fc = this.tryParseFunctionCall();
    if (fc) return fc;

    const t = this.peek();
    if (t.type === TokenType.NUMBER) {
      this.next();
      const lit: LiteralNode = { type: "Literal", value: t.value };
      return this.maybeParseSubSup(lit);
    }
    if (t.type === TokenType.IDENT) {
      this.next();
      const lit: LiteralNode = { type: "Literal", value: t.value };
      return this.maybeParseSubSup(lit);
    }
    if (t.type === TokenType.KEYWORD) {
      this.next();
      const kw = t.value.toLowerCase();
      if (kw === "left") {
        return this.parseLeftRightBracket();
      }
      if (kw === "right") {
        // leftover
        return { type: "Literal", value: "\\right" } as LiteralNode;
      }
      if (kw === "begin") {
        return this.parseBeginEnv();
      }
      if (kw === "end") {
        this.next();
        return { type: "Literal", value: "\\end" } as LiteralNode;
      }
      if (kw === "sqrt") {
        let rad = this.parseFactor();
        if (rad.type === "Bracket") {
          let br = rad as BracketNode;
          rad = this.removeBracket(br);
        }
        return { type: "Root", radicand: rad } as RootNode;
      }
      if (kw === "frac") {
        // parse \frac{...}{...}
        let num: ASTNode = { type: "Literal", value: "" } as LiteralNode;
        let den: ASTNode = { type: "Literal", value: "" } as LiteralNode;
        if (this.matchSymbol("{")) {
          this.next();
          num = this.parseExpression();
          if (this.matchSymbol("}")) this.next();
        }
        if (this.matchSymbol("{")) {
          this.next();
          den = this.parseExpression();
          if (this.matchSymbol("}")) this.next();
        }
        return { type: "Fraction", numerator: num, denominator: den, withBar: true } as FractionNode;
      }
      if (kw === "int" || kw === "oint") {
        const variant = (kw === "int") ? "int" : "oint";
        const iNode: IntegralNode = { type: "Integral", variant };
        this.parseIntegralSubSup(iNode);
        iNode.body = this.parseFactor();
        if (iNode.body.type === "Bracket") {
          let br = iNode.body as BracketNode;
          iNode.body = this.removeBracket(br);
        }
        return iNode;
      }
      if (kw === "sum") {
        const sNode: SummationNode = { type: "Summation" };
        this.parseSumSubSup(sNode);
        sNode.body = this.parseFactor();
        if (sNode.body.type === "Bracket") {
          let br = sNode.body as BracketNode;
          sNode.body = this.removeBracket(br);
        }
        return sNode;
      }
      if (["acute", "grave", "dot", "ddot", "bar", "vec", "hat", "tilde"].includes(kw)) {
        let child = this.parseFactor();
        if (child.type === "Bracket") {
          let br = child as BracketNode;
          child = this.removeBracket(br);
        }
        return { type: "Decorated", decoType: kw, child } as DecoratedNode;
      }
      // fallback
      return { type: "Literal", value: "\\" + kw } as LiteralNode;
    }
    if (t.type === TokenType.SYMBOL) {
      if ("([{".includes(t.value)) {
        this.next();
        const left = t.value;
        const content = this.parseExpression();
        let right = "";
        if ((left === "(" && this.matchSymbol(")"))
          || (left === "[" && this.matchSymbol("]"))
          || (left === "{" && this.matchSymbol("}"))) {
          right = this.peek().value;
          this.next();
        }
        const br: BracketNode = { type: "Bracket", leftDelim: left, rightDelim: right, content };
        return this.maybeParseSubSup(br);
      }
      if (")]}".includes(t.value)) {
        this.next();
        return { type: "Literal", value: t.value } as LiteralNode;
      }
      if (t.value === "\\\\") {
        this.next();
        return { type: "Literal", value: "\\\\" } as LiteralNode;
      }
      this.next();
      return { type: "Literal", value: t.value } as LiteralNode;
    }
    // else
    this.next();
    return { type: "Literal", value: "" } as LiteralNode;
  }

  /** f(...) or f\left(...) => operator= "apply" */
  private tryParseFunctionCall(): ASTNode | undefined {
    const t1 = this.peek();
    if (t1.type === TokenType.IDENT) {
      const t2 = this.tokens[this.pos + 1];
      if (t2 && t2.type === TokenType.KEYWORD && t2.value === "left") {
        // f \left
        this.next();
        const fLit: LiteralNode = { type: "Literal", value: t1.value };
        const bracket = this.parseLeftRightBracket();
        const node: BinaryOpNode = { type: "BinaryOp", operator: "apply", left: fLit, right: bracket };
        return this.maybeParseSubSup(node);
      } else if (t2 && t2.type === TokenType.SYMBOL && "([{".includes(t2.value)) {
        // f(
        this.next();
        const fLit: LiteralNode = { type: "Literal", value: t1.value };
        const bracket = this.parseFactor();
        const node: BinaryOpNode = { type: "BinaryOp", operator: "apply", left: fLit, right: bracket };
        return this.maybeParseSubSup(node);
      }
    }

    return undefined;
  }

  private parseLeftRightBracket(): ASTNode {
    let leftD = "";
    const s = this.peek();
    if (s.type === TokenType.SYMBOL && "([{".includes(s.value)) {
      leftD = "\\left" + s.value;
      this.next();
    }
    const content = this.parseExpression();
    let rightD = "";
    if (this.matchKeyword("right")) {
      this.next();
      const s2 = this.peek();
      if (s2.type === TokenType.SYMBOL && ")]}".includes(s2.value)) {
        rightD = "\\right" + s2.value;
        this.next();
      }
    }
    // if no delim
    if (leftD === "" && rightD === "") {
      return content;
    }
    let br: BracketNode = { type: "Bracket", leftDelim: leftD, rightDelim: rightD, content };
    br = this.flattenBracket(br);
    return this.maybeParseSubSup(br);
  }

  private flattenBracket(br: BracketNode): BracketNode {
    if (br.content.type === "Bracket") {
      const inner = br.content as BracketNode;
      if (br.leftDelim === inner.leftDelim && br.rightDelim === inner.rightDelim) {
        if (br.leftDelim === "{" || br.leftDelim === "") {
          return inner;
        }
      }
    }
    return br;
  }

  private removeBracket(br: BracketNode): ASTNode {
    if (br.leftDelim === "{" || br.leftDelim === "") {
      return br.content;
    }
    return br;
  }

  /** \begin{pmatrix}, \begin{cases} => parse until \end{...} */
  private parseBeginEnv(): ASTNode {
    if (!this.matchSymbol("{")) {
      return { type: "Literal", value: "\\begin" } as LiteralNode;
    }
    this.next();
    const envTok = this.peek();
    let envName = "";
    if (envTok.type === TokenType.IDENT || envTok.type === TokenType.KEYWORD) {
      envName = envTok.value.toLowerCase();
      this.next();
    }
    if (this.matchSymbol("}")) this.next();
    const node = this.parseBeginEnvContent(envName);
    return node;
  }

  private parseBeginEnvContent(envName: string): ASTNode {
    const rows: ASTNode[][] = [];
    let currentRow: ASTNode[] = [];
    while (!this.isEndEnv(envName)) {
      const tk = this.peek();
      if (tk.type === TokenType.EOF) break;
      if (tk.type === TokenType.SYMBOL && tk.value === "\\\\") {
        this.next();
        if (currentRow.length > 0 || rows.length === 0) {
          rows.push(currentRow);
        }
        currentRow = [];
      }
      else if (tk.type === TokenType.SYMBOL && tk.value === "&") {
        this.next();
      }
      else {
        const f = this.parseFactor();
        if (f.type !== "Literal" || (f as LiteralNode).value !== "") {
          currentRow.push(f);
        }
      }
    }
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    this.parseEndEnv(envName);
    const be: BeginEnvNode = { type: "BeginEnv", envName, rows };
    return this.maybeParseSubSup(be);
  }

  private isEndEnv(envName: string): boolean {
    if (this.matchKeyword("end")) {
      const s1 = this.tokens[this.pos + 1];
      if (s1 && s1.type === TokenType.SYMBOL && s1.value === "{") {
        const s2 = this.tokens[this.pos + 2];
        if (s2 && (s2.type === TokenType.IDENT || s2.type === TokenType.KEYWORD)
          && s2.value.toLowerCase() === envName) {
          return true;
        }
      }
    }
    return false;
  }
  private parseEndEnv(envName: string) {
    if (this.matchKeyword("end")) {
      this.next();
      if (this.matchSymbol("{")) {
        this.next();
        const n = this.peek();
        if (n.type === TokenType.IDENT || n.type === TokenType.KEYWORD) {
          this.next();
        }
        if (this.matchSymbol("}")) this.next();
      }
    }
  }
  /** parse sub/sup for integrals, sums => handle { ... } */
  private parseIntegralSubSup(iNode: IntegralNode) {
    if (this.matchSymbol("_")) {
      this.next();
      iNode.lower = this.parseSubOrSupContent();
    }
    if (this.matchSymbol("^")) {
      this.next();
      iNode.upper = this.parseSubOrSupContent();
    }
  }
  private parseSumSubSup(sNode: SummationNode) {
    if (this.matchSymbol("_")) {
      this.next();
      sNode.lower = this.parseSubOrSupContent();
    }
    if (this.matchSymbol("^")) {
      this.next();
      sNode.upper = this.parseSubOrSupContent();
    }
  }
  /** if next == '{', parse expression inside '}', else single token */
  private parseSubOrSupContent(): ASTNode {
    if (this.matchSymbol("{")) {
      this.next();
      const expr = this.parseExpression();
      if (this.matchSymbol("}")) {
        this.next();
      }
      return expr;
    } else {
      // single token
      const t = this.peek();
      if (t.type !== TokenType.EOF) {
        this.next();
        return { type: "Literal", value: t.value } as LiteralNode;
      }
      return { type: "Literal", value: "" } as LiteralNode;
    }
  }
  /** after factor => maybe ^ or _ => similar logic */
  private maybeParseSubSup(base: ASTNode): ASTNode {
    let node = base;
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.SYMBOL && t.value === "^") {
        this.next();
        const exp = this.parseSubOrSupContent();
        node = { type: "Superscript", base: node, exponent: exp } as SuperscriptNode;
      }
      else if (t.type === TokenType.SYMBOL && t.value === "_") {
        this.next();
        const sub = this.parseSubOrSupContent();
        node = { type: "Subscript", base: node, sub } as SubscriptNode;
      }
      else {
        break;
      }
    }
    return node;
  }

}