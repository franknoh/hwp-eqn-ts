export enum TokenType {
  KEYWORD,   // 예) 한글(HWP) => "INT", "OVER"... / LaTeX => "int", "frac"...
  IDENT,     // x, y, abc...
  NUMBER,    // 123 등
  SYMBOL,    // ^, _, {, }, (, ), +, -, /, etc.
  SPACE,
  EOF,
  UNKNOWN
}

export interface Token {
  type: TokenType;
  value: string;
}
