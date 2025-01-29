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

export class HwpParser {
  private tokens: Token[];
  private pos = 0;
  constructor(tokens: Token[]) {
    // remove space, unknown
    this.tokens = tokens.filter(t => t.type !== TokenType.SPACE && t.type !== TokenType.UNKNOWN);
  }
  private peek(): Token { return this.tokens[this.pos] || { type: TokenType.EOF, value: "" }; }
  private next(): Token { const t = this.peek(); if (t.type !== TokenType.EOF) this.pos++; return t; }
  private matchSymbol(v: string): boolean {
    const t = this.peek();
    return (t.type === TokenType.SYMBOL && t.value === v);
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
        const right = this.parseTerm();
        node = { type: "BinaryOp", operator: t.value, left: node, right } as BinaryOpNode;
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
      if (t.type === TokenType.KEYWORD) {
        const kw = t.value.toUpperCase();
        if (kw === "TIMES") {
          this.next();
          const r = this.parseFactor();
          node = { type: "BinaryOp", operator: "times", left: node, right: r } as BinaryOpNode;
        }
        else if (kw === "OVER" || kw === "ATOP") {
          this.next();
          const denom = this.parseFactor();
          node = {
            type: "Fraction",
            numerator: node,
            denominator: denom,
            withBar: (kw === "OVER")
          } as FractionNode;
        } else {
          break;
        }
      } else if (t.type === TokenType.SYMBOL && t.value === "/") {
        this.next();
        const r = this.parseFactor();
        node = { type: "BinaryOp", operator: "/", left: node, right: r } as BinaryOpNode;
      } else {
        break;
      }
    }
    return node;
  }

  private parseFactor(): ASTNode {
    // check function call
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
      const kw = t.value.toUpperCase();
      if (kw === "SQRT") {
        let rad = this.parseFactor();
        if (rad.type === "Bracket") {
          let br = rad as BracketNode;
          rad = this.removeBracket(br);
        }
        return { type: "Root", radicand: rad } as RootNode;
      }
      if (kw === "INT" || kw === "OINT") {
        const variant = (kw === "INT") ? "int" : "oint";
        const iNode: IntegralNode = { type: "Integral", variant };
        if (this.matchSymbol("_")) {
          this.next();
          iNode.lower = this.parseSingleFactorNoSubSup();
        }
        if (this.matchSymbol("^")) {
          this.next();
          iNode.upper = this.parseSingleFactorNoSubSup();
        }
        iNode.body = this.parseFactor();
        if (iNode.body.type === "Bracket") {
          let br = iNode.body as BracketNode;
          iNode.body = this.removeBracket(br);
        }
        return iNode;
      }
      if (kw === "SUM") {
        const sNode: SummationNode = { type: "Summation" };
        if (this.matchSymbol("_")) {
          this.next();
          sNode.lower = this.parseSingleFactorNoSubSup();
        }
        if (this.matchSymbol("^")) {
          this.next();
          sNode.upper = this.parseSingleFactorNoSubSup();
        }
        sNode.body = this.parseFactor();
        if (sNode.body.type === "Bracket") {
          let br = sNode.body as BracketNode;
          sNode.body = this.removeBracket(br);
        }
        return sNode;
      }
      if (["ACUTE", "GRAVE", "DOT", "DDOT", "BAR", "VEC", "HAT", "TILDE", "ARCH", "CHECK"].includes(kw)) {
        let child = this.parseFactor();
        if (child.type === "Bracket") {
          let br = child as BracketNode;
          child = this.removeBracket(br);
        }
        return { type: "Decorated", decoType: kw.toLowerCase(), child } as DecoratedNode;
      }
      if (kw === "LEFT") {
        return this.parseLeftBracket();
      }
      if (kw === "RIGHT") {
        // leftover
        return { type: "Literal", value: "RIGHT" } as LiteralNode;
      }
      if (kw === "PMATRIX" || kw === "CASES") {
        return this.parseEnv(kw.toLowerCase());
      }
      // fallback
      return { type: "Literal", value: kw } as LiteralNode;
    }
    if (t.type === TokenType.SYMBOL) {
      if ("([{".includes(t.value)) {
        return this.parseBracketDirect();
      }
      if (")]}".includes(t.value)) {
        this.next();
        return { type: "Literal", value: t.value } as LiteralNode;
      }
      this.next();
      return { type: "Literal", value: t.value } as LiteralNode;
    }
    // else
    this.next();
    return { type: "Literal", value: "" } as LiteralNode;
  }

  /** f( ) or f LEFT( ) => apply */
  private tryParseFunctionCall(): ASTNode | undefined {
    const t1 = this.peek();
    if (t1.type === TokenType.IDENT) {
      const t2 = this.tokens[this.pos + 1];
      if (t2 && t2.type === TokenType.KEYWORD && t2.value.toUpperCase() === "LEFT") {
        this.next();
        const fLit: LiteralNode = { type: "Literal", value: t1.value };
        const bracket = this.parseLeftBracket();
        const node: BinaryOpNode = { type: "BinaryOp", operator: "apply", left: fLit, right: bracket };
        return this.maybeParseSubSup(node);
      }
      else if (t2 && t2.type === TokenType.SYMBOL && "([{".includes(t2.value)) {
        this.next();
        const fLit: LiteralNode = { type: "Literal", value: t1.value };
        const bracket = this.parseBracketDirect();
        const node: BinaryOpNode = { type: "BinaryOp", operator: "apply", left: fLit, right: bracket };
        return this.maybeParseSubSup(node);
      }
    }
    return undefined;
  }

  private parseLeftBracket(): ASTNode {
    // parse "LEFT(" + content + "RIGHT)"
    let leftD = "";
    const s = this.peek();
    if (s.type === TokenType.SYMBOL && "([{".includes(s.value)) {
      leftD = "LEFT" + s.value;
      this.next();
    }
    const content = this.parseExpr();
    // check RIGHT
    let rightD = "";
    let maybeR = this.peek();
    if (maybeR.type === TokenType.KEYWORD && maybeR.value.toUpperCase() === "RIGHT") {
      this.next();
      const sym2 = this.peek();
      if (sym2.type === TokenType.SYMBOL && ")]}".includes(sym2.value)) {
        rightD = "RIGHT" + sym2.value;
        this.next();
      }
    }
    // if no delim
    if (leftD === "" && rightD === "") {
      return content;
    }
    // flatten bracket if content is also bracket with same delim
    let br: BracketNode = { type: "Bracket", leftDelim: leftD, rightDelim: rightD, content };
    br = this.flattenBracket(br);
    return this.maybeParseSubSup(br);
  }

  private parseBracketDirect(): ASTNode {
    // e.g. '(' expr ')'
    const open = this.peek();
    const left = open.value;
    this.next();
    const expr = this.parseExpr();
    let right = "";
    if ((left === "(" && this.matchSymbol(")"))
      || (left === "[" && this.matchSymbol("]"))
      || (left === "{" && this.matchSymbol("}"))) {
      right = this.peek().value;
      this.next();
    }
    let br: BracketNode = { type: "Bracket", leftDelim: left, rightDelim: right, content: expr };
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

  private parseEnv(envName: string): ASTNode {
    if (!this.matchSymbol("{")) {
      return { type: "Literal", value: envName } as LiteralNode;
    }
    this.next();
    const rows: ASTNode[][] = [];
    let currentRow: ASTNode[] = [];
    while (!this.matchSymbol("}")) {
      const tk = this.peek();
      if (tk.type === TokenType.EOF) break;
      if (tk.type === TokenType.SYMBOL && tk.value === "\\\\") {
        // row break, skip double
        this.next();
        if (currentRow.length > 0 || rows.length === 0) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else if (tk.type === TokenType.SYMBOL && tk.value === "#") {
        this.next();
        rows.push(currentRow);
        currentRow = [];
      } else if (tk.type === TokenType.SYMBOL && tk.value === "&") {
        this.next();
      } else {
        const f = this.parseFactor();
        // ex) x=1 => we might unify them => but let's unify in toHwpEqn
        if (f.type !== "Literal" || (f as LiteralNode).value !== "") {
          currentRow.push(f);
        }
      }
    }
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    if (this.matchSymbol("}")) this.next();
    const bEnv: BeginEnvNode = { type: "BeginEnv", envName, rows };
    return bEnv;
  }

  private maybeParseSubSup(base: ASTNode): ASTNode {
    let node = base;
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.SYMBOL && t.value === "^") {
        this.next();
        const exp = this.parseFactor();
        node = { type: "Superscript", base: node, exponent: exp } as SuperscriptNode;
      }
      else if (t.type === TokenType.SYMBOL && t.value === "_") {
        this.next();
        const sub = this.parseFactor();
        node = { type: "Subscript", base: node, sub } as SubscriptNode;
      }
      else {
        break;
      }
    }
    return node;
  }

  // int_1 => single literal
  private parseSingleFactorNoSubSup(): ASTNode {
    const t = this.peek();
    if (t.type !== TokenType.EOF) {
      this.next();
      return { type: "Literal", value: t.value } as LiteralNode;
    }
    return { type: "Literal", value: "" } as LiteralNode;
  }
}