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
  MatrixNode,
  CasesNode,
  DecoratedNode,
  GroupNode
} from "./ast";

export class HwpParser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    // 공백, UNKNOWN 제거
    this.tokens = tokens.filter(t => t.type !== TokenType.SPACE && t.type !== TokenType.UNKNOWN);
  }

  public parseExpression(): ASTNode {
    // 최상위 식 파싱
    const expr = this.parseExpr();
    return expr;
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: TokenType.EOF, value: "" };
  }
  private next(): Token {
    const t = this.peek();
    if (t.type !== TokenType.EOF) this.pos++;
    return t;
  }
  private matchSymbol(v: string): boolean {
    const t = this.peek();
    return (t.type === TokenType.SYMBOL && t.value === v);
  }

  /********************************************
   * expr = term { (+|-) term }*
   ********************************************/
  private parseExpr(): ASTNode {
    let node = this.parseTerm();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.SYMBOL && (t.value === "+" || t.value === "-")) {
        this.next();
        const right = this.parseTerm();
        node = {
          type: "BinaryOp",
          operator: t.value,
          left: node,
          right
        } as BinaryOpNode;
      } else {
        break;
      }
    }
    return node;
  }

  /********************************************
   * term = factor { ( times | over | atop | / ) factor }*
   ********************************************/
  private parseTerm(): ASTNode {
    let node = this.parseFactor();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.KEYWORD) {
        const kw = t.value.toUpperCase();
        if (kw === "TIMES") {
          this.next();
          const right = this.parseFactor();
          node = {
            type: "BinaryOp",
            operator: "times",
            left: node,
            right
          } as BinaryOpNode;
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
        }
        else {
          break;
        }
      }
      else if (t.type === TokenType.SYMBOL && t.value === "/") {
        this.next();
        const right = this.parseFactor();
        node = {
          type: "BinaryOp",
          operator: "/",
          left: node,
          right
        } as BinaryOpNode;
      }
      else {
        break;
      }
    }
    return node;
  }

  private parseFactor(): ASTNode {
    const t = this.peek();

    // 1) 숫자
    if (t.type === TokenType.NUMBER) {
      this.next();
      const lit: LiteralNode = { type: "Literal", value: t.value };
      return this.maybeParseSubSup(lit);
    }
    // 2) 식별자
    if (t.type === TokenType.IDENT) {
      this.next();
      const lit: LiteralNode = { type: "Literal", value: t.value };
      return this.maybeParseSubSup(lit);
    }
    // 3) KEYWORD
    if (t.type === TokenType.KEYWORD) {
      this.next();
      const kw = t.value.toUpperCase();

      if (kw === "SQRT") {
        const radicand = this.parseFactor();
        return { type: "Root", radicand } as RootNode;
      }
      // int / oint
      if (kw === "INT" || kw === "OINT") {
        const variant = (kw === "INT") ? "int" : "oint";
        const iNode: IntegralNode = { type: "Integral", variant };

        // _lower
        if (this.matchSymbol("_")) {
          this.next();
          // 단일 토큰만
          iNode.lower = this.parseSingleFactorNoSubSup();
        }
        // ^upper
        if (this.matchSymbol("^")) {
          this.next();
          iNode.upper = this.parseSingleFactorNoSubSup();
        }
        // body
        iNode.body = this.parseFactor();
        return iNode;
      }
      // sum
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
        return sNode;
      }
      if (kw === "MATRIX" || kw === "PMATRIX" || kw === "BMATRIX" || kw === "DMATRIX") {
        return this.parseMatrix(kw.toLowerCase());
      }
      if (kw === "CASES") {
        return this.parseCases();
      }
      // 장식(acute, etc.)
      const deco: DecoratedNode = {
        type: "Decorated",
        decoType: kw.toLowerCase(),
        child: this.parseFactor()
      };
      return deco;
    }
    // 4) SYMBOL
    if (t.type === TokenType.SYMBOL) {
      if (t.value === "(") {
        this.next();
        const expr = this.parseExpr();
        if (this.matchSymbol(")")) {
          this.next();
        }
        const group: GroupNode = { type: "Group", body: expr };
        return this.maybeParseSubSup(group);
      }
      if (t.value === "{") {
        this.next();
        const expr = this.parseExpr();
        if (this.matchSymbol("}")) {
          this.next();
        }
        // 여기서 group 생성 -> flatten
        let group: GroupNode = { type: "Group", body: expr };
        group = this.flattenGroup(group);
        return this.maybeParseSubSup(group);
      }
      if (t.value === "^") {
        // base 없는 superscript
        this.next();
        const exponent = this.parseFactor();
        return {
          type: "Superscript",
          base: { type: "Literal", value: "" },
          exponent
        } as SuperscriptNode;
      }
      if (t.value === "_") {
        // base 없는 subscript
        this.next();
        const sub = this.parseFactor();
        return {
          type: "Subscript",
          base: { type: "Literal", value: "" },
          sub
        } as SubscriptNode;
      }
      // 그 외
      this.next();
      return { type: "Literal", value: t.value } as LiteralNode;
    }

    // 그외
    this.next();
    return { type: "Literal", value: "" } as LiteralNode;
  }

  /** factor 뒤에 ^,_를 처리 */
  private maybeParseSubSup(base: ASTNode): ASTNode {
    let node = base;
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.SYMBOL && t.value === "^") {
        this.next();
        const exponent = this.parseFactor();
        node = {
          type: "Superscript",
          base: node,
          exponent
        } as SuperscriptNode;
      } else if (t.type === TokenType.SYMBOL && t.value === "_") {
        this.next();
        const sub = this.parseFactor();
        node = {
          type: "Subscript",
          base: node,
          sub
        } as SubscriptNode;
      } else {
        break;
      }
    }
    return node;
  }

  /** int_1^2에서 "_1"을 단일 토큰으로 파싱하기 */
  private parseSingleFactorNoSubSup(): ASTNode {
    const t = this.peek();
    if (t.type === TokenType.NUMBER || t.type === TokenType.IDENT) {
      this.next();
      return { type: "Literal", value: t.value } as LiteralNode;
    }
    if (t.type === TokenType.SYMBOL) {
      this.next();
      return { type: "Literal", value: t.value } as LiteralNode;
    }
    this.next();
    return { type: "Literal", value: "" } as LiteralNode;
  }

  private parseMatrix(mType: string): MatrixNode {
    const mat: MatrixNode = {
      type: "Matrix",
      matrixType: mType as any,
      rows: []
    };
    if (this.matchSymbol("{")) {
      this.next();
    } else {
      return mat;
    }
    let currentRow: ASTNode[] = [];
    while (!this.matchSymbol("}")) {
      if (this.peek().type === TokenType.EOF) break;
      const tk = this.peek();
      if (tk.type === TokenType.SYMBOL && tk.value === "#") {
        this.next();
        mat.rows.push(currentRow);
        currentRow = [];
      } else if (tk.type === TokenType.SYMBOL && tk.value === "&") {
        this.next();
      } else {
        const f = this.parseFactor();
        currentRow.push(f);
      }
    }
    if (currentRow.length > 0) {
      mat.rows.push(currentRow);
    }
    if (this.matchSymbol("}")) {
      this.next();
    }
    return mat;
  }

  private parseCases(): CasesNode {
    const c: CasesNode = { type: "Cases", lines: [] };
    if (this.matchSymbol("{")) {
      this.next();
    } else {
      return c;
    }
    let currentLine: ASTNode[] = [];
    while (!this.matchSymbol("}")) {
      if (this.peek().type === TokenType.EOF) break;
      if (this.matchSymbol("#")) {
        this.next();
        c.lines.push(currentLine);
        currentLine = [];
      } else {
        const f = this.parseFactor();
        currentLine.push(f);
      }
    }
    if (currentLine.length > 0) {
      c.lines.push(currentLine);
    }
    if (this.matchSymbol("}")) {
      this.next();
    }
    return c;
  }

  /**
   * flattenGroup:
   *  - if group.body.type == 'Group', 펼치기
   *  - 계속 중첩되어 있으면 재귀로
   */
  private flattenGroup(g: GroupNode): GroupNode {
    // while 문을 써서 여러 단계 평탄화할 수도 있음
    // 여기서는 2중까지만 해결하면 된다면 한번만 검사
    // 하지만 재귀로도 작성 가능
    while (g.body.type === "Group") {
      g.body = (g.body as GroupNode).body;
    }
    return g;
  }
}
