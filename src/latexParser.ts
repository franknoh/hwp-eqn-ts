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

export class LatexParser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    // 공백, UNKNOWN 제거
    this.tokens = tokens.filter(t => t.type !== TokenType.SPACE && t.type !== TokenType.UNKNOWN);
  }

  public parseExpression(): ASTNode {
    return this.parseExpr();
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: TokenType.EOF, value: "" };
  }
  private next(): Token {
    const t = this.peek();
    if (t.type !== TokenType.EOF) {
      this.pos++;
    }
    return t;
  }
  private matchSymbol(v: string): boolean {
    const t = this.peek();
    return (t.type === TokenType.SYMBOL && t.value === v);
  }
  private matchKeyword(k: string): boolean {
    const t = this.peek();
    return (t.type === TokenType.KEYWORD && t.value.toLowerCase() === k.toLowerCase());
  }

  /**********************************************
   * expr = term { (+|-) term }*
   **********************************************/
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

  /**********************************************
   * term = factor { (\times | / ) factor }*
   **********************************************/
  private parseTerm(): ASTNode {
    let node = this.parseFactor();
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.KEYWORD && t.value === "times") {
        this.next();
        const right = this.parseFactor();
        node = {
          type: "BinaryOp",
          operator: "times",
          left: node,
          right
        } as BinaryOpNode;
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

  /**********************************************
   * factor -> NUMBER | IDENT
   *        | KEYWORD(\int, \frac, \sqrt, \sum, \begin, \end, etc.)
   *        | ( expr ) | { expr }
   *        | ^, _
   **********************************************/
  private parseFactor(): ASTNode {
    const t = this.peek();

    // NUMBER
    if (t.type === TokenType.NUMBER) {
      this.next();
      const lit: LiteralNode = { type: "Literal", value: t.value };
      return this.maybeParseSubSup(lit);
    }

    // IDENT
    if (t.type === TokenType.IDENT) {
      this.next();
      const lit: LiteralNode = { type: "Literal", value: t.value };
      return this.maybeParseSubSup(lit);
    }

    // KEYWORD
    if (t.type === TokenType.KEYWORD) {
      this.next();
      const kw = t.value.toLowerCase();

      // \begin
      if (kw === "begin") {
        return this.parseEnvNamed();
      }
      // \end -> 보통 여기서 나오면 어색 -> literal
      if (kw === "end") {
        this.next(); // or handle error
        return { type: "Literal", value: "\\end" } as LiteralNode;
      }

      // \sqrt
      if (kw === "sqrt") {
        const radicand = this.parseFactor();
        return { type: "Root", radicand } as RootNode;
      }
      // \frac
      if (kw === "frac") {
        let numerator: ASTNode = { type: "Literal", value: "" } as LiteralNode;
        let denominator: ASTNode = { type: "Literal", value: "" } as LiteralNode;
        if (this.matchSymbol("{")) {
          this.next();
          numerator = this.parseExpr();
          if (this.matchSymbol("}")) this.next();
        }
        if (this.matchSymbol("{")) {
          this.next();
          denominator = this.parseExpr();
          if (this.matchSymbol("}")) this.next();
        }
        return {
          type: "Fraction",
          numerator,
          denominator,
          withBar: true
        } as FractionNode;
      }

      // \int / \oint
      if (kw === "int" || kw === "oint") {
        const variant = (kw === "int") ? "int" : "oint";
        const iNode: IntegralNode = { type: "Integral", variant };
        this.parseIntegralSubSup(iNode);
        iNode.body = this.parseFactor();
        return iNode;
      }

      // \sum
      if (kw === "sum") {
        const sNode: SummationNode = { type: "Summation" };
        this.parseSumSubSup(sNode);
        sNode.body = this.parseFactor();
        return sNode;
      }

      // \matrix, \pmatrix, \bmatrix, \vmatrix (inline) ex) \pmatrix{...}
      if (["matrix", "pmatrix", "bmatrix", "vmatrix"].includes(kw)) {
        return this.parseInlineMatrix(kw);
      }

      // \cases (inline) ex) \cases{ ... }
      if (kw === "cases") {
        return this.parseInlineCases();
      }

      // \dot, \hat, \tilde, ...
      const deco: DecoratedNode = {
        type: "Decorated",
        decoType: kw,
        child: this.parseFactor()
      };
      return deco;
    }

    // SYMBOL
    if (t.type === TokenType.SYMBOL) {
      // ( expr )
      if (t.value === "(") {
        this.next();
        const expr = this.parseExpr();
        if (this.matchSymbol(")")) {
          this.next();
        }
        return this.maybeParseSubSup(this.simplifyGroup({
          type: "Group",
          body: expr
        } as GroupNode));
      }
      // { expr }
      if (t.value === "{") {
        this.next();
        const expr = this.parseExpr();
        if (this.matchSymbol("}")) {
          this.next();
        }
        return this.maybeParseSubSup(this.simplifyGroup({
          type: "Group",
          body: expr
        } as GroupNode));
      }
      if (t.value === "^") {
        this.next();
        const exponent = this.parseSubOrSupSingle();
        return {
          type: "Superscript",
          base: { type: "Literal", value: "" },
          exponent
        } as SuperscriptNode;
      }
      if (t.value === "_") {
        this.next();
        const sub = this.parseSubOrSupSingle();
        return {
          type: "Subscript",
          base: { type: "Literal", value: "" },
          sub
        } as SubscriptNode;
      }
      if (t.value === "\\\\") {
        // line break
        this.next();
        return { type: "Literal", value: "\\\\" } as LiteralNode;
      }
      // default
      this.next();
      return { type: "Literal", value: t.value } as LiteralNode;
    }

    // 그외
    this.next();
    return { type: "Literal", value: "" } as LiteralNode;
  }

  /**
   * \begin{envName} ... \end{envName}
   * envName => "cases", "matrix", "pmatrix", "bmatrix", "vmatrix", etc.
   */
  private parseEnvNamed(): ASTNode {
    // 기대: {envName}
    // 1) consume '{'
    if (!this.matchSymbol("{")) {
      // 에러 or 그냥 literal
      return { type: "Literal", value: "\\begin" } as LiteralNode;
    }
    this.next(); // consume '{'

    // 2) read envName (IDENT or KEYWORD)
    const envToken = this.peek();
    let envName = "";
    if (envToken.type === TokenType.IDENT || envToken.type === TokenType.KEYWORD) {
      envName = envToken.value.toLowerCase();
      this.next();
    }
    // 3) consume '}'
    if (this.matchSymbol("}")) {
      this.next();
    }

    // 이제 \begin{envName} 부분 소모됨 -> envName에 따라 파싱
    if (envName === "cases") {
      return this.parseEnvCases(envName);
    } else if (["matrix", "pmatrix", "bmatrix", "vmatrix"].includes(envName)) {
      return this.parseEnvMatrix(envName);
    } else {
      // 알 수 없는 env -> fallback parse until \end{envName}
      return this.parseEnvGeneric(envName);
    }
  }

  /**
   * \begin{cases} ... \end{cases}
   */
  private parseEnvCases(envName: string): ASTNode {
    // read lines until \end{cases}
    const c: CasesNode = { type: "Cases", lines: [] };
    let currentLine: ASTNode[] = [];

    while (!(this.matchKeyword("end") && this.peekNextEnvName() === envName)) {
      const tk = this.peek();
      if (tk.type === TokenType.EOF) break;

      if (tk.type === TokenType.SYMBOL && tk.value === "\\\\") {
        // 새 줄
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
    // consume \end{cases}
    this.parseEndEnv(envName);
    return c;
  }

  /**
   * \begin{matrix} ... \end{matrix}
   * 행: "\\", 열: "&"
   */
  private parseEnvMatrix(envName: string): ASTNode {
    const mat: MatrixNode = {
      type: "Matrix",
      // vmatrix -> dmatrix
      matrixType: (envName === "vmatrix") ? "dmatrix" : envName as any,
      rows: []
    };
    let currentRow: ASTNode[] = [];

    while (!(this.matchKeyword("end") && this.peekNextEnvName() === envName)) {
      const tk = this.peek();
      if (tk.type === TokenType.EOF) break;

      if (tk.type === TokenType.SYMBOL && tk.value === "\\\\") {
        // 새 행
        this.next();
        mat.rows.push(currentRow);
        currentRow = [];
      } else if (tk.type === TokenType.SYMBOL && tk.value === "&") {
        this.next();
      } else {
        // parseFactor
        const f = this.parseFactor();
        currentRow.push(f);
      }
    }
    if (currentRow.length > 0) {
      mat.rows.push(currentRow);
    }
    // consume \end{envName}
    this.parseEndEnv(envName);
    return mat;
  }

  /** 일반 envName (알려지지 않은 환경): parse until \end{envName} */
  private parseEnvGeneric(envName: string): ASTNode {
    const list: ASTNode[] = [];
    while (!(this.matchKeyword("end") && this.peekNextEnvName() === envName)) {
      if (this.peek().type === TokenType.EOF) break;
      const f = this.parseFactor();
      list.push(f);
    }
    this.parseEndEnv(envName);
    // 임시로 그냥 GroupNode로
    return {
      type: "Group",
      body: {
        type: "Literal",
        value: list.map(l => "(?)").join(" ")
      }
    } as GroupNode;
  }

  /**
   * \end{envName}
   */
  private parseEndEnv(envName: string) {
    // match KEYWORD(end)
    if (this.matchKeyword("end")) {
      this.next(); // consume 'end'
      // then { envName }
      if (this.matchSymbol("{")) {
        this.next();
        // read ident
        const envTok = this.peek();
        if (envTok.type === TokenType.IDENT || envTok.type === TokenType.KEYWORD) {
          const eName = envTok.value.toLowerCase();
          this.next();
          // must match envName
          if (this.matchSymbol("}")) {
            this.next();
            // done
          }
        }
      }
    }
  }

  /**
   * \pmatrix{ ... } (inline, without \begin{pmatrix})
   */
  private parseInlineMatrix(kw: string): ASTNode {
    // ex) \pmatrix{ 1 & 2 \\ 3 & 4 }
    const mat: MatrixNode = {
      type: "Matrix",
      matrixType: (kw === "vmatrix") ? "dmatrix" : kw as any,
      rows: []
    };
    // expect '{'
    if (!this.matchSymbol("{")) {
      // fallback
      return mat;
    }
    this.next(); // consume '{'

    let currentRow: ASTNode[] = [];
    while (!this.matchSymbol("}")) {
      const tk = this.peek();
      if (tk.type === TokenType.EOF) break;
      if (tk.type === TokenType.SYMBOL && tk.value === "\\\\") {
        // 새 행
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
    // consume '}'
    if (this.matchSymbol("}")) {
      this.next();
    }
    return mat;
  }

  /**
   * \cases{ ... } (inline)
   */
  private parseInlineCases(): ASTNode {
    // parse until matching '}'
    const c: CasesNode = { type: "Cases", lines: [] };
    if (!this.matchSymbol("{")) {
      // fallback
      return c;
    }
    this.next();
    let currentLine: ASTNode[] = [];
    while (!this.matchSymbol("}")) {
      if (this.peek().type === TokenType.EOF) break;
      if (this.matchSymbol("\\\\")) {
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

  private parseIntegralSubSup(iNode: IntegralNode) {
    if (this.matchSymbol("_")) {
      this.next();
      iNode.lower = this.parseSubOrSupSingle();
    }
    if (this.matchSymbol("^")) {
      this.next();
      iNode.upper = this.parseSubOrSupSingle();
    }
  }
  private parseSumSubSup(sNode: SummationNode) {
    if (this.matchSymbol("_")) {
      this.next();
      sNode.lower = this.parseSubOrSupSingle();
    }
    if (this.matchSymbol("^")) {
      this.next();
      sNode.upper = this.parseSubOrSupSingle();
    }
  }

  private parseSubOrSupSingle(): ASTNode {
    if (this.matchSymbol("{")) {
      this.next();
      const expr = this.parseExpr();
      if (this.matchSymbol("}")) this.next();
      return expr;
    } else {
      return this.parseSingleFactorNoSubSup();
    }
  }

  /**
   * sub/sup에서 단일토큰만 먹고, ^,_를 계속 파싱하지 않음
   */
  private parseSingleFactorNoSubSup(): ASTNode {
    const t = this.peek();
    if (t.type === TokenType.NUMBER) {
      this.next();
      return { type: "Literal", value: t.value } as LiteralNode;
    }
    if (t.type === TokenType.IDENT) {
      this.next();
      return { type: "Literal", value: t.value } as LiteralNode;
    }
    if (t.type === TokenType.SYMBOL) {
      this.next();
      return { type: "Literal", value: t.value } as LiteralNode;
    }
    // else
    this.next();
    return { type: "Literal", value: "" } as LiteralNode;
  }

  private maybeParseSubSup(base: ASTNode): ASTNode {
    let node = base;
    while (true) {
      const t = this.peek();
      if (t.type === TokenType.SYMBOL && t.value === "^") {
        this.next();
        const exponent = this.parseSubOrSupSingle();
        node = {
          type: "Superscript",
          base: node,
          exponent
        } as SuperscriptNode;
      } else if (t.type === TokenType.SYMBOL && t.value === "_") {
        this.next();
        const sub = this.parseSubOrSupSingle();
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

  /**
   * \end{envName}에서 envName이 뭔지 미리 훔쳐보기
   */
  private peekNextEnvName(): string {
    let i = 0;
    // 1) 'end'
    const t = this.tokens[this.pos + i];
    if (t && t.type === TokenType.KEYWORD && t.value === "end") {
      i++;
    } else {
      return "";
    }
    // 2) '{'
    const t2 = this.tokens[this.pos + i];
    if (t2 && t2.type === TokenType.SYMBOL && t2.value === "{") {
      i++;
    } else {
      return "";
    }
    // 3) next => env name
    const t3 = this.tokens[this.pos + i];
    if (!t3) return "";
    if (t3.type === TokenType.IDENT || t3.type === TokenType.KEYWORD) {
      return t3.value.toLowerCase();
    }
    return "";
  }

  private simplifyGroup(g: GroupNode): ASTNode {
    if (g.body.type === "Group") {
      // 한 번 평탄화
      return g.body;
    }
    return g;
  }

}
