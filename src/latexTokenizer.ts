import { Token, TokenType } from "./tokenTypes";
import { isAlpha, isDigit } from "./utils";

const LATEX_KEYWORDS = new Set([
  "int", "oint", "sum", "sqrt", "frac",
  "acute", "grave", "dot", "ddot", "bar", "vec", "hat", "tilde", "times",
  "left", "right",
  "begin", "end"
]);
export function tokenizeLatex(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      tokens.push({ type: TokenType.SPACE, value: ch });
      i++; continue;
    }
    if ("^_{}()#&~'/,.-+*=|[]\\".includes(ch)) {
      if (ch === '\\' && i + 1 < input.length && input[i + 1] === '\\') {
        tokens.push({ type: TokenType.SYMBOL, value: "\\\\" });
        i += 2; continue;
      }
      if (ch === '\\') {
        i++;
        let cmd = "";
        while (i < input.length && /[A-Za-z]/.test(input[i])) {
          cmd += input[i]; i++;
        }
        const lower = cmd.toLowerCase();
        if (cmd.length > 0 && LATEX_KEYWORDS.has(lower)) {
          tokens.push({ type: TokenType.KEYWORD, value: lower });
        } else if (cmd.length > 0) {
          tokens.push({ type: TokenType.IDENT, value: cmd });
        } else {
          tokens.push({ type: TokenType.SYMBOL, value: '\\' });
        }
      } else {
        tokens.push({ type: TokenType.SYMBOL, value: ch });
        i++;
      }
      continue;
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
      tokens.push({ type: TokenType.IDENT, value: ident });
      continue;
    }
    tokens.push({ type: TokenType.UNKNOWN, value: ch });
    i++;
  }
  tokens.push({ type: TokenType.EOF, value: "" });
  return tokens;
}