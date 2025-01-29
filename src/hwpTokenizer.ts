import { Token, TokenType } from "./tokenTypes";
import { isAlpha, isDigit } from "./utils";

const HWP_KEYWORDS = new Set([
  "TIMES", "OVER", "ATOP", "SQRT",
  "INT", "OINT", "SUM",
  "ACUTE", "GRAVE", "DOT", "DDOT", "BAR", "VEC", "DYAD", "UNDER",
  "HAT", "ARCH", "CHECK", "TILDE",
  "LEFT", "RIGHT",
  "PMATRIX", "CASES"
]);

export function tokenizeHwpEqn(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      tokens.push({ type: TokenType.SPACE, value: ch });
      i++; continue;
    }
    if ("^_{}()#&~'/,.-+=*\\[]".includes(ch)) {
      // check double slash
      if (ch === '\\' && i + 1 < input.length && input[i + 1] === '\\') {
        tokens.push({ type: TokenType.SYMBOL, value: "\\\\" });
        i += 2; continue;
      }
      tokens.push({ type: TokenType.SYMBOL, value: ch });
      i++; continue;
    }
    if (isDigit(ch)) {
      let num = ch; i++;
      while (i < input.length && isDigit(input[i])) {
        num += input[i]; i++;
      }
      tokens.push({ type: TokenType.NUMBER, value: num });
      continue;
    }
    if (isAlpha(ch)) {
      let ident = ch; i++;
      while (i < input.length && isAlpha(input[i])) {
        ident += input[i]; i++;
      }
      const up = ident.toUpperCase();
      if (HWP_KEYWORDS.has(up)) {
        tokens.push({ type: TokenType.KEYWORD, value: up });
      } else {
        tokens.push({ type: TokenType.IDENT, value: ident });
      }
      continue;
    }
    // else
    tokens.push({ type: TokenType.UNKNOWN, value: ch });
    i++;
  }
  tokens.push({ type: TokenType.EOF, value: "" });
  return tokens;
}